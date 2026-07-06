# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-07-06

Initial release of Inkling, a fork of
[langchain-ai/openwiki](https://github.com/langchain-ai/openwiki).

### Added

- **`inkling export [dir]`** — render the Markdown wiki into a self-contained
  static HTML site with sidebar navigation, client-side search, and live Mermaid
  diagram rendering. Suitable for GitHub Pages.
- **`inkling search <query>`** — search the generated wiki from the terminal.
- **`inkling validate`** — detect broken internal links and orphan pages.
- **Ollama provider** — run documentation generation against a fully local
  Ollama server with no API key required.
- **Mermaid diagrams** — the documentation agent now produces Mermaid diagrams
  for architecture and flows where they add clarity.
- **Test suite** — unit tests for command parsing, provider resolution, the wiki
  reader, search, validation, HTML export, and prompts, plus an end-to-end suite
  that drives the built CLI. Coverage reporting via `pnpm run test:coverage`.
- **Documentation** — `docs/` guides (commands, providers, static-site export,
  architecture, testing), plus `SECURITY.md` and `CODE_OF_CONDUCT.md`.

### Changed

- Rebranded from OpenWiki to Inkling: package name, CLI binary, docs directory
  (`inkling/`), config directory (`~/.inkling/`), and environment variables
  (`INKLING_*`).
- CI now runs format, lint, build, and test; added an npm publish workflow.
