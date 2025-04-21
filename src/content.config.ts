// 1. 从 `astro:content` 导入工具函数
import { defineCollection, z, getCollection, type CollectionEntry } from 'astro:content';
import { glob } from 'astro/loaders';

// 2. 定义内容结构接口
export interface ContentStructure {
  articles: string[];
  sections: SectionStructure[];
}

export interface SectionStructure {
  name: string;
  path: string;
  articles: string[];
  sections: SectionStructure[];
}

// 辅助函数：获取相对于content目录的路径
export function getRelativePath(fullPath: string, basePath = './src/content'): string {
  const normalizedPath = fullPath.replace(/\\/g, '/');
  const normalizedBasePath = basePath.replace(/\\/g, '/');
  
  let relativePath = normalizedPath;
  if (normalizedPath.includes(normalizedBasePath)) {
    relativePath = normalizedPath.replace(normalizedBasePath, '');
  }
  
  relativePath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
  if (relativePath.startsWith('articles/')) {
    relativePath = relativePath.substring('articles/'.length);
  }
  
  return relativePath;
}

// 辅助函数：从文件路径中提取文件名（不带扩展名）
export function getBasename(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/');
  const fileName = parts[parts.length - 1];
  return fileName.replace(/\.(md|mdx)$/, '');
}

// 辅助函数：从文件路径中提取目录路径
export function getDirPath(filePath: string, basePath = './src/content'): string {
  const basename = getBasename(filePath);
  const relativePath = getRelativePath(filePath, basePath);
  return relativePath.replace(`${basename}.(md|mdx)`, '').replace(/\/$/, '');
}

// 辅助函数：获取特殊文件路径
export function getSpecialPath(originalPath: string): string {
  const parts = originalPath.split('/');
  const fileName = parts[parts.length - 1];
  const dirName = parts.length > 1 ? parts[parts.length - 2] : '';
  
  // 如果文件名与目录名相同，添加下划线前缀
  if (dirName && fileName.toLowerCase() === dirName.toLowerCase()) {
    const newFileName = fileName.startsWith('_') ? fileName : `_${fileName}`;
    return [...parts.slice(0, -1), newFileName].join('/');
  }
  
  return originalPath;
}

// 3. 定义目录结构处理函数
async function getContentStructure(): Promise<ContentStructure> {
  // 获取所有文章
  const allArticles = await getCollection('articles');
  const articlePaths = allArticles.map((entry: CollectionEntry<'articles'>) => entry.id);
  
  // 构建目录树
  const sections = new Map<string, SectionStructure>();
  
  // 处理每个文章路径
  for (const articlePath of articlePaths) {
    const parts = articlePath.split('/');
    const dirPath = parts.slice(0, -1);
    
    // 为每一级目录创建或更新节点
    let currentPath = '';
    for (const part of dirPath) {
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      if (!sections.has(currentPath)) {
        sections.set(currentPath, {
          name: part,
          path: currentPath,
          articles: [],
          sections: []
        });
      }
      
      // 将当前节点添加到父节点的子节点列表中
      if (parentPath) {
        const parentSection = sections.get(parentPath);
        if (parentSection && !parentSection.sections.find(s => s.path === currentPath)) {
          parentSection.sections.push(sections.get(currentPath)!);
        }
      }
    }
    
    // 将文章添加到其所在目录
    if (dirPath.length > 0) {
      const dirFullPath = dirPath.join('/');
      const section = sections.get(dirFullPath);
      if (section) {
        section.articles.push(articlePath);
      }
    }
  }
  
  // 获取顶级目录
  const topLevelSections = Array.from(sections.values())
    .filter(section => !section.path.includes('/'));
  
  // 获取顶级文章（不在任何子目录中的文章）
  const topLevelArticles = articlePaths.filter((path: string) => !path.includes('/'));
  
  return {
    articles: topLevelArticles,
    sections: topLevelSections
  };
}

// 4. 定义你的集合
const articles = defineCollection({
  loader: glob({ 
    pattern: "**/*.{md,mdx}", 
    base: "./src/content"
  }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    tags: z.array(z.string()).optional(),
    summary: z.string().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

// 5. 导出一个 `collections` 对象来注册你的集合
export const collections = { articles };

// 6. 导出内容结构
export const contentStructure = await getContentStructure();
