import type { Config } from "tailwindcss";
import {
  BRAND_TOKENS,
  ARTIFACT_KIND_TOKENS,
  RELATION_TYPE_TOKENS,
  STAGE_TOKENS,
  UI_ACCENT_TOKENS,
  DIFF_TOKENS,
} from "./app/lib/tokens";

// Build color maps from token objects so Tailwind classes stay in sync
// with tokens.ts — changing a hex value there propagates everywhere.

const brandColors = Object.fromEntries(
  Object.entries(BRAND_TOKENS).map(([k, v]) => [k, v])
);

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
        brand: brandColors,
        kind: kindColors,
        relation: relationColors,
        stage: stageColors,
        diff: diffColors,
        ui: {
          info:            UI_ACCENT_TOKENS.information.solid,
          "info-surface":  UI_ACCENT_TOKENS.information.surface,
          "info-text":     UI_ACCENT_TOKENS.information.text,
          action:          UI_ACCENT_TOKENS.consequential.solid,
          "action-surface": UI_ACCENT_TOKENS.consequential.surface,
          "action-text":   UI_ACCENT_TOKENS.consequential.text,
          destroy:         UI_ACCENT_TOKENS.destructive.solid,
          "destroy-surface": UI_ACCENT_TOKENS.destructive.surface,
          "destroy-text":  UI_ACCENT_TOKENS.destructive.text,
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
