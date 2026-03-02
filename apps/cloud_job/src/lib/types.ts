export type GmailMessageRef = {
  id: string;
  threadId: string;
};

export type GmailLabel = {
  id?: string;
  name?: string;
};

export type GmailRawMessage = {
  id: string;
  threadId: string;
  internalDate: string;
  payload?: unknown;
};

export type GmailClient = {
  users: {
    messages: {
      list: (args: {
        userId: string;
        q: string;
        maxResults: number;
      }) => Promise<{ data: { messages?: GmailMessageRef[] } }>;
      get: (args: {
        userId: string;
        id: string;
        format: "full";
      }) => Promise<{ data: GmailRawMessage }>;
      modify: (args: {
        userId: string;
        id: string;
        requestBody: { id: string; addLabelIds?: string[]; removeLabelIds?: string[] };
      }) => Promise<unknown>;
    };
    labels: {
      list: (args: { userId: string }) => Promise<{ data: { labels?: GmailLabel[] } }>;
      create: (args: {
        userId: string;
        requestBody: { name: string; labelListVisibility: string; messageListVisibility: string };
      }) => Promise<{ data: GmailLabel }>;
    };
  };
};

export type StorageClient = {
  bucket: (name: string) => {
    file: (path: string) => {
      save: (data: string, options: { contentType: string }) => Promise<void>;
    };
  };
};

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
    gmailUser: string;
    gmailQuery: string;
    gmailProcessedLabel: string;
    gmailClientId: string;
    gmailClientSecret: string;
    gmailRefreshToken: string;
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
    gmail: GmailClient;
    storage: StorageClient;
  };
};

export type SummarizationPayload = ParsedEmail & {
  hyperlinks: Hyperlink[];
};
