use std::fs;
use std::path::Path;
use chrono::Utc;
use clap::{Command, Arg, ArgAction};
use html5ever::parse_document;
use html5ever::tendril::TendrilSink;
use markup5ever_rcdom::{Handle, NodeData, RcDom};
use walkdir::WalkDir;

use utils_common::{ArticleMetadata, Heading};

// 导入筛选和搜索模块
use article_filter::builder::FilterBuilder;
use search_wasm::builder::SearchBuilder;

// 主函数
fn main() {
    // 设置命令行参数
    let matches = Command::new("文章索引生成器")
        .version(env!("CARGO_PKG_VERSION"))
        .author("New Echoes")
        .about("生成文章索引用于搜索和筛选")
        .arg(Arg::new("source")
            .short('s')
            .long("source")
            .value_name("SOURCE_DIR")
            .help("文章源目录路径")
            .required(true))
        .arg(Arg::new("output")
            .short('o')
            .long("output")
            .value_name("OUTPUT_DIR")
            .help("索引输出目录路径")
            .required(true))
        .arg(Arg::new("verbose")
            .short('v')
            .long("verbose")
            .help("显示详细信息")
            .action(ArgAction::SetTrue))
        .arg(Arg::new("index_all")
            .short('a')
            .long("all")
            .help("索引所有页面，包括非文章页面")
            .action(ArgAction::SetTrue))
        .get_matches();

    // 获取参数值
    let source_dir = matches.get_one::<String>("source").unwrap();
    let output_dir = matches.get_one::<String>("output").unwrap();
    let verbose = matches.get_flag("verbose");
    let index_all = matches.get_flag("index_all");

    // 检查目录
    let source_path = std::path::Path::new(source_dir);
    if !source_path.exists() || !source_path.is_dir() {
        eprintln!("错误: 源目录不存在或不是有效目录 '{}'", source_dir);
        std::process::exit(1);
    }

    // 创建输出目录
    let output_path = std::path::Path::new(output_dir);
    if !output_path.exists() {
        if let Err(e) = std::fs::create_dir_all(output_path) {
            eprintln!("错误: 无法创建输出目录 '{}': {}", output_dir, e);
            std::process::exit(1);
        }
    }

    println!("开始生成索引...");
    println!("源目录: {}", source_dir);
    println!("输出目录: {}", output_dir);

    // 生成索引
    match generate_index(source_dir, output_dir, verbose, index_all) {
        Ok(_) => println!("索引生成成功！"),
        Err(e) => {
            eprintln!("错误: 索引生成失败: {}", e);
            std::process::exit(1);
        }
    }
}

// 生成索引的主函数
fn generate_index(
    source_dir: &str, 
    output_dir: &str, 
    verbose: bool, 
    index_all: bool
) -> Result<(), String> {
    // 记录开始时间
    let start_time = std::time::Instant::now();
    
    // 扫描HTML文件
    println!("扫描HTML文件...");
    let (articles, skipped_count) = scan_html_files(source_dir, verbose, index_all)?;
    
    let article_count = articles.len();
    println!("扫描完成。找到 {} 篇有效文章，跳过 {} 个文件。", article_count, skipped_count);
    
    if article_count == 0 {
        return Err("没有找到有效文章".to_string());
    }
    
    // 创建筛选索引构建器
    let mut filter_builder = FilterBuilder::new();
    
    // 创建搜索索引构建器
    let mut search_builder = SearchBuilder::new();
    
    // 添加文章到构建器
    for article in articles {
        filter_builder.add_article(article.clone());
        search_builder.add_article(article);
    }
    
    // 构建输出路径
    let filter_index_path = format!("{}/filter_index.bin", output_dir);
    let search_index_path = format!("{}/search_index.bin", output_dir);
    
    // 保存索引
    println!("正在生成和保存索引...");
    filter_builder.save_filter_index(&filter_index_path)?;
    search_builder.save_search_index(&search_index_path)?;
    
    // 计算耗时
    let elapsed = start_time.elapsed();
    println!("索引生成完成！耗时: {:.2}秒", elapsed.as_secs_f32());
    
    Ok(())
}

