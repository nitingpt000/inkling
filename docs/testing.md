# Testing

Inkling uses [Vitest](https://vitest.dev). Tests live in `test/` and run against
TypeScript sources directly (no build needed for unit tests).

## Running

```sh
pnpm test            # run everything once
pnpm run test:watch  # watch mode
pnpm run test:e2e    # only the end-to-end suite
pnpm run test:coverage
```

Configuration is in [`vitest.config.ts`](../vitest.config.ts).

## Layout

| File                       | Kind | Covers                                          |
| -------------------------- | ---- | ----------------------------------------------- |
| `test/commands.test.ts`    | unit | Argument parsing and help text.                 |
| `test/constants.test.ts`   | unit | Provider registry, model/base-URL resolution.   |
| `test/wiki.test.ts`        | unit | Wiki reader, title derivation, file filtering.  |
| `test/search.test.ts`      | unit | Search matching and report formatting.          |
| `test/validate.test.ts`    | unit | Broken links, orphans, anchors, formatting.     |
| `test/site.test.ts`        | unit | HTML export: links, Mermaid, nav, search index. |
| `test/prompt.test.ts`      | unit | System/user prompts, Mermaid guidance.          |
| `test/update-noop.test.ts` | unit | Update no-op detection via git.                 |
| `test/e2e.test.ts`         | e2e  | The built CLI as a subprocess.                  |

Shared fixtures live in `test/helpers/fixtures.ts` (`createWikiRepo`,
`createEmptyRepo`, `SAMPLE_WIKI`).

## Unit vs. E2E

- **Unit tests** import functions directly and run against throwaway wiki
  directories created in the system temp folder.
- **E2E tests** build the CLI once (if `dist/` is missing) and spawn
  `node dist/cli.js <args>` in a temp repo, asserting on stdout, stderr, and
  exit codes — the exact behavior an installed user sees.

## What is not unit-tested

The interactive Ink UI (`src/cli.tsx`, `src/credentials.tsx`) and the live agent
loop (`src/agent/index.ts`) require a terminal and a language model. The UI is
excluded from coverage; the CLI dispatch and local commands are exercised
end-to-end instead.

## Writing tests

- Reuse `createWikiRepo(files?)` for anything that needs a wiki on disk; pass
  custom `WikiFile[]` for edge cases.
- Clean up temp directories in `afterEach` with `removeRepo`.
- Local-command features must have unit coverage plus, where they cross the CLI
  boundary, an E2E assertion on exit code and output.
- Run `pnpm run lint:check` and `pnpm run format:check` before committing.
