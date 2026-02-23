import type { Skill } from "../lib/skill.js";
import type { CloudContext, DraftNote } from "../lib/types.js";

export type RenderedDraft = {
  draft: DraftNote;
  objectPrefix: string;
  markdown: string;
};

export const renderDraftSkill: Skill<CloudContext, DraftNote[], RenderedDraft[]> = {
  name: "render_draft",
  async run(ctx, drafts) {
    const rendered = drafts.map((draft) => {
      const date = draft.internalDate.slice(0, 10);
      const objectPrefix = `drafts/${date}/${draft.messageId}`;
      const markdown = [
        `# ${draft.subject}`,
        "",
        `Source: ${draft.sourceUrl ?? "email-only"}`,
        "",
        "## TL;DR",
        draft.summary,
        "",
        "## Key Points",
        ...draft.keyPoints.map((point) => `- ${point}`),
        "",
        "## Analysis",
        draft.analysis,
        "",
        "## Questions",
        ...draft.questions.map((question) => `- ${question}`),
      ].join("\n");

      return { draft, objectPrefix, markdown };
    });
    ctx.logger.info({ count: rendered.length }, "render_draft complete");
    return rendered;
  },
};
