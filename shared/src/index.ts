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
