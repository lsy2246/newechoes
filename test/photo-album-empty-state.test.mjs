import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync("src/components/PhotoAlbumMasonry.tsx", "utf8");

test("PhotoAlbumMasonry explains an empty loaded Google Photos response", () => {
  assert.match(
    component,
    /const hasLoadedEmptyAlbum\s*=\s*!isLoading && !error && photos\.length === 0 && !hasMoreContent;/,
  );
  assert.ok(component.includes("相册里暂时没有可显示的照片"));
  assert.ok(component.includes("Google Photos 返回了空结果"));
  assert.ok(component.includes("onClick={() => fetchPhotoPage(null, 0)}"));
});
