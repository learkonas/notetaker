import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Works both locally (repo root) and in the Docker image (/app), where the
// compiled file sits at a different depth relative to shared/.
function findSharedDir(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    const candidate = path.join(dir, "shared");
    if (fs.existsSync(path.join(candidate, "skills")) || fs.existsSync(path.join(candidate, "prompts"))) {
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

/**
 * Loads a skill document from shared/skills/<skillName>/SKILL.md, optionally
 * appending files from its references/ folder.
 */
export function loadSkillDoc(skillName: string, referenceFiles: string[] = []): string {
  const skillDir = path.join(findSharedDir(), "skills", skillName);
  const parts = [readCached(path.join(skillDir, "SKILL.md"))];
  for (const ref of referenceFiles) {
    parts.push(readCached(path.join(skillDir, "references", ref)));
  }
  return parts.join("\n\n---\n\n");
}

export function loadPrompt(fileName: string): string {
  return readCached(path.join(findSharedDir(), "prompts", fileName));
}
