use wasm_bindgen::prelude::*;
use utils_common::compression::from_compressed_with_max_version;
use crate::models::{ArticleSearchIndex, SearchRequest, SearchResult, SearchResultItem, HeadingNode, HeadingIndexEntry, SuggestionCandidate, SearchSuggestion, SuggestionType};
use std::collections::{HashMap, HashSet};
use web_sys;
pub mod models;
pub mod builder;

/// WASM入口点 - 搜索文章
#[wasm_bindgen]
pub fn search_articles(index_data: &[u8], request_json: &str) -> Result<String, JsValue> {
    // 捕获Rust panic并转换为JS错误
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
    
    let start_time = web_sys::window()
        .and_then(|w| w.performance())
        .map(|p| p.now())
        .unwrap_or(0.0);
    
    // 解析搜索请求
    let req: SearchRequest = match serde_json::from_str(request_json) {
        Ok(r) => r,
        Err(e) => {
            return Err(JsValue::from_str(&format!("解析搜索请求失败: {}", e)));
        }
    };
    
    // 解压缩搜索索引
    let search_index = match from_compressed_with_max_version::<ArticleSearchIndex>(index_data, 9) {
        Ok(idx) => idx,
        Err(e) => {
            return Err(JsValue::from_str(&format!("解压搜索索引失败: {}", e)));
        }
    };
    
    // 执行搜索
    let mut result = match req.search_type.as_str() {
        "autocomplete" => perform_autocomplete(&search_index, &req),
        _ => perform_search(&search_index, &req),
    };
    
    // 计算执行时间
    let end_time = web_sys::window()
        .and_then(|w| w.performance())
        .map(|p| p.now())
        .unwrap_or(0.0);
    
    let time_ms = (end_time - start_time) as usize;
    result.time_ms = time_ms;
    
    // 序列化结果
    match serde_json::to_string(&result) {
        Ok(json) => Ok(json),
        Err(e) => Err(JsValue::from_str(&format!("序列化搜索结果失败: {}", e))),
    }
}

/// 分割查询为词条
fn split_query_to_terms(query: &str) -> Vec<String> {
    let mut terms = Vec::new();
    
    // 添加原始查询作为第一个词条
    let clean_query = query.trim().to_lowercase();
    if !clean_query.is_empty() {
        terms.push(clean_query.clone());
    }
    
    // 不再分割查询为多个词条，简化搜索逻辑
    // 如果需要，可以在这里添加分词逻辑
    
    terms
}

