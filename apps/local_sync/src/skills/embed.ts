import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft } from "../lib/types.js";

export const embedSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "embed",
  async run(ctx, drafts) {
    // Placeholder for vector index build/load. Keep deterministic lexical retrieval for MVP.
    ctx.logger.info({ drafts: drafts.length }, "embed step skipped (lexical mode)");
    return drafts;
  },
};
