import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // E2E tests spawn the built CLI; give them room beyond the unit default.
    testTimeout: 30_000,
    hookTimeout: 120_000,
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      // The interactive Ink UI is exercised by E2E, not unit-covered.
      exclude: ["src/cli.tsx", "src/credentials.tsx"],
    },
  },
});
