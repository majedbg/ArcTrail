import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
      "web-worker": "/dev/null",
    },
  },
  ssr: {
    noExternal: ["@uiw/react-markdown-preview", "@uiw/react-md-editor"],
  },
  optimizeDeps: {
    include: ["elkjs"],
    esbuildOptions: {
      mainFields: ["module", "main"],
    },
  },
});
