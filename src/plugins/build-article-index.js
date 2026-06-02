import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { resolveBuildDir } from './build-output.js';

// 获取当前文件的目录
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 获取项目根目录
const rootDir = path.resolve(__dirname, '../..');
const wasmRootDir = path.join(rootDir, 'wasm');
const wasmAssetDir = path.join(rootDir, 'src', 'assets', 'wasm');
// 构建目录在根目录下
const buildDir = path.resolve(rootDir, 'dist');
// 索引文件存储位置
const indexDir = path.join(buildDir, 'client', 'assets', 'index');

const binaryName = process.platform === 'win32'
  ? 'article-indexer-cli.exe'
  : 'article-indexer-cli';
// 二进制可执行文件路径
const binaryPath = path.join(rootDir, 'src', 'assets', 'article-index', binaryName);
const builtBinaryPath = path.join(
  wasmRootDir,
  'target',
  'release',
  binaryName,
);
const wasmBindgenBinaryName = process.platform === 'win32'
  ? 'wasm-bindgen.exe'
  : 'wasm-bindgen';
const indexerSourcePaths = [
  path.join(wasmRootDir, 'Cargo.toml'),
  path.join(wasmRootDir, 'Cargo.lock'),
  path.join(wasmRootDir, 'article-indexer'),
  path.join(wasmRootDir, 'article-filter'),
  path.join(wasmRootDir, 'search'),
  path.join(wasmRootDir, 'utils-common'),
];
const wasmPackages = [
  {
    crateName: 'search-wasm',
    pkgDir: path.join(wasmRootDir, 'search'),
    sourcePaths: [
      path.join(wasmRootDir, 'Cargo.toml'),
      path.join(wasmRootDir, 'Cargo.lock'),
      path.join(wasmRootDir, 'search'),
      path.join(wasmRootDir, 'utils-common'),
    ],
    wasmName: 'search_wasm',
    outputDir: path.join(wasmAssetDir, 'search'),
  },
  {
    crateName: 'article-filter',
    pkgDir: path.join(wasmRootDir, 'article-filter'),
    sourcePaths: [
      path.join(wasmRootDir, 'Cargo.toml'),
      path.join(wasmRootDir, 'Cargo.lock'),
      path.join(wasmRootDir, 'article-filter'),
      path.join(wasmRootDir, 'utils-common'),
    ],
    wasmName: 'article_filter',
    outputDir: path.join(wasmAssetDir, 'article-filter'),
  },
];

