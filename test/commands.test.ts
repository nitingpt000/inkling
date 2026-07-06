import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { getHelpText, parseCommand } from "../src/commands.ts";

const originalEnv = { ...process.env };

beforeEach(() => {
  delete process.env.NODE_ENV;
  delete process.env.INKLING_DEV;
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("parseCommand — help", () => {
  test.each([["--help"], ["-h"]])("%s returns help", (flag) => {
    expect(parseCommand([flag])).toEqual({ kind: "help", exitCode: 0 });
  });
});

describe("parseCommand — local subcommands", () => {
  test("export with no args", () => {
    expect(parseCommand(["export"])).toEqual({
      kind: "local",
      exitCode: 0,
      subcommand: "export",
      args: [],
    });
  });

  test("export with a target directory", () => {
    const result = parseCommand(["export", "./site"]);
    expect(result).toMatchObject({ kind: "local", subcommand: "export" });
    if (result.kind === "local") {
      expect(result.args).toEqual(["./site"]);
    }
  });

  test("search collects the query args", () => {
    const result = parseCommand(["search", "auth", "flow"]);
    expect(result).toMatchObject({
      kind: "local",
      subcommand: "search",
      args: ["auth", "flow"],
    });
  });

  test("validate", () => {
    expect(parseCommand(["validate"])).toMatchObject({
      kind: "local",
      subcommand: "validate",
    });
  });

  test("subcommand --help falls back to help", () => {
    expect(parseCommand(["export", "--help"])).toEqual({
      kind: "help",
      exitCode: 0,
    });
  });

  test("subcommand keyword only counts as first token", () => {
    // As a chat message, not a subcommand.
    const result = parseCommand(["please", "export", "docs"]);
    expect(result).toMatchObject({ kind: "run", command: "chat" });
    if (result.kind === "run") {
      expect(result.userMessage).toBe("please export docs");
    }
  });
});

describe("parseCommand — run modes", () => {
  test("bare invocation opens chat without starting", () => {
    expect(parseCommand([])).toMatchObject({
      kind: "run",
      command: "chat",
      shouldStart: false,
      userMessage: null,
    });
  });

  test("--init starts an init run", () => {
    expect(parseCommand(["--init"])).toMatchObject({
      kind: "run",
      command: "init",
      shouldStart: true,
    });
  });

  test("--update with a message", () => {
    const result = parseCommand(["--update", "focus on the API"]);
    expect(result).toMatchObject({ kind: "run", command: "update" });
    if (result.kind === "run") {
      expect(result.userMessage).toBe("focus on the API");
    }
  });

  test("--init and --update together is an error", () => {
    expect(parseCommand(["--init", "--update"])).toMatchObject({
      kind: "error",
      exitCode: 1,
    });
  });

  test("--modelId with a space-separated value", () => {
    const result = parseCommand(["--modelId", "openai/gpt-5.5", "hello"]);
    expect(result).toMatchObject({ kind: "run", modelId: "openai/gpt-5.5" });
  });

  test("--model-id=value form", () => {
    const result = parseCommand(["--model-id=z-ai/glm-5.2"]);
    expect(result).toMatchObject({ kind: "run", modelId: "z-ai/glm-5.2" });
  });

  test("--modelId without a value is an error", () => {
    expect(parseCommand(["--modelId"])).toMatchObject({ kind: "error" });
  });

  test("invalid model id is rejected", () => {
    expect(parseCommand(["--modelId", "bad id!"])).toMatchObject({
      kind: "error",
    });
  });

  test("unknown option is an error", () => {
    expect(parseCommand(["--nope"])).toMatchObject({
      kind: "error",
      exitCode: 1,
    });
  });

  test("--print without a message is an error", () => {
    expect(parseCommand(["--print"])).toMatchObject({ kind: "error" });
  });

  test("--print with a message is allowed", () => {
    expect(parseCommand(["-p", "hi"])).toMatchObject({
      kind: "run",
      print: true,
      shouldStart: true,
    });
  });

  test("--dry-run is rejected outside development mode", () => {
    expect(parseCommand(["--dry-run"])).toMatchObject({ kind: "error" });
  });

  test("--dry-run is allowed in development mode", () => {
    process.env.INKLING_DEV = "1";
    expect(parseCommand(["--dry-run"])).toMatchObject({
      kind: "run",
      dryRun: true,
    });
  });
});

describe("getHelpText", () => {
  test("documents the local subcommands", () => {
    const help = getHelpText();
    expect(help).toContain("inkling export");
    expect(help).toContain("inkling search");
    expect(help).toContain("inkling validate");
    expect(help).toContain("Inkling");
  });
});
