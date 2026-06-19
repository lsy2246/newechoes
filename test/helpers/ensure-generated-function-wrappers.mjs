import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const requiredWrappers = [
  "src/pages/api/douban.ts",
  "functions/api/douban.ts",
  "cloud-functions/api/douban.ts",
];

if (!requiredWrappers.every((filePath) => existsSync(filePath))) {
  execFileSync("node", ["scripts/generate-function-wrappers.mjs"], {
    stdio: "inherit",
  });
}
