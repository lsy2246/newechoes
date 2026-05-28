import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path) => readFileSync(path, "utf8");
const readSourceIfExists = (path) => (existsSync(path) ? readSource(path) : "");

const envExampleSource = readSourceIfExists(".env.example");
const serverRelaySource = readSourceIfExists("src/lib/server-asset-relay.ts");
const doubanRouteSource = readSource("src/pages/api/douban.ts");
const doubanComponentSource = readSource("src/components/DoubanCollection.tsx");
const googlePhotosSource = readSource("src/lib/google-photos.ts");
const googlePhotosRouteSource = readSource("src/pages/api/google-photos.ts");
const photoAlbumSource = readSource("src/components/PhotoAlbumMasonry.tsx");

test("asset relay configuration stays server-side", () => {
  assert.match(envExampleSource, /ASSET_RELAY_URL=.*\{url\}/);
  assert.doesNotMatch(envExampleSource, /PUBLIC_/);
  assert.doesNotMatch(envExampleSource, /\{headers\}|\{request\}/);
  assert.match(serverRelaySource, /process\.env\.ASSET_RELAY_URL/);
  assert.doesNotMatch(serverRelaySource, /import\.meta\.env\.PUBLIC_/);
  assert.doesNotMatch(doubanComponentSource, /ASSET_RELAY|server-asset-relay/);
  assert.doesNotMatch(photoAlbumSource, /ASSET_RELAY|server-asset-relay/);
});

test("server asset relay sends source request headers as normal HTTP headers", () => {
  assert.match(serverRelaySource, /ASSET_RELAY_URL_PLACEHOLDER = "\{url\}"/);
  assert.doesNotMatch(serverRelaySource, /\{headers\}|\{request\}/);
  assert.doesNotMatch(serverRelaySource, /JSON\.stringify\(\s*headers/);
  assert.doesNotMatch(serverRelaySource, /canDescribeRequestOptions/);
  assert.match(serverRelaySource, /encodeURIComponent/);
  assert.match(serverRelaySource, /fetch\(\s*relayUrl,\s*\{[\s\S]*headers/);
  assert.match(serverRelaySource, /fetch\(\s*url,\s*\{[\s\S]*headers/);
});

test("Douban keeps frontend image URLs local while the API relays server-side", () => {
  assert.match(doubanRouteSource, /server-asset-relay/);
  assert.match(doubanRouteSource, /DOUBAN_IMAGE_HEADERS/);
  assert.match(doubanRouteSource, /fetchAssetWithRelayFallback\(\s*imageUrl,\s*\{[\s\S]*headers:\s*DOUBAN_IMAGE_HEADERS/);
  assert.match(doubanRouteSource, /imageUrl:\s*imageUrl\s*\?\s*localDoubanImageUrl\(imageUrl\)\s*:\s*''/);
  assert.doesNotMatch(doubanRouteSource, /imageFallbackUrl/);
  assert.match(doubanRouteSource, /\/api\/douban\?imageUrl=/);
  assert.doesNotMatch(doubanComponentSource, /imageFallbackUrl|handleDoubanImageError/);
  assert.match(doubanComponentSource, /src=\{item\.imageUrl\}/);
  assert.doesNotMatch(doubanComponentSource, /src=\{`\/api\/douban\?imageUrl=/);
});

test("Google Photos keeps media URLs local while the API relays server-side", () => {
  assert.doesNotMatch(googlePhotosSource, /server-asset-relay|assetUrlWithFallback/);
  assert.match(googlePhotosSource, /GOOGLE_PHOTOS_MEDIA_HEADERS/);
  assert.match(googlePhotosSource, /localGooglePhotosMediaUrl/);
  assert.doesNotMatch(googlePhotosSource, /FallbackUrl/);
  assert.match(googlePhotosRouteSource, /const mediaUrl = url\.searchParams\.get\("mediaUrl"\)/);
  assert.match(googlePhotosRouteSource, /isAllowedGooglePhotosMediaUrl/);
  assert.match(googlePhotosRouteSource, /fetchAssetWithRelayFallback\(\s*mediaUrl,\s*\{[\s\S]*headers:\s*GOOGLE_PHOTOS_MEDIA_HEADERS/);
  assert.doesNotMatch(photoAlbumSource, /FallbackUrl|switchImageToFallback|switchVideoToFallback/);
});
