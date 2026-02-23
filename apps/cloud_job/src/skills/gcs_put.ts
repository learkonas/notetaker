import type { Skill } from "../lib/skill.js";
import type { CloudContext } from "../lib/types.js";
import type { RenderedDraft } from "./render_draft.js";

export type PersistedDraft = RenderedDraft & {
  jsonPath: string;
  mdPath: string;
};

export const gcsPutSkill: Skill<CloudContext, RenderedDraft[], PersistedDraft[]> = {
  name: "gcs_put",
  async run(ctx, renderedDrafts) {
    const storage = ctx.clients.storage as {
      bucket: (name: string) => {
        file: (path: string) => {
          save: (data: string, options: { contentType: string }) => Promise<void>;
        };
      };
    };
    const bucket = storage.bucket(ctx.config.bucket);
    const persisted: PersistedDraft[] = [];
    for (const item of renderedDrafts) {
      const jsonPath = `${item.objectPrefix}.json`;
      const mdPath = `${item.objectPrefix}.md`;
      await bucket.file(jsonPath).save(JSON.stringify(item.draft, null, 2), {
        contentType: "application/json",
      });
      await bucket.file(mdPath).save(item.markdown, {
        contentType: "text/markdown",
      });
      persisted.push({ ...item, jsonPath, mdPath });
    }
    ctx.logger.info({ count: persisted.length }, "gcs_put complete");
    return persisted;
  },
};
