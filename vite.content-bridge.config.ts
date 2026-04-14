import { defineConfig } from "vite";
import { resolve } from "path";

// content-bridge 运行在 ISOLATED world，同样需要打成自包含的 IIFE
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/content-bridge.ts"),
      name: "PageClipperBridge",
      formats: ["iife"],
      fileName: () => "content-bridge.js",
    },
  },
});
