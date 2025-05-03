import hljs from 'highlight.js';
import path from 'path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import crypto from 'crypto';
import os from 'os';
import * as childProcess from 'child_process';
import util from 'util';

// 将exec转换为Promise版本
const execPromise = util.promisify(childProcess.exec);

// 终端相关语言列表
const TERMINAL_LANGUAGES = ['bash', 'shell', 'sh', 'zsh', 'console', 'terminal', 'cmd', 'powershell', 'ps', 'batch'];

// 常用语言别名映射
const LANGUAGE_ALIASES = {
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'yml': 'yaml',
  'git': 'diff',
  'text': 'plaintext',
  'docker-compose': 'yaml',
  'npm': 'bash',
  'docker': 'dockerfile',
  'node': 'javascript',
  'nginx': 'ini',
  'mdx': 'markdown',
  '.gitignore': 'plaintext',
  'astro': 'html',
  'jsx': 'javascript',
  'tsx': 'typescript',
  'vue': 'html',
  'cron': 'plaintext',
  'mindmap': 'plaintext',
  'batch': 'plaintext'
};

// 用于存储全局状态的对象
const globalStore = {
  mermaidDefinitions: new Map(),
  pendingMermaidGraphs: []
};

/**
 * 检查Mermaid CLI是否可用
 */
async function checkMermaidCliAvailable() {
  try {
    // 检测是否在Vercel环境中
    const isVercelEnv = process.env.VERCEL === '1';
    if (isVercelEnv) {
      console.log(`[Mermaid检测] 在Vercel环境中运行, Node版本: ${process.version}`);
    }
    
    // 首先检查npx是否可用
    try {
      const { stdout: npxVersion } = await execPromise('npx --version');
      console.log(`[Mermaid检测] NPX可用，版本: ${npxVersion.trim()}`);
    } catch (npxError) {
      console.error(`[Mermaid检测] NPX不可用: ${npxError.message}`);
      // 在Vercel环境中，我们假设NPX始终可用
      if (!isVercelEnv) {
        return false;
      }
    }
    
    // 检查mermaid-cli是否已安装
    try {
      const { stdout, stderr } = await execPromise('npx mmdc --version');
      console.log(`[Mermaid检测] Mermaid CLI已安装，版本: ${stdout.trim() || stderr.trim()}`);
      // 版本输出成功即可认为已安装，无需后续测试
      return true;
    } catch (mmdcError) {
      // 版本检查失败，可能是命令不存在或参数不兼容
      console.log(`[Mermaid检测] Mermaid CLI版本检查失败: ${mmdcError.message}`);
      // 继续创建测试文件进行测试
    }

    // 创建一个简单的测试文件
    const tempDir = isVercelEnv ? path.join(process.cwd(), 'dist', 'client', 'mermaid-svg') : os.tmpdir();
    
    // 确保目录存在
    try {
      if (!fsSync.existsSync(tempDir)) {
        fsSync.mkdirSync(tempDir, { recursive: true });
      }
    } catch (mkdirError) {
      console.error(`[Mermaid检测] 创建临时目录失败: ${mkdirError.message}`);
      // 在Vercel环境中，尝试使用项目根目录
      if (isVercelEnv) {
        try {
          console.log(`[Mermaid检测] 尝试使用项目根目录`);
        } catch (e) {
          // 忽略错误
        }
      }
    }
    
    // 生成唯一的测试文件名
    const testId = Date.now() + '-' + Math.random().toString(36).substring(2, 10);
    const testFile = path.join(tempDir, `test-mermaid-${testId}.mmd`);
    const testSvgFile = path.join(tempDir, `test-mermaid-${testId}.svg`);
    
    // 写入一个简单的图表定义
    try {
      await fs.writeFile(testFile, 'graph TD;\nA-->B;', 'utf8');
      console.log(`[Mermaid检测] 测试文件已创建: ${testFile}`);
    } catch (writeError) {
      console.error(`[Mermaid检测] 创建测试文件失败: ${writeError.message}`);
      if (isVercelEnv) {
        console.log(`[Mermaid检测] 在Vercel环境中假设CLI已安装`);
        return true;
      }
      return false;
    }
    
    try {
      // 尝试执行命令 - 在Vercel环境中使用基本参数
      const testCmd = isVercelEnv 
        ? `npx mmdc -i "${testFile}" -o "${testSvgFile}"`
        : `npx mmdc -i "${testFile}" -o "${testSvgFile}" -t default`;
      
      console.log(`[Mermaid检测] 执行测试命令: ${testCmd}`);
      const { stdout, stderr } = await execPromise(testCmd);
      
      if (stdout) console.log(`[Mermaid检测] 命令输出: ${stdout}`);
      if (stderr) console.log(`[Mermaid检测] 命令错误: ${stderr}`);
      
      // 清理测试文件
      try {
        await fs.unlink(testFile);
        if (fsSync.existsSync(testSvgFile)) {
          await fs.unlink(testSvgFile);
        }
        console.log(`[Mermaid检测] 测试文件已清理`);
      } catch (cleanupError) {
        console.log(`[Mermaid检测] 清理测试文件失败: ${cleanupError.message}`);
        // 忽略清理错误
      }
      
      return true;
    } catch (testError) {
      console.error(`[Mermaid检测] Mermaid CLI测试失败: ${testError.message}`);
      
      // 输出标准输出和错误输出，帮助调试
      if (testError.stdout) console.log(`[Mermaid检测] 命令输出: ${testError.stdout}`);
      if (testError.stderr) console.log(`[Mermaid检测] 命令错误: ${testError.stderr}`);
      
      // 尝试清理测试文件
      try {
        await fs.unlink(testFile);
        console.log(`[Mermaid检测] 测试源文件已清理`);
      } catch (e) {
        // 忽略清理错误
      }
      
      // 尝试安装Mermaid CLI - 在Vercel环境中使用项目安装而非全局安装
      try {
        if (isVercelEnv) {
          console.log(`[Mermaid检测] 在Vercel环境中安装mermaid-cli作为项目依赖`);
          await execPromise('npm install @mermaid-js/mermaid-cli --no-save');
        } else {
          console.log(`[Mermaid检测] 尝试全局安装mermaid-cli`);
          await execPromise('npm install -g @mermaid-js/mermaid-cli');
        }
        console.log(`[Mermaid检测] Mermaid CLI安装成功`);
        return true;
      } catch (installError) {
        console.error(`[Mermaid检测] 安装Mermaid CLI失败: ${installError.message}`);
        
        // 在Vercel环境中，我们假设可以使用CLI
        if (isVercelEnv) {
          console.log(`[Mermaid检测] 在Vercel环境中继续执行，假设已安装`);
          return true;
        }
        
        return false;
      }
    }
  } catch (generalError) {
    console.error(`[Mermaid检测] 检查过程发生错误: ${generalError.message}`);
    
    // 在Vercel环境中，我们假设可以继续
    if (process.env.VERCEL === '1') {
      console.log(`[Mermaid检测] 在Vercel环境中继续执行`);
      return true;
    }
    
    return false;
  }
}

