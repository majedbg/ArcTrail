import type { Config } from "tailwindcss";
import {
  ARTIFACT_KIND_TOKENS,
  RELATION_TYPE_TOKENS,
  STAGE_TOKENS,
  DIFF_TOKENS,
} from "./app/lib/tokens";

// Build color maps from token objects so Tailwind classes stay in sync
// with tokens.ts — changing a hex value there propagates everywhere.

const kindColors = Object.fromEntries(
  Object.entries(ARTIFACT_KIND_TOKENS).map(([k, v]) => [k.toLowerCase(), v.color])
);

const relationColors = Object.fromEntries(
  Object.entries(RELATION_TYPE_TOKENS).map(([k, v]) => [
    k.toLowerCase().replace(/_/g, "-"),
    v.color,
  ])
);

const stageColors = Object.fromEntries(
  Object.entries(STAGE_TOKENS).map(([k, v]) => [k, v.color])
);

const diffColors = Object.fromEntries(
  Object.entries(DIFF_TOKENS).map(([k, v]) => [k, v.color])
);

export default {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kind: kindColors,
        relation: relationColors,
        stage: stageColors,
        diff: diffColors,
      },
    },
  },
  plugins: [],
} satisfies Config;
