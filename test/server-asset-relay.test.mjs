import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path) => readFileSync(path, "utf8");

const constsSource = readSource("src/consts.ts");
const serverRelaySource = readSource("src/lib/server/asset-relay.ts");
const doubanRouteSource = readSource("src/server/api/douban.ts");
const doubanComponentSource = readSource("src/components/DoubanCollection.tsx");
const wereadRouteSource = readSource("src/server/api/weread.ts");
const wereadComponentSource = readSource("src/components/WereadBookList.tsx");
const googlePhotosSource = readSource("src/lib/google-photos/shared.ts");
const googlePhotosRouteSource = readSource("src/server/api/google-photos.ts");
const photoAlbumSource = readSource("src/components/PhotoAlbumMasonry.tsx");

test("asset relay template stays in shared consts with encoded headers support", () => {
  assert.match(constsSource, /export const ASSET_RELAY_URL = "https:\/\/proxy\.u\.cd\/download\?url=\{url\}&headers=\{headers\}"/);
  assert.match(serverRelaySource, /import \{ ASSET_RELAY_URL \} from "\.\.\/\.\.\/consts(\.js)?"/);
  assert.doesNotMatch(serverRelaySource, /import \{ ASSET_RELAY_URL \} from "\.\.\/consts(\.js)?"/);
  assert.doesNotMatch(serverRelaySource, /process\.env\.ASSET_RELAY_URL/);
  assert.doesNotMatch(serverRelaySource, /import\.meta\.env\.PUBLIC_/);
  assert.doesNotMatch(doubanComponentSource, /ASSET_RELAY|server\/asset-relay/);
  assert.doesNotMatch(photoAlbumSource, /ASSET_RELAY|server\/asset-relay/);
});

