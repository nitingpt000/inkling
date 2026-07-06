import { readWikiPages, type WikiPage } from "./wiki.js";

export type SearchMatch = {
  relPath: string;
  title: string;
  lineNumber: number;
  line: string;
};

export type SearchReport = {
  query: string;
  matches: SearchMatch[];
  pagesSearched: number;
};

/**
 * Case-insensitive substring search across all wiki pages. Returns one match
 * per matching line, in page order.
 */
export async function searchWiki(
  query: string,
  cwd: string = process.cwd(),
): Promise<SearchReport> {
  const normalizedQuery = query.trim().toLowerCase();
  const pages = await readWikiPages(cwd);
  const matches: SearchMatch[] = [];

  if (normalizedQuery.length > 0) {
    for (const page of pages) {
      collectPageMatches(page, normalizedQuery, matches);
    }
  }

  return {
    query,
    matches,
    pagesSearched: pages.length,
  };
}

function collectPageMatches(
  page: WikiPage,
  normalizedQuery: string,
  matches: SearchMatch[],
): void {
  const lines = page.content.split(/\r?\n/u);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.toLowerCase().includes(normalizedQuery)) {
      matches.push({
        relPath: page.relPath,
        title: page.title,
        lineNumber: index + 1,
        line: line.trim(),
      });
    }
  }
}

export function formatSearchReport(report: SearchReport): string {
  if (report.query.trim().length === 0) {
    return "Provide a search query, e.g. inkling search authentication";
  }

  if (report.pagesSearched === 0) {
    return "No wiki pages found. Run inkling --init to generate documentation first.";
  }

  if (report.matches.length === 0) {
    return `No matches for "${report.query}" across ${report.pagesSearched} page(s).`;
  }

  const lines: string[] = [
    `${report.matches.length} match(es) for "${report.query}" across ${report.pagesSearched} page(s):`,
    "",
  ];

  let currentPath: string | null = null;

  for (const match of report.matches) {
    if (match.relPath !== currentPath) {
      currentPath = match.relPath;
      lines.push(`${match.title} (${match.relPath})`);
    }

    lines.push(`  ${match.lineNumber}: ${truncate(match.line, 120)}`);
  }

  return lines.join("\n");
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
