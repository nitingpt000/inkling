import { afterEach, describe, expect, test } from "vitest";
import { formatValidateReport, validateWiki } from "../src/validate.ts";
import {
  createWikiRepo,
  removeRepo,
  type WikiFile,
} from "./helpers/fixtures.ts";

const repos: string[] = [];

afterEach(async () => {
  await Promise.all(repos.splice(0).map(removeRepo));
});

async function wikiRepo(files?: WikiFile[]): Promise<string> {
  const repo = await createWikiRepo(files);
  repos.push(repo);
  return repo;
}

describe("validateWiki", () => {
  test("flags broken links as errors", async () => {
    const cwd = await wikiRepo();
    const report = await validateWiki(cwd);

    const errors = report.issues.filter((issue) => issue.severity === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ relPath: "quickstart.md" });
    expect(errors[0].message).toContain("architecture/missing.md");
  });

  test("flags orphan pages as warnings", async () => {
    const cwd = await wikiRepo();
    const report = await validateWiki(cwd);

    const orphan = report.issues.find((issue) =>
      issue.message.includes("Orphan page"),
    );
    expect(orphan).toMatchObject({
      severity: "warning",
      relPath: "architecture/orphan.md",
    });
  });

  test("does not flag valid links, anchors, or external urls", async () => {
    const cwd = await wikiRepo([
      {
        relPath: "quickstart.md",
        content: [
          "# Home",
          "",
          "[Overview](overview.md#components)",
          "[External](https://example.com)",
          "[Anchor only](#home)",
        ].join("\n"),
      },
      {
        relPath: "overview.md",
        content: "# Overview\n\n## Components\n\nBody.\n",
      },
    ]);

    const report = await validateWiki(cwd);
    expect(report.issues.filter((i) => i.severity === "error")).toHaveLength(0);
    // No missing-anchor warning: #components exists.
    expect(
      report.issues.filter((i) => i.message.includes("anchor")),
    ).toHaveLength(0);
  });

  test("warns on a missing anchor", async () => {
    const cwd = await wikiRepo([
      {
        relPath: "quickstart.md",
        content: "# Home\n\n[Overview](overview.md#nope)\n",
      },
      { relPath: "overview.md", content: "# Overview\n\n## Components\n" },
    ]);

    const report = await validateWiki(cwd);
    const anchorWarning = report.issues.find((issue) =>
      issue.message.includes("#nope"),
    );
    expect(anchorWarning?.severity).toBe("warning");
  });

  test("warns when quickstart.md is missing", async () => {
    const cwd = await wikiRepo([{ relPath: "intro.md", content: "# Intro\n" }]);

    const report = await validateWiki(cwd);
    expect(
      report.issues.some((issue) =>
        issue.message.includes("Missing quickstart"),
      ),
    ).toBe(true);
  });

  test("clean wiki reports no issues", async () => {
    const cwd = await wikiRepo([
      {
        relPath: "quickstart.md",
        content: "# Home\n\n[Guide](guide.md)\n",
      },
      { relPath: "guide.md", content: "# Guide\n\nBody.\n" },
    ]);

    const report = await validateWiki(cwd);
    expect(report.issues).toHaveLength(0);
    expect(report.pages).toBe(2);
  });
});

describe("formatValidateReport", () => {
  test("summarizes error and warning counts", () => {
    const output = formatValidateReport({
      pages: 3,
      issues: [
        { severity: "error", relPath: "a.md", message: "boom" },
        { severity: "warning", relPath: "b.md", message: "meh" },
      ],
    });
    expect(output).toContain("1 error(s), 1 warning(s)");
    expect(output).toContain("✗ a.md: boom");
    expect(output).toContain("! b.md: meh");
  });

  test("reports a clean bill of health", () => {
    expect(formatValidateReport({ pages: 2, issues: [] })).toContain(
      "no issues found",
    );
  });
});
