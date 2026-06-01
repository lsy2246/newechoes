import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path) => readFileSync(path, "utf8");

const constsSource = readSource("src/consts.ts");
const serverRelaySource = readSource("src/lib/server-asset-relay.ts");
const doubanRouteSource = readSource("src/pages/api/douban.ts");
const doubanComponentSource = readSource("src/components/DoubanCollection.tsx");
const googlePhotosSource = readSource("src/lib/google-photos/shared.ts");
const googlePhotosRouteSource = readSource("src/pages/api/google-photos.ts");
const photoAlbumSource = readSource("src/components/PhotoAlbumMasonry.tsx");

test("asset relay template stays in shared consts with encoded headers support", () => {
  assert.match(constsSource, /export const ASSET_RELAY_URL = "https:\/\/proxy\.u\.cd\/download\?url=\{url\}&headers=\{headers\}"/);
  assert.match(serverRelaySource, /import \{ ASSET_RELAY_URL \} from "@\/consts"/);
  assert.doesNotMatch(serverRelaySource, /process\.env\.ASSET_RELAY_URL/);
  assert.doesNotMatch(serverRelaySource, /import\.meta\.env\.PUBLIC_/);
  assert.doesNotMatch(doubanComponentSource, /ASSET_RELAY|server-asset-relay/);
  assert.doesNotMatch(photoAlbumSource, /ASSET_RELAY|server-asset-relay/);
});

test("server asset relay encodes source request headers into the relay URL", () => {
  assert.match(serverRelaySource, /ASSET_RELAY_URL_PLACEHOLDER = "\{url\}"/);
  assert.match(serverRelaySource, /ASSET_RELAY_HEADERS_PLACEHOLDER = "\{headers\}"/);
  assert.match(serverRelaySource, /JSON\.stringify\(\s*headers/);
  assert.match(serverRelaySource, /encodeURIComponent/);
  assert.match(serverRelaySource, /replaceAll\(ASSET_RELAY_HEADERS_PLACEHOLDER,\s*encodedHeaders\)/);
  assert.match(serverRelaySource, /fetch\(\s*relayUrl,\s*\{\s*signal\s*\}\)/);
  assert.match(serverRelaySource, /fetch\(\s*url,\s*\{[\s\S]*headers/);
});

test("Douban prefers relay URLs in the frontend and falls back to the local image API", () => {
  assert.match(doubanRouteSource, /server-asset-relay/);
  assert.match(doubanRouteSource, /DOUBAN_IMAGE_HEADERS/);
  assert.match(doubanRouteSource, /fetchAssetDirect\(\s*imageUrl,\s*\{[\s\S]*headers:\s*DOUBAN_IMAGE_HEADERS/);
  assert.match(doubanRouteSource, /relayAssetUrl\(imageUrl,\s*DOUBAN_IMAGE_HEADERS\)\s*\|\|\s*fallbackImageUrl/);
  assert.match(doubanRouteSource, /fallbackImageUrl/);
  assert.match(doubanRouteSource, /\/api\/douban\?imageUrl=/);
  assert.match(doubanComponentSource, /fallbackImageUrl\?: string/);
  assert.match(doubanComponentSource, /dataset\.fallbackApplied/);
  assert.match(doubanComponentSource, /event\.currentTarget\.src = item\.fallbackImageUrl/);
  assert.match(doubanComponentSource, /src=\{item\.imageUrl\}/);
  assert.doesNotMatch(doubanComponentSource, /src=\{`\/api\/douban\?imageUrl=/);
});

test("Google Photos page/media flow uses relay URLs with local API fallback", () => {
  assert.match(googlePhotosSource, /server-asset-relay/);
  assert.match(googlePhotosSource, /GOOGLE_PHOTOS_MEDIA_HEADERS/);
  assert.match(googlePhotosSource, /localGooglePhotosMediaUrl/);
  assert.match(googlePhotosSource, /relayAssetUrl\(mediaUrl,\s*GOOGLE_PHOTOS_MEDIA_HEADERS\)\s*\|\|\s*fallbackUrl/);
  assert.match(googlePhotosSource, /fetchAssetWithRelayFallback\(\s*shareUrl,\s*\{[\s\S]*headers:\s*GOOGLE_PHOTOS_PAGE_HEADERS/);
  assert.match(googlePhotosSource, /fallbackThumbUrl/);
  assert.match(googlePhotosSource, /fallbackVideoUrl/);
  assert.match(googlePhotosRouteSource, /const mediaUrl = url\.searchParams\.get\("mediaUrl"\)/);
  assert.match(googlePhotosRouteSource, /isAllowedGooglePhotosMediaUrl/);
  assert.match(googlePhotosRouteSource, /fetchAssetDirect\(\s*mediaUrl,\s*\{[\s\S]*headers:\s*GOOGLE_PHOTOS_MEDIA_HEADERS/);
  assert.match(photoAlbumSource, /fallbackMediaSource/);
  assert.match(photoAlbumSource, /fallbackThumbUrl/);
  assert.match(photoAlbumSource, /fallbackVideoUrl/);
});
