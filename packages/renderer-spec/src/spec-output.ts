export type SpecSection = {
  title: string;
  bullets: string[];
};

export type SpecOutput = {
  title: string;
  sections: SpecSection[];
  notes: string[];
};