// 扫描HTML文件并提取文章数据
fn scan_html_files(
    dir_path: &str, 
    verbose: bool,
    index_all: bool
) -> Result<(Vec<ArticleMetadata>, usize), String> {
    let mut articles = Vec::new();
    let dir_path = Path::new(dir_path);
    let mut processed_files = 0;
    
    // 调试计数器
    let mut total_files = 0;
    let mut article_files = 0;

    // 递归遍历目录
    for entry in WalkDir::new(dir_path) {
        let entry = entry.map_err(|e| format!("遍历目录时出错: {}", e))?;
        
        // 只处理HTML文件
        if !entry.file_type().is_file() || !entry.path().extension().map_or(false, |ext| ext == "html") {
            continue;
        }
        
        total_files += 1;
        processed_files += 1;

        // 解析HTML文件
        match extract_article_from_html(entry.path(), dir_path, index_all, verbose) {
            Ok(Some(article)) => {
                articles.push(article);
                article_files += 1;
            }
            Ok(None) => {
                // 跳过不符合条件的文件
            }
            Err(err) => {
                if verbose {
                    eprintln!("解析文件时出错 {}: {}", entry.path().display(), err);
                }
            }
        }
    }
    
    // 打印统计信息
    if verbose {
        println!("总HTML文件数: {}, 识别为文章的文件数: {}", total_files, article_files);
    }

    Ok((articles, processed_files))
}

// 从HTML文件中提取文章数据
fn extract_article_from_html(file_path: &Path, base_dir: &Path, index_all: bool, verbose: bool) -> Result<Option<ArticleMetadata>, String> {
    // 读取文件内容
    let html = fs::read_to_string(file_path)
        .map_err(|e| format!("无法读取文件 {}: {}", file_path.display(), e))?;
        
    // 检查路径，跳过已知的非内容文件
    let file_path_str = file_path.to_string_lossy().to_lowercase();
    let is_system_file = file_path_str.contains("/404.html") || 
                        file_path_str.contains("\\404.html") ||
                        file_path_str.contains("/search/") ||
                        file_path_str.contains("\\search\\") ||
                        file_path_str.contains("/robots.txt") ||
                        file_path_str.contains("\\robots.txt") ||
                        file_path_str.contains("/sitemap.xml") ||
                        file_path_str.contains("\\sitemap.xml");
    
    if is_system_file {
        return Ok(None);
    }
    
    // 解析HTML
    let dom = parse_document(RcDom::default(), Default::default())
    .from_utf8()
    .read_from(&mut html.as_bytes())
    .map_err(|e| format!("解析HTML时出错: {}", e))?;
    // 提取元数据
    let meta_tags = extract_meta_tags(&dom.document);
    
    // 获取og:type标签值，这是页面类型的权威来源
    let og_type = meta_tags.get("og:type").map(|t| t.as_str()).unwrap_or("");
    
    // 严格确定页面类型，不做猜测
    let page_type = match og_type {
        "article" => "article",
        "page" => "page", 
        "directory" => "directory",
        _ => {
            // 如果没有有效的og:type，尝试通过其他方式判断
            if html.contains("property=\"og:type\"") && html.contains("content=\"article\"") {
                "article"
            } else if html.contains("property=\"og:type\"") && html.contains("content=\"page\"") {
                "page"
            } else if html.contains("property=\"og:type\"") && html.contains("content=\"directory\"") {
                "directory"
            } else {
                // 默认未知类型
                "unknown"
            }
        }
    };
    
    // 根据--all参数和页面类型决定是否处理
    let should_process = if index_all {
        // --all模式下，处理article和page类型
        page_type == "article" || page_type == "page"
    } else {
        // 非--all模式下，仅处理article类型
        page_type == "article"
    };
    
    // 如果不符合处理条件，跳过
    if !should_process {
        return Ok(None);
    }
    
    // 提取标题
    let title = extract_title(&dom.document);
    if title.is_empty() {
        return Ok(None);
    }
    
    // 计算相对路径作为文章ID
    let relative_path = file_path.strip_prefix(base_dir)
        .map_err(|_| format!("计算相对路径失败"))?;
    
    let id = relative_path.with_extension("")
        .to_string_lossy()
        .replace('\\', "/")
        .trim_end_matches("index")
        .trim_end_matches('/')
        .to_string();
    
    // 提取正文内容
    let content = extract_content(&dom.document);
    
    // 内容太少的可能不是有效内容页面
    if content.trim().len() < 30 {
        return Ok(None);
    }

    if verbose {
        println!("处理: {}", file_path.display());
    }

    // 提取文章中的标题结构
    let headings = extract_headings(&dom.document, &content);
    
    // 构建URL
    let url = format!("/{}", id);
    
    // 提取摘要
    let summary = if !content.is_empty() {
        let mut summary = content.chars().take(200).collect::<String>();
        summary.push_str("...");
        summary
    } else {
        String::new()
    };

    // 提取标签 - 优先使用article:tag标准格式
    let tags = {
        let mut tags = Vec::new();
        
        // 从meta标签中提取标签信息
        for (key, value) in meta_tags.iter() {
            if key == "article:tag" || key == "keywords" {
                let tag_values = value.split(',').map(|s| s.trim().to_string());
                tags.extend(tag_values);
            }
        }
        
        // 去除空标签和重复标签
        tags.retain(|tag| !tag.trim().is_empty());
        tags.sort();
        tags.dedup();
        
        tags
    };

    // 日期提取 - 优先使用article:published_time标准格式
    let date = meta_tags.get("article:published_time")
        .and_then(|date_str| {
            chrono::DateTime::parse_from_rfc3339(date_str)
                .map(|dt| dt.with_timezone(&Utc))
                .ok()
        })
        .unwrap_or_else(|| {
            Utc::now()
        });

    // 创建文章元数据，保留原始页面类型信息，并添加标题结构
    let article = ArticleMetadata {
        id,
        title,
        summary,
        date,
        tags,
        url,
        content,
        page_type: page_type.to_string(),
        headings,
    };

    Ok(Some(article))
}

