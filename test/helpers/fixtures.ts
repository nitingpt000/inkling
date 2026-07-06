import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export type WikiFile = {
  /** Path relative to the wiki root, e.g. "architecture/overview.md". */
  relPath: string;
  content: string;
};

/**
 * A representative wiki used across tests:
 * - quickstart.md links to the overview, has a broken link, and mentions
 *   "authentication" for search tests.
 * - architecture/overview.md contains a Mermaid block, an anchor heading, an
 *   external link, and a back-link to quickstart.
 * - architecture/orphan.md is reachable from nothing (orphan warning).
 */
export const SAMPLE_WIKI: WikiFile[] = [
  {
    relPath: "quickstart.md",
    content: [
      "# Sample Project",
      "",
      "See the [overview](architecture/overview.md#components).",
      "A [broken link](architecture/missing.md) for testing.",
      "",
      "## Getting Started",
      "",
      "Configure authentication before running.",
    ].join("\n"),
  },
  {
    relPath: "architecture/overview.md",
    content: [
      "# Architecture Overview",
      "",
      "```mermaid",
      "flowchart LR",
      "  A --> B",
      "```",
      "",
      "## Components",
      "",
      "See the [website](https://example.com) for more.",
      "",
      "Back to [quickstart](../quickstart.md).",
    ].join("\n"),
  },
  {
    relPath: "architecture/orphan.md",
    content: "# Orphan\n\nNothing links here.\n",
  },
];

/**
 * Creates a throwaway repository directory containing a wiki under `inkling/`.
 * Returns the repository root. Callers may pass custom files.
 */
export async function createWikiRepo(
  files: WikiFile[] = SAMPLE_WIKI,
): Promise<string> {
  const repo = await mkdtemp(path.join(tmpdir(), "inkling-test-"));
  const wikiRoot = path.join(repo, "inkling");

  for (const file of files) {
    const absPath = path.join(wikiRoot, file.relPath);
    await mkdir(path.dirname(absPath), { recursive: true });
    await writeFile(absPath, file.content, "utf8");
  }

  return repo;
}

/** Creates an empty repository directory with no wiki. */
export async function createEmptyRepo(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "inkling-empty-"));
}

export async function removeRepo(repo: string): Promise<void> {
  await rm(repo, { recursive: true, force: true });
}
