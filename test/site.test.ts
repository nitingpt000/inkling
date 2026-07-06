import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { exportSite } from "../src/site.ts";
import {
  createEmptyRepo,
  createWikiRepo,
  removeRepo,
} from "./helpers/fixtures.ts";

const repos: string[] = [];

afterEach(async () => {
  await Promise.all(repos.splice(0).map(removeRepo));
});

async function exportRepo(): Promise<{ cwd: string; outDir: string }> {
  const cwd = await createWikiRepo();
  repos.push(cwd);
  const outDir = path.join(cwd, "site");
  const report = await exportSite(cwd, outDir);
  expect(report.pages).toBe(3);
  expect(report.wroteIndex).toBe(true);
  return { cwd, outDir };
}

async function read(outDir: string, rel: string): Promise<string> {
  return readFile(path.join(outDir, rel), "utf8");
}

describe("exportSite", () => {
  test("writes an html page per markdown page plus assets and index", async () => {
    const { outDir } = await exportRepo();

    for (const file of [
      "index.html",
      "quickstart.html",
      "architecture/overview.html",
      "architecture/orphan.html",
      "assets/styles.css",
      "assets/app.js",
      "assets/search-index.js",
    ]) {
      await expect(read(outDir, file)).resolves.toBeTypeOf("string");
    }
  });

  test("rewrites .md links to .html and preserves anchors", async () => {
    const { outDir } = await exportRepo();
    const quickstart = await read(outDir, "quickstart.html");
    expect(quickstart).toContain(
      'href="architecture/overview.html#components"',
    );
  });

  test("does not rewrite external links", async () => {
    const { outDir } = await exportRepo();
    const overview = await read(outDir, "architecture/overview.html");
    expect(overview).toContain('href="https://example.com"');
  });

  test("converts mermaid fences into mermaid elements", async () => {
    const { outDir } = await exportRepo();
    const overview = await read(outDir, "architecture/overview.html");
    expect(overview).toContain('class="mermaid"');
    expect(overview).toContain("flowchart LR");
    expect(overview).not.toContain("language-mermaid");
  });

  test("nested pages reference assets with the correct depth prefix", async () => {
    const { outDir } = await exportRepo();
    const overview = await read(outDir, "architecture/overview.html");
    expect(overview).toContain('href="../assets/styles.css"');
    const quickstart = await read(outDir, "quickstart.html");
    expect(quickstart).toContain('href="assets/styles.css"');
  });

  test("groups nested pages under a directory heading in the nav", async () => {
    const { outDir } = await exportRepo();
    const quickstart = await read(outDir, "quickstart.html");
    expect(quickstart).toContain("nav-group-title");
    expect(quickstart).toContain("Architecture");
  });

  test("builds a search index with title and text", async () => {
    const { outDir } = await exportRepo();
    const script = await read(outDir, "assets/search-index.js");
    expect(script).toContain("window.INKLING_SEARCH_INDEX");
    expect(script).toContain("Sample Project");
    expect(script).toContain("authentication");
  });

  test("index.html mirrors the quickstart page", async () => {
    const { outDir } = await exportRepo();
    const index = await read(outDir, "index.html");
    expect(index).toContain("Sample Project");
  });

  test("reports zero pages and writes nothing when the wiki is absent", async () => {
    const cwd = await createEmptyRepo();
    repos.push(cwd);
    const report = await exportSite(cwd, path.join(cwd, "site"));
    expect(report).toMatchObject({ pages: 0, wroteIndex: false });
  });
});
