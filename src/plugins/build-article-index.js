import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// 获取当前文件的目录
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 获取项目根目录
const rootDir = path.resolve(__dirname, '../..');
// 构建目录在根目录下
const buildDir = path.resolve(rootDir, 'dist');
// 索引文件存储位置
const indexDir = path.join(buildDir, 'client', 'index');

// 二进制可执行文件路径
const binaryPath = path.join(rootDir, 'src', 'assets', 'article-index', process.platform === 'win32' 
  ? 'article-indexer-cli.exe' 
  : 'article-indexer-cli');

/**
 * 创建Astro构建后钩子插件，用于生成文章索引
 * @returns {import('astro').AstroIntegration} Astro集成对象
 */
export function articleIndexerIntegration() {
  return {
    name: 'article-indexer-integration',
    hooks: {
      // 开发服务器钩子 - 为开发模式添加虚拟API路由
      'astro:server:setup': ({ server }) => {
        // 为index目录下的文件提供虚拟API路由
        server.middlewares.use((req, res, next) => {
          // 检查请求路径是否是索引文件
          if (req.url.startsWith('/index/') && req.method === 'GET') {
            const requestedFile = req.url.slice(7); // 移除 '/index/'
            const filePath = path.join(indexDir, requestedFile);
            
            console.log(`虚拟API请求: ${req.url} -> ${filePath}`);
            
            // 检查文件是否存在
            if (fs.existsSync(filePath)) {
              const stat = fs.statSync(filePath);
              if (stat.isFile()) {
                // 设置适当的Content-Type
                let contentType = 'application/octet-stream';
                if (filePath.endsWith('.json')) {
                  contentType = 'application/json';
                } else if (filePath.endsWith('.bin')) {
                  contentType = 'application/octet-stream';
                }
                
                res.setHeader('Content-Type', contentType);
                res.setHeader('Content-Length', stat.size);
                fs.createReadStream(filePath).pipe(res);
                return;
              }
            }
            
            // 文件不存在，返回404
            res.statusCode = 404;
            res.end('索引文件未找到');
            return;
          }
          
          // 不是索引文件请求，继续下一个中间件
          next();
        });
      },
      'astro:build:done': async ({ dir, pages }) => {
        console.log('Astro构建完成，开始生成文章索引...');
        
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
        
        // 确定客户端输出目录
        let clientDirPath = buildDirPath;
        const clientSuffix = path.sep + 'client';
        
        if (buildDirPath.endsWith(clientSuffix)) {
          clientDirPath = buildDirPath;
        } else if (fs.existsSync(path.join(buildDirPath, 'client'))) {
          clientDirPath = path.join(buildDirPath, 'client');
        }
        
        // 索引输出目录
        const outputDirPath = path.join(clientDirPath, 'index');
        
        await generateArticleIndex({ 
          buildDir: clientDirPath, 
          outputDir: outputDirPath 
        });
      }
    }
  };
}

/**
 * 生成文章索引
 * 使用二进制可执行文件直接扫描HTML目录并生成索引
 * @param {Object} options - 选项对象
 * @param {string} options.buildDir - 构建输出目录
 * @param {string} options.outputDir - 索引输出目录
 * @returns {Promise<Object>} 索引生成结果
 */
export async function generateArticleIndex(options = {}) {
  console.log('开始生成文章索引...');
  
  try {
    // 使用提供的目录或默认目录
    const buildDirPath = options.buildDir || buildDir;
    const outputDirPath = options.outputDir || indexDir;
    
    console.log(`构建目录: ${buildDirPath}`);
    console.log(`索引输出目录: ${outputDirPath}`);
    
    // 确保索引目录存在
    if (!fs.existsSync(outputDirPath)) {
      console.log(`创建索引输出目录: ${outputDirPath}`);
      fs.mkdirSync(outputDirPath, { recursive: true });
    }
    
    // 检查二进制文件是否存在
    if (!fs.existsSync(binaryPath)) {
      throw new Error(`索引工具不存在: ${binaryPath}`);
    }
    
    // 检查构建目录是否存在
    if (!fs.existsSync(buildDirPath)) {
      throw new Error(`构建目录不存在: ${buildDirPath}`);
    }
    
    // 设置二进制可执行文件权限（仅Unix系统）
    if (process.platform !== 'win32') {
      fs.chmodSync(binaryPath, 0o755);
    }

    try {
      // 执行索引命令，直接捕获输出
      const result = execFileSync(binaryPath, [
        '--source',                   // 源目录参数名
        buildDirPath,                 // 源目录值
        '--output',                   // 输出目录参数名
        outputDirPath,                // 输出目录值
        '--verbose',                  // 输出详细日志
        // '--all'                       // 索引所有页面类型
      ], { 
        encoding: 'utf8',
        // 在Windows上禁用引号转义，防止参数解析问题
        windowsVerbatimArguments: process.platform === 'win32'
      });
      
      console.log(result);
      console.log('文章索引生成完成!');
      console.log(`索引文件保存在: ${outputDirPath}`);
      
      return {
        success: true,
        indexPath: outputDirPath
      };
    } catch (execError) {
      console.error('执行索引工具时出错:', execError.message);
      if (execError.stdout) console.log('标准输出:', execError.stdout);
      if (execError.stderr) console.log('错误输出:', execError.stderr);
      
      // 尝试直接读取构建目录内容并打印，帮助调试
      try {
        console.log(`构建目录内容 (${buildDirPath}):`);
        const items = fs.readdirSync(buildDirPath);
        for (const item of items) {
          const itemPath = path.join(buildDirPath, item);
          const stats = fs.statSync(itemPath);
          console.log(`- ${item} (${stats.isDirectory() ? '目录' : '文件'}, ${stats.size} 字节)`);
        }
      } catch (fsError) {
        console.error('无法读取构建目录内容:', fsError.message);
      }
      
      throw execError;
    }
  } catch (error) {
    console.error('生成文章索引时出错:', error.message);
    
    // 更详细的错误信息
    if (error.stdout) console.log('标准输出:', error.stdout);
    if (error.stderr) console.log('错误输出:', error.stderr);
    
    return {
      success: false,
      error: error.message
    };
  }
}
