use wasm_bindgen::prelude::*;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::io;
use once_cell::sync::OnceCell;
use std::sync::Mutex;
use serde_json;
use web_sys::console;
use utils_common::compression as utils;

// 导出模块
pub mod models;
pub mod builder;

// 全局索引存储
static INDEX: OnceCell<Mutex<Option<ArticleIndex>>> = OnceCell::new();

/// 初始化函数 - 设置错误处理
#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
}

/// 版本信息
#[wasm_bindgen]
pub fn version() -> String {
    "3.1.0".to_string() // 简化版本，移除了搜索功能
}

//===== Models 部分 =====

/// 简化的文章元数据 - 只包含展示所需信息
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
}

/// 文章索引 - 存储所有文章和索引数据
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ArticleIndex {
    /// 所有文章的元数据列表
    pub articles: Vec<ArticleMetadata>,
    /// 标签索引: 标签名 -> 文章ID列表
    pub tag_index: HashMap<String, Vec<usize>>,
}

/// 筛选参数 - 客户端传递的筛选条件
#[derive(Deserialize, Debug, Default)]
pub struct FilterParams {
    /// 标签筛选条件 (可选)
    pub tags: Option<Vec<String>>,
    /// 排序方式: "newest", "oldest", "title_asc", "title_desc" (可选)
    pub sort: Option<String>,
    /// 分页 - 当前页码 (可选, 默认为1)
    pub page: Option<usize>,
    /// 分页 - 每页条数 (可选, 默认为12)
    pub limit: Option<usize>,
    /// 日期筛选: "all" 或 "startDate,endDate" 格式的日期范围
    pub date: Option<String>,
}

/// 筛选结果 - 返回给客户端的筛选结果
#[derive(Serialize, Debug)]
pub struct FilterResult {
    /// 筛选后的文章列表
    pub articles: Vec<ArticleMetadata>,
    /// 筛选结果总数
    pub total: usize,
    /// 当前页码
    pub page: usize,
    /// 每页条数
    pub limit: usize,
    /// 总页数
    pub total_pages: usize,
}

impl ArticleIndex {
    /// 从压缩的二进制数据恢复索引
    pub fn from_compressed(data: &[u8]) -> Result<Self, io::Error> {
        utils::from_compressed_with_max_version(data, 3)
    }
}

/// 文章过滤器 - 处理文章筛选逻辑
pub struct ArticleFilter;

impl ArticleFilter {
    /// 加载索引数据
    pub fn load_index(data: &[u8]) -> Result<(), String> {
        // 将FilterIndex转换为ArticleIndex
        let filter_index = match utils::from_compressed_with_max_version::<crate::models::FilterIndex>(data, 3) {
            Ok(index) => {
                index
            },
            Err(e) => {
                console::log_1(&JsValue::from_str(&format!("索引解析失败: {}", e)));
                return Err(format!("解析索引失败: {}", e));
            }
        };
        
        // 转换为ArticleIndex
        let article_index = Self::convert_filter_to_article_index(filter_index);
        
        // 存储到全局变量
        INDEX.get_or_init(|| Mutex::new(Some(article_index)));
        Ok(())
    }
    
    // 将FilterIndex转换为ArticleIndex
    fn convert_filter_to_article_index(filter_index: crate::models::FilterIndex) -> ArticleIndex {
        // 转换文章元数据
        let articles: Vec<ArticleMetadata> = filter_index.articles
            .into_iter()
            .map(|article| {
                // 只保留需要的字段
                ArticleMetadata {
                    id: article.id,
                    title: article.title,
                    summary: article.summary,
                    date: article.date,
                    tags: article.tags,
                    url: article.url,
                }
            })
            .collect();
        
        // 转换标签索引
        let mut tag_index = HashMap::new();
        for (tag, article_ids) in filter_index.tag_index {
            tag_index.insert(tag, article_ids.into_iter().collect::<Vec<_>>());
        }
        
        ArticleIndex {
            articles,
            tag_index,
        }
    }
    
