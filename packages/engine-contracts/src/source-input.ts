export type SourceArtifact = {
  text: string;
  kind?: string;
  metadata?: Record<string, unknown>;
};

export type SourceInput = {
  text: string;
  locale?: string;
  metadata?: Record<string, unknown>;
  artifacts?: SourceArtifact[];
};
