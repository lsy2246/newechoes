use utils_common::models::ArticleMetadata;
use utils_common::compression::to_compressed;
use crate::models::{ArticleSearchIndex, HeadingIndexEntry};
use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::io::Write;
use regex::Regex;

/// 简单移除字符串中的HTML标签
fn remove_html_tags(text: &str) -> String {
    let mut result = String::new();
    let mut in_tag = false;
    
    for c in text.chars() {
        if c == '<' {
            in_tag = true;
        } else if c == '>' {
            in_tag = false;
        } else if !in_tag {
            result.push(c);
        }
    }
    
    result.trim().to_string()
}

/// 搜索索引构建器
pub struct SearchBuilder {
    articles: Vec<ArticleMetadata>,
}

impl SearchBuilder {
    /// 创建新的搜索索引构建器
    pub fn new() -> Self {
        Self {
            articles: Vec::new(),
        }
    }

    /// 获取索引构建器中的文章数量
    pub fn get_article_count(&self) -> usize {
        self.articles.len()
    }

    /// 添加文章到索引构建器
    pub fn add_article(&mut self, article: ArticleMetadata) {
        // 只添加非目录页面到索引
        if article.page_type != "directory" {
            self.articles.push(article);
        }
    }

    /// 清理文本，移除不必要的字符和符号
    fn clean_text(&self, text: &str) -> String {
        text.trim().to_lowercase()
    }

    /// 提取关键词
    fn extract_keywords(&self, text: &str) -> Vec<String> {
        let clean_text = self.clean_text(text);
        
        let mut keywords = HashSet::new();
        let mut current_word = String::new();
        let mut chinese_chars = Vec::new();
        
        // 遍历文本字符
        for c in clean_text.chars() {
            if c.is_alphanumeric() || c == '_' || c == '-' {
                // 如果之前有收集的中文字符，先处理
                if !chinese_chars.is_empty() {
                    // 处理中文词组 (2-3个字符组合)
                    for i in 1..=chinese_chars.len().min(3) {
                        for start in 0..=chinese_chars.len() - i {
                            let term: String = chinese_chars[start..start+i].iter().collect();
                            if term.len() >= 2 { // 只添加长度>=2的中文词
                                keywords.insert(term);
                            }
                        }
                    }
                    chinese_chars.clear();
                }
                
                current_word.push(c);
            } else if c.is_whitespace() || c.is_ascii_punctuation() {
                // 处理当前单词
                if !current_word.is_empty() && current_word.len() >= 2 {
                    keywords.insert(current_word.clone());
                    current_word.clear();
                }
                
                // 处理中文字符
                if !chinese_chars.is_empty() {
                    for i in 1..=chinese_chars.len().min(3) {
                        for start in 0..=chinese_chars.len() - i {
                            let term: String = chinese_chars[start..start+i].iter().collect();
                            if term.len() >= 2 {
                                keywords.insert(term);
                            }
                        }
                    }
                    chinese_chars.clear();
                }
            } else {
                // 处理当前英文词
                if !current_word.is_empty() && current_word.len() >= 2 {
                    keywords.insert(current_word.clone());
                    current_word.clear();
                }
                
                // 收集中文字符
                chinese_chars.push(c);
            }
        }
        
        // 处理最后一个单词
        if !current_word.is_empty() && current_word.len() >= 2 {
            keywords.insert(current_word);
        }
        
        // 处理最后的中文字符
        if !chinese_chars.is_empty() {
            for i in 1..=chinese_chars.len().min(3) {
                for start in 0..=chinese_chars.len() - i {
                    let term: String = chinese_chars[start..start+i].iter().collect();
                    if term.len() >= 2 {
                        keywords.insert(term);
                    }
                }
            }
        }
        
        // 过滤纯数字的关键词
        keywords.into_iter()
                .filter(|keyword| !keyword.chars().all(|c| c.is_ascii_digit()))
                .collect()
    }

