use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use utils_common::models::ArticleMetadata;

/// 筛选索引 - 存储标签和日期索引
#[derive(Serialize, Deserialize, Debug)]
pub struct FilterIndex {
    /// 所有文章的元数据列表
    pub articles: Vec<ArticleMetadata>,
    /// 标签到文章ID列表的映射
    pub tag_index: HashMap<String, HashSet<usize>>,
    /// 年份到文章ID列表的映射
    pub year_index: HashMap<i32, HashSet<usize>>,
    /// 月份到文章ID列表的映射（格式：yyyy-mm）
    pub month_index: HashMap<String, HashSet<usize>>,
}

/// 筛选规则 - 定义筛选条件
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FilterRules {
    /// 需要包含的标签列表
    pub tags: Vec<String>,
    /// 排序方式: date_desc, date_asc, title_asc, title_desc
    pub sort_by: String,
}

impl Default for FilterRules {
    fn default() -> Self {
        Self {
            tags: Vec::new(),
            sort_by: "date_desc".to_string(),
        }
    }
} 