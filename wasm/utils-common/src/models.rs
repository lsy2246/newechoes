use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// 标题结构 - 存储文章中的标题及其层级
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Heading {
    /// 标题级别（1表示h1，2表示h2，依此类推）
    pub level: usize,
    /// 标题文本
    pub text: String,
    /// 标题在文章中的开始位置（字符偏移量）
    pub position: usize,
    /// 标题内容结束位置（下一个标题开始前或文章结束）
    pub end_position: Option<usize>,
}

/// 文章元数据 - 存储索引所需的文章基本信息
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ArticleMetadata {
    /// 文章唯一标识符
    pub id: String,
    /// 文章标题
    pub title: String,
    /// 文章摘要
    pub summary: String,
    /// 发布日期
    pub date: DateTime<Utc>,
    /// 文章标签列表
    pub tags: Vec<String>,
    /// 文章URL路径
    pub url: String,
    /// 文章内容，用于全文搜索
    #[serde(skip_serializing_if = "String::is_empty", default)]
    pub content: String,
    /// 页面类型：article（文章）、page（普通页面）
    #[serde(default = "default_page_type")]
    pub page_type: String,
    /// 文章中的标题结构
    #[serde(default)]
    pub headings: Vec<Heading>,
}

/// 默认页面类型为article
fn default_page_type() -> String {
    "article".to_string()
}

/// 索引类型 - 用于区分不同的索引
#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum IndexType {
    /// 只包含基本信息的索引
    Basic,
    /// 包含筛选所需的标签和日期索引
    Filter,
    /// 包含全文搜索索引
    Search,
    /// 完整索引，包含所有内容
    Full,
}

/// 索引元数据 - 存储索引的基本信息
#[derive(Serialize, Deserialize, Debug)]
pub struct IndexMetadata {
    /// 索引包含的文章数量
    pub article_count: usize,
    /// 索引包含的标签数量
    pub tag_count: usize,
    /// 索引创建时间
    pub created_at: DateTime<Utc>,
    /// 索引版本
    pub version: String,
    /// 索引类型
    pub index_type: IndexType,
    /// 索引中的词元总数
    pub token_count: usize,
}

/// 标题索引项 - 存储标题与内容匹配关系
#[derive(Serialize, Deserialize, Clone, Debug)]
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
} 