    /// 提取文章中的标题和层级结构
    fn extract_headings(&self, article: &ArticleMetadata, article_id: usize) -> HashMap<String, HeadingIndexEntry> {
        let headings = HashMap::new();
        
        // 如果内容为空，返回空结果
        if article.content.is_empty() {
            return headings;
        }
        
        // 首先尝试使用文章中已解析的标题（如果有）
        if !article.headings.is_empty() {
            return self.build_heading_structure_from_extracted(&article.headings, article);
        }
        
        // 使用正则表达式匹配所有h1-h6标签
        let heading_regex = Regex::new(r"<h([1-6])(?:\s+[^>]*)?>([\s\S]*?)</h\d>").unwrap();
        
        // 提取所有标题及其位置和级别
        let mut extracted_headings = Vec::new();
        
        for cap in heading_regex.captures_iter(&article.content) {
            // 获取标题级别
            let level = cap.get(1)
                .and_then(|m| m.as_str().parse::<usize>().ok())
                .unwrap_or(1);
            
            // 获取标题文本并清理HTML标签
            let text_with_tags = cap.get(2).map_or("", |m| m.as_str());
            let text = remove_html_tags(text_with_tags).trim().to_string();
            
            // 跳过空标题
            if text.is_empty() {
                continue;
            }
            
            // 记录标题在文档中的位置
            let position = cap.get(0).map_or(0, |m| m.start());
            
            // 添加到提取的标题列表
            extracted_headings.push((level, text, position));
        }
        
        // 如果没有找到标题，尝试使用更宽松的正则表达式
        if extracted_headings.is_empty() {
            // 使用最宽松的正则表达式再次尝试匹配
            let fallback_regex = Regex::new(r"<h\d[^>]*>(.*?)</h\d>").unwrap();
            
            for cap in fallback_regex.captures_iter(&article.content) {
                let text_with_tags = cap.get(1).map_or("", |m| m.as_str());
                let text = remove_html_tags(text_with_tags).trim().to_string();
                
                if text.is_empty() {
                    continue;
                }
                
                let position = cap.get(0).map_or(0, |m| m.start());
                // 默认级别为1
                extracted_headings.push((1, text, position));
            }
        }
        
        // 如果仍然没有找到标题，返回空结果
        if extracted_headings.is_empty() {
            return headings;
        }
        
        // 按位置排序提取的标题
        extracted_headings.sort_by_key(|h| h.2);
        
        // 构建标题层级结构
        self.build_heading_hierarchy(extracted_headings, article)
    }
    
    /// 从提取的标题数组构建标题层级结构
    fn build_heading_hierarchy(
        &self,
        sorted_headings: Vec<(usize, String, usize)>, // (级别, 文本, 位置)
        article: &ArticleMetadata
    ) -> HashMap<String, HeadingIndexEntry> {
        let mut result = HashMap::new();
        let mut heading_stack: Vec<(String, usize)> = Vec::new(); // (ID, 级别)
        let mut children_map: HashMap<String, Vec<String>> = HashMap::new(); // 存储子标题关系
        
        // 遍历排序后的标题，构建层级关系
        for (idx, (level, text, position)) in sorted_headings.iter().enumerate() {
            let heading_id = format!("{}:{}", article.id, idx);
            
            // 确定结束位置 - 下一个标题的开始或文章结束
            let end_position = if idx + 1 < sorted_headings.len() {
                sorted_headings[idx + 1].2
            } else {
                article.content.len()
            };
            
            // 查找父标题: 向上查找堆栈中第一个级别小于当前标题的条目
            let mut parent_id = None;
            
            // 从栈顶开始，移除所有级别>=当前标题的条目
            while let Some((last_id, last_level)) = heading_stack.last() {
                if *last_level >= *level {
                    heading_stack.pop();
                } else {
                    parent_id = Some(last_id.clone());
                    break;
                }
            }
            
            // 如果有父标题，添加到父标题的子标题列表
            if let Some(ref pid) = parent_id {
                children_map.entry(pid.clone())
                    .or_insert_with(Vec::new)
                    .push(heading_id.clone());
            }
            
            // 创建标题条目
            let heading_entry = HeadingIndexEntry {
                id: heading_id.clone(),
                level: *level,
                text: text.clone(),
                start_position: *position,
                end_position,
                parent_id,
                children_ids: Vec::new(), // 暂时为空，稍后填充
            };
            
            // 将当前标题入栈
            heading_stack.push((heading_id.clone(), *level));
            
            // 添加到结果集
            result.insert(heading_id, heading_entry);
        }
        
        // 获取所有标题的位置信息
        let mut position_map = HashMap::new();
        for (id, entry) in &result {
            position_map.insert(id.clone(), entry.start_position);
        }
        
        // 填充并排序子标题列表
        for (parent_id, children) in children_map {
            if let Some(parent) = result.get_mut(&parent_id) {
                // 添加子标题
                parent.children_ids = children;
                
                // 按位置排序
                parent.children_ids.sort_by(|a, b| {
                    let pos_a = position_map.get(a).cloned().unwrap_or(0);
                    let pos_b = position_map.get(b).cloned().unwrap_or(0);
                    pos_a.cmp(&pos_b)
                });
            }
        }
        
        result
    }
    
