import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findSharedDir(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    const candidate = path.join(dir, "shared");
    if (fs.existsSync(path.join(candidate, "prompts"))) {
      return candidate;
    }
    dir = path.dirname(dir);
  }
  throw new Error(`Could not locate shared/ directory walking up from ${__dirname}`);
}

const docCache = new Map<string, string>();

function readCached(filePath: string): string {
  const cached = docCache.get(filePath);
  if (cached !== undefined) return cached;
  const contents = fs.readFileSync(filePath, "utf8");
  docCache.set(filePath, contents);
  return contents;
}

export function loadPrompt(fileName: string): string {
  return readCached(path.join(findSharedDir(), "prompts", fileName));
}