/// 获取搜索建议
fn get_search_suggestions(search_index: &ArticleSearchIndex, query: &str) -> Vec<SearchSuggestion> {
    let query = query.trim().to_lowercase();
    
    // 如果查询为空，返回热门词汇
    if query.is_empty() {
        let mut common_terms: Vec<(String, usize)> = search_index.common_terms
            .iter()
            .map(|(term, freq)| (term.clone(), *freq))
            .collect();
        
        common_terms.sort_by(|a, b| b.1.cmp(&a.1)); // 按频率降序排序
        
        return common_terms.iter().take(10).map(|(term, _)| {
            SearchSuggestion {
                text: term.clone(),
                suggestion_type: SuggestionType::Completion,
                matched_text: String::new(),
                suggestion_text: term.clone(),
            }
        }).collect();
    }
    
    // 保存所有候选建议
    let mut candidates: Vec<SuggestionCandidate> = Vec::new();
    
    // 第1步: 标题完全匹配
    for (_, article) in search_index.articles.iter().enumerate() {
        let title_lower = article.title.to_lowercase();
        
        if title_lower == query {
            // 找到完全匹配标题的文章，不返回完全相同的建议
            continue;
        } else if title_lower.starts_with(&query) {
            // 标题以查询开头，作为前缀补全
            candidates.push(SuggestionCandidate {
                text: article.title.clone(),
                score: 100,
                suggestion_type: SuggestionType::Completion,
                frequency: 100
            });
        } else if title_lower.contains(&query) {
            // 标题包含查询，作为纠正建议
            candidates.push(SuggestionCandidate {
                text: article.title.clone(),
                score: 90,
                suggestion_type: SuggestionType::Correction,
                frequency: 90
            });
        }
    }
    
    // 第2步: 独立词汇匹配
    for (term, freq) in &search_index.common_terms {
        let term_lower = term.to_lowercase();
        
        // 跳过与查询完全相同的词汇
        if term_lower == query {
            continue;
        }
        
        if term_lower.starts_with(&query) {
            // 前缀匹配，作为补全建议
            candidates.push(SuggestionCandidate {
                text: term.clone(),
                score: 95,
                suggestion_type: SuggestionType::Completion,
                frequency: *freq
            });
        } else if term_lower.contains(&query) {
            // 包含关系，作为纠正建议
            candidates.push(SuggestionCandidate {
                text: term.clone(),
                score: 85,
                suggestion_type: SuggestionType::Correction,
                frequency: *freq
            });
        }
    }
    
    // 第3步: 编辑距离匹配
    if candidates.len() < 5 {
        for (term, freq) in &search_index.common_terms {
            let term_lower = term.to_lowercase();
            
            // 跳过已添加的词汇和完全相同的词汇
            if term_lower == query || candidates.iter().any(|s| s.text.to_lowercase() == term_lower) {
                continue;
            }
            
            // 计算编辑距离
            let distance = levenshtein_distance(&query, &term_lower);
            
            // 只考虑编辑距离较小的词
            let max_allowed_distance = query.len().min(3);
            if distance <= max_allowed_distance as i32 {
                // 编辑距离分数: 基础分80,减去距离值
                let edit_score = 80 - distance * 5;
                
                candidates.push(SuggestionCandidate {
                    text: term.clone(),
                    score: edit_score,
                    suggestion_type: SuggestionType::Correction,
                    frequency: *freq
                });
            }
        }
    }
    
    // 首先按分数和频率排序
    candidates.sort_by(|a, b| {
        match b.score.cmp(&a.score) {
            std::cmp::Ordering::Equal => b.frequency.cmp(&a.frequency),
            other => other
        }
    });
    
    // 转换为SearchSuggestion格式并截取前10个结果
    candidates.iter()
        .take(10)
        .map(|candidate| {
            let text_lower = candidate.text.to_lowercase();
            
            let (matched_text, suggestion_text) = match candidate.suggestion_type {
                SuggestionType::Completion if text_lower.starts_with(&query) => {
                    // 前缀匹配：分离已匹配部分和建议部分，保留原始大小写
                    let original_case_matched = &candidate.text[..query.len()];
                    let original_case_suggestion = &candidate.text[query.len()..];
                    (original_case_matched.to_string(), original_case_suggestion.to_string())
                },
                _ => {
                    // 纠正建议：用户输入作为匹配部分，完整建议作为建议部分
                    (query.to_string(), candidate.text.clone())
                }
            };
            
            SearchSuggestion {
                text: candidate.text.clone(),
                suggestion_type: candidate.suggestion_type.clone(),
                matched_text,
                suggestion_text,
            }
        })
        .collect()
}

/// 计算两个字符串之间的Levenshtein编辑距离
fn levenshtein_distance(s1: &str, s2: &str) -> i32 {
    let s1_chars: Vec<char> = s1.chars().collect();
    let s2_chars: Vec<char> = s2.chars().collect();
    
    let m = s1_chars.len();
    let n = s2_chars.len();
    
    // 如果任何一个字符串为空，编辑距离就是另一个的长度
    if m == 0 { return n as i32; }
    if n == 0 { return m as i32; }
    
    // 为动态规划创建距离矩阵
    let mut matrix = vec![vec![0; n + 1]; m + 1];
    
    // 初始化第一行和第一列
    for i in 0..=m {
        matrix[i][0] = i as i32;
    }
    for j in 0..=n {
        matrix[0][j] = j as i32;
    }
    
    // 填充剩余的矩阵
    for i in 1..=m {
        for j in 1..=n {
            let cost = if s1_chars[i-1] == s2_chars[j-1] { 0 } else { 1 };
            
            matrix[i][j] = std::cmp::min(
                std::cmp::min(
                    matrix[i-1][j] + 1,     // 删除
                    matrix[i][j-1] + 1      // 插入
                ),
                matrix[i-1][j-1] + cost     // 替换
            );
        }
    }
    
    // 矩阵右下角的值就是编辑距离
    matrix[m][n]
}

