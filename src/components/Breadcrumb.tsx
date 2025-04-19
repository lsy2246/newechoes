interface Breadcrumb {
  name: string;
  path: string;
}

export interface BreadcrumbProps {
  pageType: 'articles' | 'article' | 'timeline'; // 页面类型
  pathSegments?: string[]; // 路径段数组
  tagFilter?: string; // 标签过滤器
  articleTitle?: string; // 文章标题（仅在文章详情页使用）
}

export function Breadcrumb({
  pageType,
  pathSegments = [],
  tagFilter = '',
  articleTitle = ''
}: BreadcrumbProps) {
  // 将路径段转换为面包屑对象
  const breadcrumbs: Breadcrumb[] = pathSegments
    .filter(segment => segment.trim() !== '')
    .map((segment, index, array) => {
      const path = array.slice(0, index + 1).join('/');
      return { name: segment, path };
    });

  return (
    <div className="flex items-center text-sm">
      {/* 文章列表链接 */}
      <a href="/articles" className="text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
        文章
      </a>

      {/* 标签过滤 */}
      {tagFilter && (
        <>
          <span className="mx-2 text-secondary-300 dark:text-secondary-600">/</span>
          <span className="text-secondary-600 dark:text-secondary-400 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            {tagFilter}
          </span>
        </>
      )}

      {/* 目录路径 */}
      {!tagFilter && breadcrumbs.map((crumb: Breadcrumb, index: number) => {
        const crumbPath = breadcrumbs.slice(0, index + 1).map((b: Breadcrumb) => b.name).join('/');
        return (
          <span key={`crumb-${index}`}>
            <span className="mx-2 text-secondary-300 dark:text-secondary-600">/</span>
            <a href={`/articles?path=${encodeURIComponent(crumbPath)}`} className="text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400">{crumb.name}</a>
          </span>
        );
      })}

      {/* 文章标题 */}
      {pageType === 'article' && articleTitle && (
        <>
          <span className="mx-2 text-secondary-300 dark:text-secondary-600">/</span>
          <span className="text-secondary-600 dark:text-secondary-400 truncate max-w-[150px] sm:max-w-[300px]">{articleTitle}</span>
        </>
      )}
    </div>
  );
} 