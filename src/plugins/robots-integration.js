// robots.txt 集成插件
// 用于在构建时自动生成 robots.txt 文件

import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { SITE_URL } from '../consts';

// 生成 robots.txt 内容
function generateRobotsTxt(siteUrl) {
  return `# robots.txt 文件
# 网站: ${siteUrl}
# 生成时间: ${new Date().toISOString()}

User-agent: *
Allow: /

# 站点地图
Sitemap: ${siteUrl}/sitemap.xml
`;
}

// 主集成函数
export function robotsIntegration() {
  return {
    name: 'robots-integration',
    hooks: {
      // 开发服务器钩子 - 为开发模式添加虚拟API路由
      'astro:server:setup': ({ server }) => {
        // 为 robots.txt 提供虚拟路由
        server.middlewares.use((req, res, next) => {
          // 检查请求路径是否是 robots.txt
          if (req.url === '/robots.txt' && req.method === 'GET') {
            console.log(`虚拟路由请求: ${req.url}`);
            
            // 尝试返回已构建好的 robots.txt 文件
            const distPath = path.join(process.cwd(), 'dist/client/robots.txt');
            
            if (existsSync(distPath)) {
              try {
                const content = readFileSync(distPath, 'utf-8');
                res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
                res.end(content);
              } catch (error) {
                res.statusCode = 500;
                res.end('读取 robots.txt 文件时出错');
              }
            } else {
              // 如果文件不存在，则动态生成
              const content = generateRobotsTxt(SITE_URL);
              res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
              res.end(content);
            }
            return;
          }
          
          // 不是 robots.txt 请求，继续下一个中间件
          next();
        });
      },

      // 构建完成钩子 - 生成 robots.txt 文件
      'astro:build:done': async ({ dir }) => {
        console.log('生成 robots.txt...');
        
        try {
          // 获取构建目录路径
          let buildDirPath;
          
          // 直接处理URL对象
          if (dir instanceof URL) {
            buildDirPath = dir.pathname;
            // Windows路径修复
            if (process.platform === 'win32' && buildDirPath.startsWith('/') && /^\/[A-Z]:/i.test(buildDirPath)) {
              buildDirPath = buildDirPath.substring(1);
            }
          } else {
            buildDirPath = String(dir);
          }
          
          // 生成 robots.txt 内容
          const content = generateRobotsTxt(SITE_URL);
          
          // 写入 robots.txt (使用 UTF-8 编码)
          const filePath = path.join(buildDirPath, 'robots.txt');
          
          // 添加 UTF-8 BOM 标记以确保浏览器正确识别编码
          const BOM = '\uFEFF';
          await fs.writeFile(filePath, BOM + content, 'utf8');
          console.log('已生成 robots.txt (UTF-8 with BOM)');
          
        } catch (error) {
          console.error('生成 robots.txt 时出错:', error);
        }
      }
    }
  };
} 