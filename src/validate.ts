import path from "node:path";
import { readWikiPages, toPosix, type WikiPage } from "./wiki.js";

export type WikiIssue = {
  severity: "error" | "warning";
  relPath: string;
  message: string;
};

export type ValidateReport = {
  pages: number;
  issues: WikiIssue[];
};

type ParsedLink = {
  target: string;
  raw: string;
};

const LINK_PATTERN = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu;

/**
 * Validates internal wiki links and page reachability:
 * - error: a relative Markdown link points to a page that does not exist.
 * - warning: a link anchor does not match any heading in the target page.
 * - warning: a page is not reachable from quickstart.md.
 */
export async function validateWiki(
  cwd: string = process.cwd(),
): Promise<ValidateReport> {
  const pages = await readWikiPages(cwd);
  const byPath = new Map(pages.map((page) => [page.relPath, page]));
  const issues: WikiIssue[] = [];

  if (pages.length === 0) {
    return { pages: 0, issues };
  }

  if (!byPath.has("quickstart.md")) {
    issues.push({
      severity: "warning",
      relPath: "quickstart.md",
      message: "Missing quickstart.md; the wiki has no canonical entrypoint.",
    });
  }

  for (const page of pages) {
    validatePageLinks(page, byPath, issues);
  }

  reportOrphans(pages, byPath, issues);

  return { pages: pages.length, issues };
}

function validatePageLinks(
  page: WikiPage,
  byPath: Map<string, WikiPage>,
  issues: WikiIssue[],
): void {
  for (const link of extractLinks(page.content)) {
    const resolved = resolveInternalLink(page.relPath, link.target);

    if (!resolved) {
      continue;
    }

    const targetPage = byPath.get(resolved.relPath);

    if (!targetPage) {
      issues.push({
        severity: "error",
        relPath: page.relPath,
        message: `Broken link to "${link.target}" (no such page ${resolved.relPath}).`,
      });
      continue;
    }

    if (resolved.anchor && !hasHeadingAnchor(targetPage, resolved.anchor)) {
      issues.push({
        severity: "warning",
        relPath: page.relPath,
        message: `Link "${link.target}" points to a missing "#${resolved.anchor}" anchor in ${resolved.relPath}.`,
      });
    }
  }
}

function reportOrphans(
  pages: WikiPage[],
  byPath: Map<string, WikiPage>,
  issues: WikiIssue[],
): void {
  if (!byPath.has("quickstart.md")) {
    return;
  }

  const reachable = new Set<string>(["quickstart.md"]);
  const queue = ["quickstart.md"];

  while (queue.length > 0) {
    const current = queue.shift();

    if (current === undefined) {
      break;
    }

    const page = byPath.get(current);

    if (!page) {
      continue;
    }

    for (const link of extractLinks(page.content)) {
      const resolved = resolveInternalLink(page.relPath, link.target);

      if (
        resolved &&
        byPath.has(resolved.relPath) &&
        !reachable.has(resolved.relPath)
      ) {
        reachable.add(resolved.relPath);
        queue.push(resolved.relPath);
      }
    }
  }

  for (const page of pages) {
    if (!reachable.has(page.relPath)) {
      issues.push({
        severity: "warning",
        relPath: page.relPath,
        message: "Orphan page: not reachable from quickstart.md via links.",
      });
    }
  }
}

function extractLinks(content: string): ParsedLink[] {
  const links: ParsedLink[] = [];

  for (const match of content.matchAll(LINK_PATTERN)) {
    links.push({ raw: match[0], target: match[1] });
  }

  return links;
}

type ResolvedLink = {
  relPath: string;
  anchor: string | null;
};

function resolveInternalLink(
  fromRelPath: string,
  target: string,
): ResolvedLink | null {
  const trimmed = target.trim();

  if (
    trimmed.length === 0 ||
    trimmed.startsWith("#") ||
    /^[a-z]+:/iu.test(trimmed) ||
    trimmed.startsWith("//")
  ) {
    // Empty, same-page anchor, or absolute/protocol-qualified link.
    return null;
  }

  const [pathPart, anchor = null] = trimmed.split("#", 2);

  if (!pathPart.toLowerCase().endsWith(".md")) {
    // Only Markdown pages participate in link validation.
    return null;
  }

  const fromDir = path.posix.dirname(fromRelPath);
  const resolved = toPosix(
    path.posix.normalize(path.posix.join(fromDir, pathPart)),
  );

  if (resolved.startsWith("..")) {
    // Link escapes the wiki root; not a wiki page we can validate.
    return null;
  }

  return { relPath: resolved, anchor };
}

function hasHeadingAnchor(page: WikiPage, anchor: string): boolean {
  const target = anchor.toLowerCase();

  for (const line of page.content.split(/\r?\n/u)) {
    const match = /^#{1,6}\s+(.+?)\s*$/u.exec(line);

    if (match && slugifyHeading(match[1]) === target) {
      return true;
    }
  }

  return false;
}

/** GitHub-style heading slug. */
function slugifyHeading(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/gu, "")
    .trim()
    .replace(/\s+/gu, "-");
}

export function formatValidateReport(report: ValidateReport): string {
  if (report.pages === 0) {
    return "No wiki pages found. Run inkling --init to generate documentation first.";
  }

  const errors = report.issues.filter((issue) => issue.severity === "error");
  const warnings = report.issues.filter(
    (issue) => issue.severity === "warning",
  );

  if (report.issues.length === 0) {
    return `Validated ${report.pages} page(s): no issues found.`;
  }

  const lines: string[] = [
    `Validated ${report.pages} page(s): ${errors.length} error(s), ${warnings.length} warning(s).`,
    "",
  ];

  for (const issue of report.issues) {
    const marker = issue.severity === "error" ? "✗" : "!";
    lines.push(`${marker} ${issue.relPath}: ${issue.message}`);
  }

  return lines.join("\n");
}