/// 执行自动补全
fn perform_autocomplete(search_index: &ArticleSearchIndex, req: &SearchRequest) -> SearchResult {
    let query = req.query.to_lowercase();
    
    // 如果查询为空，返回空结果
    if query.is_empty() {
        return SearchResult {
            items: Vec::new(),
            total: 0,
            page: 1,
            page_size: 10,
            total_pages: 0,
            time_ms: 0,
            query: query.clone(),
            suggestions: Vec::new(),
        };
    }
    
    // 使用与普通搜索相同的建议生成逻辑
    let suggestions = get_search_suggestions(search_index, &query);
    
    SearchResult {
        items: Vec::new(), // 自动补全不需要返回结果项
        total: suggestions.len(),
        page: 1,
        page_size: suggestions.len(),
        total_pages: 1,
        time_ms: 0, // 由外部函数填充
        query: query.clone(),
        suggestions,
    }
}

/// 执行搜索
fn perform_search(search_index: &ArticleSearchIndex, req: &SearchRequest) -> SearchResult {
    let query = req.query.to_lowercase();
    
    // 如果查询为空，返回空结果
    if query.is_empty() {
        return SearchResult {
            items: Vec::new(),
            total: 0,
            page: req.page,
            page_size: req.page_size,
            total_pages: 0,
            time_ms: 0,
            query: query.clone(),
            suggestions: Vec::new(),
        };
    }
    
    // 分词 - 第一个词是完整查询
    let terms = split_query_to_terms(&query);
    if terms.is_empty() {
        return SearchResult {
            items: Vec::new(),
            total: 0,
            page: req.page,
            page_size: req.page_size,
            total_pages: 0,
            time_ms: 0,
            query: query.clone(),
            suggestions: Vec::new(),
        };
    }
    
    // 找到匹配的文章ID及其得分 - 已按匹配优先级排序
    let matched_articles = find_matched_articles(search_index, &terms);
    
    // 处理每个匹配的文章
    let mut all_items = Vec::new();
    
    for (article_id, base_score) in matched_articles {
        if article_id >= search_index.articles.len() {
            continue;
        }
        
        let article = &search_index.articles[article_id];
        
        // 构建标题树和匹配内容
        let heading_tree = build_heading_tree_with_matches(article, &terms, search_index);
        
        // 高亮处理文章标题
        let highlighted_title = if !terms.is_empty() {
            highlight_title(&article.title, &terms[0])
        } else {
            article.title.clone()
        };
        
        // 创建搜索结果项
        let result_item = SearchResultItem {
            id: article.id.clone(),
            title: highlighted_title,
            summary: article.summary.clone(),
            url: article.url.clone(),
            score: base_score,
            heading_tree,
            page_type: article.page_type.clone(),
        };
        
        all_items.push(result_item);
    }
    
    // 分页处理
    let total = all_items.len();
    let total_pages = (total + req.page_size - 1) / req.page_size;
    let start_idx = (req.page - 1) * req.page_size;
    let end_idx = std::cmp::min(start_idx + req.page_size, total);
    
    let paged_results = if start_idx < total {
        all_items[start_idx..end_idx].to_vec()
    } else {
        Vec::new()
    };
    
    // 生成搜索建议
    let suggestions = get_search_suggestions(search_index, &query);
    
    SearchResult {
        items: paged_results,
        total,
        page: req.page,
        page_size: req.page_size,
        total_pages,
        time_ms: 0, // 由外部函数填充
        query: query.clone(),
        suggestions,
    }
}

