# Commands

Inkling has two kinds of commands:

- **Agent commands** run the documentation agent and need a configured provider
  and model: the interactive chat, `--init`, and `--update`.
- **Local commands** operate on the generated `inkling/` directory and need no
  model, credentials, or network access: `export`, `search`, and `validate`.

## `inkling`

Open the interactive chat. On the first run, Inkling walks you through
configuring a provider, API key, model, and an optional LangSmith key.

```sh
inkling                       # open chat
inkling "document the API"    # send an initial request, then stay open
inkling -p "What can you do?" # one-shot: run once, print, exit
```

## `inkling --init [message]`

Generate the initial wiki under `inkling/`. Inspects source, config,
existing docs, and git history, then writes `quickstart.md` plus section pages.
An optional message steers the run.

```sh
inkling --init
inkling --init "focus on the data model first"
```

## `inkling --update [message]`

Refresh existing documentation from repository changes since the last run. Edits
are surgical — only pages affected by real source changes are touched. If
nothing relevant changed, the run is a no-op.

```sh
inkling --update
inkling --update -p            # non-interactive, prints the summary
```

## `inkling export [dir]`

Render the wiki into a self-contained static HTML site (sidebar navigation,
client-side search, live Mermaid diagrams). Defaults to `inkling-site/`.

```sh
inkling export              # writes ./inkling-site
inkling export ./public     # custom output directory
```

Exit code `1` if there is no wiki to export. See
[static-site.md](./static-site.md) for hosting.

## `inkling search <query>`

Case-insensitive search across all wiki pages, printing matching lines with
their page and line number.

```sh
inkling search authentication
inkling search "rate limit"
```

Exit code `1` if no query is provided.

## `inkling validate`

Check the wiki for problems:

- **Errors** — broken internal Markdown links (a link to a page that does not
  exist). Exit code `1` when any error is found.
- **Warnings** — orphan pages (not reachable from `quickstart.md`), links to
  missing heading anchors, and a missing `quickstart.md` entrypoint.

```sh
inkling validate
```

Useful in CI to keep documentation link-clean.

## Flags

| Flag             | Applies to     | Description                             |
| ---------------- | -------------- | --------------------------------------- |
| `-p`, `--print`  | agent commands | Run once, print the final output, exit. |
| `--modelId <id>` | agent commands | Override the model for this run.        |
| `--init`         | —              | Generate initial documentation.         |
| `--update`       | —              | Update existing documentation.          |
| `-h`, `--help`   | all            | Print usage and exit.                   |

## Exit codes

| Code | Meaning                                                                |
| ---- | ---------------------------------------------------------------------- |
| `0`  | Success.                                                               |
| `1`  | Usage error, missing query, export with no wiki, or validation errors. |
