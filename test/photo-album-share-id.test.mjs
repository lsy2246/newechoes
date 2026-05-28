import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const albumsPage = readFileSync("src/pages/albums.astro", "utf8");
const component = readFileSync("src/components/PhotoAlbumMasonry.tsx", "utf8");
const consts = readFileSync("src/consts.ts", "utf8");

test("albums page passes the Google Photos share id at the call site", () => {
  assert.ok(albumsPage.includes('shareId="M62Uxp4Uz2CUwie9A"'));
  assert.equal(albumsPage.includes("PHOTO_ALBUM_CONFIG"), false);
  assert.equal(albumsPage.includes("shareUrl="), false);
});

test("PhotoAlbumMasonry builds the Google Photos share url internally", () => {
  assert.ok(component.includes("shareId: string;"));
  assert.ok(component.includes('const GOOGLE_PHOTOS_SHARE_URL_BASE = "https://photos.app.goo.gl/";'));
  assert.ok(
    component.includes("shareUrl: `${GOOGLE_PHOTOS_SHARE_URL_BASE}${encodeURIComponent(shareId)}`,"),
  );
});

test("global consts do not keep a concrete Google Photos share link", () => {
  assert.equal(consts.includes("PHOTO_ALBUM_CONFIG"), false);
  assert.equal(consts.includes("photos.app.goo.gl/M62Uxp4Uz2CUwie9A"), false);
});
