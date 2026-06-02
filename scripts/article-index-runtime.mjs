const mode = (process.argv[2] || "verify").trim().toLowerCase();

if (mode === "rebuild") {
  process.env.ARTICLE_INDEX_RUNTIME_BUILD = "force";
} else {
  process.env.ARTICLE_INDEX_RUNTIME_BUILD = "prebuilt";
}

try {
  const { prepareArticleIndexRuntimeArtifacts } = await import("../src/plugins/build-article-index.js");
  prepareArticleIndexRuntimeArtifacts();
  console.log(`[article-index-runtime] ${mode} completed`);
} catch (error) {
  console.error(`[article-index-runtime] ${mode} failed: ${error.message}`);
  process.exit(1);
}
