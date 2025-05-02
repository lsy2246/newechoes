use std::collections::{HashMap, HashSet};
use serde::{Deserialize, Serialize};
use bincode::{Encode, Decode};
use utils_common::models::ArticleMetadata;

/// 标题索引项
#[derive(Serialize, Deserialize, Clone, Debug, Encode, Decode)]
pub struct HeadingIndexEntry {
    /// 标题ID (文章ID:标题索引)
    pub id: String,
    /// 标题级别
    pub level: usize,
    /// 标题文本
    pub text: String,
    /// 标题内容起始位置
    pub start_position: usize,
    /// 标题内容结束位置
    pub end_position: usize,
    /// 父标题ID (如果有)
    pub parent_id: Option<String>,
    /// 子标题ID列表
    pub children_ids: Vec<String>,
}

/// 带有匹配内容的标题节点
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HeadingNode {
    /// 标题ID
    pub id: String,
    /// 标题文本
    pub text: String,
    /// 标题级别
    pub level: usize,
    /// 该标题下匹配的内容
    pub content: Option<String>,
    /// 匹配的关键词列表
    pub matched_terms: Option<Vec<String>>,
    /// 子标题列表
    pub children: Vec<HeadingNode>,
}

/// 搜索索引 - 简化版本
#[derive(Serialize, Deserialize, Debug)]
pub struct ArticleSearchIndex {
    /// 关键词到文章ID的映射（标题）
    pub title_term_index: HashMap<String, HashSet<usize>>,
    /// 文章的元数据列表
    pub articles: Vec<ArticleMetadata>,
    /// 标题索引 - 标题ID到标题信息的映射
    pub heading_index: HashMap<String, HeadingIndexEntry>,
    /// 关键词到标题ID的映射
    pub heading_term_index: HashMap<String, HashSet<String>>,
    /// 常用词汇及其频率
    pub common_terms: HashMap<String, usize>,
    /// 内容关键词到文章ID的映射
    pub content_term_index: HashMap<String, HashSet<usize>>,
}

/// 搜索请求结构
#[derive(Deserialize)]
pub struct SearchRequest {
    /// 搜索查询
    pub query: String,
    /// 搜索类型 (normal或autocomplete)
    #[serde(default)]
    pub search_type: String,
    /// 当前页码
    #[serde(default = "default_page")]
    pub page: usize,
    /// 每页条数
    #[serde(default = "default_page_size")]
    pub page_size: usize,
}

/// 搜索建议类型
#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "snake_case")]
pub enum SuggestionType {
    /// 补全建议 - 前缀匹配
    Completion,
    /// 纠正建议 - 编辑距离或包含匹配
    Correction
}

/// 搜索建议分数和类型（内部使用）
#[derive(Debug, Clone)]
pub struct SuggestionCandidate {
    /// 建议文本
    pub text: String,
    /// 分数 (0-100)
    pub score: i32,
    /// 建议类型
    pub suggestion_type: SuggestionType,
    /// 原始关键词频率
    pub frequency: usize,
}

/// 搜索建议结构（对外输出）
#[derive(Serialize, Debug, Clone)]
pub struct SearchSuggestion {
    /// 建议文本
    pub text: String,
    /// 建议类型
    pub suggestion_type: SuggestionType,
    /// 用户已输入匹配部分
    pub matched_text: String,
    /// 建议补全部分
    pub suggestion_text: String,
}

/// 搜索结果
#[derive(Serialize)]
pub struct SearchResult {
    /// 搜索结果条目
    pub items: Vec<SearchResultItem>,
    /// 结果总数
    pub total: usize,
    /// 当前页码
    pub page: usize,
    /// 每页条数
    pub page_size: usize,
    /// 总页数
    pub total_pages: usize,
    /// 搜索耗时(毫秒)
    pub time_ms: usize,
    /// 搜索查询
    pub query: String,
    /// 搜索建议
    pub suggestions: Vec<SearchSuggestion>,
}

/// 搜索结果条目
#[derive(Serialize, Clone)]
pub struct SearchResultItem {
    /// 文章ID
    pub id: String,
    /// 文章标题
    pub title: String,
    /// 文章摘要
    pub summary: String,
    /// 文章URL
    pub url: String,
    /// 匹配分数
    pub score: f64,
    /// 结构化的标题和内容层级
    pub heading_tree: Option<HeadingNode>,
    /// 页面类型
    pub page_type: String,
}

/// 默认页码
fn default_page() -> usize {
    1
}

/// 默认每页条数
fn default_page_size() -> usize {
    10
} 