function hasCargo() {
  try {
    const output = execFileSync('cargo', ['--version'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return typeof output === 'string' && output.includes('cargo');
  } catch {
    return false;
  }
}

function canExecute(command, args = ['--version']) {
  try {
    const output = execFileSync(command, args, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return typeof output === 'string' && output.length > 0;
  } catch {
    return false;
  }
}

function resolveWasmBindgenCli() {
  const candidateDirs = [
    process.env.CARGO_HOME ? path.join(process.env.CARGO_HOME, 'bin') : null,
    process.env.HOME ? path.join(process.env.HOME, '.cargo', 'bin') : null,
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, '.cargo', 'bin') : null,
    process.platform === 'win32' ? null : '/rust/bin',
  ].filter(Boolean);

  for (const candidateDir of candidateDirs) {
    const candidatePath = path.join(candidateDir, wasmBindgenBinaryName);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  if (canExecute(wasmBindgenBinaryName)) {
    return wasmBindgenBinaryName;
  }

  return null;
}

function getNewestMtimeMs(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return 0;
  }

  const stat = fs.statSync(targetPath);
  if (!stat.isDirectory()) {
    return stat.mtimeMs;
  }

  let newestMtimeMs = stat.mtimeMs;
  const entries = fs.readdirSync(targetPath, { withFileTypes: true });

  for (const entry of entries) {
    newestMtimeMs = Math.max(
      newestMtimeMs,
      getNewestMtimeMs(path.join(targetPath, entry.name)),
    );
  }

  return newestMtimeMs;
}

function shouldRebuildIndexerBinary() {
  if (!fs.existsSync(binaryPath)) {
    return true;
  }

  const binaryMtimeMs = fs.statSync(binaryPath).mtimeMs;
  const sourceMtimeMs = Math.max(
    ...indexerSourcePaths.map((sourcePath) => getNewestMtimeMs(sourcePath)),
  );

  return sourceMtimeMs > binaryMtimeMs;
}

function shouldRebuildWasmPackage(pkg) {
  const jsAssetPath = path.join(pkg.outputDir, `${pkg.wasmName}.js`);
  const wasmAssetPath = path.join(pkg.outputDir, `${pkg.wasmName}_bg.wasm`);

  if (!fs.existsSync(jsAssetPath) || !fs.existsSync(wasmAssetPath)) {
    return true;
  }

  const builtAt = Math.min(
    fs.statSync(jsAssetPath).mtimeMs,
    fs.statSync(wasmAssetPath).mtimeMs,
  );
  const sourceMtimeMs = Math.max(
    ...pkg.sourcePaths.map((sourcePath) => getNewestMtimeMs(sourcePath)),
  );

  return sourceMtimeMs > builtAt;
}

function ensureWasmBindgenCli() {
  const existingCli = resolveWasmBindgenCli();
  if (existingCli) {
    return existingCli;
  }

  if (!hasCargo()) {
    throw new Error('当前环境未安装 cargo，无法自动安装 wasm-bindgen-cli');
  }

  console.log('检测到 wasm-bindgen CLI 缺失，开始安装...');
  execFileSync(
    'cargo',
    ['install', 'wasm-bindgen-cli', '--version', '0.2.121'],
    {
      cwd: wasmRootDir,
      encoding: 'utf8',
      stdio: 'inherit',
    },
  );

  const installedCli = resolveWasmBindgenCli();
  if (!installedCli) {
    throw new Error(`安装 wasm-bindgen CLI 失败: ${wasmBindgenBinaryName}`);
  }

  return installedCli;
}

function buildWasmPackage(pkg) {
  if (!shouldRebuildWasmPackage(pkg)) {
    return;
  }

  if (!hasCargo()) {
    throw new Error(`检测到 ${pkg.crateName} 前端 wasm 产物缺失或过期，但当前环境未安装 cargo`);
  }

  const wasmBindgenCli = ensureWasmBindgenCli();

  console.log(`检测到 ${pkg.crateName} 前端 wasm 产物已过期，开始重新编译...`);

  execFileSync(
    'cargo',
    ['build', '--release', '--target', 'wasm32-unknown-unknown', '--package', pkg.crateName],
    {
      cwd: wasmRootDir,
      encoding: 'utf8',
      stdio: 'inherit',
    },
  );

  const builtWasmPath = path.join(
    wasmRootDir,
    'target',
    'wasm32-unknown-unknown',
    'release',
    `${pkg.wasmName}.wasm`,
  );

  if (!fs.existsSync(builtWasmPath)) {
    throw new Error(`未找到 ${pkg.crateName} 编译产物: ${builtWasmPath}`);
  }

  fs.mkdirSync(pkg.outputDir, { recursive: true });

  execFileSync(
    wasmBindgenCli,
    [
      builtWasmPath,
      '--out-dir',
      pkg.outputDir,
      '--target',
      'web',
      '--no-typescript',
    ],
    {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: 'inherit',
    },
  );

  console.log(`${pkg.crateName} 前端 wasm 已更新: ${pkg.outputDir}`);
}

function ensureArticleIndexerBinary() {
  if (!shouldRebuildIndexerBinary()) {
    return;
  }

  if (!hasCargo()) {
    throw new Error('检测到文章索引器缺失或过期，但当前环境未安装 cargo');
  }

  console.log('检测到文章索引器已过期，开始重新编译...');

  execFileSync(
    'cargo',
    ['build', '--release', '--package', 'article-indexer', '--bin', 'article-indexer-cli'],
    {
      cwd: wasmRootDir,
      encoding: 'utf8',
      stdio: 'inherit',
    },
  );

  if (!fs.existsSync(builtBinaryPath)) {
    throw new Error(`重新编译后仍未找到索引工具: ${builtBinaryPath}`);
  }

  fs.mkdirSync(path.dirname(binaryPath), { recursive: true });
  fs.copyFileSync(builtBinaryPath, binaryPath);

  if (process.platform !== 'win32') {
    fs.chmodSync(binaryPath, 0o755);
  }

  console.log(`文章索引器已更新: ${binaryPath}`);
}

function ensureWasmAssets() {
  for (const pkg of wasmPackages) {
    buildWasmPackage(pkg);
  }
}

function ensureStaticIndexRuntimeArtifacts() {
  const runtimePaths = [
    path.join(wasmAssetDir, 'search', 'search_wasm.js'),
    path.join(wasmAssetDir, 'search', 'search_wasm_bg.wasm'),
    path.join(wasmAssetDir, 'article-filter', 'article_filter.js'),
    path.join(wasmAssetDir, 'article-filter', 'article_filter_bg.wasm'),
    binaryPath,
  ];

  const missingPaths = runtimePaths.filter((targetPath) => !fs.existsSync(targetPath));

  if (missingPaths.length > 0) {
    throw new Error(`缺少静态索引运行时产物: ${missingPaths.join(', ')}`);
  }
}

function formatArtifactTimestamp(targetPath) {
  const timestamp = fs.statSync(targetPath).mtime;
  return Number.isNaN(timestamp.getTime()) ? 'unknown' : timestamp.toISOString();
}

function logRuntimeArtifactSummary() {
  const runtimeArtifacts = [
    {
      label: 'search wasm',
      path: path.join(wasmAssetDir, 'search', 'search_wasm_bg.wasm'),
    },
    {
      label: 'article filter wasm',
      path: path.join(wasmAssetDir, 'article-filter', 'article_filter_bg.wasm'),
    },
    {
      label: `article indexer (${process.platform})`,
      path: binaryPath,
    },
  ];

  console.log('[索引构建] 当前运行时产物:');
  for (const artifact of runtimeArtifacts) {
    if (!fs.existsSync(artifact.path)) {
      console.log(`- ${artifact.label}: 缺失 (${artifact.path})`);
      continue;
    }

    console.log(`- ${artifact.label}: ${artifact.path} (mtime=${formatArtifactTimestamp(artifact.path)})`);
  }
}

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
          if (req.url.startsWith('/assets/index/') && req.method === 'GET') {
            const requestedFile = req.url.slice('/assets/index/'.length);
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
        const clientDirPath = resolveBuildDir(dir);
        
        // 索引输出目录
        const outputDirPath = path.join(clientDirPath, 'assets', 'index');
        
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
    try {
      ensureWasmAssets();
    } catch (wasmBuildError) {
      console.warn(`[索引构建] wasm 前端产物未完成重编译，继续使用仓库内预构建产物: ${wasmBuildError.message}`);
    }

    try {
      ensureArticleIndexerBinary();
    } catch (indexerBuildError) {
      console.warn(`[索引构建] native 索引器未完成重编译，继续使用仓库内预构建产物: ${indexerBuildError.message}`);
    }

    ensureStaticIndexRuntimeArtifacts();
    logRuntimeArtifactSummary();

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