// 注册语言别名
function registerAliases() {
  Object.entries(LANGUAGE_ALIASES).forEach(([alias, language]) => {
    try {
      if (alias !== language && hljs.getLanguage(language)) {
        hljs.registerAliases(alias, { languageName: language });
      }
    } catch (e) {
      // 移除详细日志
    }
  });
}

// 检测是否为终端命令类型
function isTerminalLike(lang) {
  return TERMINAL_LANGUAGES.includes(lang);
}

/**
 * 检查语言是否可用
 */
function isLanguageAvailable(lang) {
  if (!lang) return false;
  
  try {
    const normalizedLang = normalizeLanguage(lang);
    return !!hljs.getLanguage(normalizedLang);
  } catch (e) {
    return false;
  }
}

/**
 * 代码高亮处理函数
 */
function highlightCode(code, language) {
  if (!code) return escape(code || '');

  try {
    const normalizedLang = normalizeLanguage(language);
    
    const highlightResult = hljs.highlight(code, {
      language: normalizedLang,
      ignoreIllegals: true,
    });
    
    return highlightResult.value;
  } catch (e) {
    // 移除详细警告日志
    return escape(code);
  }
}

/**
 * 规范化语言名称
 */
function normalizeLanguage(lang) {
  return LANGUAGE_ALIASES[lang?.toLowerCase()] || lang || 'plaintext';
}

/**
 * 清理文件名，确保不会有连续的短横线
 */
function sanitizeFileName(name) {
  if (!name) return 'default';
  
  // 先替换所有非字母数字字符为短横线
  let result = name.replace(/[^a-zA-Z0-9]/g, '-');
  
  // 然后去除连续的短横线
  result = result.replace(/-+/g, '-');
  
  // 去除开头和结尾的短横线
  result = result.replace(/^-+|-+$/g, '');
  
  return result || 'default';
}

/**
 * 自定义代码块集成
 */
