import { parseGitHistoryLog } from "./parser.js";

function normalizeRepositoryConfig(repositoryConfig = {}) {
  const repositoryUrl = String(repositoryConfig?.url ?? "").trim();
  const explicitProvider = String(repositoryConfig?.provider ?? "").trim().toLowerCase();

  if (explicitProvider) {
    return {
      repositoryUrl,
      repositoryProvider: explicitProvider,
    };
  }

  let repositoryProvider = "";
  try {
    const host = new URL(repositoryUrl).hostname.toLowerCase();
    if (host.includes("github.com")) {
      repositoryProvider = "github";
    } else if (host.includes("gitee.com")) {
      repositoryProvider = "gitee";
    } else if (host.includes("forgejo")) {
      repositoryProvider = "forgejo";
    } else if (host.includes("gitea")) {
      repositoryProvider = "gitea";
    }
  } catch {
    repositoryProvider = "";
  }

  return {
    repositoryUrl,
    repositoryProvider,
  };
}

function createPublishedOnlyHistory({ articleIdentity, sourcePath, publishedAt }) {
  return {
    articleIdentity,
    sourcePath,
    updatedAt: null,
    revisions: [],
    events: [
      {
        hash: "frontmatter",
        shortHash: "date",
        date: publishedAt,
        author: "",
        subject: "published",
        kind: "published",
        status: "A",
        previousPath: undefined,
        currentPath: sourcePath,
      },
    ],
  };
}

function getRepositoryToken(provider) {
  if (provider === "github") {
    return process.env.GITHUB_TOKEN || process.env.SOURCE_REPOSITORY_TOKEN || "";
  }
  if (provider === "gitee") {
    return process.env.GITEE_TOKEN || process.env.SOURCE_REPOSITORY_TOKEN || "";
  }
  if (provider === "gitea" || provider === "forgejo") {
    return process.env.GITEA_TOKEN || process.env.SOURCE_REPOSITORY_TOKEN || "";
  }
  return process.env.SOURCE_REPOSITORY_TOKEN || "";
}

function buildApiHeaders(provider) {
  const headers = {
    Accept: "application/json",
    "User-Agent": "newechoes-article-history",
  };
  const token = getRepositoryToken(provider);
  if (!token) {
    return headers;
  }

  if (provider === "github") {
    return {
      ...headers,
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  return {
    ...headers,
    Authorization: `token ${token}`,
  };
}

function parseRepositoryParts(repositoryUrl) {
  try {
    const url = new URL(repositoryUrl);
    const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
    return {
      origin: `${url.protocol}//${url.host}`,
      owner: parts[0] ?? "",
      repo: (parts[1] ?? "").replace(/\.git$/, ""),
    };
  } catch {
    return {
      origin: "",
      owner: "",
      repo: "",
    };
  }
}

function buildProviderApiBase(provider, repositoryUrl) {
  const { origin, owner, repo } = parseRepositoryParts(repositoryUrl);
  if (!origin || !owner || !repo) {
    return null;
  }

  if (provider === "github") {
    return `${origin}/repos/${owner}/${repo}`;
  }
  if (provider === "gitee") {
    return `${origin}/api/v5/repos/${owner}/${repo}`;
  }
  if (provider === "gitea" || provider === "forgejo") {
    return `${origin}/api/v1/repos/${owner}/${repo}`;
  }
  return null;
}

function buildCompareUrl(provider, apiBase, sourcePath) {
  const encodedPath = encodeURIComponent(sourcePath);
  if (provider === "github") {
    return `${apiBase}/commits?path=${encodedPath}&per_page=100`;
  }
  if (provider === "gitee") {
    return `${apiBase}/commits?path=${encodedPath}&per_page=100`;
  }
  if (provider === "gitea" || provider === "forgejo") {
    return `${apiBase}/commits?path=${encodedPath}&limit=100`;
  }
  return null;
}

function toRemoteLogOutput(provider, commits, sourcePath) {
  const commitSeparator = "\x1e";
  const fieldSeparator = "\x1f";

  return commits.map((commit) => {
    const hash = commit.sha || commit.id || "";
    const shortHash = hash.slice(0, 7);
    const committedAt = commit.commit?.committer?.date
      || commit.created_at
      || commit.committer?.date
      || commit.timestamp
      || "";
    const author = commit.commit?.author?.name
      || commit.author?.name
      || commit.committer?.login
      || commit.author_name
      || "";
    const subject = commit.commit?.message?.split(/\r?\n/, 1)[0]
      || commit.message
      || "";

    if (!hash || !committedAt) {
      return "";
    }

    return [
      `${commitSeparator}${hash}${fieldSeparator}${shortHash}${fieldSeparator}${committedAt}${fieldSeparator}${author}${fieldSeparator}${subject}`,
      `M\t${sourcePath}`,
    ].join("\n");
  }).filter(Boolean).join("\n");
}

async function fetchProviderCommits({ provider, repositoryUrl, sourcePath }) {
  const apiBase = buildProviderApiBase(provider, repositoryUrl);
  if (!apiBase) {
    return [];
  }

  const requestUrl = buildCompareUrl(provider, apiBase, sourcePath);
  if (!requestUrl) {
    return [];
  }

  const response = await fetch(requestUrl, {
    headers: buildApiHeaders(provider),
  });

  if (!response.ok) {
    throw new Error(`${provider} history request failed: ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

export async function fetchRemoteArticleHistory({
  articleIdentity,
  sourcePath,
  publishedAt,
  repositoryConfig = {},
}) {
  const { repositoryUrl, repositoryProvider } = normalizeRepositoryConfig(repositoryConfig);
  const provider = repositoryProvider;

  if (
    provider !== "github"
    && provider !== "gitee"
    && provider !== "gitea"
    && provider !== "forgejo"
  ) {
    return createPublishedOnlyHistory({ articleIdentity, sourcePath, publishedAt });
  }

  try {
    const commits = await fetchProviderCommits({
      provider,
      repositoryUrl,
      sourcePath,
    });

    if (!Array.isArray(commits) || commits.length === 0) {
      return createPublishedOnlyHistory({ articleIdentity, sourcePath, publishedAt });
    }

    return parseGitHistoryLog({
      articleIdentity,
      sourcePath,
      publishedAt,
      logOutput: toRemoteLogOutput(provider, commits, sourcePath),
      repositoryUrl,
      repositoryProvider: provider,
    });
  } catch {
    return createPublishedOnlyHistory({ articleIdentity, sourcePath, publishedAt });
  }
}

export { createPublishedOnlyHistory };