    /// 从预解析的标题列表构建层级结构
    fn build_heading_structure_from_extracted(
        &self, 
        headings: &[utils_common::models::Heading], 
        article: &ArticleMetadata
    ) -> HashMap<String, HeadingIndexEntry> {
        // 将预解析的标题转换为(级别, 文本, 位置)的格式
        let mut extracted: Vec<(usize, String, usize)> = headings.iter()
            .map(|h| (h.level, h.text.clone(), h.position))
            .collect();
        
        // 按位置排序
        extracted.sort_by_key(|h| h.2);
        
        // 构建层级结构
        self.build_heading_hierarchy(extracted, article)
    }

    /// 构建搜索索引
    pub fn build_search_index(&self) -> Result<ArticleSearchIndex, String> {
        if self.articles.is_empty() {
            return Err("无法构建索引: 没有文章数据".to_string());
        }

        // 构建标题关键词到文章的索引
        let title_term_index = self.build_title_term_index();
        
        // 提取所有文章的标题结构
        let mut all_headings = HashMap::new();
        
        for (article_id, article) in self.articles.iter().enumerate() {
            // 提取标题结构
            let article_headings = self.extract_headings(article, article_id);
            
            // 合并到全局索引
            all_headings.extend(article_headings);
        }
        
        // 构建标题关键词索引
        let heading_term_index = self.build_heading_term_index(&all_headings);
        
        // 定义停用词表
        let stop_words: HashSet<&str> = [
            "的", "是", "在", "了", "和", "与", "或", "而", "但", "如果", "因为",
            "所以", "这", "那", "这个", "那个", "这些", "那些", "并", "可以", "把",
            "被", "将", "已", "就", "也", "很", "到", "上", "下", "中", "为"
        ].iter().cloned().collect();
        
        // 统计词频
        let mut term_frequency: HashMap<String, usize> = HashMap::new();
        
        // 构建内容关键词索引
        let mut content_term_index: HashMap<String, HashSet<usize>> = HashMap::new();
        
        // 遍历所有文章，提取关键词和构建内容索引
        for (article_id, article) in self.articles.iter().enumerate() {
            // 标题关键词
            let title_keywords = self.extract_keywords(&article.title);
            for keyword in &title_keywords {
                if !stop_words.contains(keyword.as_str()) && keyword.len() >= 2 {
                    *term_frequency.entry(keyword.clone()).or_insert(0) += 3; // 标题权重高
                }
            }
            
            // 内容关键词
            let content_keywords = self.extract_keywords(&article.content);
            let mut content_term_freq: HashMap<String, usize> = HashMap::new();
            
            // 先统计文章内的词频
            for keyword in content_keywords {
                if !stop_words.contains(keyword.as_str()) && keyword.len() >= 2 {
                    *content_term_freq.entry(keyword.clone()).or_insert(0) += 1;
                    
                    // 同时添加到内容关键词索引
                    content_term_index.entry(keyword)
                                     .or_insert_with(HashSet::new)
                                     .insert(article_id);
                }
            }
            
            // 只保留高频词（出现至少2次）添加到全局词频统计
            for (keyword, freq) in content_term_freq.iter() {
                if *freq >= 2 {
                    *term_frequency.entry(keyword.clone()).or_insert(0) += 1;
                }
            }
        }
        
        // 选择最常用的词作为常用词汇
        let mut terms: Vec<(String, usize)> = term_frequency.into_iter().collect();
        terms.sort_by(|a, b| b.1.cmp(&a.1)); // 按频率降序排序
        
        let mut common_terms = HashMap::new();
        
        // 添加常用词
        for (term, freq) in terms.into_iter().take(500) {
            common_terms.insert(term, freq);
        }

        // 输出构建统计
        println!("索引构建统计:");
        println!("- 文章数量: {}", self.articles.len());
        println!("- 标题词汇: {}", title_term_index.len());
        println!("- 标题结构: {}", all_headings.len());
        println!("- 内容词汇: {}", content_term_index.len());
        println!("- 常用词汇: {}", common_terms.len());

        Ok(ArticleSearchIndex {
            title_term_index,
            articles: self.articles.clone(),
            heading_index: all_headings,
            heading_term_index,
            common_terms,
            content_term_index,
        })
    }

