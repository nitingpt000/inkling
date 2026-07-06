import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import { readWikiPages, type WikiPage } from "./wiki.js";

export const DEFAULT_SITE_DIR = "inkling-site";

export type ExportReport = {
  outDir: string;
  pages: number;
  wroteIndex: boolean;
};

type NavPage = {
  href: string;
  title: string;
  relPath: string;
};

/**
 * Renders the Markdown wiki under the inkling/ directory into a self-contained
 * static HTML site (sidebar navigation, client-side search, and Mermaid
 * diagram rendering) suitable for hosting on GitHub Pages.
 */
export async function exportSite(
  cwd: string = process.cwd(),
  outDirInput: string = DEFAULT_SITE_DIR,
): Promise<ExportReport> {
  const pages = await readWikiPages(cwd);
  const outDir = path.isAbsolute(outDirInput)
    ? outDirInput
    : path.join(cwd, outDirInput);

  if (pages.length === 0) {
    return { outDir, pages: 0, wroteIndex: false };
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(path.join(outDir, "assets"), { recursive: true });

  const navPages = pages.map(
    (page): NavPage => ({
      href: toHtmlPath(page.relPath),
      title: page.title,
      relPath: page.relPath,
    }),
  );

  for (const page of pages) {
    const html = await renderPage(page, navPages, page.relPath);
    const outPath = path.join(outDir, toHtmlPath(page.relPath));

    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, html, "utf8");
  }

  const quickstart =
    pages.find((page) => page.relPath === "quickstart.md") ?? pages[0];
  const indexHtml = await renderPage(quickstart, navPages, "index.html", 0);
  await writeFile(path.join(outDir, "index.html"), indexHtml, "utf8");

  await writeFile(
    path.join(outDir, "assets", "styles.css"),
    STYLES_CSS,
    "utf8",
  );
  await writeFile(path.join(outDir, "assets", "app.js"), APP_JS, "utf8");
  await writeFile(
    path.join(outDir, "assets", "search-index.js"),
    buildSearchIndexScript(pages),
    "utf8",
  );

  return { outDir, pages: pages.length, wroteIndex: true };
}

async function renderPage(
  page: WikiPage,
  navPages: NavPage[],
  currentPath: string,
  depthOverride?: number,
): Promise<string> {
  const depth = depthOverride ?? pathDepth(currentPath);
  const rootPrefix = "../".repeat(depth);
  const body = await renderMarkdown(page.content);
  const nav = renderNav(navPages, page.relPath, rootPrefix);

  return htmlDocument({
    title: page.title,
    rootPrefix,
    nav,
    body,
  });
}

async function renderMarkdown(markdown: string): Promise<string> {
  const { text, blocks } = extractMermaidBlocks(markdown);
  let html = await marked.parse(text, { async: true });

  html = rewriteMarkdownLinks(html);

  blocks.forEach((code, index) => {
    const placeholder = mermaidPlaceholder(index);
    html = html
      .split(`<p>${placeholder}</p>`)
      .join(mermaidElement(code))
      .split(placeholder)
      .join(mermaidElement(code));
  });

  return html;
}

function extractMermaidBlocks(markdown: string): {
  text: string;
  blocks: string[];
} {
  const blocks: string[] = [];
  const text = markdown.replace(
    /```mermaid\s*\n([\s\S]*?)```/gu,
    (_match, code: string) => {
      const placeholder = mermaidPlaceholder(blocks.length);
      blocks.push(code.replace(/\s+$/u, ""));
      return placeholder;
    },
  );

  return { text, blocks };
}

function mermaidPlaceholder(index: number): string {
  return `<!--INKLING_MERMAID_${index}-->`;
}

function mermaidElement(code: string): string {
  return `<pre class="mermaid">${escapeHtml(code)}</pre>`;
}

function rewriteMarkdownLinks(html: string): string {
  return html.replace(
    /href="(?!https?:|mailto:|#|\/\/)([^"]+?)\.md((?:#[^"]*)?)"/gu,
    'href="$1.html$2"',
  );
}

