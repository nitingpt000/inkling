import { afterEach, describe, expect, test } from "vitest";
import { formatSearchReport, searchWiki } from "../src/search.ts";
import {
  createEmptyRepo,
  createWikiRepo,
  removeRepo,
} from "./helpers/fixtures.ts";

const repos: string[] = [];

afterEach(async () => {
  await Promise.all(repos.splice(0).map(removeRepo));
});

async function wikiRepo(): Promise<string> {
  const repo = await createWikiRepo();
  repos.push(repo);
  return repo;
}

describe("searchWiki", () => {
  test("finds a case-insensitive match with a line number", async () => {
    const cwd = await wikiRepo();
    const report = await searchWiki("AUTHENTICATION", cwd);

    expect(report.pagesSearched).toBe(3);
    expect(report.matches).toHaveLength(1);
    expect(report.matches[0]).toMatchObject({
      relPath: "quickstart.md",
      title: "Sample Project",
    });
    expect(report.matches[0].lineNumber).toBeGreaterThan(0);
  });

  test("returns no matches for an unknown term", async () => {
    const cwd = await wikiRepo();
    const report = await searchWiki("zzzznotfound", cwd);
    expect(report.matches).toHaveLength(0);
  });

  test("an empty query matches nothing", async () => {
    const cwd = await wikiRepo();
    const report = await searchWiki("   ", cwd);
    expect(report.matches).toHaveLength(0);
  });

  test("reports zero pages when the wiki is absent", async () => {
    const cwd = await createEmptyRepo();
    repos.push(cwd);
    const report = await searchWiki("anything", cwd);
    expect(report.pagesSearched).toBe(0);
  });
});

describe("formatSearchReport", () => {
  test("prompts for a query when empty", () => {
    expect(
      formatSearchReport({ query: "", matches: [], pagesSearched: 3 }),
    ).toContain("Provide a search query");
  });

  test("mentions running --init when no pages exist", () => {
    expect(
      formatSearchReport({ query: "x", matches: [], pagesSearched: 0 }),
    ).toContain("inkling --init");
  });

  test("summarizes matches grouped by page", () => {
    const output = formatSearchReport({
      query: "auth",
      pagesSearched: 2,
      matches: [
        {
          relPath: "quickstart.md",
          title: "Sample Project",
          lineNumber: 8,
          line: "Configure authentication before running.",
        },
      ],
    });
    expect(output).toContain("Sample Project (quickstart.md)");
    expect(output).toContain("8:");
  });
});
