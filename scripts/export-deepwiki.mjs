#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_START_URL = "https://deepwiki.com/KanStack/KanStack/1-overview";
const DEFAULT_OUTPUT_DIR = "docs/wiki";
const USER_AGENT = "KanStack DeepWiki exporter";

function parseArgs(argv) {
  const options = {
    outputDir: DEFAULT_OUTPUT_DIR,
    startUrl: DEFAULT_START_URL,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--out-dir") {
      options.outputDir = argv[index + 1] ?? options.outputDir;
      index += 1;
      continue;
    }

    if (value === "--start-url") {
      options.startUrl = argv[index + 1] ?? options.startUrl;
      index += 1;
      continue;
    }

    if (value === "--help" || value === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/export-deepwiki.mjs [options]

Options:
  --start-url <url>  DeepWiki page to start from
  --out-dir <dir>    Output directory for exported markdown
  -h, --help         Show this help message
`);
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

function decodeHtmlEntities(value) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const normalized = entity.toLowerCase();

    if (normalized === "amp") return "&";
    if (normalized === "lt") return "<";
    if (normalized === "gt") return ">";
    if (normalized === "quot") return '"';
    if (normalized === "apos") return "'";
    if (normalized === "nbsp") return " ";

    if (normalized.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
    }

    if (normalized.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
    }

    return match;
  });
}

function stripTags(value) {
  return decodeHtmlEntities(
    value
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function extractRepoRoot(startUrl) {
  const url = new URL(startUrl);
  const [, owner, repo] = url.pathname.split("/");

  if (!owner || !repo) {
    throw new Error(`Unsupported DeepWiki URL: ${startUrl}`);
  }

  return {
    origin: url.origin,
    repoPath: `/${owner}/${repo}`,
  };
}

function extractLastIndexed(html) {
  const indexedMatch = html.match(
    /Last indexed:\s*<!-- -->\s*([^<]+?)\s*<!-- -->/,
  );
  const commitMatch = html.match(/\/commits\/([0-9a-f]{6,40})"/i);

  return {
    commit: commitMatch?.[1] ?? null,
    date: indexedMatch?.[1]?.trim() ?? null,
  };
}

function extractNavigation(html, repoPath) {
  const itemPattern = new RegExp(
    `<li style="padding-left:([^";]+)"><a[^>]+href="(${escapeRegExp(repoPath)}\\/[^"#?]+)"[^>]*>([\\s\\S]*?)<\\/a><\\/li>`,
    "g",
  );
  const pages = [];
  const seen = new Set();

  for (const match of html.matchAll(itemPattern)) {
    const href = match[2];

    if (seen.has(href)) {
      continue;
    }

    seen.add(href);

    const slug = href.slice(repoPath.length + 1);
    const depth = Number.parseInt(match[1], 10) / 12 || 0;

    pages.push({
      depth,
      fileName: `${slug}.md`,
      href,
      routeKey: extractRouteKey(slug),
      slug,
      title: stripTags(match[3]),
    });
  }

  if (pages.length === 0) {
    throw new Error("Could not discover any DeepWiki navigation links");
  }

  return pages;
}

function extractRouteKey(slug) {
  const match = slug.match(/^\d+(?:\.\d+)?/);

  return match?.[0] ?? slug;
}

function extractMarkdownFromHtml(html, pageTitle) {
  const chunkPattern =
    /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)<\/script>/g;

  for (const match of html.matchAll(chunkPattern)) {
    const decoded = JSON.parse(`"${match[1]}"`);

    if (
      decoded.startsWith(`# ${pageTitle}\n`) ||
      decoded.startsWith(`# ${pageTitle}\r\n`)
    ) {
      return decoded;
    }
  }

  throw new Error(`Could not extract markdown payload for "${pageTitle}"`);
}

