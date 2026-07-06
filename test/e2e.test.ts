import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { promisify } from "node:util";
import { beforeAll, describe, expect, test } from "vitest";
import {
  createEmptyRepo,
  createWikiRepo,
  removeRepo,
} from "./helpers/fixtures.ts";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

const projectRoot = process.cwd();
const cliPath = path.join(projectRoot, "dist", "cli.js");

type CliResult = {
  stdout: string;
  stderr: string;
  code: number;
};

/** Runs the built CLI as a subprocess in `cwd`, capturing output and exit code. */
async function runCli(args: string[], cwd: string): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [cliPath, ...args],
      {
        cwd,
        env: { ...process.env, NO_COLOR: "1" },
      },
    );
    return { stdout, stderr, code: 0 };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
      code: typeof err.code === "number" ? err.code : 1,
    };
  }
}

// Build the CLI once before the E2E suite so we exercise the shipped artifact.
beforeAll(async () => {
  try {
    await access(cliPath);
  } catch {
    const tsc = require.resolve("typescript/bin/tsc");
    await execFileAsync(process.execPath, [tsc, "-p", "tsconfig.json"], {
      cwd: projectRoot,
    });
  }
}, 120_000);

describe("inkling validate (e2e)", () => {
  test("exits non-zero and reports the broken link", async () => {
    const repo = await createWikiRepo();
    try {
      const result = await runCli(["validate"], repo);
      expect(result.code).toBe(1);
      expect(result.stdout).toContain("architecture/missing.md");
      expect(result.stdout).toContain("Orphan page");
    } finally {
      await removeRepo(repo);
    }
  });
});

describe("inkling search (e2e)", () => {
  test("finds a term and exits zero", async () => {
    const repo = await createWikiRepo();
    try {
      const result = await runCli(["search", "authentication"], repo);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain("quickstart.md");
    } finally {
      await removeRepo(repo);
    }
  });

  test("exits non-zero with no query", async () => {
    const repo = await createWikiRepo();
    try {
      const result = await runCli(["search"], repo);
      expect(result.code).toBe(1);
      expect(result.stdout).toContain("Provide a search query");
    } finally {
      await removeRepo(repo);
    }
  });
});

describe("inkling export (e2e)", () => {
  test("writes a static site to a custom directory", async () => {
    const repo = await createWikiRepo();
    try {
      const result = await runCli(["export", "public"], repo);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Exported 3 page(s)");
      await expect(
        access(path.join(repo, "public", "index.html")),
      ).resolves.toBeUndefined();
    } finally {
      await removeRepo(repo);
    }
  });

  test("errors when there is no wiki to export", async () => {
    const repo = await createEmptyRepo();
    try {
      const result = await runCli(["export"], repo);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("No wiki pages found");
    } finally {
      await removeRepo(repo);
    }
  });
});

describe("inkling cli basics (e2e)", () => {
  test("--help prints usage including the new subcommands", async () => {
    const repo = await createEmptyRepo();
    try {
      const result = await runCli(["--help"], repo);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain("inkling export");
      expect(result.stdout).toContain("inkling search");
      expect(result.stdout).toContain("inkling validate");
    } finally {
      await removeRepo(repo);
    }
  });

  test("rejects an unknown option", async () => {
    const repo = await createEmptyRepo();
    try {
      const result = await runCli(["--nope"], repo);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Unknown option");
    } finally {
      await removeRepo(repo);
    }
  });
});
