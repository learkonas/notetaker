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

export type QualityScore = {
  accuracy: number;
  coverage: number;
  insight: number;
  clarity: number;
  actionability: number;
  overall: number;
  styleScore: number;
  needsReview: boolean;
  reasons: string[];
};

export type RelatedNote = {
  title: string;
  path: string;
  score: number;
  rationale: string;
};

export type StyleProfile = {
  requiredSections: string[];
  avgLength: number;
  avgBullets: number;
  preferredTagPrefix: string;
};

export type GcsFile = {
  name: string;
  metadata?: { timeCreated?: string };
  download: () => Promise<[Buffer]>;
  delete: () => Promise<unknown>;
};

export type StorageClient = {
  bucket: (name: string) => {
    getFiles: (args: { prefix: string }) => Promise<[GcsFile[]]>;
  };
};

export type LocalContext = {
  config: {
    bucket: string;
    vaultPath: string;
    inboxFolder: string;
    reviewFolder: string;
    styleSamplePath: string;
    pipelineVersion: string;
    retainDraftDays: number;
    llmProvider: "mock" | "openai";
    openaiApiKey?: string;
  };
  logger: {
    info: (obj: unknown, msg?: string) => void;
    warn: (obj: unknown, msg?: string) => void;
    error: (obj: unknown, msg?: string) => void;
  };
  clients: {
    storage: StorageClient;
  };
  styleProfile?: StyleProfile;
  noteIndex?: { title: string; path: string; body: string; tags: string[]; aliases: string[]; embedding?: number[] }[];
  checkpointPath: string;
};

export type LocalDraft = DraftNote & {
  relatedNotes?: RelatedNote[];
  quality?: QualityScore;
  markdown?: string;
  embedding?: number[];
};
