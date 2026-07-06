import { describe, expect, test } from "vitest";
import {
  createModeInstructions,
  createSystemPrompt,
  createUserPrompt,
} from "../src/agent/prompt.ts";
import type { RunContext } from "../src/agent/types.ts";

const context: RunContext = {
  lastUpdate: null,
  gitSummary: "abc123 initial commit",
};

describe("createSystemPrompt", () => {
  test("targets the inkling/ output directory", () => {
    expect(createSystemPrompt("init")).toContain("inkling/");
  });

  test("includes Mermaid diagram guidance", () => {
    const prompt = createSystemPrompt("init");
    expect(prompt).toContain("Mermaid");
    expect(prompt).toContain("```mermaid");
  });

  test("embeds mode-specific instructions", () => {
    expect(createSystemPrompt("init")).toContain(
      createModeInstructions("init"),
    );
    expect(createSystemPrompt("update")).toContain(
      createModeInstructions("update"),
    );
  });
});

describe("createModeInstructions", () => {
  test("chat mode avoids editing docs unprompted", () => {
    expect(createModeInstructions("chat")).toContain("interactive chat turn");
  });

  test("init and update modes differ", () => {
    expect(createModeInstructions("init")).not.toBe(
      createModeInstructions("update"),
    );
  });
});

describe("createUserPrompt", () => {
  test("chat returns the user message verbatim", () => {
    expect(createUserPrompt("chat", context, "hello there")).toBe(
      "hello there",
    );
  });

  test("chat with no message uses a default opener", () => {
    expect(createUserPrompt("chat", context, null)).toContain("chat");
  });

  test("init includes the git summary", () => {
    const prompt = createUserPrompt("init", context, null);
    expect(prompt).toContain("abc123 initial commit");
    expect(prompt).toContain("Initialize Inkling documentation");
  });

  test("appends an additional user instruction when provided", () => {
    const prompt = createUserPrompt("update", context, "focus on the API");
    expect(prompt).toContain("Additional user instruction");
    expect(prompt).toContain("focus on the API");
  });
});