/// 高亮处理标题文本
fn highlight_title(title: &str, query: &str) -> String {
    if title.is_empty() || query.is_empty() {
        return title.to_string();
    }

    let title_lower = title.to_lowercase();
    let query_lower = query.to_lowercase();
    
    // 查找所有匹配位置
    let mut term_positions = Vec::new();
    let mut start_idx = 0;
    
    while start_idx < title_lower.len() {
        if let Some(found_idx) = title_lower[start_idx..].find(&query_lower) {
            let abs_idx = start_idx + found_idx;
            let match_end = abs_idx + query_lower.len();
            
            // 确保索引位于字符边界上
            let valid_abs_idx = find_char_boundary(title, abs_idx);
            let valid_match_end = find_char_boundary(title, match_end);
            
            // 添加匹配位置
            if valid_match_end > valid_abs_idx {
                term_positions.push((valid_abs_idx, valid_match_end));
            }
            
            start_idx = if valid_match_end > start_idx { valid_match_end } else { start_idx + 1 };
        } else {
            break;
        }
    }
    
    // 如果没有找到匹配，返回原始标题
    if term_positions.is_empty() {
        return title.to_string();
    }
    
    // 按位置排序
    term_positions.sort_by_key(|&(start, _)| start);
    
    // 构建高亮标题
    let mut highlighted = String::new();
    let mut last_pos = 0;
    
    for (start, end) in term_positions {
        // 添加匹配前的文本
        if start > last_pos {
            highlighted.push_str(&title[last_pos..start]);
        }
        
        // 添加高亮标记
        highlighted.push_str("<mark>");
        highlighted.push_str(&title[start..end]);
        highlighted.push_str("</mark>");
        
        last_pos = end;
    }
    
    // 添加最后一部分
    if last_pos < title.len() {
        highlighted.push_str(&title[last_pos..]);
    }
    
    highlighted
}

/// 查找匹配的文章ID并按优先级排序
fn find_matched_articles(search_index: &ArticleSearchIndex, terms: &[String]) -> Vec<(usize, f64)> {
    // 确保有搜索词
    if terms.is_empty() {
        return Vec::new();
    }
    
    let query = &terms[0].to_lowercase();
    let mut result_with_scores: Vec<(usize, f64)> = Vec::new();
    let mut seen_articles = HashSet::new();
    
    // 第1步: 查找以查询开头的标题 (如"wasm入门指南")
    for (article_id, article) in search_index.articles.iter().enumerate() {
        let title_lower = article.title.to_lowercase();
        
        if title_lower.starts_with(query) && title_lower != *query {
            result_with_scores.push((article_id, 115.0));
            seen_articles.insert(article_id);
        }
    }
    
    // 第2步: 查找包含查询的标题 (如"使用wasm")
    for (article_id, article) in search_index.articles.iter().enumerate() {
        if seen_articles.contains(&article_id) {
            continue;
        }
        
        let title_lower = article.title.to_lowercase();
        
        if title_lower.contains(query) {
            // 标题中包含查询词
            result_with_scores.push((article_id, 99.0));
            seen_articles.insert(article_id);
        }
    }
    
    // 第3步: 查找标题与查询完全匹配的文章 (如只有"wasm")
    for (article_id, article) in search_index.articles.iter().enumerate() {
        if seen_articles.contains(&article_id) {
            continue;
        }
        
        let title_lower = article.title.to_lowercase();
        
        if title_lower == *query {
            result_with_scores.push((article_id, 90.0));
            seen_articles.insert(article_id);
        }
    }
    
    // 第4步: 从索引中查找匹配
    if let Some(article_ids) = search_index.title_term_index.get(query) {
        for &article_id in article_ids {
            if seen_articles.contains(&article_id) {
                continue;
            }
            
            result_with_scores.push((article_id, 85.0));
            seen_articles.insert(article_id);
        }
    }
    
    // 第5步: 从标题关键词索引中查找
    if let Some(heading_ids) = search_index.heading_term_index.get(query) {
        for heading_id in heading_ids {
            if let Some(article_id) = extract_article_id_from_heading(heading_id) {
                if seen_articles.contains(&article_id) || article_id >= search_index.articles.len() {
                    continue;
                }
                
                result_with_scores.push((article_id, 80.0));
                seen_articles.insert(article_id);
            }
        }
    }
    
    // 第6步: 从内容索引中查找
    if let Some(article_ids) = search_index.content_term_index.get(query) {
        for &article_id in article_ids {
            if seen_articles.contains(&article_id) || article_id >= search_index.articles.len() {
                continue;
            }
            
            result_with_scores.push((article_id, 75.0));
            seen_articles.insert(article_id);
        }
    }
    
    // 第7步: 如果没有找到任何匹配，尝试更宽松的匹配
    if result_with_scores.is_empty() {
        // 对所有文章内容进行更宽松的搜索
        for (article_id, article) in search_index.articles.iter().enumerate() {
            let content_lower = article.content.to_lowercase();
            
            if content_lower.contains(query) {
                result_with_scores.push((article_id, 50.0));
            }
        }
    }
    
    // 按分数降序排序
    result_with_scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    
    result_with_scores
}

