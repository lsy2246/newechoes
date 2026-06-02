export type DeployTarget = "vercel" | "edgeone" | "cloudflare";

export type PlatformScript = {
  src: string;
  async?: boolean;
  defer?: boolean;
  dataAttributes?: Record<string, string>;
};

export type PlatformObservability = {
  provider: DeployTarget;
  speedInsights: boolean;
  bodyScripts: PlatformScript[];
};

export type PlatformCapabilities = {
  vercelInsights: boolean;
  googlePhotosParsing: boolean;
  articleHistory: boolean;
};
