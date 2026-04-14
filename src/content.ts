const PREFIX = "[PageClipper]";

const isDouyin =
  location.hostname === "douyin.com" ||
  location.hostname.endsWith(".douyin.com");

function isVideoPlayerOpen(): boolean {
  return !!document.querySelector('[data-e2e="video-player-collect"]');
}

if (!isDouyin) {
  // 非抖音域名，不做任何事
} else {
  console.log(`${PREFIX} ▶ 脚本启动 — ${location.href}`);

  let lastVideoPath = "";

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const response = await originalFetch(...args);

    if (!isVideoPlayerOpen()) return response;

    const url = args[0] instanceof Request ? args[0].url : String(args[0]);

    if (/douyinvod\.com/.test(url) && /\/video\//.test(url)) {
      const path = url.split("?")[0];
      if (path !== lastVideoPath) {
        lastVideoPath = path;
        console.log(`${PREFIX} ✅ 视频链接: ${url}`);
      }
    }

    return response;
  };
}
