import fs from 'node:fs';
import path from 'node:path';
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
 * Create a new post file in the default content directory.
 *
 * @param {object} options - Creation options.
 * @param {string} options.title - Post title.
 * @param {string} [options.rootDir] - Project root directory.
 * @param {Date} [options.now] - Date to use for the post.
 * @returns {string} Absolute path to the created post file.
 */
export function createPost({ title, rootDir = getProjectRoot(), now = new Date() }) {
  const trimmed = String(title ?? '').trim();
  if (!trimmed) {
    throw new Error('Title is required.');
  }

  const fileBaseName = path.basename(trimmed);
  if (!fileBaseName || fileBaseName === '.') {
    throw new Error('Title is required.');
  }

  const contentDir = path.resolve(rootDir, 'src', 'content');
  fs.mkdirSync(contentDir, { recursive: true });

  const filePath = path.join(contentDir, `${fileBaseName}.md`);
  if (fs.existsSync(filePath)) {
    throw new Error(`Post already exists: ${path.resolve(filePath)}`);
  }

  const content = buildPostContent(trimmed, now);
  fs.writeFileSync(filePath, content, 'utf8');

  return path.resolve(filePath);
}

/**
 * Run the CLI entry point for new post creation.
 *
 * @param {string[]} argv - Command line arguments.
 * @returns {number} Exit code.
 */
export function runCli(argv = process.argv.slice(2)) {
  const title = argv.join(' ').trim();
  if (!title) {
    console.error('Usage: pnpm new-post "Post Title"');
    return 1;
  }

  try {
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
  process.exit(runCli());
}
