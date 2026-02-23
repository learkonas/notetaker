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

export type LocalContext = {
  config: {
    bucket: string;
    vaultPath: string;
    inboxFolder: string;
    reviewFolder: string;
    styleSamplePath: string;
    pipelineVersion: string;
  };
  logger: {
    info: (obj: unknown, msg?: string) => void;
    warn: (obj: unknown, msg?: string) => void;
    error: (obj: unknown, msg?: string) => void;
  };
  clients: {
    storage: unknown;
  };
  styleProfile?: StyleProfile;
  noteIndex?: { title: string; path: string; body: string; tags: string[] }[];
  checkpointPath: string;
};

export type LocalDraft = DraftNote & {
  relatedNotes?: RelatedNote[];
  quality?: QualityScore;
  markdown?: string;
};
