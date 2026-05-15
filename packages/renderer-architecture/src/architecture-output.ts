export type ArchitectureActor = {
  name: string;
  role: string;
};

export type ArchitectureComponent = {
  name: string;
  responsibility: string;
};

export type ArchitectureFlow = {
  name: string;
  steps: string[];
};

export type ArchitectureOutput = {
  title: string;
  system_boundary: string;
  actors: ArchitectureActor[];
  components: ArchitectureComponent[];
  interaction_flows: ArchitectureFlow[];
  mvp_exclusions: string[];
  later_decisions: string[];
  notes: string[];
};