/// 从标题ID中提取文章ID
fn extract_article_id_from_heading(heading_id: &str) -> Option<usize> {
    // 标题ID的格式为 "article_id:heading_index"
    if let Some(colon_pos) = heading_id.find(':') {
        if let Some(article_id_str) = heading_id.get(0..colon_pos) {
            return article_id_str.parse::<usize>().ok();
        }
    }
    None
}

/// 在文章内容中查找匹配词，并提取段落上下文
fn find_matches_in_paragraph(article: &utils_common::models::ArticleMetadata, heading: &HeadingIndexEntry, terms: &[String]) -> Option<(String, Vec<String>)> {
    // 提取标题下的内容，确保位置在有效的字符边界上
    let mut content_start = heading.start_position + heading.text.len() + heading.level + 1; // +1 for the space
    let mut content_end = heading.end_position;
    
    // 确保起始位置是有效的字符边界
    if content_start < article.content.len() {
        content_start = find_char_boundary(&article.content, content_start);
    }
    
    // 确保结束位置是有效的字符边界
    if content_end > article.content.len() {
        content_end = article.content.len();
    }
    content_end = find_char_boundary(&article.content, content_end);
    
    // 确保有效的内容
    if content_start >= content_end || content_start >= article.content.len() {
        return None;
    }
    
    // 提取标题下的内容
    let content = &article.content[content_start..content_end];
    
    // 如果内容为空，则返回None
    if content.trim().is_empty() {
        return None;
    }
    
    // 在内容中查找匹配
    let content_lower = content.to_lowercase();
    let mut matched_terms = Vec::new();
    let mut term_positions = Vec::new();
    
    // 仅匹配完整查询
    if !terms.is_empty() {
        let complete_query = &terms[0].to_lowercase();
        
        // 查找完整查询在内容中的所有位置
        let mut start_idx = 0;
        while start_idx < content_lower.len() {
            if let Some(found_idx) = content_lower[start_idx..].find(complete_query) {
                let abs_idx = start_idx + found_idx;
                let match_end = abs_idx + complete_query.len();
                
                // 确保索引位于字符边界上
                let valid_abs_idx = find_char_boundary(content, abs_idx);
                let valid_match_end = find_char_boundary(content, match_end);
                
                // 确保匹配区域有效
                if valid_match_end > valid_abs_idx {
                    // 添加匹配位置
                    term_positions.push((valid_abs_idx, valid_match_end, 1));
                    matched_terms.push(terms[0].clone());
                }
                
                // 继续搜索
                start_idx = if valid_match_end > start_idx { valid_match_end } else { start_idx + 1 };
            } else {
                // 没有更多匹配
                break;
            }
        }
    }
    
    // 如果没有匹配，返回None
    if term_positions.is_empty() {
        return None;
    }
    
    // 对匹配位置排序（按位置）
    term_positions.sort_by_key(|&(start, _, _)| start);
    
    // 去除重复的匹配词
    matched_terms.sort();
    matched_terms.dedup();
    
    // 格式化匹配内容
    let highlighted_content = format_matched_content(content, &term_positions);
    
    Some((highlighted_content, matched_terms))
}

