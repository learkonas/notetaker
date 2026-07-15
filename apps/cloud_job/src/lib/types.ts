import type { InboxClient } from "./inbox.js";

export type Hyperlink = {
  anchorText: string;
  url: string;
  normalizedUrl: string;
  domain: string;
};

export type DraftNote = {
  messageId: string;
  threadId: string;
  internalDate: string;
  from: string;
  subject: string;
  sourceUrl?: string;
  emailText: string;
  hyperlinks: Hyperlink[];
  summary: string;
  keyPoints: string[];
  analysis: string;
  questions: string[];
  tags: string[];
  evidenceQuotes: string[];
  confidence: number;
  qualityFlags: string[];
  contentHash: string;
  pipelineVersion: string;
  createdAt: string;
};

export type ParsedEmail = {
  messageId: string;
  threadId: string;
  internalDate: string;
  from: string;
  subject: string;
  emailText: string;
  html?: string;
};

export type CloudContext = {
  config: {
    bucket: string;
    inboxApiUrl: string;
    inboxMailbox: string;
    inboxProcessedFolder: string;
    cfAccessClientId: string;
    cfAccessClientSecret: string;
    pipelineVersion: string;
    llmProvider: "mock" | "openai";
    openaiApiKey?: string;
    openaiModel: string;
    maxEmailsPerRun: number;
  };
  logger: {
    info: (obj: unknown, msg?: string) => void;
    warn: (obj: unknown, msg?: string) => void;
    error: (obj: unknown, msg?: string) => void;
  };
  clients: {
    inbox: InboxClient;
    storage: unknown;
  };
};

export type SummarizationPayload = ParsedEmail & {
  hyperlinks: Hyperlink[];
};
