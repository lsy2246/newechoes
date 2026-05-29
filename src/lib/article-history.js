import { execFileSync } from "node:child_process";
import path from "node:path";

const COMMIT_SEPARATOR = "\x1e";
const FIELD_SEPARATOR = "\x1f";
const historyCache = new Map();

export function resolveArticleIdentity(article) {
  const title = article?.data?.title;
  if (typeof title === "string" && title.trim()) {
    return title.trim();
  }
  return article?.id ?? "";
}

export function assertUniqueArticleIdentities(articles) {
  const articleIdsByTitle = new Map();

  for (const article of articles) {
    const identity = resolveArticleIdentity(article);
    if (!identity) {
      continue;
    }

    const articleIds = articleIdsByTitle.get(identity) ?? [];
    articleIds.push(article.id);
    articleIdsByTitle.set(identity, articleIds);
  }

  const duplicate = [...articleIdsByTitle.entries()].find(([, articleIds]) => articleIds.length > 1);
  if (duplicate) {
    const [identity, articleIds] = duplicate;
    throw new Error(`Duplicate article title "${identity}": ${articleIds.join(", ")}`);
  }
}

export function formatArticleHistoryPath(gitPath) {
  const normalized = normalizeGitPath(gitPath);
  return normalized.replace(/^src\/content\//, "");
}

function decodeGitQuotedPath(gitPath) {
  const value = String(gitPath ?? "").trim();
  if (!value) {
    return "";
  }

  const unquoted = value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1)
    : value;

  if (!unquoted.includes("\\")) {
    return unquoted;
  }

  const hasOctalEscapes = /\\[0-7]{1,3}/.test(unquoted);
  if (!hasOctalEscapes) {
    return unquoted
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }

  const bytes = [];

  for (let index = 0; index < unquoted.length; ) {
    const char = unquoted[index];

    if (char !== "\\") {
      const codePoint = unquoted.codePointAt(index) ?? 0;
      const encoded = Buffer.from(String.fromCodePoint(codePoint), "utf8");
      bytes.push(...encoded);
      index += codePoint > 0xffff ? 2 : 1;
      continue;
    }

    const escapeChar = unquoted[index + 1];
    if (!escapeChar) {
      index += 1;
      continue;
    }

    if (/[0-7]/.test(escapeChar)) {
      const match = unquoted.slice(index + 1).match(/^[0-7]{1,3}/);
      const octal = match?.[0] ?? "";
      if (octal) {
        bytes.push(Number.parseInt(octal, 8));
        index += 1 + octal.length;
        continue;
      }
    }

    if (escapeChar === "n") {
      bytes.push(0x0a);
      index += 2;
      continue;
    }

    if (escapeChar === "t") {
      bytes.push(0x09);
      index += 2;
      continue;
    }

    if (escapeChar === "r") {
      bytes.push(0x0d);
      index += 2;
      continue;
    }

    if (escapeChar === "\\") {
      bytes.push(0x5c);
      index += 2;
      continue;
    }

    if (escapeChar === '"') {
      bytes.push(0x22);
      index += 2;
      continue;
    }

    bytes.push(escapeChar.codePointAt(0) ?? 0x5c);
    index += 2;
  }

  return Buffer.from(bytes).toString("utf8");
}

function normalizeGitPath(gitPath) {
  return decodeGitQuotedPath(gitPath).replace(/\\/g, "/");
}