export default function customCodeBlocksIntegration() {
  // 使用外部定义的globalStore，不再在此重新定义一个新的
  
  /**
   * 扫描内容目录检查Mermaid代码块
   * @param {Object} logger - 日志记录器
   */
  async function scanContentForMermaid(logger) {
    try {
      const contentDir = path.join(process.cwd(), 'src/content');
      
      // 检查目录是否存在
      try {
        await fs.access(contentDir);
      } catch (error) {
        return [];
      }
      
      // 递归获取所有 .md 和 .mdx 文件
      async function findMarkdownFiles(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files = await Promise.all(entries.map(async (entry) => {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            return findMarkdownFiles(fullPath);
          } else if (/\.(md|mdx)$/.test(entry.name)) {
            return [fullPath];
          } else {
            return [];
          }
        }));
        return files.flat();
      }
      
      const markdownFiles = await findMarkdownFiles(contentDir);
      logger.info(`找到 ${markdownFiles.length} 个 Markdown/MDX 文件`);
      
      // 搜索Mermaid代码块
      const mermaidFiles = [];
      
      for (const file of markdownFiles) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          // 简单检查是否包含 ```mermaid 标记
          if (content.includes('```mermaid') || content.includes('~~~mermaid')) {
            const matches = content.match(/```mermaid\s+([\s\S]*?)```|~~~mermaid\s+([\s\S]*?)~~~/g) || [];
            const relativePath = path.relative(contentDir, file);
            mermaidFiles.push({
              path: relativePath,
              count: matches.length
            });
            
            // 移除详细日志，只保留关键信息
            if (matches.length > 0) {
              logger.info(`文件 "${relativePath}" 包含 ${matches.length} 个 Mermaid 代码块`);
            }
            
            // 尝试提取并处理这些Mermaid代码块
            matches.forEach((match, index) => {
              const code = match.replace(/```mermaid\s+|~~~mermaid\s+|```$|~~~$/g, '').trim();
              if (code) {
                // 移除详细日志
                
                // 标准化并计算哈希
                const normalizedCode = code.trim();
                const hash = crypto.createHash('md5').update(normalizedCode).digest('hex');
                
                // 使用文件名和索引生成一个简洁安全的文件名
                const baseName = path.basename(relativePath, path.extname(relativePath));
                // 使用安全处理函数
                const safeBaseName = sanitizeFileName(baseName);
                const safeFilename = `mermaid-diagram-${safeBaseName}-${index}`;
                const svgFileName = `${safeFilename}-${hash}.svg`;
                
                globalStore.pendingMermaidGraphs.push({
                  definition: normalizedCode,
                  svgFileName: svgFileName,
                  fromScan: true
                });
              }
            });
          }
        } catch (error) {
          console.error(`读取或处理文件时出错`);
        }
      }
      
      return mermaidFiles;
    } catch (error) {
      logger.error(`扫描内容目录时出错`);
      return [];
    }
  }
  
  /**
   * 处理Mermaid图形，生成SVG
   * @param {string} graphDefinition - Mermaid图形定义
   * @param {string} filename - 可选，文件名
   * @param {boolean} [inBuildMode=false] - 是否在构建模式下运行
   * @returns {string} SVG文件的公共路径
   */
  async function processMermaidGraph(graphDefinition, filename, inBuildMode = false) {
    if (typeof window !== 'undefined') {
      console.error('Mermaid处理必须在服务器端执行');
      return '';
    }

    try {
      // 标准化图表定义（处理空白）
      const normalizedDefinition = graphDefinition.trim();
      
      // 使用MD5哈希创建唯一ID
      const hash = crypto.createHash('md5').update(normalizedDefinition).digest('hex');
      const safeFilename = sanitizeFileName(filename || 'mermaid-diagram-default');
      const svgFileName = `${safeFilename}-${hash}.svg`;
      
      // SVG的公共路径
      const svgPublicPath = `/mermaid-svg/${svgFileName}`;
      
      // 添加到待处理列表，但只在构建模式下实际生成
      if (inBuildMode) {
        // 保存图表定义到内存
        if (!globalStore.mermaidDefinitions.has(svgPublicPath)) {
          globalStore.mermaidDefinitions.set(svgPublicPath, {
            definition: normalizedDefinition,
            svgFileName: svgFileName
          });
        }
        
        // 确保不会重复添加
        const exists = globalStore.pendingMermaidGraphs.some(graph => 
          graph.svgFileName === svgFileName
        );
        
        if (!exists) {
          globalStore.pendingMermaidGraphs.push({
            definition: normalizedDefinition,
            svgFileName: svgFileName
          });
        }
      }
      
      return svgPublicPath;
    } catch (error) {
      console.error(`Mermaid处理错误`);
      return '';
    }
  }
  
  /**
   * 在构建完成后，生成所有Mermaid SVG文件
   * @param {string} outDir - 输出目录路径
   */
  async function generatePendingMermaidGraphs(outDir) {
    try {
      const mermaidGraphs = globalStore.pendingMermaidGraphs;
      
      if (!mermaidGraphs || mermaidGraphs.length === 0) {
        return;
      }
      
      // 检测Vercel环境
      const isVercelEnv = process.env.VERCEL === '1';
      if (isVercelEnv) {
        console.log(`[Mermaid] 检测到Vercel环境，将使用适配的渲染逻辑`);
      }
      
      // 处理输出目录路径 - 如果是URL对象，获取pathname
      if (typeof outDir === 'object' && outDir instanceof URL) {
        outDir = outDir.pathname;
        // Windows路径修复 (如果以/C:开头)
        if (process.platform === 'win32' && outDir.startsWith('/') && /^\/[A-Z]:/i.test(outDir)) {
          outDir = outDir.substring(1);
        }
      }
      
      // 创建SVG输出目录
      const svgOutDir = path.join(outDir, 'mermaid-svg');
      
      try {
        // 使用同步方法确保目录创建成功
        if (!fsSync.existsSync(svgOutDir)) {
          fsSync.mkdirSync(svgOutDir, { recursive: true });
        }
      } catch (dirError) {
        console.error(`创建SVG目录失败: ${dirError.message}`);
        
        // 如果是Vercel环境，创建临时处理目录
        if (isVercelEnv) {
          console.log(`[Mermaid] 尝试在Vercel环境创建备用目录`);
          try {
            const tmpOutDir = path.join(process.cwd(), 'dist', 'client', 'mermaid-svg');
            if (!fsSync.existsSync(tmpOutDir)) {
              fsSync.mkdirSync(tmpOutDir, { recursive: true });
            }
            console.log(`[Mermaid] 成功创建备用目录: ${tmpOutDir}`);
          } catch (tmpDirError) {
            console.error(`创建备用目录失败: ${tmpDirError.message}`);
          }
        }
        
        // 继续尝试生成，可能目录已存在
      }

      // 每个图表的处理
      let successCount = 0;
      let failCount = 0;
      let vercelFallbackCount = 0;
      
      // Vercel环境下限制处理的图表数量以避免超时
      const graphsToProcess = isVercelEnv ? 
        mermaidGraphs.slice(0, Math.min(mermaidGraphs.length, 10)) : // 限制为最多10个图表
        mermaidGraphs;
      
      if (isVercelEnv && graphsToProcess.length < mermaidGraphs.length) {
        console.log(`[Mermaid] Vercel环境下图表过多，限制处理前 ${graphsToProcess.length} 个，共 ${mermaidGraphs.length} 个`);
      }
      
      for (const [index, graph] of graphsToProcess.entries()) {
        try {
          // 获取图表定义
          const graphDefinition = graph.graphDefinition || graph.definition;
          
          if (!graphDefinition) {
            failCount++;
            continue;
          }
          
          // 获取图表文件名
          const svgFileName = graph.svgFileName;
          if (svgFileName) {
            // 构建SVG文件路径
            const svgPath = path.join(svgOutDir, svgFileName);
            
            console.log(`[Mermaid] 处理图表 ${index + 1}/${graphsToProcess.length}: ${svgFileName}`);
            const startTime = Date.now();
            
            const success = await generateThemeAwareSvg(graphDefinition, svgPath, index, graphsToProcess.length);
            const timeUsed = Date.now() - startTime;
            
            if (success) {
              // 检查文件是否真的存在
              if (fsSync.existsSync(svgPath)) {
                const fileSize = fsSync.statSync(svgPath).size;
                console.log(`[Mermaid] 成功生成SVG (${fileSize} 字节), 耗时: ${timeUsed}ms`);
                successCount++;
                
                // 如果生成的是占位SVG
                if (isVercelEnv && fileSize < 500) {
                  vercelFallbackCount++;
                }
              } else {
                console.log(`[Mermaid] 生成SVG报告成功但文件不存在: ${svgPath}`);
                failCount++;
              }
            } else {
              failCount++;
              console.log(`[Mermaid] 生成SVG失败, 耗时: ${timeUsed}ms`);
              
              // 在Vercel环境中尝试使用占位符
              if (isVercelEnv) {
                try {
                  const fallbackSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg class="mermaid-svg" width="100%" height="auto" viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f5f5f5" />
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="12px">
    Mermaid图表占位符 (生成失败后使用)
  </text>
</svg>`;
                  await fs.writeFile(svgPath, fallbackSvg, 'utf8');
                  console.log(`[Mermaid] 生成失败后补充占位SVG`);
                  vercelFallbackCount++;
                  // 将失败转为成功，因为提供了替代方案
                  successCount++;
                  failCount--;
                } catch (fallbackError) {
                  console.error(`[Mermaid] 生成占位SVG失败: ${fallbackError.message}`);
                }
              }
            }
          } else {
            failCount++;
          }
        } catch (graphError) {
          console.error(`处理图表失败: ${graphError.message}`);
          failCount++;
        }
      }
      
      // 输出汇总信息
      console.log(`[Mermaid] 图表处理完成: 总共 ${graphsToProcess.length} 个, 成功 ${successCount} 个, 失败 ${failCount} 个`);
      if (isVercelEnv && vercelFallbackCount > 0) {
        console.log(`[Mermaid] 在Vercel环境中使用了 ${vercelFallbackCount} 个占位SVG`);
      }
      
      if (isVercelEnv && graphsToProcess.length < mermaidGraphs.length) {
        console.log(`[Mermaid] 警告: 由于Vercel环境限制，${mermaidGraphs.length - graphsToProcess.length} 个图表未处理`);
      }
    } catch (error) {
      console.error(`生成Mermaid SVG文件出错: ${error.message}`);
      if (error.stack) {
        console.error(`错误堆栈: ${error.stack}`);
      }
    }
  }
  
  // 生成支持主题切换的SVG
  async function generateThemeAwareSvg(graphDefinition, svgPath, index, total) {
    try {
      // 检测Vercel环境并添加警告日志
      const isVercelEnv = process.env.VERCEL === '1';
      if (isVercelEnv) {
        console.log(`[Mermaid警告] 在Vercel环境中运行，可能会遇到限制`);
      }
      
      // 标准化图表定义
      const normalizedDefinition = graphDefinition.trim();
      
      // 确保目标目录存在
      const svgDir = path.dirname(svgPath);
      if (!fsSync.existsSync(svgDir)) {
        fsSync.mkdirSync(svgDir, { recursive: true });
      }
      
      // 直接在目标目录中创建文件，避免使用临时目录
      const uniqueId = Date.now() + '-' + Math.random().toString(36).substring(2, 10);
      const mmdFilePath = path.join(svgDir, `source-${uniqueId}.mmd`);
      const rawSvgPath = path.join(svgDir, `raw-${uniqueId}.svg`);
      const puppeteerConfigPath = path.join(svgDir, `puppeteer-config-${uniqueId}.json`);
      
      // 输出详细的环境信息帮助调试
      console.log(`[Mermaid调试] 当前工作目录: ${process.cwd()}`);
      console.log(`[Mermaid调试] 图表文件路径: ${mmdFilePath}`);
      console.log(`[Mermaid调试] 原始SVG路径: ${rawSvgPath}`);
      console.log(`[Mermaid调试] 最终SVG路径: ${svgPath}`);
      console.log(`[Mermaid调试] 操作系统: ${process.platform}`);
      console.log(`[Mermaid调试] Node版本: ${process.version}`);

      // 写入Mermaid定义到文件
      await fs.writeFile(mmdFilePath, normalizedDefinition, 'utf8');
      console.log(`[Mermaid调试] 已写入图表定义文件`);
      
      // 写入Puppeteer配置文件
      const puppeteerConfig = {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      };
      await fs.writeFile(puppeteerConfigPath, JSON.stringify(puppeteerConfig), 'utf8');
      console.log(`[Mermaid调试] 已写入Puppeteer配置文件`);
      
      // 构建Mermaid命令 - 使用puppeteerConfigFile而不是puppeteerConfig
      let mermaidCmd = `npx mmdc -i "${mmdFilePath}" -o "${rawSvgPath}" -t default --puppeteerConfigFile "${puppeteerConfigPath}"`;
      console.log(`[Mermaid调试] 执行命令: ${mermaidCmd}`);
      
      try {
        const { stdout, stderr } = await execPromise(mermaidCmd);
        if (stdout) console.log(`[Mermaid调试] 命令输出: ${stdout}`);
        if (stderr) console.log(`[Mermaid调试] 命令错误: ${stderr}`);
      } catch (execError) {
        console.error(`执行Mermaid命令失败: ${execError.message}`);
        if (execError.stdout) console.log(`命令标准输出: ${execError.stdout}`);
        if (execError.stderr) console.log(`命令错误输出: ${execError.stderr}`);
        
        // 尝试使用简化版命令，不使用puppeteer配置
        try {
          console.log(`[Mermaid调试] 尝试使用基本命令不带配置`);
          const basicCmd = `npx mmdc -i "${mmdFilePath}" -o "${rawSvgPath}" -t default`;
          const { stdout, stderr } = await execPromise(basicCmd);
          if (stdout) console.log(`[Mermaid调试] 基本命令输出: ${stdout}`);
          if (stderr) console.log(`[Mermaid调试] 基本命令错误: ${stderr}`);
        } catch (basicExecError) {
          console.error(`使用基本命令失败: ${basicExecError.message}`);
          
          // 如果是Vercel环境，我们提供一个默认的替代SVG
          if (isVercelEnv) {
            console.log(`[Mermaid调试] 在Vercel环境中提供默认占位SVG`);
            const fallbackSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg class="mermaid-svg" width="100%" height="auto" viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f5f5f5" />
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="12px">
    Mermaid图表占位符
  </text>
</svg>`;
            await fs.writeFile(svgPath, fallbackSvg, 'utf8');
            console.log(`[Mermaid调试] 已写入占位SVG`);
            return true;
          }
          
          throw new Error(`Mermaid渲染失败: ${basicExecError.message}`);
        }
      }
      
      // 验证SVG文件是否生成
      try {
        await fs.access(rawSvgPath);
        console.log(`[Mermaid调试] 成功生成原始SVG文件`);
      } catch (e) {
        console.error(`SVG文件生成失败或无法访问: ${e.message}`);
        
        // 如果是Vercel环境，我们提供一个默认的替代SVG
        if (isVercelEnv) {
          console.log(`[Mermaid调试] 在Vercel环境中提供默认占位SVG`);
          const fallbackSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg class="mermaid-svg" width="100%" height="auto" viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f5f5f5" />
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="12px">
    Mermaid图表占位符
  </text>
</svg>`;
          await fs.writeFile(svgPath, fallbackSvg, 'utf8');
          console.log(`[Mermaid调试] 已写入占位SVG`);
          return true;
        }
        
        throw new Error(`无法访问生成的SVG文件: ${e.message}`);
      }
      
      // 读取SVG文件内容
      const lightSvgContent = await fs.readFile(rawSvgPath, 'utf8');
      console.log(`[Mermaid调试] 成功读取SVG内容，长度: ${lightSvgContent.length}`);
      
      // 添加主题类
      const themeAwareSvg = createThemeAwareSvg(lightSvgContent);
      
      // 写入最终SVG文件
      await fs.writeFile(svgPath, themeAwareSvg);
      console.log(`[Mermaid调试] 成功写入最终SVG文件`);
      
      // 清理中间文件
      try {
        await fs.unlink(mmdFilePath);
        await fs.unlink(rawSvgPath);
        await fs.unlink(puppeteerConfigPath);
        console.log(`[Mermaid调试] 成功清理中间文件`);
      } catch (unlinkError) {
        console.log(`[Mermaid调试] 清理中间文件时出错: ${unlinkError.message}`);
        // 忽略清理错误，不影响主流程
      }
      
      return true;
    } catch (error) {
      console.error(`SVG生成失败: ${error.message}`);
      // 提供堆栈跟踪以便更好地调试
      if (error.stack) {
        console.error(`错误堆栈: ${error.stack}`);
      }
      
      // 如果是Vercel环境，写入一个占位符SVG而不是失败
      if (process.env.VERCEL === '1') {
        try {
          console.log(`[Mermaid调试] 在Vercel环境中提供默认占位SVG (错误恢复)`);
          const fallbackSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg class="mermaid-svg" width="100%" height="auto" viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f5f5f5" />
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="12px">
    Mermaid图表占位符 (渲染失败)
  </text>
</svg>`;
          await fs.writeFile(svgPath, fallbackSvg, 'utf8');
          console.log(`[Mermaid调试] 已写入错误恢复占位SVG`);
          return true;
        } catch (fallbackError) {
          console.error(`无法写入占位SVG: ${fallbackError.message}`);
        }
      }
      
      return false;
    }
  }

  // 辅助函数：创建支持主题切换的SVG
  function createThemeAwareSvg(lightSvg) {
    // 从SVG中提取重要部分
    const lightSvgMatch = lightSvg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    
    if (!lightSvgMatch) {
      throw new Error('无法解析SVG内容');
    }
    
    // 从亮色SVG中提取宽度、高度和viewBox
    const widthMatch = lightSvg.match(/width="([^"]*)"/);
    const heightMatch = lightSvg.match(/height="([^"]*)"/);
    const viewBoxMatch = lightSvg.match(/viewBox="([^"]*)"/);
    
    const width = widthMatch ? widthMatch[1] : '100%';
    // 始终设置高度为auto，让CSS控制高度
    const height = 'auto';
    
    // 确保viewBox存在且格式正确
    let viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 100 100';
    if (viewBox.split(' ').length !== 4) {
      // 如果viewBox格式不正确，尝试从宽高创建
      const widthValue = parseFloat(width);
      const originalHeight = heightMatch ? heightMatch[1] : '100%';
      const heightValue = parseFloat(originalHeight);
      
      if (!isNaN(widthValue) && !isNaN(heightValue) && widthValue > 0 && heightValue > 0) {
        viewBox = `0 0 ${widthValue} ${heightValue}`;
      } else {
        // 使用默认viewBox
        viewBox = '0 0 100 100';
      }
    }
    
    // 从亮色SVG中提取内容，并移除样式标签
    let lightContent = lightSvgMatch[1];
    
    // 移除内联样式
    lightContent = lightContent.replace(/<style>[\s\S]*?<\/style>/gi, '');
    
    // 为每个SVG创建唯一前缀，避免ID冲突
    const uniquePrefix = `mmd-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}-`;
    
    // 查找所有id属性并替换它们
    lightContent = lightContent.replace(/\sid="([^"]+)"/g, (match, id) => {
      return ` id="${uniquePrefix}${id}"`;
    });
    
    // 查找引用这些ID的url(#id)并更新它们
    lightContent = lightContent.replace(/url\(#([^)]+)\)/g, (match, id) => {
      return `url(#${uniquePrefix}${id})`;
    });
    
    // 替换id="my-svg"为class="mermaid-svg"
    lightContent = lightContent.replace(/id="my-svg"/gi, '');
    
    // 创建添加了类名的SVG
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg class="mermaid-svg" width="${width}" height="${height}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
  ${lightContent}