function renderNav(
  navPages: NavPage[],
  currentRelPath: string,
  rootPrefix: string,
): string {
  const groups = new Map<string, NavPage[]>();
  const rootPages: NavPage[] = [];

  for (const page of navPages) {
    if (page.relPath === "quickstart.md") {
      continue;
    }

    const slashIndex = page.relPath.indexOf("/");

    if (slashIndex === -1) {
      rootPages.push(page);
      continue;
    }

    const group = page.relPath.slice(0, slashIndex);
    const existing = groups.get(group) ?? [];
    existing.push(page);
    groups.set(group, existing);
  }

  const sections: string[] = [];
  const quickstart = navPages.find((page) => page.relPath === "quickstart.md");

  if (quickstart) {
    sections.push(
      navLink(quickstart, currentRelPath, rootPrefix, "nav-quickstart"),
    );
  }

  for (const page of rootPages) {
    sections.push(navLink(page, currentRelPath, rootPrefix));
  }

  for (const group of [...groups.keys()].sort()) {
    const items = (groups.get(group) ?? [])
      .map((page) => navLink(page, currentRelPath, rootPrefix))
      .join("\n");
    sections.push(
      `<div class="nav-group"><span class="nav-group-title">${escapeHtml(
        titleize(group),
      )}</span>${items}</div>`,
    );
  }

  return sections.join("\n");
}

function navLink(
  page: NavPage,
  currentRelPath: string,
  rootPrefix: string,
  extraClass = "",
): string {
  const isActive = page.relPath === currentRelPath;
  const className = ["nav-link", extraClass, isActive ? "active" : ""]
    .filter(Boolean)
    .join(" ");

  return `<a class="${className}" href="${rootPrefix}${page.href}">${escapeHtml(
    page.title,
  )}</a>`;
}

function buildSearchIndexScript(pages: WikiPage[]): string {
  const index = pages.map((page) => ({
    href: toHtmlPath(page.relPath),
    title: page.title,
    text: stripMarkdown(page.content).slice(0, 4000),
  }));

  return `window.INKLING_SEARCH_INDEX = ${JSON.stringify(index)};\n`;
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/gu, " ")
    .replace(/`[^`]*`/gu, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/gu, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/^[#>\-*+\s]+/gmu, " ")
    .replace(/[*_~]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function htmlDocument(options: {
  title: string;
  rootPrefix: string;
  nav: string;
  body: string;
}): string {
  const { title, rootPrefix, nav, body } = options;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)} · Inkling</title>
<link rel="stylesheet" href="${rootPrefix}assets/styles.css" />
</head>
<body>
<button class="menu-toggle" aria-label="Toggle navigation">☰</button>
<aside class="sidebar">
<a class="brand" href="${rootPrefix}index.html">Inkling</a>
<input class="search-input" type="search" placeholder="Search docs…" aria-label="Search documentation" />
<div class="search-results" hidden></div>
<nav class="nav">
${nav}
</nav>
</aside>
<main class="content">
<article class="markdown-body">
${body}
</article>
<footer class="site-footer">Generated by <a href="https://github.com/nitingpt000/inkling">Inkling</a>.</footer>
</main>
<script>window.INKLING_ROOT_PREFIX = ${JSON.stringify(rootPrefix)};</script>
<script src="${rootPrefix}assets/search-index.js"></script>
<script type="module" src="${rootPrefix}assets/app.js"></script>
</body>
</html>
`;
}

function toHtmlPath(relPath: string): string {
  return relPath.replace(/\.md$/u, ".html");
}

function pathDepth(relPath: string): number {
  const normalized = relPath.replace(/\.md$/u, ".html");

  return normalized.split("/").length - 1;
}