/// 格式化匹配内容，高亮显示匹配词
fn format_matched_content(content: &str, term_positions: &[(usize, usize, i32)]) -> String {
    // 如果没有匹配，返回原始内容
    if term_positions.is_empty() || content.is_empty() {
        return content.to_string();
    }
    
    let mut highlighted_content = String::new();
    
    // 如果段落太长，我们只提取匹配词周围的上下文
    if content.len() > 300 {
        // 查找第一个高优先级匹配（通常是完整查询）
        let primary_matches: Vec<&(usize, usize, i32)> = term_positions.iter()
            .filter(|(_, _, prio)| *prio == 1)
            .collect();
        
        // 如果有高优先级匹配，使用它；否则使用第一个匹配
        let (first_start, first_end, _) = if !primary_matches.is_empty() {
            **primary_matches.first().unwrap()
        } else {
            term_positions[0]
        };
        
        // 安全地计算上下文起始位置，确保位于字符边界上
        let mut ctx_start = if first_start > 150 { first_start - 150 } else { 0 };
        ctx_start = find_char_boundary(content, ctx_start); // 确保在字符边界上
        
        // 安全地计算上下文结束位置，确保位于字符边界上
        let mut ctx_end = std::cmp::min(first_end + 150, content.len());
        ctx_end = find_char_boundary(content, ctx_end); // 确保在字符边界上
        
        // 获取上下文
        let context = &content[ctx_start..ctx_end];
        
        // 在上下文中高亮匹配词
        let mut last_pos = 0;
        // 只处理在上下文范围内的匹配
        let visible_matches: Vec<(usize, usize)> = term_positions.iter()
            .filter(|&&(s, e, _)| s >= ctx_start && e <= ctx_end)
            .map(|&(s, e, _)| (s - ctx_start, e - ctx_start)) // 调整为相对位置
            .collect();
        
        for (rel_start, rel_end) in visible_matches {
            // 添加匹配前的文本
            if rel_start > last_pos && rel_start <= context.len() {
                // 确保所有边界都是有效的
                let safe_last_pos = find_char_boundary(context, last_pos);
                let safe_rel_start = find_char_boundary(context, rel_start);
                
                if safe_rel_start > safe_last_pos {
                    highlighted_content.push_str(&context[safe_last_pos..safe_rel_start]);
                }
            }
            
            // 添加带标记的匹配文本
            if rel_end <= context.len() {
                let safe_rel_start = find_char_boundary(context, rel_start);
                let safe_rel_end = find_char_boundary(context, rel_end);
                
                if safe_rel_end > safe_rel_start {
                    highlighted_content.push_str("<mark>");
                    highlighted_content.push_str(&context[safe_rel_start..safe_rel_end]);
                    highlighted_content.push_str("</mark>");
                }
                
                last_pos = safe_rel_end;
            }
        }
        
        // 添加最后一个匹配后的文本
        if last_pos < context.len() {
            let safe_last_pos = find_char_boundary(context, last_pos);
            highlighted_content.push_str(&context[safe_last_pos..]);
        }
        
        // 如果上下文前后有截断，添加省略号
        if ctx_start > 0 {
            highlighted_content = format!("...{}", highlighted_content);
        }
        if ctx_end < content.len() {
            highlighted_content = format!("{}...", highlighted_content);
        }
    } else {
        // 对于短段落，显示整个内容
        let mut last_pos = 0;
        for &(start, end, _) in term_positions {
            // 确保索引在有效范围内
            if start < content.len() {
                // 确保边界安全
                let safe_start = find_char_boundary(content, start);
                let safe_end = find_char_boundary(content, end.min(content.len()));
                let safe_last_pos = find_char_boundary(content, last_pos);
                
                // 添加匹配前的文本
                if safe_start > safe_last_pos {
                    highlighted_content.push_str(&content[safe_last_pos..safe_start]);
                }
                
                // 添加带标记的匹配文本
                if safe_end > safe_start {
                    highlighted_content.push_str("<mark>");
                    highlighted_content.push_str(&content[safe_start..safe_end]);
                    highlighted_content.push_str("</mark>");
                }
                
                last_pos = safe_end;
            }
        }
        
        // 添加最后一个匹配后的文本
        if last_pos < content.len() {
            let safe_last_pos = find_char_boundary(content, last_pos);
            highlighted_content.push_str(&content[safe_last_pos..]);
        }
    }
    
    // 如果由于某种原因结果为空，返回原始内容的一部分
    if highlighted_content.is_empty() && !content.is_empty() {
        // 安全返回内容的前300个字符
        let safe_end = find_char_boundary(content, content.len().min(300));
        return format!("{}...", &content[0..safe_end]);
    }
    
    highlighted_content
}