test("server asset relay encodes source request headers into the relay URL", () => {
  assert.match(serverRelaySource, /ASSET_RELAY_URL_PLACEHOLDER = "\{url\}"/);
  assert.match(serverRelaySource, /ASSET_RELAY_HEADERS_PLACEHOLDER = "\{headers\}"/);
  assert.match(serverRelaySource, /JSON\.stringify\(\s*headers/);
  assert.match(serverRelaySource, /encodeURIComponent/);
  assert.match(serverRelaySource, /replaceAll\(ASSET_RELAY_HEADERS_PLACEHOLDER,\s*encodedHeaders\)/);
  assert.match(serverRelaySource, /searchParams\.set\("cache",\s*cache\)/);
  assert.match(serverRelaySource, /searchParams\.set\("cache_ttl",\s*String\(cacheTtl\)\)/);
  assert.match(serverRelaySource, /searchParams\.set\("cache_key_mode",\s*cacheKeyMode\)/);
  assert.match(serverRelaySource, /fetch\(\s*relayUrl,\s*\{\s*signal\s*\}\)/);
  assert.match(serverRelaySource, /fetch\(\s*url,\s*\{[\s\S]*headers/);
});

test("Douban prefers relay URLs in the frontend and falls back to the local image API", () => {
  assert.match(doubanRouteSource, /server\/asset-relay/);
  assert.match(doubanRouteSource, /DOUBAN_IMAGE_HEADERS/);
  assert.match(doubanRouteSource, /fetchAssetDirect\(\s*imageUrl,\s*\{[\s\S]*headers:\s*DOUBAN_IMAGE_HEADERS/);
  assert.match(doubanRouteSource, /const relayImageUrl = imageUrl/);
  assert.match(doubanRouteSource, /const fallbackImageUrl = relayImageUrl && imageUrl/);
  assert.match(doubanRouteSource, /cache:\s*"prefer"/);
  assert.match(doubanRouteSource, /DOUBAN_IMAGE_CACHE_TTL_SECONDS = 31536000/);
  assert.match(doubanRouteSource, /cacheTtl:\s*DOUBAN_IMAGE_CACHE_TTL_SECONDS/);
  assert.match(doubanRouteSource, /imageUrl:\s*imageUrl \? relayImageUrl \|\| localDoubanImageUrl\(imageUrl\) : ''/);
  assert.match(doubanRouteSource, /fallbackImageUrl/);
  assert.match(doubanRouteSource, /\/api\/douban\?imageUrl=/);
  assert.match(doubanComponentSource, /fallbackImageUrl\?: string/);
  assert.match(doubanComponentSource, /applyNextImageFallback/);
  assert.match(doubanComponentSource, /dataset\.fallbackIndex/);
  assert.match(doubanComponentSource, /getFallbackImageUrls\(item\.imageUrl,\s*item\.fallbackImageUrl\)/);
  assert.match(doubanComponentSource, /src=\{item\.imageUrl\}/);
  assert.doesNotMatch(doubanComponentSource, /src=\{`\/api\/douban\?imageUrl=/);
});

test("Weread keeps direct page fetches and uses direct -> relay -> local cover fallback", () => {
  assert.match(wereadRouteSource, /server\/asset-relay/);
  assert.match(wereadRouteSource, /WEREAD_PAGE_HEADERS/);
  assert.match(wereadRouteSource, /WEREAD_IMAGE_HEADERS/);
  assert.match(wereadRouteSource, /fetchAssetDirect\(\s*imageUrl,\s*\{[\s\S]*headers:\s*WEREAD_IMAGE_HEADERS/);
  assert.doesNotMatch(wereadRouteSource, /fetchAssetWithRelayFallback\(/);
  assert.match(wereadRouteSource, /imageUrl:\s*book\.cover/);
  assert.match(wereadRouteSource, /fallbackImageUrl:\s*book\.cover \? relayAssetUrl\(book\.cover,\s*WEREAD_IMAGE_HEADERS\) \|\| localWereadImageUrl\(book\.cover\) : ''/);
  assert.match(wereadRouteSource, /serverFallbackImageUrl:\s*book\.cover && relayAssetUrl\(book\.cover,\s*WEREAD_IMAGE_HEADERS\)/);
  assert.match(wereadRouteSource, /fallbackImageUrl:\s*imageUrl \? relayImageUrl \|\| localWereadImageUrl\(imageUrl\) : ''/);
  assert.match(wereadRouteSource, /serverFallbackImageUrl:\s*relayImageUrl && imageUrl \? localWereadImageUrl\(imageUrl\) : ''/);
  assert.match(wereadRouteSource, /\/api\/weread\?imageUrl=/);
  assert.match(wereadComponentSource, /fallbackImageUrl\?: string/);
  assert.match(wereadComponentSource, /serverFallbackImageUrl\?: string/);
  assert.match(wereadComponentSource, /applyNextImageFallback/);
  assert.match(wereadComponentSource, /dataset\.fallbackIndex/);
  assert.match(wereadComponentSource, /book\.serverFallbackImageUrl/);
  assert.match(wereadComponentSource, /src=\{book\.imageUrl\}/);
});

test("Google Photos page/media flow keeps relay-first images and media-mode relay videos with backend fallback", () => {
  assert.match(googlePhotosSource, /server\/asset-relay/);
  assert.match(googlePhotosSource, /GOOGLE_PHOTOS_MEDIA_HEADERS/);
  assert.match(googlePhotosSource, /GOOGLE_PHOTOS_PAGE_CACHE_TTL_SECONDS = 1800/);
  assert.match(googlePhotosSource, /GOOGLE_PHOTOS_MEDIA_CACHE_TTL_SECONDS = 2592000/);
  assert.match(googlePhotosSource, /const googlePhotosImageUrl = \(baseUrl: string, params: string\) =>/);
  assert.match(googlePhotosSource, /googlePhotosMediaUrl\(baseUrl, `\$\{params\}-no`\)/);
  assert.match(googlePhotosSource, /localGooglePhotosMediaUrl/);
  assert.match(googlePhotosSource, /relayAssetUrl\(\s*mediaUrl,\s*GOOGLE_PHOTOS_MEDIA_HEADERS,\s*\{[\s\S]*cache:\s*"prefer"[\s\S]*cacheTtl:\s*GOOGLE_PHOTOS_MEDIA_CACHE_TTL_SECONDS[\s\S]*\}\s*\)\s*\|\|\s*fallbackUrl/);
  assert.match(googlePhotosSource, /const streamedGooglePhotosVideoUrl = \(baseUrl: string\) => \{/);
  assert.match(googlePhotosSource, /const relayUrl = relayAssetUrl\(\s*mediaUrl,\s*GOOGLE_PHOTOS_MEDIA_HEADERS,\s*\{[\s\S]*cache:\s*"prefer"[\s\S]*cacheTtl:\s*GOOGLE_PHOTOS_MEDIA_CACHE_TTL_SECONDS[\s\S]*\}\s*\);/);
  assert.match(googlePhotosSource, /mode:\s*"media"/);
  assert.match(googlePhotosSource, /const mediaRelayUrl = relayUrl \|\| null;/);
  assert.match(googlePhotosSource, /url:\s*mediaRelayUrl\s*\|\|\s*localUrl/);
  assert.match(googlePhotosSource, /fallbackUrl:\s*mediaRelayUrl \? localUrl : null/);
  assert.match(googlePhotosSource, /const thumbUrl = proxiedGooglePhotosMediaUrl\(baseUrl,\s*"w600"\)/);
  assert.match(googlePhotosSource, /const displayUrl = proxiedGooglePhotosMediaUrl\(baseUrl,\s*"w1600"\)/);
  assert.match(googlePhotosSource, /const previewUrl = proxiedGooglePhotosMediaUrl\(baseUrl,\s*"w2400"\)/);
  assert.match(googlePhotosSource, /fetchAssetWithRelayFallback\(\s*shareUrl,\s*\{[\s\S]*headers:\s*GOOGLE_PHOTOS_PAGE_HEADERS[\s\S]*cache:\s*"prefer"[\s\S]*cacheTtl:\s*GOOGLE_PHOTOS_PAGE_CACHE_TTL_SECONDS/);
  assert.match(googlePhotosSource, /fallbackThumbUrl/);
  assert.match(googlePhotosSource, /fallbackVideoUrl/);
  assert.match(googlePhotosRouteSource, /const mediaUrl = url\.searchParams\.get\("mediaUrl"\)/);
  assert.match(googlePhotosRouteSource, /isAllowedGooglePhotosMediaUrl/);
  assert.match(googlePhotosRouteSource, /const forwardedRange = request\.headers\.get\("range"\)/);
  assert.match(googlePhotosRouteSource, /fetchAssetDirect\(\s*mediaUrl,\s*\{[\s\S]*headers:\s*\{[\s\S]*\.\.\.GOOGLE_PHOTOS_MEDIA_HEADERS/);
  assert.match(googlePhotosRouteSource, /Range:\s*forwardedRange/);
  assert.match(googlePhotosRouteSource, /new Response\(response\.body,\s*\{[\s\S]*status:\s*response\.status/);
  assert.match(googlePhotosRouteSource, /accept-ranges/);
  assert.match(googlePhotosRouteSource, /content-range/);
  assert.match(photoAlbumSource, /fallbackMediaSource/);
  assert.match(photoAlbumSource, /fallbackThumbUrl/);
  assert.match(photoAlbumSource, /fallbackVideoUrl/);
});
