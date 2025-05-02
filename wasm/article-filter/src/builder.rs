use utils_common::models::ArticleMetadata;
use utils_common::compression::to_compressed;
use crate::models::FilterIndex;
use chrono::Datelike;
use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::io::Write;

/// 筛选索引构建器
pub struct FilterBuilder {
    articles: Vec<ArticleMetadata>,
}

impl FilterBuilder {
    /// 创建新的筛选索引构建器
    pub fn new() -> Self {
        Self {
            articles: Vec::new(),
        }
    }

    /// 添加文章到索引构建器
    pub fn add_article(&mut self, article: ArticleMetadata) {
        self.articles.push(article);
    }

    /// 构建筛选索引
    pub fn build_filter_index(&self) -> Result<FilterIndex, String> {
        if self.articles.is_empty() {
            println!("错误: 无法构建索引，没有文章数据");
            return Err("无法构建索引: 没有文章数据".to_string());
        }

        println!("开始构建筛选索引，文章数量: {}", self.articles.len());

        // 创建索引数据结构
        let mut tag_index: HashMap<String, HashSet<usize>> = HashMap::new();
        let mut year_index: HashMap<i32, HashSet<usize>> = HashMap::new();
        let mut month_index: HashMap<String, HashSet<usize>> = HashMap::new();

        // 填充索引
        for (i, article) in self.articles.iter().enumerate() {
            // 标签索引
            for tag in &article.tags {
                tag_index.entry(tag.clone()).or_insert_with(HashSet::new).insert(i);
            }

            // 日期索引
            let date = article.date;
            let year = date.year();
            
            // 按年索引
            year_index.entry(year).or_insert_with(HashSet::new).insert(i);
            
            // 按年月索引 (格式：yyyy-mm)
            let month_key = format!("{}-{:02}", year, date.month());
            month_index.entry(month_key).or_insert_with(HashSet::new).insert(i);
        }

        println!("索引构建完成，标签数量: {}, 年份数量: {}, 月份数量: {}", 
                 tag_index.len(), year_index.len(), month_index.len());

        Ok(FilterIndex {
            articles: self.articles.clone(),
            tag_index,
            year_index,
            month_index,
        })
    }

    /// 保存筛选索引到文件
    pub fn save_filter_index(&self, path: &str) -> Result<(), String> {
        println!("开始保存筛选索引到文件: {}", path);
        
        // 构建过滤索引
        let filter_index = match self.build_filter_index() {
            Ok(index) => {
                println!("成功构建筛选索引，文章: {}，标签: {}", 
                        index.articles.len(), 
                        index.tag_index.len());
                index
            },
            Err(e) => {
                println!("构建筛选索引失败: {}", e);
                return Err(e);
            }
        };
        
        // 保存过滤索引
        let mut filter_file = match File::create(path) {
            Ok(file) => file,
            Err(e) => {
                println!("创建索引文件失败: {}", e);
                return Err(format!("无法创建筛选索引文件: {}", e));
            }
        };
        
        // 使用版本号3.0
        let version = [3, 0];
        
        let compressed_data = match to_compressed(&filter_index, version) {
            Ok(data) => {
                println!("数据压缩成功，压缩后大小: {} 字节", data.len());
                data
            },
            Err(e) => {
                println!("数据压缩失败: {}", e);
                return Err(format!("压缩筛选索引失败: {}", e));
            }
        };
        
        // 写入文件
        match filter_file.write_all(&compressed_data) {
            Ok(_) => {
                println!("筛选索引已成功写入文件: {}，大小: {} 字节", path, compressed_data.len());
            },
            Err(e) => {
                println!("写入筛选索引文件失败: {}", e);
                return Err(format!("无法写入筛选索引文件: {}", e));
            }
        }
        
        Ok(())
    }
} 