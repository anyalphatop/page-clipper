import { defineConfig } from "vite";
import { resolve } from "path";
import { copyFileSync } from "fs";

export default defineConfig({
  plugins: [
    {
      name: "copy-manifest",
      closeBundle() {
        copyFileSync("manifest.json", "dist/manifest.json");
      },
    },
  ],
  build: {
    outDir: "dist",
    lib: {
      entry: resolve(__dirname, "src/content.ts"),
      name: "PageClipperContent",
      formats: ["iife"],
      fileName: () => "content.js",
    },
  },
});