function normalizeRepositoryUrl(remoteUrl) {
  const value = String(remoteUrl ?? "").trim();
  if (!value) {
    return "";
  }

  const sshMatch = value.match(/^git@([^:]+):(.+)$/);
  const url = sshMatch ? `https://${sshMatch[1]}/${sshMatch[2]}` : value;

  return url
    .replace(/^http:\/\//, "https://")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
}

function normalizeRepositoryProvider(provider, repositoryUrl) {
  const explicitProvider = String(provider ?? "").trim().toLowerCase();
  if (explicitProvider && explicitProvider !== "auto") {
    return explicitProvider;
  }

  try {
    const host = new URL(normalizeRepositoryUrl(repositoryUrl)).hostname.toLowerCase();
    if (host.includes("github.com")) return "github";
    if (host.includes("gitee.com")) return "gitee";
    if (host.includes("gitlab.")) return "gitlab";
    if (host.includes("bitbucket.org")) return "bitbucket";
    if (host.includes("forgejo")) return "forgejo";
    if (host.includes("gitea")) return "gitea";
  } catch {
    // Unknown or local repository URLs intentionally do not get external links.
  }

  return "";
}

function encodeRepositoryPath(gitPath) {
  return normalizeGitPath(gitPath)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function buildHistoryLinks({ repositoryUrl, repositoryProvider, hash, currentPath }) {
  const baseUrl = normalizeRepositoryUrl(repositoryUrl);
  if (!baseUrl || !hash || !currentPath) {
    return {};
  }

  const provider = normalizeRepositoryProvider(repositoryProvider, baseUrl);
  const encodedPath = encodeRepositoryPath(currentPath);

  switch (provider) {
    case "github":
    case "gitee":
      return {
        commitUrl: `${baseUrl}/commit/${hash}`,
        snapshotUrl: `${baseUrl}/blob/${hash}/${encodedPath}`,
      };
    case "gitlab":
      return {
        commitUrl: `${baseUrl}/-/commit/${hash}`,
        snapshotUrl: `${baseUrl}/-/blob/${hash}/${encodedPath}`,
      };
    case "gitea":
    case "forgejo":
      return {
        commitUrl: `${baseUrl}/commit/${hash}`,
        snapshotUrl: `${baseUrl}/src/commit/${hash}/${encodedPath}`,
      };
    case "bitbucket":
      return {
        commitUrl: `${baseUrl}/commits/${hash}`,
        snapshotUrl: `${baseUrl}/src/${hash}/${encodedPath}`,
      };
    default:
      return {};
  }
}

function parseNameStatusLine(line) {
  const parts = line.split("\t").map(normalizeGitPath);
  const status = parts[0] ?? "";
  const code = status.slice(0, 1);

  if (code === "R" || code === "C") {
    return {
      status,
      kind: code === "R" ? "moved" : "copied",
      previousPath: parts[1] ?? "",
      currentPath: parts[2] ?? "",
    };
  }

  return {
    status,
    kind: status === "A" ? "created" : status === "D" ? "deleted" : "updated",
    currentPath: parts[1] ?? "",
  };
}

export function parseGitHistoryLog({
  articleIdentity,
  sourcePath,
  publishedAt,
  logOutput,
  repositoryUrl = "",
  repositoryProvider = "auto",
}) {
  const revisions = [];
  const blocks = String(logOutput ?? "")
    .split(COMMIT_SEPARATOR)
    .map((block) => block.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const [header, ...statusLines] = block.split(/\r?\n/).filter(Boolean);
    const [hash, shortHash, committedAt, author, ...subjectParts] = header.split(FIELD_SEPARATOR);
    if (!hash || !committedAt) {
      continue;
    }

    const parsedStatuses = statusLines.map(parseNameStatusLine);
    const moveStatus = parsedStatuses.find((status) => status.kind === "moved");

    const currentPath = moveStatus?.currentPath || parsedStatuses[0]?.currentPath || sourcePath;

    revisions.push({
      hash,
      shortHash,
      date: new Date(committedAt),
      author,
      subject: subjectParts.join(FIELD_SEPARATOR),
      kind: moveStatus ? "moved" : "updated",
      status: parsedStatuses[0]?.status ?? "M",
      previousPath: moveStatus?.previousPath,
      currentPath,
      ...buildHistoryLinks({
        repositoryUrl,
        repositoryProvider,
        hash,
        currentPath,
      }),
    });
  }

  const publishedRevision = {
    hash: "frontmatter",
    shortHash: "date",
    date: publishedAt,
    author: "",
    subject: "published",
    kind: "published",
    status: "A",
    previousPath: undefined,
    currentPath: sourcePath,
  };

  const events = [...revisions, publishedRevision].sort(
    (left, right) => right.date.getTime() - left.date.getTime(),
  );

  return {
    articleIdentity,
    sourcePath,
    updatedAt: revisions[0]?.date ?? null,
    revisions,
    events,
  };
}

function getArticleSourcePath(article) {
  if (article?.filePath) {
    return path.relative(process.cwd(), article.filePath).replace(/\\/g, "/");
  }

  return `src/content/${article.id}.${article.id.endsWith(".mdx") ? "mdx" : "md"}`;
}

function readGitLog(sourcePath) {
  return execFileSync(
    "git",
    [
      "-c",
      "core.quotePath=false",
      "log",
      "--follow",
      "--date=iso-strict",
      `--format=${COMMIT_SEPARATOR}%H${FIELD_SEPARATOR}%h${FIELD_SEPARATOR}%cI${FIELD_SEPARATOR}%aN${FIELD_SEPARATOR}%s`,
      "--name-status",
      "--",
      sourcePath,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
  );
}

export function getArticleHistory(article, repositoryConfig = {}) {
  const articleIdentity = resolveArticleIdentity(article);
  const sourcePath = getArticleSourcePath(article);
  const publishedAt = article.data.date;
  const repositoryUrl = repositoryConfig?.url ?? "";
  const repositoryProvider = repositoryConfig?.provider ?? "auto";
  const cacheKey = [
    articleIdentity,
    sourcePath,
    publishedAt.toISOString(),
    repositoryUrl,
    repositoryProvider,
  ].join("\n");

  if (historyCache.has(cacheKey)) {
    return historyCache.get(cacheKey);
  }

  try {
    const history = parseGitHistoryLog({
      articleIdentity,
      sourcePath,
      publishedAt,
      logOutput: readGitLog(sourcePath),
      repositoryUrl,
      repositoryProvider,
    });
    historyCache.set(cacheKey, history);
    return history;
  } catch {
    const history = parseGitHistoryLog({
      articleIdentity,
      sourcePath,
      publishedAt,
      logOutput: "",
      repositoryUrl,
      repositoryProvider,
    });
    historyCache.set(cacheKey, history);
    return history;
  }
}

export function getArticleHistoryMap(articles, repositoryConfig = {}) {
  return new Map(
    articles.map((article) => [
      resolveArticleIdentity(article),
      getArticleHistory(article, repositoryConfig),
    ]),
  );
}
