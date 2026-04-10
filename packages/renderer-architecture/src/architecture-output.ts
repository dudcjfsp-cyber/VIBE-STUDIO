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
  components: ArchitectureComponent[];
  interaction_flows: ArchitectureFlow[];
  notes: string[];
};
