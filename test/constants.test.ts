import { describe, expect, test } from "vitest";
import {
  getDefaultModelId,
  getProviderApiKeyEnvKey,
  getProviderBaseUrlEnvKey,
  isValidModelId,
  isValidProvider,
  normalizeModelId,
  normalizeProvider,
  OLLAMA_DEFAULT_BASE_URL,
  providerRequiresApiKey,
  providerRequiresBaseUrl,
  resolveConfiguredProvider,
  resolveProviderBaseUrl,
  SELECTABLE_INKLING_PROVIDERS,
} from "../src/constants.ts";

describe("provider registry", () => {
  test("ollama is selectable", () => {
    expect(SELECTABLE_INKLING_PROVIDERS).toContain("ollama");
  });

  test("every provider exposes an api key env key", () => {
    for (const provider of SELECTABLE_INKLING_PROVIDERS) {
      expect(getProviderApiKeyEnvKey(provider)).toMatch(/_API_KEY$|_KEY$/u);
    }
  });
});

describe("providerRequiresApiKey", () => {
  test("ollama does not require an api key", () => {
    expect(providerRequiresApiKey("ollama")).toBe(false);
  });

  test.each(["openrouter", "openai", "anthropic", "baseten", "fireworks"])(
    "%s requires an api key",
    (provider) => {
      expect(
        providerRequiresApiKey(
          provider as Parameters<typeof providerRequiresApiKey>[0],
        ),
      ).toBe(true);
    },
  );
});

describe("providerRequiresBaseUrl", () => {
  test("openai-compatible requires a base url", () => {
    expect(providerRequiresBaseUrl("openai-compatible")).toBe(true);
  });

  test("ollama does not require a base url (has a default)", () => {
    expect(providerRequiresBaseUrl("ollama")).toBe(false);
  });
});

describe("resolveProviderBaseUrl", () => {
  test("ollama falls back to the default local endpoint", () => {
    expect(resolveProviderBaseUrl("ollama", {})).toBe(OLLAMA_DEFAULT_BASE_URL);
  });

  test("ollama honors an OLLAMA_BASE_URL override", () => {
    expect(
      resolveProviderBaseUrl("ollama", {
        OLLAMA_BASE_URL: "http://gpu.local:11434/v1",
      }),
    ).toBe("http://gpu.local:11434/v1");
  });

  test("anthropic base url override", () => {
    expect(
      resolveProviderBaseUrl("anthropic", {
        ANTHROPIC_BASE_URL: "https://gw.example.com",
      }),
    ).toBe("https://gw.example.com");
  });

  test("openai has no default base url", () => {
    expect(resolveProviderBaseUrl("openai", {})).toBeUndefined();
  });
});

describe("getDefaultModelId", () => {
  test("returns the first configured model for a provider", () => {
    expect(getDefaultModelId("ollama")).toBe("qwen2.5-coder:7b");
    expect(getDefaultModelId("anthropic")).toBe("claude-haiku-4-5");
  });
});

describe("getProviderBaseUrlEnvKey", () => {
  test("ollama exposes OLLAMA_BASE_URL", () => {
    expect(getProviderBaseUrlEnvKey("ollama")).toBe("OLLAMA_BASE_URL");
  });
});

describe("normalizeProvider / isValidProvider", () => {
  test("recognizes ollama case-insensitively", () => {
    expect(normalizeProvider("  Ollama ")).toBe("ollama");
    expect(isValidProvider("ollama")).toBe(true);
  });

  test("rejects unknown providers", () => {
    expect(normalizeProvider("banana")).toBeNull();
    expect(isValidProvider("banana")).toBe(false);
  });
});

describe("model id validation", () => {
  test.each([
    ["z-ai/glm-5.2", true],
    ["qwen2.5-coder:7b", true],
    ["openai/gpt-5.5", true],
    ["", false],
    ["bad id!", false],
    ["http://x", false],
  ])("isValidModelId(%s) === %s", (value, expected) => {
    expect(isValidModelId(value)).toBe(expected);
  });

  test("normalizeModelId trims", () => {
    expect(normalizeModelId("  gpt-5.5  ")).toBe("gpt-5.5");
  });
});

describe("resolveConfiguredProvider", () => {
  test("uses INKLING_PROVIDER when set", () => {
    expect(resolveConfiguredProvider({ INKLING_PROVIDER: "ollama" })).toBe(
      "ollama",
    );
  });

  test("infers openrouter from an OpenRouter key", () => {
    expect(resolveConfiguredProvider({ OPENROUTER_API_KEY: "sk-x" })).toBe(
      "openrouter",
    );
  });

  test("defaults to openrouter with no config", () => {
    expect(resolveConfiguredProvider({})).toBe("openrouter");
  });
});
