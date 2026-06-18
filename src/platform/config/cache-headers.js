const LONG_CACHE_CONTROL = "public, max-age=31536000, immutable";
const STATIC_CACHE_CONTROL = "public, max-age=604800, stale-while-revalidate=86400";
const LEGACY_FAR_FUTURE_EXPIRES = "Thu, 31 Dec 2037 23:55:55 GMT";
const VARY_ACCEPT_ENCODING = "Accept-Encoding";

function createHeaders(cacheControl) {
  return {
    "Cache-Control": cacheControl,
    Expires: LEGACY_FAR_FUTURE_EXPIRES,
    Vary: VARY_ACCEPT_ENCODING,
  };
}

export const CACHE_HEADER_RULES = [
  {
    cloudflarePath: "/_astro/*",
    platformPath: "/_astro/(.*)",
    headers: createHeaders(LONG_CACHE_CONTROL),
  },
  {
    cloudflarePath: "/fonts/*",
    platformPath: "/fonts/(.*)",
    headers: createHeaders(STATIC_CACHE_CONTROL),
  },
  {
    cloudflarePath: "/maps/*",
    platformPath: "/maps/(.*)",
    headers: createHeaders(STATIC_CACHE_CONTROL),
  },
  {
    cloudflarePath: "/models/*",
    platformPath: "/models/(.*)",
    headers: createHeaders(STATIC_CACHE_CONTROL),
  },
  {
    cloudflarePath: "/styles/*",
    platformPath: "/styles/(.*)",
    headers: createHeaders(STATIC_CACHE_CONTROL),
  },
  {
    cloudflarePath: "/favicon.svg",
    platformPath: "/favicon.svg",
    headers: createHeaders(STATIC_CACHE_CONTROL),
  },
];

function toPlatformHeaderEntries(headers) {
  return Object.entries(headers).map(([key, value]) => ({ key, value }));
}

export function renderCloudflareHeadersFile() {
  return CACHE_HEADER_RULES.map(({ cloudflarePath, headers }) => {
    const lines = [cloudflarePath];

    for (const [name, value] of Object.entries(headers)) {
      lines.push(`  ${name}: ${value}`);
    }

    return lines.join("\n");
  }).join("\n\n");
}

export function buildVercelHeaders() {
  return CACHE_HEADER_RULES.map(({ platformPath, headers }) => ({
    source: platformPath,
    headers: toPlatformHeaderEntries(headers),
  }));
}

export function buildEdgeoneHeaders() {
  return CACHE_HEADER_RULES.map(({ cloudflarePath, headers }) => ({
    source: cloudflarePath,
    headers: toPlatformHeaderEntries(headers),
  }));
}
