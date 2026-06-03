import assert from "node:assert/strict";
import test from "node:test";

import { createSearchRuntime } from "../src/lib/search/runtime.js";
import { createFilterRuntime } from "../src/lib/filter/runtime.js";

const searchIndex = {
  articles: [
    {
      id: "wasm-guide",
      title: "WASM Guide",
      summary: "A practical guide to WebAssembly.",
      url: "/wasm-guide",
      date: "2024-05-01T00:00:00.000Z",
      updated_at: "2024-05-03T00:00:00.000Z",
      tags: ["wasm", "rust"],
      content: "Learn wasm and workers for faster interfaces.",
      page_type: "article",
      headings: [
        { level: 2, text: "Workers", position: 0, end_position: 40 },
      ],
    },
    {
      id: "worker-patterns",
      title: "Worker Patterns",
      summary: "Patterns for keeping the main thread responsive.",
      url: "/worker-patterns",
      date: "2024-04-20T00:00:00.000Z",
      updated_at: "2024-04-20T00:00:00.000Z",
      tags: ["javascript"],
      content: "Move heavy search and filtering into a worker.",
      page_type: "article",
      headings: [],
    },
  ],
};

test("JS search runtime ranks title-prefix matches first and returns inline suggestions", () => {
  const runtime = createSearchRuntime(searchIndex);
  const result = runtime.search({
    query: "was",
    search_type: "normal",
    page_size: 10,
    page: 1,
  });

  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, "wasm-guide");
  assert.match(result.items[0].title, /<mark>WAS<\/mark>M Guide/);
  assert.equal(result.suggestions[0].text, "WASM Guide");
  assert.equal(result.suggestions[0].suggestion_type, "completion");
  assert.equal(result.suggestions[0].matched_text, "WAS");
  assert.equal(result.suggestions[0].suggestion_text, "M Guide");
});

test("JS search runtime returns correction suggestions for near matches", () => {
  const runtime = createSearchRuntime({
    articles: [searchIndex.articles[1]],
  });
  const result = runtime.suggest({
    query: "workr",
    search_type: "autocomplete",
    page_size: 10,
    page: 1,
  });

  assert.equal(result.items.length, 0);
  assert.equal(result.suggestions[0].suggestion_type, "correction");
  assert.equal(result.suggestions[0].text, "worker");
  assert.equal(result.suggestions[0].matched_text, "workr");
  assert.equal(result.suggestions[0].suggestion_text, "worker");
});

test("JS filter runtime returns sorted tags and paginated filter results", () => {
  const runtime = createFilterRuntime({
    articles: [
      {
        id: "a",
        title: "Rust Search",
        summary: "Search runtime notes",
        url: "/rust-search",
        date: "2024-02-01T00:00:00.000Z",
        tags: ["rust", "search"],
      },
      {
        id: "b",
        title: "JS Worker",
        summary: "Worker migration notes",
        url: "/js-worker",
        date: "2024-06-01T00:00:00.000Z",
        tags: ["javascript", "search"],
      },
      {
        id: "c",
        title: "Archive",
        summary: "Older notes",
        url: "/archive",
        date: "2023-12-15T00:00:00.000Z",
        tags: ["rust"],
      },
    ],
  });

  assert.deepEqual(runtime.getAllTags(), ["javascript", "rust", "search"]);

  const result = runtime.filter({
    tags: ["search"],
    sort: "newest",
    page: 1,
    limit: 1,
    date: "2024-01-01,2024-12-31",
  });

  assert.equal(result.total, 2);
  assert.equal(result.total_pages, 2);
  assert.equal(result.articles.length, 1);
  assert.equal(result.articles[0].title, "JS Worker");
});
