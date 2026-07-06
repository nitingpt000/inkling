import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { searchWiki } from "../src/search.ts";
import { validateWiki } from "../src/validate.ts";
import { exportSite } from "../src/site.ts";

async function createWiki(): Promise<string> {
  const repo = await mkdtemp(path.join(tmpdir(), "inkling-wiki-"));
  const wiki = path.join(repo, "inkling");
  await mkdir(path.join(wiki, "architecture"), { recursive: true });

  await writeFile(
    path.join(wiki, "quickstart.md"),
    [
      "# Sample Project",
      "",
      "See the [overview](architecture/overview.md).",
      "A [broken link](architecture/missing.md).",
      "",
      "## Getting Started",
      "Configure authentication before running.",
    ].join("\n"),
    "utf8",
  );

  await writeFile(
    path.join(wiki, "architecture", "overview.md"),
    [
      "# Architecture Overview",
      "",
      "```mermaid",
      "flowchart LR",
      "  A --> B",
      "```",
      "",
      "Back to [quickstart](../quickstart.md).",
    ].join("\n"),
    "utf8",
  );

  await writeFile(
    path.join(wiki, "architecture", "orphan.md"),
    "# Orphan\n\nNothing links here.\n",
    "utf8",
  );

  return repo;
}

describe("searchWiki", () => {
  test("finds a case-insensitive match with line numbers", async () => {
    const repo = await createWiki();
    const report = await searchWiki("AUTHENTICATION", repo);

    expect(report.pagesSearched).toBe(3);
    expect(report.matches).toHaveLength(1);
    expect(report.matches[0].relPath).toBe("quickstart.md");
    expect(report.matches[0].lineNumber).toBeGreaterThan(0);
  });

  test("returns no matches for an empty query", async () => {
    const repo = await createWiki();
    const report = await searchWiki("   ", repo);

    expect(report.matches).toHaveLength(0);
  });
});

describe("validateWiki", () => {
  test("detects broken links and orphan pages", async () => {
    const repo = await createWiki();
    const report = await validateWiki(repo);

    expect(report.pages).toBe(3);

    const errors = report.issues.filter((issue) => issue.severity === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("architecture/missing.md");

    const orphanWarning = report.issues.find((issue) =>
      issue.message.includes("Orphan page"),
    );
    expect(orphanWarning?.relPath).toBe("architecture/orphan.md");
  });
});

describe("exportSite", () => {
  test("renders HTML with rewritten links and mermaid blocks", async () => {
    const repo = await createWiki();
    const outDir = path.join(repo, "site");
    const report = await exportSite(repo, outDir);

    expect(report.pages).toBe(3);
    expect(report.wroteIndex).toBe(true);

    const overview = await readFile(
      path.join(outDir, "architecture", "overview.html"),
      "utf8",
    );
    expect(overview).toContain('href="../quickstart.html"');
    expect(overview).toContain('class="mermaid"');
    expect(overview).toContain("flowchart LR");

    const quickstart = await readFile(
      path.join(outDir, "quickstart.html"),
      "utf8",
    );
    expect(quickstart).toContain('href="architecture/overview.html"');

    const index = await readFile(path.join(outDir, "index.html"), "utf8");
    expect(index).toContain("Sample Project");
  });

  test("reports zero pages when the wiki is absent", async () => {
    const repo = await mkdtemp(path.join(tmpdir(), "inkling-empty-"));
    const report = await exportSite(repo, path.join(repo, "site"));

    expect(report.pages).toBe(0);
    expect(report.wroteIndex).toBe(false);
  });
});
