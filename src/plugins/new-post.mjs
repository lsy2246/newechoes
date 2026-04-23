import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';

function pad2(value) {
  return String(value).padStart(2, '0');
}

/**
 * Format a date string in local time with timezone offset.
 *
 * @param {Date} date - Date to format.
 * @returns {string} ISO 8601 date string with timezone offset.
 */
export function formatDateWithTimezone(date = new Date()) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());

  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const offsetHours = pad2(Math.floor(abs / 60));
  const offsetMins = pad2(abs % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMins}`;
}

/**
 * Resolve the project root directory from the current module location.
 *
 * @returns {string} Absolute path to the project root.
 */
export function getProjectRoot() {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '..', '..');
}

/**
 * Return the absolute content root.
 *
 * @param {string} rootDir - Project root directory.
 * @returns {string}
 */
export function getContentRoot(rootDir = getProjectRoot()) {
  return path.resolve(rootDir, 'src', 'content');
}

/**
 * Build the default post content.
 *
 * @param {string} title - Post title.
 * @param {Date} date - Post date.
 * @returns {string} Markdown content for the new post.
 */
export function buildPostContent(title, date = new Date()) {
  const dateValue = formatDateWithTimezone(date);

  return `---\n` +
    `title: "${title}"\n` +
    `date: ${dateValue}\n` +
    `tags: []\n` +
    `---\n` +
    `hello,world\n`;
}

/**
 * Resolve the target directory and title from user input.
 *
 * Examples:
 * - "文章标题" -> src/content/文章标题.md
 * - "notes/web/文章标题" -> src/content/notes/web/文章标题.md
 *
 * @param {string} input - Raw CLI input.
 * @returns {{ relativeDir: string, fileBaseName: string, title: string }}
 */
export function resolvePostTarget(input) {
  const normalizedInput = String(input ?? '').trim().replace(/\\/g, '/');
  if (!normalizedInput) {
    throw new Error('Title is required.');
  }

  const parts = normalizedInput.split('/').filter(Boolean);
  const fileBaseName = parts.at(-1)?.trim();
  if (!fileBaseName || fileBaseName === '.') {
    throw new Error('Title is required.');
  }

  const relativeDir = parts.length > 1 ? parts.slice(0, -1).join(path.sep) : '';

  if (path.isAbsolute(normalizedInput)) {
    throw new Error('Please use a path relative to src/content.');
  }

  if (relativeDir) {
    const resolvedDir = path.normalize(relativeDir);
    if (resolvedDir.startsWith('..') || path.isAbsolute(resolvedDir)) {
      throw new Error('Post path must stay inside src/content.');
    }
  }

  return {
    relativeDir,
    fileBaseName,
    title: fileBaseName,
  };
}

/**
 * Infer the current content directory from the shell working directory.
 *
 * @param {string} rootDir - Project root directory.
 * @param {string} [cwd] - Current working directory.
 * @returns {string}
 */
export function getCurrentContentDirectory(rootDir = getProjectRoot(), cwd = process.cwd()) {
  const contentDir = getContentRoot(rootDir);
  const normalizedContentDir = path.resolve(contentDir);
  const normalizedCwd = path.resolve(cwd);

  if (
    normalizedCwd !== normalizedContentDir &&
    !normalizedCwd.startsWith(`${normalizedContentDir}${path.sep}`)
  ) {
    return '';
  }

  const relativePath = path.relative(normalizedContentDir, normalizedCwd);
  if (!relativePath) {
    return '';
  }

  return relativePath.split(path.sep).join('/');
}

/**
 * Scan and return all directories under src/content.
 *
 * @param {string} rootDir - Project root directory.
 * @returns {string[]}
 */
export function getContentDirectories(rootDir = getProjectRoot()) {
  const contentDir = getContentRoot(rootDir);
  const directories = [];
  const queue = [''];

  while (queue.length > 0) {
    const relativeDir = queue.shift();
    const absoluteDir = relativeDir ? path.join(contentDir, relativeDir) : contentDir;

    if (!fs.existsSync(absoluteDir)) {
      continue;
    }

    const children = fs.readdirSync(absoluteDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        relativePath: relativeDir ? `${relativeDir}/${entry.name}` : entry.name,
      }))
      .sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'zh-CN'));

    for (const child of children) {
      directories.push(child.relativePath);
      queue.push(child.relativePath);
    }
  }

  return directories;
}

async function askDirectory(rl, rootDir) {
  const directories = getContentDirectories(rootDir);
  const currentDir = getCurrentContentDirectory(rootDir);
  const currentLabel = currentDir || 'src/content';
  const directoryChoices = [];
  const seen = new Set();

  directoryChoices.push({
    label: `当前目录 (${currentLabel})`,
    value: currentDir,
  });
  seen.add(currentDir);

  for (const directory of directories) {
    if (seen.has(directory)) {
      continue;
    }
    directoryChoices.push({
      label: directory,
      value: directory,
    });
    seen.add(directory);
  }

  output.write('请选择文章目录：\n');
  directoryChoices.forEach((choice, index) => {
    output.write(`  ${index + 1}. ${choice.label}\n`);
  });

  while (true) {
    const answer = (await rl.question('输入编号后回车（默认 1）: ')).trim();
    const selectedIndex = answer === '' ? 1 : Number.parseInt(answer, 10);

    if (
      Number.isInteger(selectedIndex) &&
      selectedIndex >= 1 &&
      selectedIndex <= directoryChoices.length
    ) {
      return directoryChoices[selectedIndex - 1].value;
    }

    output.write(`无效编号，请输入 1 到 ${directoryChoices.length} 之间的数字。\n`);
  }
}

async function askTitle(rl) {
  while (true) {
    const answer = (await rl.question('请输入文章标题: ')).trim();
    if (answer) {
      return answer;
    }

    output.write('文章标题不能为空，请重新输入。\n');
  }
}

/**
 * Prompt the user to choose a content directory interactively.
 *
 * @param {object} options - Prompt options.
 * @param {string} options.rootDir - Project root directory.
 * @returns {Promise<string>}
 */
export async function promptForDirectory({ rootDir = getProjectRoot() } = {}) {
  const rl = readline.createInterface({ input, output });

  try {
    return await askDirectory(rl, rootDir);
  } finally {
    rl.close();
  }
}

/**
 * Prompt the user for a post title interactively.
 *
 * @returns {Promise<string>}
 */
export async function promptForTitle() {
  const rl = readline.createInterface({ input, output });

  try {
    return await askTitle(rl);
  } finally {
    rl.close();
  }
}

/**
 * Run the interactive new-post flow.
 *
 * @param {object} options - Interactive options.
 * @param {string} [options.rootDir] - Project root directory.
 * @returns {Promise<string>}
 */
export async function runInteractiveNewPost({ rootDir = getProjectRoot() } = {}) {
  const rl = readline.createInterface({ input, output });

  try {
    const selectedDirectory = await askDirectory(rl, rootDir);
    const title = await askTitle(rl);
    return selectedDirectory ? `${selectedDirectory}/${title}` : title;
  } finally {
    rl.close();
  }
}

/**
 * Create a new post file in the default content directory.
 *
 * @param {object} options - Creation options.
 * @param {string} options.title - Post title.
 * @param {string} [options.rootDir] - Project root directory.
 * @param {Date} [options.now] - Date to use for the post.
 * @returns {string} Absolute path to the created post file.
 */
export function createPost({ title, rootDir = getProjectRoot(), now = new Date() }) {
  const { relativeDir, fileBaseName, title: postTitle } = resolvePostTarget(title);

  const contentDir = getContentRoot(rootDir);
  const targetDir = relativeDir ? path.join(contentDir, relativeDir) : contentDir;
  fs.mkdirSync(targetDir, { recursive: true });

  const filePath = path.join(targetDir, `${fileBaseName}.md`);
  if (fs.existsSync(filePath)) {
    throw new Error(`Post already exists: ${path.resolve(filePath)}`);
  }

  const content = buildPostContent(postTitle, now);
  fs.writeFileSync(filePath, content, 'utf8');

  return path.resolve(filePath);
}

/**
 * Run the CLI entry point for new post creation.
 *
 * @param {string[]} argv - Command line arguments.
 * @returns {Promise<number>} Exit code.
 */
export async function runCli(argv = process.argv.slice(2)) {
  let title = argv.join(' ').trim();

  try {
    if (!title) {
      title = await runInteractiveNewPost();
    }

    const createdPath = createPost({ title });
    console.log(`Created new post: ${createdPath}`);
    return 0;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return 1;
  }
}

const isDirectRun = fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? '');
if (isDirectRun) {
  process.exit(await runCli());
}
