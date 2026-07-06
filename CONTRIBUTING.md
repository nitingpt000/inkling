# Contributing to Inkling

Thanks for your interest in improving Inkling! Contributions of all kinds are
welcome — bug reports, features, docs, and provider integrations.

## Getting started

Prerequisites: Node.js ≥ 20 and [pnpm](https://pnpm.io).

```sh
git clone https://github.com/nitingpt000/inkling.git
cd inkling
pnpm install
pnpm run build
```

Run the CLI from source while developing:

```sh
pnpm run dev -- --help
```

See [DEVELOPMENT.md](./DEVELOPMENT.md) for running Inkling against another local
repository.

## Before you open a pull request

Run the same checks CI runs:

```sh
pnpm run format:check
pnpm run lint:check
pnpm run build
pnpm test
```

`pnpm run format` and `pnpm run lint` will auto-fix most formatting and lint
issues.

## Tests

Tests use [Vitest](https://vitest.dev) and live in `test/`:

```sh
pnpm test              # unit + e2e
pnpm run test:watch    # watch mode
pnpm run test:e2e      # end-to-end suite only
pnpm run test:coverage # coverage report
```

See [docs/testing.md](./docs/testing.md) for the full layout and conventions.
Reuse `createWikiRepo` from `test/helpers/fixtures.ts` for anything that needs a
wiki on disk.

## Guidelines

- Keep changes focused; one logical change per PR.
- Add or update tests in `test/` for behavior changes.
- Local subcommands (`export`, `search`, `validate`) must stay offline — no LLM
  calls, credentials, or network access.
- Match the existing code style; imports of local modules use the `.js`
  extension even in `.ts` files.
- Update `README.md` and `CHANGELOG.md` when you add user-facing features.

## Adding a provider or model

Providers and their default models are defined in
[`src/constants.ts`](./src/constants.ts) (`PROVIDER_CONFIGS`). Model
construction lives in [`src/agent/index.ts`](./src/agent/index.ts). Most
OpenAI-compatible providers only need a `PROVIDER_CONFIGS` entry.

## Reporting bugs

Open an issue using the bug report template and include your OS, Node version,
the command you ran, and the output. Do not paste API keys or `.env` contents.

## Code of conduct

Be respectful and constructive. By contributing you agree that your
contributions are licensed under the project's [MIT License](./LICENSE).
