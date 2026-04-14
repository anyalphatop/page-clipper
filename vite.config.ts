import { defineConfig } from "vite";
import { resolve } from "path";
import { copyFileSync } from "fs";

export default defineConfig({
  plugins: [
    {
      name: "copy-manifest",
      closeBundle() {
        copyFileSync("manifest.json", "dist/manifest.json");
        copyFileSync("rules.json", "dist/rules.json");
      },
    },
  ],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
