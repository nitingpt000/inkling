# Static site export

`inkling export` renders the Markdown wiki under `inkling/` into a
self-contained static website.

```sh
inkling export              # writes ./inkling-site
inkling export ./public     # custom output directory
```

## What it produces

```
inkling-site/
├── index.html              # mirrors quickstart.md
├── quickstart.html
├── <section>/<page>.html   # one HTML file per Markdown page
└── assets/
    ├── styles.css
    ├── app.js              # search + mermaid + mobile nav
    └── search-index.js     # prebuilt client-side search index
```

Features:

- **Sidebar navigation** grouped by section directory, quickstart pinned first.
- **Client-side search** over page titles and text — no server required.
- **Mermaid diagrams** rendered in the browser; fenced ` ```mermaid ` blocks in
  your Markdown become live diagrams.
- **Relative links** — every `.md` link is rewritten to `.html`, and assets use
  the correct depth prefix, so the site works from any subpath or `file://`.

The output directory is fully regenerated on each run.

## Hosting on GitHub Pages

1. Export into a folder Pages can serve, e.g. `docs/`:

   ```sh
   inkling export docs
   ```

2. Commit the folder and push.
3. In your repository settings, enable **Pages** and set the source to the
   `docs/` folder on your default branch.

Alternatively, publish `inkling-site/` with any static host (Netlify, Vercel,
S3, GitHub Pages via an action, etc.).

## Automating exports

Combine with the scheduled documentation workflow so each docs update also
refreshes the published site. After `inkling --update`, run `inkling export`
and commit the output, or add an export step to your own Pages deploy workflow.

## Notes

- Mermaid is loaded from a CDN at view time. Without network access, diagrams
  fall back to their raw text — the rest of the site still works.
- The generated site is static HTML/CSS/JS with no build step and no runtime
  dependencies.
