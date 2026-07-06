import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { INKLING_DIR } from "./constants.js";

export type WikiPage = {
  /** POSIX-style path relative to the wiki root, e.g. "architecture/overview.md". */
  relPath: string;
  /** Absolute path on disk. */
  absPath: string;
  /** Raw Markdown content. */
  content: string;
  /** Human-friendly title derived from the first heading or the filename. */
  title: string;
};

/**
 * Files inside the wiki directory that are metadata or scratch, not real pages.
 */
function isWikiSupportFile(relPath: string): boolean {
  const base = path.basename(relPath);

  return (
    base.startsWith("_") || base.startsWith(".") || base === ".last-update.json"
  );
}

export function resolveWikiRoot(cwd: string = process.cwd()): string {
  return path.join(cwd, INKLING_DIR);
}

async function collectMarkdownFiles(
  dir: string,
  root: string,
  out: string[],
): Promise<void> {
  let entries;

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return;
    }

    throw error;
  }

  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await collectMarkdownFiles(absPath, root, out);
      continue;
    }

    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) {
      continue;
    }

    const relPath = toPosix(path.relative(root, absPath));

    if (isWikiSupportFile(relPath)) {
      continue;
    }

    out.push(absPath);
  }
}

export async function readWikiPages(
  cwd: string = process.cwd(),
): Promise<WikiPage[]> {
  const root = resolveWikiRoot(cwd);
  const files: string[] = [];

  await collectMarkdownFiles(root, root, files);

  const pages = await Promise.all(
    files.map(async (absPath): Promise<WikiPage> => {
      const content = await readFile(absPath, "utf8");
      const relPath = toPosix(path.relative(root, absPath));

      return {
        relPath,
        absPath,
        content,
        title: deriveTitle(content, relPath),
      };
    }),
  );

  return pages.sort(
    (a, b) =>
      wikiPageOrder(a) - wikiPageOrder(b) || a.relPath.localeCompare(b.relPath),
  );
}

/** Sort quickstart first, then everything else alphabetically. */
function wikiPageOrder(page: WikiPage): number {
  return page.relPath === "quickstart.md" ? 0 : 1;
}

export function deriveTitle(content: string, relPath: string): string {
  for (const line of content.split(/\r?\n/u)) {
    const match = /^#\s+(.+?)\s*$/u.exec(line);

    if (match) {
      return match[1];
    }
  }

  const base = path.basename(relPath, ".md");

  return base
    .replace(/[-_]+/gu, " ")
    .replace(/\b\w/gu, (character) => character.toUpperCase());
}

export function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

export function isFileNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
