export enum GitPlatform {
  GITHUB = "github",
  GITEA = "gitea",
  GITEE = "gitee",
}

export const DEFAULT_GIT_CONFIG = {
  perPage: 9,
};

export const GIT_PLATFORM_CONFIG = {
  platforms: {
    [GitPlatform.GITHUB]: {
      apiUrl: "https://api.github.com",
    },
    [GitPlatform.GITEA]: {},
    [GitPlatform.GITEE]: {
      apiUrl: "https://gitee.com/api/v5",
    },
  },
  platformNames: {
    [GitPlatform.GITHUB]: "GitHub",
    [GitPlatform.GITEA]: "Gitea",
    [GitPlatform.GITEE]: "Gitee",
  },
};