// 从DOM中提取标题
fn extract_title(handle: &Handle) -> String {
    // 首先尝试从<title>标签获取
    if let Some(title) = extract_title_tag(handle) {
        return title;
    }
    
    // 然后尝试从<h1>标签获取
    if let Some(h1) = extract_h1_tag(handle) {
        return h1;
    }
    
    // 最后返回空字符串
    String::new()
}

// 从DOM中提取<title>标签内容
fn extract_title_tag(handle: &Handle) -> Option<String> {
    match handle.data {
        NodeData::Document => {
            // 递归查找
            for child in handle.children.borrow().iter() {
                if let Some(title) = extract_title_tag(child) {
                    return Some(title);
                }
            }
            None
        }
        NodeData::Element { ref name, .. } => {
            if name.local.as_ref() == "title" {
                // 获取文本内容
                let mut text = String::new();
                extract_text_from_node(handle, &mut text);
                return Some(text.trim().to_string());
            } else {
                // 递归查找
                for child in handle.children.borrow().iter() {
                    if let Some(title) = extract_title_tag(child) {
                        return Some(title);
                    }
                }
                None
            }
        }
        _ => {
            // 递归查找
            for child in handle.children.borrow().iter() {
                if let Some(title) = extract_title_tag(child) {
                    return Some(title);
                }
            }
            None
        }
    }
}

// 从DOM中提取<h1>标签内容
fn extract_h1_tag(handle: &Handle) -> Option<String> {
    match handle.data {
        NodeData::Element { ref name, .. } => {
            if name.local.as_ref() == "h1" {
                // 获取文本内容
                let mut text = String::new();
                extract_text_from_node(handle, &mut text);
                return Some(text.trim().to_string());
            } else {
                // 递归查找
                for child in handle.children.borrow().iter() {
                    if let Some(h1) = extract_h1_tag(child) {
                        return Some(h1);
                    }
                }
                None
            }
        }
        _ => {
            // 递归查找
            for child in handle.children.borrow().iter() {
                if let Some(h1) = extract_h1_tag(child) {
                    return Some(h1);
                }
            }
            None
        }
    }
}

// 从DOM中提取元数据标签
fn extract_meta_tags(handle: &Handle) -> std::collections::HashMap<String, String> {
    let mut meta_tags = std::collections::HashMap::new();
    extract_meta_tags_internal(handle, &mut meta_tags);
    meta_tags
}

