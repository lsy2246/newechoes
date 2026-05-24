import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const projectsPage = readFileSync("src/pages/projects.astro", "utf8");
const moviesPage = readFileSync("src/pages/movies.astro", "utf8");
const booksPage = readFileSync("src/pages/books.astro", "utf8");
const albumsPage = readFileSync("src/pages/albums.astro", "utf8");
const gitProjectCollection = readFileSync("src/components/GitProjectCollection.tsx", "utf8");
const photoAlbumMasonry = readFileSync("src/components/PhotoAlbumMasonry.tsx", "utf8");

test("collection pages do not render large page titles above their content", () => {
  assert.equal(moviesPage.includes("<h1"), false);
  assert.equal(booksPage.includes("<h1"), false);

  assert.ok(projectsPage.includes("showTitle={false}"));
  assert.ok(albumsPage.includes("showTitle={false}"));
  assert.ok(gitProjectCollection.includes("showTitle?: boolean;"));
  assert.ok(gitProjectCollection.includes("showTitle = true"));
  assert.match(gitProjectCollection, /\{showTitle && \(/);
  assert.ok(photoAlbumMasonry.includes("showTitle?: boolean;"));
  assert.ok(photoAlbumMasonry.includes("showTitle = true"));
  assert.match(photoAlbumMasonry, /\{showTitle \? \(/);
});

test("collection pages without a visible title keep breathing room below the nav", () => {
  assert.ok(moviesPage.includes('class="collection-page-offset pt-6 md:pt-8"'));
  assert.ok(booksPage.includes('class="collection-page-offset pt-6 md:pt-8"'));
  assert.ok(albumsPage.includes('class="collection-page-offset pt-6 md:pt-8"'));
  assert.equal(projectsPage.includes("collection-page-offset"), false);
});
