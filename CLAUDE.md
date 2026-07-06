# Repository guide for agents

Inkling is a TypeScript CLI (Node.js ≥ 20, ESM) that runs a
[DeepAgents](https://github.com/langchain-ai/deepagents) documentation agent and
provides local tooling around the generated wiki. The terminal UI is built with
[Ink](https://github.com/vadimdemedes/ink) (React).

## Project layout

- `src/cli.tsx` — entry point, Ink UI, and command dispatch.
- `src/commands.ts` — argument parsing and help text.
- `src/constants.ts` — providers, models, and env-key definitions.
- `src/credentials.tsx` — first-run interactive setup flow.
- `src/env.ts` — reads/writes `~/.inkling/.env`.
- `src/agent/` — the documentation agent, prompts, and run utilities.
- `src/wiki.ts` — shared reader for the `inkling/` Markdown wiki.
- `src/site.ts` — static HTML site exporter (`inkling export`).
- `src/search.ts` — wiki search (`inkling search`).
- `src/validate.ts` — link/orphan validation (`inkling validate`).
- `test/` — Vitest tests.

## Commands

```sh
pnpm install
pnpm run build        # tsc -> dist/
pnpm run dev          # run from source with tsx
pnpm test             # vitest
pnpm run lint:check   # eslint
pnpm run format:check # prettier
```

## Conventions

- ESM only; import local modules with the `.js` extension (e.g. `./wiki.js`)
  even from `.ts` sources — that is what `tsc` emits and what Node resolves.
- Keep the brand name spelled `Inkling` / `inkling`; env vars are prefixed
  `INKLING_`.
- Local subcommands (`export`, `search`, `validate`) must not require the LLM,
  provider credentials, or network access — they operate on `inkling/` on disk.
- Run `pnpm run lint:check` and `pnpm run format:check` before committing; CI
  enforces both plus `build` and `test`.
