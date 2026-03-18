/**
 * Standalone Vitest config — does NOT include the Remix Vite plugin
 * so tests run in a clean Node environment without Remix's build machinery.
 */
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "app"),
    },
  },
});