/// 辅助函数：确保索引位于有效的字符边界上
fn find_char_boundary(s: &str, index: usize) -> usize {
    // 确保边界值
    if s.is_empty() {
        return 0;
    }
    if index >= s.len() {
        return s.len();
    }
    
    // 如果索引已经在字符边界上，直接返回
    if s.is_char_boundary(index) {
        return index;
    }
    
    // 否则，找到最近的字符边界
    // 先向前查找
    let mut previous = index;
    while previous > 0 && !s.is_char_boundary(previous) {
        previous -= 1;
    }
    
    // 向后查找
    let mut next = index;
    while next < s.len() && !s.is_char_boundary(next) {
        next += 1;
    }
    
    // 返回最近的边界（前向或后向）
    if index - previous <= next - index {
        previous
    } else {
        next
    }
}

/// 构建带匹配内容的标题树
fn build_heading_tree_with_matches(
    article: &utils_common::models::ArticleMetadata, 
    terms: &[String],
    search_index: &ArticleSearchIndex
) -> Option<HeadingNode> {
    // 如果没有搜索词或内容为空，返回None
    if terms.is_empty() || article.content.is_empty() {
        return None;
    }

    // 获取与文章相关的所有标题
    let article_id_str = article.id.to_string();
    let heading_map: HashMap<String, &HeadingIndexEntry> = search_index.heading_index.iter()
        .filter(|(id, _)| id.starts_with(&format!("{}:", article_id_str)))
        .map(|(id, entry)| (id.clone(), entry))
        .collect();
    
    if heading_map.is_empty() {
        // 如果没有标题结构，创建一个根节点
        let root_heading = HeadingIndexEntry {
            id: format!("{}:root", article.id),
            level: 0,
            text: article.title.clone(),
            start_position: 0,
            end_position: article.content.len(),
            parent_id: None,
            children_ids: Vec::new(),
        };
        
        // 查找全文匹配
        if let Some((highlighted_content, matched_terms)) = find_matches_in_paragraph(article, &root_heading, terms) {
        return Some(HeadingNode {
                id: root_heading.id,
                text: root_heading.text,
                level: root_heading.level,
                content: Some(highlighted_content),
                matched_terms: Some(matched_terms),
            children: Vec::new(),
        });
    }
    
        return None;
    }
    
    // 查找根标题（没有父标题的标题）
    let mut root_headings: Vec<&&HeadingIndexEntry> = heading_map.values()
        .filter(|entry| entry.parent_id.is_none())
        .collect();
    
    // 如果没有根标题，返回None
    if root_headings.is_empty() {
        return None;
    }
    
    // 排序根标题，确保始终以相同的顺序处理
    root_headings.sort_by_key(|entry| entry.start_position);
    
    // 创建一个虚拟的根节点来包含所有顶级标题
            let root_heading = HeadingIndexEntry {
                id: format!("{}:root", article.id),
                level: 0,
                text: article.title.clone(),
                start_position: 0,
                end_position: article.content.len(),
                parent_id: None,
        children_ids: root_headings.iter().map(|entry| entry.id.clone()).collect(),
    };
    
    // 先查找每个段落中的匹配
    let mut heading_matches: HashMap<String, (String, Vec<String>)> = HashMap::new();
    
    // 处理所有标题下的匹配
    for (heading_id, heading) in &heading_map {
        if let Some((highlighted_content, matched_terms)) = find_matches_in_paragraph(article, heading, terms) {
            heading_matches.insert(heading_id.clone(), (highlighted_content, matched_terms));
        }
    }
    
    // 处理根节点下的直接内容（不属于任何标题的部分）
    let root_content = if let Some((highlighted_content, matched_terms)) = find_matches_in_paragraph(article, &root_heading, terms) {
        Some((highlighted_content, matched_terms))
        } else {
        None
    };
    
    // 创建根节点
    let mut root_node = HeadingNode {
        id: root_heading.id,
        text: root_heading.text,
        level: root_heading.level,
        content: root_content.as_ref().map(|(content, _)| content.clone()),
        matched_terms: root_content.as_ref().map(|(_, terms)| terms.clone()),
        children: Vec::new(),
    };
    
    // 递归构建子标题树
    for child_id in &root_heading.children_ids {
        if let Some(heading) = heading_map.get(child_id) {
            let mut child_node = HeadingNode {
                id: child_id.clone(),
                text: heading.text.clone(),
                level: heading.level,
        content: None,
        matched_terms: None,
                children: Vec::new(),
            };
            
            // 填充子节点的匹配内容和子节点
            if let Some((content, terms)) = heading_matches.get(child_id) {
                child_node.content = Some(content.clone());
                child_node.matched_terms = Some(terms.clone());
            }
            
            // 递归处理子标题
            if !heading.children_ids.is_empty() {
                for grandchild_id in &heading.children_ids {
                    if let Some(grandchild) = heading_map.get(grandchild_id) {
                        let mut grandchild_node = HeadingNode {
                            id: grandchild_id.clone(),
                            text: grandchild.text.clone(),
                            level: grandchild.level,
                            content: None,
                            matched_terms: None,
                children: Vec::new(),
            };
            
                        // 填充孙节点的匹配内容
                        if let Some((content, terms)) = heading_matches.get(grandchild_id) {
                            grandchild_node.content = Some(content.clone());
                            grandchild_node.matched_terms = Some(terms.clone());
                        }
                        
                        // 对于更深层次的节点，采用相同的处理方式
                        if !grandchild.children_ids.is_empty() {
                            process_deeper_nodes(&mut grandchild_node, grandchild, &heading_map, &heading_matches);
                        }
                        
                        child_node.children.push(grandchild_node);
                    }
                }
                
                // 按标题文本排序子节点，保持一致性
                child_node.children.sort_by(|a, b| a.text.cmp(&b.text));
            }
            
            root_node.children.push(child_node);
        }
    }
    
    // 按级别和文本排序子节点
    root_node.children.sort_by(|a, b| {
        match a.level.cmp(&b.level) {
            std::cmp::Ordering::Equal => a.text.cmp(&b.text),
            other => other
        }
    });
    
    Some(root_node)
}

/// 处理更深层次的标题节点
fn process_deeper_nodes(
    parent: &mut HeadingNode,
    heading: &HeadingIndexEntry,
    heading_map: &HashMap<String, &HeadingIndexEntry>,
    heading_matches: &HashMap<String, (String, Vec<String>)>
) {
    for child_id in &heading.children_ids {
        if let Some(child) = heading_map.get(child_id) {
            let mut child_node = HeadingNode {
                id: child_id.clone(),
                text: child.text.clone(),
                level: child.level,
                content: None,
                matched_terms: None,
                children: Vec::new(),
            };
            
            // 填充匹配内容
            if let Some((content, terms)) = heading_matches.get(child_id) {
                child_node.content = Some(content.clone());
                child_node.matched_terms = Some(terms.clone());
            }
            
            // 继续处理子节点
            if !child.children_ids.is_empty() {
                process_deeper_nodes(&mut child_node, child, heading_map, heading_matches);
            }
            
            parent.children.push(child_node);
        }
    }
    
    // 按级别和文本排序子节点
    parent.children.sort_by(|a, b| {
        match a.level.cmp(&b.level) {
            std::cmp::Ordering::Equal => a.text.cmp(&b.text),
            other => other
        }
    });
}