// 递归辅助函数，用于提取元数据标签
fn extract_meta_tags_internal(handle: &Handle, meta_tags: &mut std::collections::HashMap<String, String>) {
    match handle.data {
        NodeData::Element { ref name, ref attrs, .. } => {
            let tag_name = name.local.to_string();
            
            if tag_name == "meta" {
                let attrs = attrs.borrow();
                
                // 高度优先处理og:type属性，确保它被正确识别
                let has_og_type = attrs.iter().any(|attr| 
                    (attr.name.local.to_string() == "property" && attr.value.contains("og:type")) ||
                    (attr.name.local.to_string() == "name" && attr.value.contains("og:type"))
                );
                
                if has_og_type {
                    // 直接找到content属性
                    if let Some(content_attr) = attrs.iter().find(|attr| attr.name.local.to_string() == "content") {
                        meta_tags.insert("og:type".to_string(), content_attr.value.to_string());
                    }
                }
                
                // 处理常规meta标签
                if let (Some(name_attr), Some(content_attr)) = (
                    attrs.iter().find(|attr| attr.name.local.to_string() == "name"),
                    attrs.iter().find(|attr| attr.name.local.to_string() == "content")
                ) {
                    meta_tags.insert(name_attr.value.to_string(), content_attr.value.to_string());
                } 
                // 处理Open Graph属性（property属性）
                else if let (Some(property_attr), Some(content_attr)) = (
                    attrs.iter().find(|attr| attr.name.local.to_string() == "property"),
                    attrs.iter().find(|attr| attr.name.local.to_string() == "content")
                ) {
                    // 将完整的属性名保存到meta_tags
                    let property = property_attr.value.to_string();
                    meta_tags.insert(property.clone(), content_attr.value.to_string());
                }
            }
            
            // 递归处理子节点
            for child in handle.children.borrow().iter() {
                extract_meta_tags_internal(child, meta_tags);
            }
        },
        _ => {
            // 递归处理子节点
            for child in handle.children.borrow().iter() {
                extract_meta_tags_internal(child, meta_tags);
            }
        }
    }
}

// 从DOM中提取正文内容
fn extract_content(handle: &Handle) -> String {
    let mut content = String::new();
    
    // 根据语义化标签顺序查找内容
    if let Some(article_element) = find_article_element(handle) {
        extract_text_from_node_filtered(&article_element, &mut content);
    } else if let Some(main_content) = find_main_content(handle) {
        extract_text_from_node_filtered(&main_content, &mut content);
    } else if let Some(body) = find_body(handle) {
        extract_text_from_node_filtered(&body, &mut content);
    }
    
    // 内联处理空格和换行
    let mut result = content.split_whitespace().collect::<Vec<_>>().join(" ");
    
    // 去除多余空格
    while result.contains("  ") {
        result = result.replace("  ", " ");
    }
    
    // 去除多余换行
    while result.contains("\n\n") {
        result = result.replace("\n\n", "\n");
    }
    
    result.trim().to_string()
}

// 查找文章元素 - 使用语义化标签
fn find_article_element(handle: &Handle) -> Option<Handle> {
    match handle.data {
        NodeData::Element { ref name, .. } => {
            // 直接查找article标签，这是语义化的文章内容区
            if name.local.as_ref() == "article" {
                return Some(handle.clone());
            }
            
            // 递归查找
            for child in handle.children.borrow().iter() {
                if let Some(article) = find_article_element(child) {
                    return Some(article);
                }
            }
            None
        }
        _ => {
            // 递归查找
            for child in handle.children.borrow().iter() {
                if let Some(article) = find_article_element(child) {
                    return Some(article);
                }
            }
            None
        }
    }
}

// 查找主要内容区域
fn find_main_content(handle: &Handle) -> Option<Handle> {
    match handle.data {
        NodeData::Element { ref name, .. } => {
            // 查找语义化标签
            if name.local.as_ref() == "main" {
                return Some(handle.clone());
            }
            
            // 递归查找
            for child in handle.children.borrow().iter() {
                if let Some(main) = find_main_content(child) {
                    return Some(main);
                }
            }
            None
        }
        _ => {
            // 递归查找
            for child in handle.children.borrow().iter() {
                if let Some(main) = find_main_content(child) {
                    return Some(main);
                }
            }
            None
        }
    }
}

// 查找body元素
fn find_body(handle: &Handle) -> Option<Handle> {
    match handle.data {
        NodeData::Element { ref name, .. } => {
            if name.local.as_ref() == "body" {
                return Some(handle.clone());
            }
            
            // 递归查找
            for child in handle.children.borrow().iter() {
                if let Some(body) = find_body(child) {
                    return Some(body);
                }
            }
            None
        }
        _ => {
            // 递归查找
            for child in handle.children.borrow().iter() {
                if let Some(body) = find_body(child) {
                    return Some(body);
                }
            }
            None
        }
    }
}

