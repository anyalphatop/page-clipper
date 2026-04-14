import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/background.ts"),
      name: "PageClipperBackground",
      formats: ["iife"],
      fileName: () => "background.js",
    },
  },
});
