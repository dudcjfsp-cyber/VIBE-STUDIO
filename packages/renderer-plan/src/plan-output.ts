export type PlanSection = {
  title: string;
  bullets: string[];
};

export type PlanOutput = {
  title: string;
  sections: PlanSection[];
  notes: string[];
};
