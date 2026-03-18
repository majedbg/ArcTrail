/**
 * CSS Variable Generator
 *
 * Node.js script (run via `tsx app/lib/generateCssVars.ts`) that reads
 * the token maps from tokens.ts and outputs a :root { ... } CSS block
 * to app/styles/tokens.css.
 *
 * Run via: npm run generate:css
 */

import * as fs from "fs";
import * as path from "path";
import {
  ARTIFACT_KIND_TOKENS,
  RELATION_TYPE_TOKENS,
  STAGE_TOKENS,
  DIFF_TOKENS,
} from "./tokens.js";

const lines: string[] = [":root {"];

// --color-kind-<name> from ARTIFACT_KIND_TOKENS
for (const [key, token] of Object.entries(ARTIFACT_KIND_TOKENS)) {
  const name = key.toLowerCase();
  lines.push(`  --color-kind-${name}: ${token.color};`);
}

// --color-relation-<name> from RELATION_TYPE_TOKENS (underscore → hyphen)
for (const [key, token] of Object.entries(RELATION_TYPE_TOKENS)) {
  const name = key.toLowerCase().replace(/_/g, "-");
  lines.push(`  --color-relation-${name}: ${token.color};`);
}

// --color-stage-<name> from STAGE_TOKENS
for (const [key, token] of Object.entries(STAGE_TOKENS)) {
  lines.push(`  --color-stage-${key}: ${token.color};`);
}

// --color-diff-<name> from DIFF_TOKENS
for (const [key, token] of Object.entries(DIFF_TOKENS)) {
  lines.push(`  --color-diff-${key}: ${token.color};`);
}

// Canvas background
lines.push(`  --canvas-bg: #0a0a0a;`);

lines.push("}");

const output = lines.join("\n") + "\n";

// Output path: app/styles/tokens.css (relative to project root via process.cwd())
const outPath = path.join(process.cwd(), "app", "styles", "tokens.css");

// Ensure the styles directory exists
fs.mkdirSync(path.dirname(outPath), { recursive: true });

fs.writeFileSync(outPath, output, "utf-8");

console.log(`✓ Generated CSS variables → ${outPath}`);
