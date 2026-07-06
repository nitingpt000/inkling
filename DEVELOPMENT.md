# Development

## Run Against Another Local Repo

Prerequisites:

- Node.js 20 or newer
- pnpm

Set up pnpm's global bin directory once if `pnpm link --global` has not worked
on this machine yet:

```sh
pnpm setup
```

Restart your shell, or source the profile file that `pnpm setup` changed. Then
set up and link this package:

```sh
cd /path/to/inkling
pnpm install
pnpm run build
pnpm link --global
```

Run a dry test from the repo you want Inkling to inspect:

```sh
cd /path/to/target/repo
INKLING_DEV=1 inkling --dry-run
```

Run the real CLI from the target repo:

```sh
cd /path/to/target/repo
inkling
inkling -p "Summarize what you can do"
inkling --modelId openai/gpt-5.5
inkling "Please focus on API documentation"
```

The target repo is still the current working directory. The global link only
avoids typing the path to `dist/cli.js`.

If you do not want to configure pnpm globals, use a shell alias instead:

```sh
alias inkling='node /path/to/inkling/dist/cli.js'
```

That alias can go in `~/.zshrc` if you want it to persist.

After changing Inkling source code, rebuild from this package directory:

```sh
pnpm run build
```

The existing global link will keep using the rebuilt `dist/cli.js`.

## Local wiki tooling

The `export`, `search`, and `validate` subcommands run entirely locally against
the `inkling/` directory — no provider credentials or network access required:

```sh
inkling validate          # broken links and orphan pages
inkling search <query>    # search the generated wiki
inkling export ./site     # render a static HTML site
```

Their implementations live in `src/site.ts`, `src/search.ts`, and
`src/validate.ts`, with shared reading in `src/wiki.ts`. Tests are in
`test/wiki-tools.test.ts`.

Real runs can write:

- `inkling/`
- `~/.inkling/.env` for provider/model settings and optional LangSmith credentials

Scheduled update workflow example:

- `examples/inkling-update.yml`
