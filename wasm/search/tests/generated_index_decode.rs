use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;

use search_wasm::models::ArticleSearchIndex;
use utils_common::compression::{from_compressed_with_max_version, to_compressed};
use utils_common::models::ArticleMetadata;

#[test]
fn search_index_roundtrips_in_memory() {
    let mut title_term_index = HashMap::new();
    title_term_index.insert("test".to_string(), HashSet::from([0_u32]));

    let mut common_terms = HashMap::new();
    common_terms.insert("test".to_string(), 1_u32);

    let mut content_term_index = HashMap::new();
    content_term_index.insert("test".to_string(), HashSet::from([0_u32]));

    let index = ArticleSearchIndex {
        title_term_index,
        articles: vec![ArticleMetadata {
            id: "demo".to_string(),
            title: "Demo".to_string(),
            summary: "Summary".to_string(),
            date: "2026-01-01T00:00:00Z".parse().expect("should parse test timestamp"),
            updated_at: None,
            tags: vec!["tag".to_string()],
            url: "/demo".to_string(),
            content: "Body".to_string(),
            page_type: "article".to_string(),
            headings: Vec::new(),
        }],
        heading_index: HashMap::new(),
        heading_term_index: HashMap::new(),
        common_terms,
        content_term_index,
    };

    let compressed = to_compressed(&index, [7, 0]).expect("should encode test search index");
    let decoded: ArticleSearchIndex = from_compressed_with_max_version(&compressed, 9)
        .expect("should decode test search index");

    assert_eq!(decoded.articles.len(), 1);
    assert_eq!(decoded.articles[0].id, "demo");
    assert_eq!(decoded.common_terms.get("test"), Some(&1_u32));
}

#[test]
fn host_can_decode_generated_search_index() {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("dist")
        .join("assets")
        .join("index")
        .join("search_index.bin");

    if !path.exists() {
        return;
    }

    let data = fs::read(path).expect("should read generated search index");
    let _: ArticleSearchIndex = from_compressed_with_max_version(&data, 9)
        .expect("host search runtime should decode generated search index");
}
