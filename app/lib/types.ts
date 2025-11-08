export type Category = "digital" | "physical" | "circuit" | (string & {}); // extensible

export type MediaItem = {
  type: "img" | "video";
  src: string;
  alt?: string;
};

export type IterationNode = {
  id: string;
  title: string;
  dateISO: string;
  categories: Category[];
  summary?: string;
  media?: MediaItem[];
  metrics?: Record<string, number>;
};

export type IterationEdge = {
  id: string;
  fromId: string;
  toId: string;
  kind?: "improves" | "reverts" | "forks" | (string & {});
};

export type ProjectDTO = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  nodes: IterationNode[];
  edges: IterationEdge[];
};

