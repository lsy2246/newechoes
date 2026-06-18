import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const projectsPage = readFileSync("src/pages/projects.astro", "utf8");
const moviesPage = readFileSync("src/pages/movies.astro", "utf8");
const booksPage = readFileSync("src/pages/books.astro", "utf8");
const albumsPage = readFileSync("src/pages/albums.astro", "utf8");
const gitProjects = readFileSync("src/components/GitProjects.tsx", "utf8");
const photoAlbumMasonry = readFileSync("src/components/PhotoAlbumMasonry.tsx", "utf8");

test("collection pages do not render large page titles above their content", () => {
  assert.equal(moviesPage.includes("<h1"), false);
  assert.equal(booksPage.includes("<h1"), false);

  assert.ok(projectsPage.includes("showTitle={false}"));
  assert.ok(albumsPage.includes("showTitle={false}"));
  assert.ok(gitProjects.includes("showTitle?: boolean;"));
  assert.ok(gitProjects.includes("showTitle = true"));
  assert.match(gitProjects, /\{showTitle && \(/);
  assert.ok(photoAlbumMasonry.includes("showTitle?: boolean;"));
  assert.ok(photoAlbumMasonry.includes("showTitle = true"));
  assert.match(photoAlbumMasonry, /\{showTitle \? \(/);
});

test("collection route pages use the normal layout container without shallow view wrappers", () => {
  assert.ok(moviesPage.includes("<DoubanList"));
  assert.ok(booksPage.includes("<WereadBookList"));
  assert.ok(albumsPage.includes("<PhotoAlbumMasonry"));
  assert.ok(projectsPage.includes("<GitProjects"));
  for (const page of [moviesPage, booksPage, albumsPage, projectsPage]) {
    assert.ok(page.includes('pageType="directory"'));
    assert.equal(page.includes("View />"), false);
    assert.equal(page.includes("collection-page-offset"), false);
    assert.equal(page.includes("projects-shell"), false);
  }
});
