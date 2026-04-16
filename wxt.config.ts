import { defineConfig } from "wxt";

export default defineConfig({
  outDir: "dist",
  manifest: {
    name: "Page Clipper",
    description: "小红书视频一键下载",
    icons: {
      16: "icons/icon16.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },
    action: {
      default_icon: {
        16: "icons/icon16.png",
        32: "icons/icon32.png",
        48: "icons/icon48.png",
      },
    },
  },
});
