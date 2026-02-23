import fs from "node:fs/promises";
import path from "node:path";
import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft } from "../lib/types.js";

type CheckpointState = {
  processedMessageIds: string[];
  updatedAt: string;
};

async function loadCheckpoint(checkpointPath: string): Promise<CheckpointState> {
  try {
    const raw = await fs.readFile(checkpointPath, "utf8");
    return JSON.parse(raw) as CheckpointState;
  } catch {
    return { processedMessageIds: [], updatedAt: new Date(0).toISOString() };
  }
}

export async function isProcessed(ctx: LocalContext, messageId: string): Promise<boolean> {
  const state = await loadCheckpoint(ctx.checkpointPath);
  return state.processedMessageIds.includes(messageId);
}

export const checkpointSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "checkpoint",
  async run(ctx, drafts) {
    const state = await loadCheckpoint(ctx.checkpointPath);
    for (const draft of drafts) {
      if (!state.processedMessageIds.includes(draft.messageId)) {
        state.processedMessageIds.push(draft.messageId);
      }
    }
    state.updatedAt = new Date().toISOString();
    await fs.mkdir(path.dirname(ctx.checkpointPath), { recursive: true });
    await fs.writeFile(ctx.checkpointPath, JSON.stringify(state, null, 2), "utf8");
    ctx.logger.info({ count: drafts.length }, "checkpoint updated");
    return drafts;
  },
};