    /// 获取所有标签
    pub fn get_all_tags() -> Result<Vec<String>, String> {
        // 获取索引
        let index_mutex = INDEX.get().ok_or("索引未初始化")?;
        let index_guard = index_mutex.lock().map_err(|_| "获取索引锁失败")?;
        let index = index_guard.as_ref().ok_or("索引为空")?;
        
        // 提取所有标签
        let tags = index.tag_index.keys().cloned().collect();
        Ok(tags)
    }
    
    /// 筛选文章
    pub fn filter_articles(params: &FilterParams) -> Result<FilterResult, String> {
        // 获取索引
        let index_mutex = INDEX.get().ok_or("索引未初始化")?;
        let index_guard = index_mutex.lock().map_err(|_| "获取索引锁失败")?;
        let index = index_guard.as_ref().ok_or("索引为空")?;
        
        // 筛选候选文章
        let candidate_ids = Self::apply_filters(index, params)?;
        
        // 从ID获取文章元数据
        let mut filtered_articles = candidate_ids
            .into_iter()
            .filter_map(|id| index.articles.get(id).cloned())
            .collect::<Vec<_>>();
        
        // 排序
        Self::apply_sorting(&mut filtered_articles, params);
        
        // 分页
        let page = params.page.unwrap_or(1).max(1);
        let limit = params.limit.unwrap_or(12).max(1);
        let total = filtered_articles.len();
        let total_pages = (total + limit - 1) / limit.max(1);
        let page = page.min(total_pages.max(1));
        
        let start = (page - 1) * limit;
        let end = (start + limit).min(total);
        
        let paged_articles = if start < filtered_articles.len() {
            filtered_articles[start..end].to_vec()
        } else {
            Vec::new()
        };
        
        // 构建结果
        Ok(FilterResult {
            articles: paged_articles,
            total,
            page,
            limit,
            total_pages,
        })
    }
    
    // 应用筛选条件
    fn apply_filters(index: &ArticleIndex, params: &FilterParams) -> Result<Vec<usize>, String> {
        // 初始化候选文章 ID 集合，默认包含所有文章
        let mut candidate_ids: HashSet<usize> = (0..index.articles.len()).collect();

        // 标签筛选
        if let Some(tags) = &params.tags {
            if !tags.is_empty() {
                let tag_candidates = Self::filter_by_tags(index, tags);
                
                // 保留同时存在于两个集合中的元素
                candidate_ids.retain(|id| tag_candidates.contains(id));
            }
        }
        
        // 日期筛选
        if let Some(date_param) = &params.date {
            if date_param != "all" {
                // 解析日期范围（格式: "startDate,endDate"）
                let date_parts: Vec<&str> = date_param.split(',').collect();
                let start_date_str = date_parts.get(0).map(|s| *s).unwrap_or("");
                let end_date_str = date_parts.get(1).map(|s| *s).unwrap_or("");
                
                let has_start_date = !start_date_str.is_empty();
                let has_end_date = !end_date_str.is_empty();
                
                if has_start_date && has_end_date {
                    // 两个日期都存在的情况
                    // 尝试解析日期
                    let start_date_fmt = format!("{}T00:00:00Z", start_date_str);
                    let end_date_fmt = format!("{}T23:59:59Z", end_date_str);
                    
                    match (
                        chrono::DateTime::parse_from_rfc3339(&start_date_fmt),
                        chrono::DateTime::parse_from_rfc3339(&end_date_fmt)
                    ) {
                        (Ok(start), Ok(end)) => {
                            let start_utc = start.with_timezone(&chrono::Utc);
                            let end_utc = end.with_timezone(&chrono::Utc);
                            
                            candidate_ids.retain(|&id| {
                                if let Some(article) = index.articles.get(id) {
                                    article.date >= start_utc && article.date <= end_utc
                                } else {
                                    false
                                }
                            });
                        },
                        _ => {}
                    }
                } else if has_start_date {
                    // 只有开始日期的情况
                    let start_date_fmt = format!("{}T00:00:00Z", start_date_str);
                    
                    if let Ok(start) = chrono::DateTime::parse_from_rfc3339(&start_date_fmt) {
                        let start_utc = start.with_timezone(&chrono::Utc);
                        
                        candidate_ids.retain(|&id| {
                            if let Some(article) = index.articles.get(id) {
                                article.date >= start_utc
                            } else {
                                false
                            }
                        });
                    }
                } else if has_end_date {
                    // 只有结束日期的情况
                    let end_date_fmt = format!("{}T23:59:59Z", end_date_str);
                    
                    if let Ok(end) = chrono::DateTime::parse_from_rfc3339(&end_date_fmt) {
                        let end_utc = end.with_timezone(&chrono::Utc);
                        
                        candidate_ids.retain(|&id| {
                            if let Some(article) = index.articles.get(id) {
                                article.date <= end_utc
                            } else {
                                false
                            }
                        });
                    }
                }
            }
        }
        
        Ok(candidate_ids.into_iter().collect())
    }
    