    /// 保存搜索索引到文件
    pub fn save_search_index(&self, path: &str) -> Result<(), String> {
        // 构建搜索索引
        let search_index = self.build_search_index()?;
        
        // 保存搜索索引
        let mut search_file = File::create(path)
            .map_err(|e| format!("无法创建搜索索引文件: {}", e))?;
        
        // 使用版本号7.0，表示优化版本索引
        let version = [7, 0];
        let compressed_data = to_compressed(&search_index, version)
            .map_err(|e| format!("压缩搜索索引失败: {}", e))?;
        
        search_file.write_all(&compressed_data)
            .map_err(|e| format!("无法写入搜索索引文件: {}", e))?;
        
        Ok(())
    }

    /// 构建标题关键词索引
    fn build_heading_term_index(&self, headings: &HashMap<String, HeadingIndexEntry>) -> HashMap<String, HashSet<String>> {
        let mut heading_term_index = HashMap::new();
        
        for (heading_id, heading) in headings {
            // 提取标题文本的关键词
            let heading_keywords = self.extract_keywords(&heading.text);
            
            // 添加到索引
            for keyword in heading_keywords {
                heading_term_index.entry(keyword)
                                 .or_insert_with(HashSet::new)
                                 .insert(heading_id.clone());
            }
        }
        
        heading_term_index
    }

    /// 构建标题关键词到文章的索引
    fn build_title_term_index(&self) -> HashMap<String, HashSet<usize>> {
        let mut title_term_index = HashMap::new();
        
        for (article_id, article) in self.articles.iter().enumerate() {
            // 从标题中提取关键词
            let title_keywords = self.extract_keywords(&article.title);
            
            // 添加到索引
            for keyword in title_keywords {
                title_term_index.entry(keyword)
                              .or_insert_with(HashSet::new)
                              .insert(article_id);
            }
            
            // 额外处理：标题中的各个单词
            let title_words: Vec<String> = article.title
                .to_lowercase()
                .split_whitespace()
                .map(|s| s.trim_matches(|c: char| !c.is_alphanumeric() && c != '_' && c != '-'))
                .filter(|s| s.len() >= 2)
                .map(|s| s.to_string())
                .collect();
                
            for word in title_words {
                title_term_index.entry(word)
                          .or_insert_with(HashSet::new)
                          .insert(article_id);
            }
        }
        
        title_term_index
    }
} 