function titleize(value: string): string {
  return value
    .replace(/[-_]+/gu, " ")
    .replace(/\b\w/gu, (character) => character.toUpperCase());
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

const STYLES_CSS = `:root {
  --bg: #0f1117;
  --surface: #171a23;
  --border: #262b38;
  --text: #d7dbe4;
  --muted: #9aa3b2;
  --accent: #7c9cff;
  --code-bg: #11141c;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  display: flex;
  min-height: 100vh;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
.sidebar {
  width: 280px;
  flex: 0 0 280px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 20px 16px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}
.brand { display: block; font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 16px; }
.search-input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  margin-bottom: 12px;
}
.search-results { margin-bottom: 12px; }
.search-results a { display: block; padding: 6px 8px; border-radius: 6px; font-size: 14px; }
.search-results a:hover { background: var(--bg); }
.search-results .result-title { font-weight: 600; }
.search-results .result-snippet { color: var(--muted); font-size: 12px; }
.nav { display: flex; flex-direction: column; gap: 2px; }
.nav-link { display: block; padding: 6px 8px; border-radius: 6px; color: var(--muted); font-size: 14px; }
.nav-link:hover { color: var(--text); background: var(--bg); text-decoration: none; }
.nav-link.active { color: var(--text); background: var(--bg); font-weight: 600; }
.nav-quickstart { color: var(--text); font-weight: 600; }
.nav-group { margin-top: 14px; }
.nav-group-title { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); padding: 0 8px; margin-bottom: 4px; }
.content { flex: 1 1 auto; padding: 40px 48px; max-width: 900px; }
.markdown-body { line-height: 1.65; }
.markdown-body h1 { font-size: 30px; margin-top: 0; }
.markdown-body h2 { border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-top: 32px; }
.markdown-body code { background: var(--code-bg); padding: 2px 5px; border-radius: 4px; font-size: 0.9em; }
.markdown-body pre { background: var(--code-bg); padding: 14px; border-radius: 8px; overflow-x: auto; border: 1px solid var(--border); }
.markdown-body pre code { background: transparent; padding: 0; }
.markdown-body pre.mermaid { background: #f6f8ff; text-align: center; }
.markdown-body table { border-collapse: collapse; width: 100%; }
.markdown-body th, .markdown-body td { border: 1px solid var(--border); padding: 6px 10px; }
.markdown-body blockquote { border-left: 3px solid var(--accent); margin: 0; padding: 4px 16px; color: var(--muted); }
.site-footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--border); color: var(--muted); font-size: 13px; }
.menu-toggle { display: none; position: fixed; top: 12px; right: 12px; z-index: 20; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; font-size: 18px; }
@media (max-width: 760px) {
  body { flex-direction: column; }
  .sidebar { position: fixed; left: 0; top: 0; transform: translateX(-100%); transition: transform 0.2s ease; z-index: 15; }
  .sidebar.open { transform: translateX(0); }
  .menu-toggle { display: block; }
  .content { padding: 64px 20px 40px; max-width: 100%; }
}
`;

const APP_JS = `const index = window.INKLING_SEARCH_INDEX || [];
const rootPrefix = window.INKLING_ROOT_PREFIX || "";
const input = document.querySelector(".search-input");
const results = document.querySelector(".search-results");
const nav = document.querySelector(".nav");
const toggle = document.querySelector(".menu-toggle");
const sidebar = document.querySelector(".sidebar");

if (toggle && sidebar) {
  toggle.addEventListener("click", () => sidebar.classList.toggle("open"));
}

function snippet(text, query) {
  const at = text.toLowerCase().indexOf(query);
  if (at === -1) return text.slice(0, 100);
  const start = Math.max(0, at - 40);
  return (start > 0 ? "…" : "") + text.slice(start, start + 120);
}

if (input && results && nav) {
  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      results.hidden = true;
      results.innerHTML = "";
      nav.hidden = false;
      return;
    }
    const matches = index
      .filter((page) =>
        page.title.toLowerCase().includes(query) ||
        page.text.toLowerCase().includes(query)
      )
      .slice(0, 12);
    nav.hidden = true;
    results.hidden = false;
    results.innerHTML = matches.length
      ? matches
          .map(
            (page) =>
              '<a href="' + rootPrefix + page.href + '">' +
              '<span class="result-title">' + page.title + "</span>" +
              '<span class="result-snippet">' + snippet(page.text, query) + "</span>" +
              "</a>"
          )
          .join("")
      : '<p class="result-snippet">No matches.</p>';
  });
}

import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs")
  .then(({ default: mermaid }) => {
    mermaid.initialize({ startOnLoad: true, theme: "default", securityLevel: "loose" });
  })
  .catch(() => {
    /* offline: mermaid blocks stay as plain text */
  });
`;