function rewriteLinks(markdown, pagesByRouteKey) {
  let output = markdown;

  output = output.replace(
    /\[([^\]]+)\]\(#(\d+(?:\.\d+)?)\)/g,
    (fullMatch, label, routeKey) => {
      const page = pagesByRouteKey.get(routeKey);
      if (!page) {
        return fullMatch;
      }

      return `[${label}](${page.fileName})`;
    },
  );

  output = output.replace(
    /\[([^\]]+)\]\((\/[^)]+)\)/g,
    (fullMatch, label, target) => {
      const slug = target.split("/").pop();
      const routeKey = extractRouteKey(slug ?? "");
      const page = pagesByRouteKey.get(routeKey);

      if (!page) {
        return fullMatch;
      }

      return `[${label}](${page.fileName})`;
    },
  );

  output = output.replace(/\[([^\]]+)\]\(\)/g, (fullMatch, label) => {
    const sourcePath = label.match(/^([^:]+):\d+(?:-\d+)?$/)?.[1];

    if (!sourcePath) {
      return label;
    }

    return `[${label}](../${sourcePath})`;
  });

  output = output.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (fullMatch, label, target) => {
      if (
        target.startsWith("#") ||
        target.startsWith("../") ||
        target.startsWith("http://") ||
        target.startsWith("https://") ||
        target.startsWith("mailto:") ||
        target.startsWith("tel:")
      ) {
        return fullMatch;
      }

      if (/^\d+(?:\.\d+)?-[^)]+\.md$/.test(target)) {
        return fullMatch;
      }

      return `[${label}](../${target})`;
    },
  );

  return output;
}

function buildIndex(pages, metadata, startUrl) {
  const lines = [
    "# DeepWiki Export",
    "",
    `- Source: [${startUrl}](${startUrl})`,
    `- Pages: ${pages.length}`,
  ];

  if (metadata.date) {
    lines.push(`- Last indexed: ${metadata.date}`);
  }

  if (metadata.commit) {
    lines.push(`- Indexed commit: \`${metadata.commit}\``);
  }

  lines.push("", "## Pages", "");

  for (const page of pages) {
    const indent = "  ".repeat(page.depth);
    lines.push(`${indent}- [${page.title}](${page.fileName})`);
  }

  lines.push("", "## Refresh", "", "```sh", "npm run wiki:export", "```", "");

  return `${lines.join("\n")}\n`;
}

function buildManifest(pages, metadata, startUrl) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      lastIndexed: metadata.date,
      indexedCommit: metadata.commit,
      pages: pages.map((page) => ({
        depth: page.depth,
        fileName: page.fileName,
        routeKey: page.routeKey,
        slug: page.slug,
        title: page.title,
        url: new URL(page.href, startUrl).toString(),
      })),
      startUrl,
    },
    null,
    2,
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { origin, repoPath } = extractRepoRoot(options.startUrl);
  const startHtml = await fetchHtml(options.startUrl);
  const metadata = extractLastIndexed(startHtml);
  const pages = extractNavigation(startHtml, repoPath);
  const pagesByRouteKey = new Map(pages.map((page) => [page.routeKey, page]));
  const outputDir = path.resolve(options.outputDir);

  await mkdir(outputDir, { recursive: true });

  for (const page of pages) {
    const url = new URL(page.href, origin).toString();
    const html = url === options.startUrl ? startHtml : await fetchHtml(url);
    const markdown = extractMarkdownFromHtml(html, page.title);
    const rewritten = rewriteLinks(markdown, pagesByRouteKey);

    await writeFile(
      path.join(outputDir, page.fileName),
      `${rewritten.trim()}\n`,
      "utf8",
    );
    console.log(`exported ${page.fileName}`);
  }

  await writeFile(
    path.join(outputDir, "README.md"),
    buildIndex(pages, metadata, options.startUrl),
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "_manifest.json"),
    buildManifest(pages, metadata, options.startUrl),
    "utf8",
  );

  console.log(`wrote ${pages.length} pages to ${outputDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
