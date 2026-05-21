import { createReadStream, createWriteStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { hrtime } from "node:process";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { constants, createBrotliCompress, createGzip } from "node:zlib";

const defaultFileExtensions = [".css", ".js", ".html", ".xml", ".cjs", ".mjs", ".svg", ".txt"];

async function* walkDir(dir, extensions) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const path = resolve(dir, entry.name);

    if (entry.isDirectory()) {
      yield* walkDir(path, extensions);
    } else if (extensions.includes(extname(entry.name))) {
      yield path;
    }
  }
}

async function compressFiles(name, extension, createCompressor, files, logger, batchSize) {
  const start = hrtime.bigint();

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.all(
      batch.map((file) =>
        pipeline(createReadStream(file), createCompressor(), createWriteStream(`${file}.${extension}`)),
      ),
    );
  }

  const elapsedMs = (hrtime.bigint() - start) / BigInt(1000000);
  logger.info(`${name.padEnd(8, " ")} compressed ${files.length} files in ${elapsedMs}ms`);
}

export function compressionIntegration({
  fileExtensions = defaultFileExtensions,
  batchSize = 10,
} = {}) {
  return {
    name: "local-compression",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const buildDir = fileURLToPath(dir);
        const files = [];

        for await (const file of walkDir(buildDir, fileExtensions)) {
          files.push(file);
        }

        await Promise.all([
          compressFiles(
            "gzip",
            "gz",
            () => createGzip({ level: constants.Z_BEST_COMPRESSION }),
            files,
            logger,
            batchSize,
          ),
          compressFiles(
            "brotli",
            "br",
            () =>
              createBrotliCompress({
                params: {
                  [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
                },
              }),
            files,
            logger,
            batchSize,
          ),
        ]);

        logger.info("Compression finished\n");
      },
    },
  };
}