// 从节点提取文本，过滤掉非内容标签
fn extract_text_from_node_filtered(handle: &Handle, text: &mut String) {
    match handle.data {
        NodeData::Element { ref name, ref attrs, .. } => {
            let tag_name = name.local.to_string();
            
            // 跳过aside标签
            if tag_name == "aside" {
                return;
            }
            
            // 对于section标签，检查是否为目录区
            if tag_name == "section" {
                let attrs = attrs.borrow();
                let is_toc_section = attrs.iter().any(|attr| {
                    (attr.name.local.to_string() == "id" && 
                     (attr.value.contains("toc") || attr.value.contains("directory"))) ||
                    (attr.name.local.to_string() == "class" && 
                     (attr.value.contains("toc") || attr.value.contains("directory")))
                });
                
                if is_toc_section {
                    return;
                }
            }
            
            // 跳过交互元素和导航元素
            let non_content_tags = [
                // 脚本和样式
                "script", "style", 
                // 元数据和链接
                "head", "meta", "link", 
                // 语义化页面结构中的非内容区
                "header", "footer", "nav", "aside",
                // 其他交互元素
                "noscript", "iframe", "svg", "path",
                "button", "input", "form", "select", "option", "textarea", 
                "template", "dialog", "canvas"
            ];
            
            if non_content_tags.contains(&tag_name.as_str()) {
                return;
            }
            
            // 检查是否是sr-only元素（屏幕阅读器专用）
            let attrs = attrs.borrow();
            let is_sr_only = attrs.iter().any(|attr| {
                attr.name.local.to_string() == "class" && 
                attr.value.contains("sr-only")
            });
            
            if is_sr_only {
                return;
            }
            
            // 跳过其他可能的非内容区域（使用通用检测）
            for attr in attrs.iter() {
                if attr.name.local.to_string() == "class" || attr.name.local.to_string() == "id" {
                    let value = attr.value.to_string().to_lowercase();
                    if value.contains("nav") || 
                       value.contains("menu") || 
                       value.contains("sidebar") || 
                       value.contains("comment") ||
                       value.contains("related") ||
                       value.contains("share") ||
                       value.contains("toc") ||
                       value.contains("directory") {
                        return;
                    }
                }
            }
            
            // 递归处理子节点
            for child in handle.children.borrow().iter() {
                extract_text_from_node_filtered(child, text);
            }
        }
        NodeData::Text { ref contents } => {
            let content = contents.borrow();
            let trimmed = content.trim();
            if !trimmed.is_empty() {
                text.push_str(&content);
                text.push(' ');
            }
        }
        _ => {
            // 递归处理子节点
            for child in handle.children.borrow().iter() {
                extract_text_from_node_filtered(child, text);
            }
        }
    }
}

// 从节点提取文本
fn extract_text_from_node(handle: &Handle, text: &mut String) {
    match handle.data {
        NodeData::Text { ref contents } => {
            text.push_str(&contents.borrow());
            text.push(' ');
        }
        _ => {
            // 递归处理子节点
            for child in handle.children.borrow().iter() {
                extract_text_from_node(child, text);
            }
        }
    }
}