    // 按标签筛选
    fn filter_by_tags(index: &ArticleIndex, tags: &[String]) -> HashSet<usize> {
        let mut result = HashSet::new();
        
        for tag in tags {
            if let Some(article_ids) = index.tag_index.get(tag) {
                for &id in article_ids {
                    result.insert(id);
                }
            }
        }
        
        result
    }
    
    // 应用排序
    fn apply_sorting(articles: &mut [ArticleMetadata], params: &FilterParams) {
        match params.sort.as_deref() {
            Some("oldest") => {
                articles.sort_by(|a, b| a.date.cmp(&b.date));
            }
            Some("title_asc") => {
                articles.sort_by(|a, b| a.title.cmp(&b.title));
            }
            Some("title_desc") => {
                articles.sort_by(|a, b| b.title.cmp(&a.title));
            }
            _ => {
                // 默认按最新排序
                articles.sort_by(|a, b| b.date.cmp(&a.date));
            }
        }
    }
}

/// 文章过滤器JS接口 - 提供给JavaScript使用的筛选API
#[wasm_bindgen]
pub struct ArticleFilterJS;

#[wasm_bindgen]
impl ArticleFilterJS {
    /// 初始化过滤器并加载索引
    #[wasm_bindgen]
    pub fn init(index_data: &[u8]) -> Result<(), JsValue> {
        console_error_panic_hook::set_once();
        
        let result = ArticleFilter::load_index(index_data)
            .map_err(|e| {
                console::log_1(&JsValue::from_str(&format!("初始化过滤器失败: {}", e)));
                JsValue::from_str(&e)
            });
            
        result
    }
    
    /// 获取所有标签
    #[wasm_bindgen]
    pub fn get_all_tags() -> Result<JsValue, JsValue> {
        let tags = ArticleFilter::get_all_tags()
            .map_err(|e| JsValue::from_str(&e))?;
        
        serde_wasm_bindgen::to_value(&tags)
            .map_err(|e| JsValue::from_str(&format!("序列化标签失败: {}", e)))
    }
    
    /// 筛选文章
    #[wasm_bindgen]
    pub fn filter_articles(params_json: &str) -> Result<JsValue, JsValue> {
        // 解析参数
        let params: FilterParams = serde_json::from_str(params_json)
            .map_err(|e| JsValue::from_str(&format!("解析参数失败: {}", e)))?;
        
        // 筛选文章
        let result = ArticleFilter::filter_articles(&params)
            .map_err(|e| JsValue::from_str(&e))?;
        
        // 序列化结果
        serde_wasm_bindgen::to_value(&result)
            .map_err(|e| JsValue::from_str(&format!("序列化结果失败: {}", e)))
    }
}
