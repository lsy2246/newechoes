import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const doubanComponent = readFileSync("src/components/DoubanList.tsx", "utf8");
const photoAlbumComponent = readFileSync("src/components/PhotoAlbumMasonry.tsx", "utf8");
const doubanInitBlock =
  doubanComponent.match(/useEffect\(\(\) => \{[\s\S]*?fetchDoubanData\(1, false\);[\s\S]*?\}, \[type, doubanId, fetchDoubanData, setupIntersectionObserver\]\);/)?.[0] ?? "";
const photoAlbumInitBlock =
  photoAlbumComponent.match(/useEffect\(\(\) => \{[\s\S]*?fetchPhotoPage\(null, 0\);[\s\S]*?\}, \[shareId, fetchPhotoPage\]\);/)?.[0] ?? "";

test("DoubanList leaves the loading guard open for the first page request", () => {
  assert.match(
    doubanInitBlock,
    /setIsLoading\(true\);\s*stateRef\.current\.isLoading = false;\s*[\s\S]*fetchDoubanData\(1, false\);/,
  );
  assert.doesNotMatch(
    doubanInitBlock,
    /setIsLoading\(true\);\s*stateRef\.current\.isLoading = true;\s*[\s\S]*fetchDoubanData\(1, false\);/,
  );
});

test("PhotoAlbumMasonry keeps the first Google Photos request outside the loading short-circuit", () => {
  assert.match(
    photoAlbumInitBlock,
    /stateRef\.current = \{\s*isLoading: false,\s*hasMoreContent: true,\s*visibleCount: REVEAL_BATCH_SIZE,\s*photosLength: 0,\s*nextCursor: null,\s*\};\s*[\s\S]*fetchPhotoPage\(null, 0\);/,
  );
  assert.doesNotMatch(
    photoAlbumInitBlock,
    /stateRef\.current = \{\s*isLoading: true,\s*hasMoreContent: true,\s*visibleCount: REVEAL_BATCH_SIZE,\s*photosLength: 0,\s*nextCursor: null,\s*\};\s*[\s\S]*fetchPhotoPage\(null, 0\);/,
  );
});