// 从HTML内容中提取标题结构
fn extract_headings(handle: &Handle, content: &str) -> Vec<Heading> {
    let mut headings = Vec::new();
    
    // 首先尝试从article标签提取标题 - 这是语义化的文章内容区
    if let Some(article_element) = find_article_element(handle) {
        // 只从文章主体提取标题，避免其他区域
        extract_headings_from_element(&article_element, &mut headings, 0);
    } else {
        // 备选：如果找不到article标签，尝试从main提取
        if let Some(main_element) = find_main_content(handle) {
            extract_headings_from_element(&main_element, &mut headings, 0);
        } else {
            // 最后的备选：从整个文档提取，但排除header、aside、section
            extract_headings_internal(handle, &mut headings, 0);
        }
    }
    
    if !headings.is_empty() {
        // 将内容转为小写用于位置匹配
        let content_lower = content.to_lowercase();
        
        // 计算每个标题在内容中的位置
        for i in 0..headings.len() {
            let heading_text = headings[i].text.to_lowercase();
            
            // 查找标题在内容中的位置
            if let Some(pos) = content_lower.find(&heading_text) {
                headings[i].position = pos;
                
                // 计算结束位置（下一个标题的开始，或者文档结束）
                if i < headings.len() - 1 {
                    headings[i].end_position = Some(headings[i + 1].position);
                } else {
                    headings[i].end_position = Some(content.len());
                }
            }
        }
    }
    
    headings
}
// 从指定元素提取标题（通常是article标签）
fn extract_headings_from_element(handle: &Handle, headings: &mut Vec<Heading>, position: usize) {
    match handle.data {
        NodeData::Element { ref name, .. } => {
            let tag_name = name.local.to_string();
            
            // 检查是否是标题标签
            if tag_name.starts_with('h') && tag_name.len() == 2 {
                if let Some(level) = tag_name.chars().nth(1).unwrap_or('0').to_digit(10) {
                    if level >= 1 && level <= 6 {
                        // 提取标题文本
                        let mut title_text = String::new();
                        extract_text_from_node(handle, &mut title_text);
                        
                        let trimmed_text = title_text.trim().to_string();
                        
                        // 只添加非空标题
                        if !trimmed_text.is_empty() {
                            // 检查是否重复
                            if !headings.iter().any(|h| h.text == trimmed_text) {
                                // 创建标题对象
                                headings.push(Heading {
                                    level: level as usize,
                                    text: trimmed_text,
                                    position,
                                    end_position: None, // 稍后填充
                                });
                            }
                        }
                    }
                }
            }
            
            // 递归处理子节点
            for child in handle.children.borrow().iter() {
                extract_headings_from_element(child, headings, position);
            }
        }
        _ => {
            // 递归处理子节点
            for child in handle.children.borrow().iter() {
                extract_headings_from_element(child, headings, position);
            }
        }
    }
}

// 递归辅助函数，提取标题标签 (h1, h2, h3, etc.)，同时排除非内容区域
fn extract_headings_internal(handle: &Handle, headings: &mut Vec<Heading>, position: usize) {
    match handle.data {
        NodeData::Element { ref name, ref attrs, .. } => {
            let tag_name = name.local.to_string();
            
            // 排除header、aside、section(目录)标签区域
            if tag_name == "header" || tag_name == "aside" || tag_name == "section" {
                // 检查section是否是目录区域
                if tag_name == "section" {
                    // 检查是否有表明这是目录的类或ID
                    let attrs = attrs.borrow();
                    let is_toc = attrs.iter().any(|attr| {
                        (attr.name.local.to_string() == "id" && attr.value.contains("toc")) || 
                        (attr.name.local.to_string() == "class" && attr.value.contains("toc"))
                    });
                    
                    // 如果不是目录，可以递归处理
                    if !is_toc {
                        for child in handle.children.borrow().iter() {
                            extract_headings_internal(child, headings, position);
                        }
                    }
                }
                
                // 不再递归处理这些区域
                return;
            }
            
            // 排除sr-only元素
            let is_sr_only = attrs.borrow().iter().any(|attr| {
                attr.name.local.to_string() == "class" && 
                attr.value.contains("sr-only")
            });
            
            if is_sr_only {
                return;
            }
            
            // 处理标题标签
            if tag_name.starts_with('h') && tag_name.len() == 2 {
                if let Some(level) = tag_name.chars().nth(1).unwrap_or('0').to_digit(10) {
                    if level >= 1 && level <= 6 {
                        // 提取标题文本
                        let mut title_text = String::new();
                        extract_text_from_node(handle, &mut title_text);
                        
                        let trimmed_text = title_text.trim().to_string();
                        
                        // 只添加非空标题
                        if !trimmed_text.is_empty() {
                            // 检查是否重复
                            if !headings.iter().any(|h| h.text == trimmed_text) {
                                // 创建标题对象
                                headings.push(Heading {
                                    level: level as usize,
                                    text: trimmed_text,
                                    position,
                                    end_position: None, // 稍后填充
                                });
                            }
                        }
                    }
                }
            }
            
            // 递归处理子节点
            for child in handle.children.borrow().iter() {
                extract_headings_internal(child, headings, position);
            }
        }
        _ => {
            // 递归处理子节点
            for child in handle.children.borrow().iter() {
                extract_headings_internal(child, headings, position);
            }
        }
    }
}
