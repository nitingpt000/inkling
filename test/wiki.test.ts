import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { deriveTitle, readWikiPages, resolveWikiRoot } from "../src/wiki.ts";
import {
  createEmptyRepo,
  createWikiRepo,
  removeRepo,
  SAMPLE_WIKI,
} from "./helpers/fixtures.ts";

const repos: string[] = [];

async function repo(files = SAMPLE_WIKI): Promise<string> {
  const created = await createWikiRepo(files);
  repos.push(created);
  return created;
}

afterEach(async () => {
  await Promise.all(repos.splice(0).map(removeRepo));
});

describe("resolveWikiRoot", () => {
  test("points at the inkling/ directory", () => {
    expect(resolveWikiRoot("/tmp/project")).toBe(
      path.join("/tmp/project", "inkling"),
    );
  });
});

describe("deriveTitle", () => {
  test("uses the first heading", () => {
    expect(deriveTitle("# My Page\n\nBody", "x.md")).toBe("My Page");
  });

  test("falls back to a title-cased filename", () => {
    expect(deriveTitle("no heading here", "data-models.md")).toBe(
      "Data Models",
    );
  });
});

describe("readWikiPages", () => {
  test("returns all pages with quickstart first", async () => {
    const cwd = await repo();
    const pages = await readWikiPages(cwd);

    expect(pages).toHaveLength(3);
    expect(pages[0].relPath).toBe("quickstart.md");
    expect(pages.map((page) => page.relPath)).toEqual([
      "quickstart.md",
      "architecture/orphan.md",
      "architecture/overview.md",
    ]);
    expect(pages[0].title).toBe("Sample Project");
  });

  test("uses POSIX-style relative paths on every platform", async () => {
    const cwd = await repo();
    const pages = await readWikiPages(cwd);
    expect(pages.every((page) => !page.relPath.includes("\\"))).toBe(true);
  });

  test("skips metadata and scratch files", async () => {
    const cwd = await repo();
    const wikiRoot = resolveWikiRoot(cwd);
    await mkdir(wikiRoot, { recursive: true });
    await writeFile(path.join(wikiRoot, "_plan.md"), "# scratch\n", "utf8");
    await writeFile(path.join(wikiRoot, ".last-update.json"), "{}\n", "utf8");

    const pages = await readWikiPages(cwd);
    expect(pages.map((page) => page.relPath)).not.toContain("_plan.md");
    expect(pages).toHaveLength(3);
  });

  test("returns an empty list when there is no wiki", async () => {
    const cwd = await createEmptyRepo();
    repos.push(cwd);
    expect(await readWikiPages(cwd)).toEqual([]);
  });
});