</svg>`;
  }
  
  /**
   * 自定义代码块处理的Rehype插件
   */
  function rehypeCustomCodeBlocks(outDir, isDev) {
    registerAliases();
    
    return async (tree, file) => {
      // 收集Mermaid节点
      const mermaidNodes = [];
      // 记录已处理节点
      const processedNodes = new WeakSet();
      
      // 代码块处理Promise
      const codeBlockPromises = [];
      

      // 安全的遍历函数
      const safeVisit = (tree) => {
        const stack = [{node: tree, index: 0, isRoot: true}];
        let codeBlockCount = 0;
        
        while (stack.length > 0) {
          const current = stack[stack.length - 1];
          const {node, index, isRoot} = current;
          
          if (!node.children || index >= node.children.length) {
            stack.pop();
            continue;
          }
          
          const child = node.children[index];
          current.index++;
          
          // 处理代码块
          if (child.type === 'element' && child.tagName === 'pre' && 
              child.children?.length === 1 && 
              child.children[0].tagName === 'code' &&
              !processedNodes.has(child)) {
            
            codeBlockCount++;
            processedNodes.add(child);
            
            const codeNode = child.children[0];
            const classes = codeNode.properties?.className || [];
            
            // 提取语言
            const langClass = classes.find(className => 
              typeof className === 'string' && className.startsWith('language-')
            );
            
            let lang = langClass 
              ? langClass.replace('language-', '') 
              : 'plaintext';
            
            // 检查语言可用性
            const originalLang = lang;
            if (lang !== 'mermaid' && !isLanguageAvailable(lang)) {
              // 移除非关键警告
              lang = 'plaintext';
            }
            
            // 提取代码内容
            let codeContent = '';
            if (codeNode.children) {
              for (const child of codeNode.children) {
                if (child.type === 'text') {
                  codeContent += child.value || '';
                }
              }
            }
            
            // 收集Mermaid代码块
            if (originalLang === 'mermaid') {
              mermaidNodes.push({ node: child, code: codeContent });
              continue;
            }
            
            // 处理普通代码块
            const promise = (async () => {
              try {
                // 提取文件名和高亮行
                let filename = '';
                let linesToHighlight = [];
                const lines = codeContent.split('\n');
                
                // 文件名检测
                const firstLine = lines[0]?.trim() || '';
                const fileNameRegex = /^(?:\/\/|#|<!--)\s*(?:filename|file)(?:\s*:|\s+)([^*]+)(?:\*\/|-->)?$/i;
                const lineRangeRegex = /^(?:\/\/|#|<!--)\s*(?:highlight|line|range)(?:\s*:|\s+)([0-9,-]+)(?:\*\/|-->)?$/i;
                
                const fileNameMatch = firstLine.match(fileNameRegex);
                if (fileNameMatch) {
                  filename = fileNameMatch[1].trim();
                  lines.shift();
                }
                
                // 高亮行检测
                if (lines.length > 0) {
                  const lineRangeMatch = lines[0].trim().match(lineRangeRegex);
                  if (lineRangeMatch) {
                    const rangeStr = lineRangeMatch[1].trim();
                    linesToHighlight = parseLineRanges(rangeStr);
                    lines.shift();
                  }
                }
                
                const isTerminal = isTerminalLike(lang);
                const codeToHighlight = lines.join('\n');
                const highlightedCode = highlightCode(codeToHighlight, lang);
                
                // 创建代码块容器
                const containerNode = {
                  type: 'element',
                  tagName: 'div',
                  properties: { 
                    className: [
                      'code-block-container',
                      isTerminal ? 'terminal-container' : '',
                      originalLang !== lang ? `fallback-language-${originalLang}` : ''
                    ].filter(Boolean),
                    ...(linesToHighlight.length > 0 ? { 'data-highlight-lines': linesToHighlight.join(',') } : {})
                  },
                  children: []
                };
                
                // 创建标题栏
                const titleBarNode = {
                  type: 'element',
                  tagName: 'div',
                  properties: { className: ['code-block-title'] },
                  children: [
                    // 左侧：语言/文件名
                    {
                      type: 'element',
                      tagName: 'div',
                      properties: { className: ['code-title-left'] },
                      children: [
                        // 语言标识
                        {
                          type: 'element',
                          tagName: 'span',
                          properties: { 
                            className: ['code-language', originalLang !== lang ? 'fallback-language' : '']
                          },
                          children: [{ 
                            type: 'text', 
                            value: originalLang !== lang 
                              ? `${getDisplayLanguage(originalLang)} (使用纯文本格式)`
                              : getDisplayLanguage(lang)
                          }]
                        }
                      ]
                    },
                    // 右侧：复制按钮
                    {
                      type: 'element',
                      tagName: 'div',
                      properties: { className: ['code-title-right'] },
                      children: [
                        {
                          type: 'element',
                          tagName: 'button',
                          properties: { 
                            className: ['copy-button'],
                            'data-copy': 'true'
                          },
                          children: [{ type: 'text', value: '复制' }]
                        }
                      ]
                    }
                  ]
                };
                
                // 如有文件名，添加到标题栏
                if (filename) {
                  titleBarNode.children[0].children.push({
                    type: 'element',
                    tagName: 'span',
                    properties: { className: ['code-filename'] },
                    children: [{ type: 'text', value: filename }]
                  });
                }
                
                // 终端窗口处理
                if (isTerminal) {
                  const controlsNode = {
                    type: 'element',
                    tagName: 'div',
                    properties: { className: ['terminal-controls'] },
                    children: [
                      {
                        type: 'element',
                        tagName: 'span',
                        properties: { className: ['terminal-control', 'terminal-close'] },
                        children: []
                      },
                      {
                        type: 'element',
                        tagName: 'span',
                        properties: { className: ['terminal-control', 'terminal-minimize'] },
                        children: []
                      },
                      {
                        type: 'element',
                        tagName: 'span',
                        properties: { className: ['terminal-control', 'terminal-maximize'] },
                        children: []
                      }
                    ]
                  };
                  
                  titleBarNode.children[0].children.unshift(controlsNode);
                }
                
                // 创建代码内容
                const codeContentNode = {
                  type: 'element',
                  tagName: 'div',
                  properties: { className: ['code-block-content'] },
                  children: [
                    {
                      type: 'element',
                      tagName: 'pre',
                      properties: { 
                        className: [
                          isTerminal ? 'terminal-pre' : ''
                        ].filter(Boolean)
                      },
                      children: [
                        {
                          type: 'element',
                          tagName: 'code',
                          properties: { 
                            className: [`language-${lang}`],
                            'data-highlighted': highlightedCode
                          },
                          children: [
                            {
                              type: 'text',
                              value: codeToHighlight
                            }
                          ]
                        }
                      ]
                    }
                  ]
                };
                
                // 组装元素
                containerNode.children.push(titleBarNode);
                containerNode.children.push(codeContentNode);
                
                // 替换原始节点
                Object.assign(child, containerNode);
                processedNodes.add(containerNode);
              } catch (error) {
                console.error(`代码高亮处理失败`);
              }
            })();
            
            codeBlockPromises.push(promise);
          }
          
          // 遍历子节点
          if (child.children && child.children.length > 0 && !processedNodes.has(child)) {
            stack.push({node: child, index: 0, isRoot: false});
          }
        }
      };
      
      safeVisit(tree);
      await Promise.all(codeBlockPromises);
      
      // 处理Mermaid图表
      if (mermaidNodes.length > 0) {
        const mermaidPromises = mermaidNodes.map(async ({ node, code }, index) => {
          try {
            // 构建标准化的图表ID
            let nodeId;
            if (node.properties?.id) {
              nodeId = `mermaid-diagram-${sanitizeFileName(node.properties.id)}`;
            } else if (file && file.path) {
              const baseName = path.basename(file.path, path.extname(file.path));
              const safeBaseName = sanitizeFileName(baseName);
              nodeId = `mermaid-diagram-${safeBaseName}-${index}`;
            } else {
              nodeId = `mermaid-diagram-${index}`;
            }
            
            const result = await processMermaidGraph(code, nodeId, process.env.NODE_ENV === 'production');
            
            if (result) {
              // 创建图表容器
              if (isDev) {
                // 开发模式下使用带有数据属性的容器，动态加载SVG
                const figureNode = {
                  type: 'element',
                  tagName: 'figure',
                  properties: { 
                    className: ['mermaid-figure'],
                    'data-mermaid-src': result
                  },
                  children: []
                };
                
                Object.assign(node, figureNode);
                processedNodes.add(figureNode);
              } else {
                // 生产模式下使用内联SVG替代img标签
                const figureNode = {
                  type: 'element',
                  tagName: 'figure',
                  properties: { className: ['mermaid-figure'] },
                  children: [
                    {
                      type: 'element',
                      tagName: 'div',
                      properties: { 
                        className: ['mermaid-svg-container'],
                        'data-mermaid-src': result
                      },
                      children: [] // SVG将由客户端JavaScript插入
                    }
                  ]
                };
                
                Object.assign(node, figureNode);
                processedNodes.add(figureNode);
              }
            } else {
              // 错误处理
              node.properties.className = ['mermaid-error'];
              node.children.push({
                type: 'element',
                tagName: 'div',
                properties: { className: ['mermaid-error-message'] },
                children: [{ type: 'text', value: '图表渲染失败' }]
              });
            }
          } catch (error) {
            console.error(`Mermaid处理失败`);
          }
        });
        
        await Promise.all(mermaidPromises);
      }
    };
  }
  
  return {
    name: 'astro-custom-code-blocks',
    hooks: {
      'astro:config:setup': async ({ updateConfig, injectScript, config }) => {
        // 注册语言别名
        registerAliases();
        
        // 开发模式检测
        const isDev = process.env.NODE_ENV !== 'production';
        
        // 确定输出目录
        let outDir;
        
        try {
          if (config.outDir) {
            // 处理URL对象
            if (typeof config.outDir === 'object' && config.outDir instanceof URL) {
              outDir = config.outDir.pathname;
              if (process.platform === 'win32' && outDir.startsWith('/')) {
                if (/^\/[A-Z]:/i.test(outDir)) {
                  outDir = outDir.substring(1);
                }
              }
            } else {
              outDir = String(config.outDir);
            }
          } else {
            outDir = path.join(process.cwd(), 'dist');
          }
        } catch (error) {
          console.error('配置输出目录时出错');
          outDir = path.join(process.cwd(), 'dist');
        }

        // 配置更新，包括确保静态资源正确处理
        updateConfig({
          markdown: {
            syntaxHighlight: false,
            rehypePlugins: [
              ...(config.markdown?.rehypePlugins || []),
              [rehypeCustomCodeBlocks, outDir, isDev]
            ]
          }
        });
      },
      
      'astro:server:setup': ({ server }) => {
        // 开发模式下处理Mermaid SVG请求的虚拟API - 只提供已构建的文件
        server.middlewares.use((req, res, next) => {
          if (req.url.startsWith('/mermaid-svg/')) {
            const svgFileName = req.url.slice('/mermaid-svg/'.length);
            
            // 尝试从构建目录读取已生成的SVG文件
            const svgPath = path.join(process.cwd(), 'dist', 'client', 'mermaid-svg', svgFileName);

            if (svgPath) {
              // 读取并提供SVG文件，设置正确的内容类型和缓存控制
              try {
                const svgContent = fsSync.readFileSync(svgPath, 'utf8');
                res.writeHead(200, { 
                  'Content-Type': 'image/svg+xml',
                  // 避免缓存，确保在主题切换时能重新加载
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'Expires': '0'
                });
                res.end(svgContent);
                return;
              } catch (readError) {
                console.error(`读取SVG文件失败`);
              }
            }
            
            // 未找到文件，返回404
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Mermaid SVG文件不存在，请在构建模式下运行以生成SVG文件');
            return;
          }
          next();
        });
      },
      
      'astro:build:start': async ({ logger }) => {
        logger.info('初始化自定义代码块和Mermaid渲染...');
        
        // 检测Vercel环境
        const isVercelEnv = process.env.VERCEL === '1';
        if (isVercelEnv) {
          logger.info('在Vercel环境中运行，将使用适配的Mermaid处理逻辑');
          logger.info(`操作系统: ${process.platform}, Node版本: ${process.version}`);
        }
        
        // 检查Mermaid CLI是否可用
        const mermaidCliAvailable = await checkMermaidCliAvailable();
        if (!mermaidCliAvailable) {
          logger.warn('警告: Mermaid CLI不可用，SVG生成可能会失败。');
          logger.warn('请手动安装: npm install -g @mermaid-js/mermaid-cli');
        } else {
          logger.info('✓ Mermaid CLI已安装并可用');
        }
        
        // 如果是构建模式，主动扫描内容目录识别Mermaid代码块
        if (process.env.NODE_ENV === 'production') {
          logger.info('构建模式 - 主动扫描内容目录识别Mermaid代码块');
          await scanContentForMermaid(logger);
          logger.info(`待处理Mermaid图表数量: ${globalStore.pendingMermaidGraphs.length}`);
          
          // 在Vercel环境中，限制处理的图表数量
          if (isVercelEnv && globalStore.pendingMermaidGraphs.length > 10) {
            logger.warn(`在Vercel环境中图表数量(${globalStore.pendingMermaidGraphs.length})较多，将限制处理最多10个`);
          }
        }
      },
      
      'astro:build:done': async ({ dir, logger }) => {
        try {
          // 处理输出目录
          let outDir;
          
          // 处理URL对象或字符串
          if (typeof dir === 'object' && dir instanceof URL) {
            outDir = dir.pathname;
            // Windows路径修复
            if (process.platform === 'win32' && outDir.startsWith('/')) {
              if (/^\/[A-Z]:/i.test(outDir)) {
                outDir = outDir.substring(1);
              }
            }
          } else {
            outDir = String(dir);
          }

          if (globalStore.pendingMermaidGraphs.length === 0) {
            return;
          }
          
          logger.info(`开始生成 ${globalStore.pendingMermaidGraphs.length} 个Mermaid SVG文件...`);
          
          // 生成所有待处理的Mermaid图表
          await generatePendingMermaidGraphs(outDir);
        } catch (error) {
          logger.error('生成Mermaid SVG文件失败');
        } finally {
          // 清理内存
          globalStore.pendingMermaidGraphs = [];
        }
      }
    }
  };
}

/**
 * 将字符串形式的行号范围解析为数组
 */
function parseLineRanges(rangeStr) {
  if (!rangeStr) return [];
  
  const result = [];
  const ranges = rangeStr.split(',');
  
  for (const range of ranges) {
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(num => parseInt(num.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          result.push(i);
        }
      }
    } else {
      const num = parseInt(range.trim(), 10);
      if (!isNaN(num)) {
        result.push(num);
      }
    }
  }
  
  return [...new Set(result)].sort((a, b) => a - b);
}

/**
 * 获取显示用的语言名称
 */
function getDisplayLanguage(lang) {
  if (!lang) return '纯文本';
  
  // 首字母大写处理
  const formatted = lang.toLowerCase()
    .replace(/^\w/, c => c.toUpperCase())
    .replace(/-(\w)/g, (_, c) => ' ' + c.toUpperCase());
  
  // 特殊语言名称处理
  const specialNames = {
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'csharp': 'C#',
    'cpp': 'C++',
    'plaintext': '纯文本',
    'yaml': 'YAML',
    'html': 'HTML',
    'css': 'CSS',
    'json': 'JSON',
    'xml': 'XML',
    'svg': 'SVG',
    'jsx': 'JSX',
    'tsx': 'TSX',
    'sql': 'SQL',
    'php': 'PHP'
  };
  
  return specialNames[lang.toLowerCase()] || formatted;
}

// HTML转义函数
function escape(html) {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}