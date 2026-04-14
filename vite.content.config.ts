import { defineConfig } from "vite";
import { resolve } from "path";

// content script 必须是 classic script（无 import 语句），
// 因为 Chrome 的 world: "MAIN" 不支持 ES module 格式的 content script。
// 使用 lib + iife 模式确保输出为完全自包含的单文件。
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/content.ts"),
      name: "PageClipperContent",
      formats: ["iife"],
      fileName: () => "content.js",
    },
  },
});
