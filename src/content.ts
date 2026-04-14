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

  // 用 URL path（不含 query params）做去重 key
  // 同一个视频会有多次分段 range 请求，path 相同，只打印第一次
  // 切换到新视频时 path 不同，会触发新的打印
  const seenPaths = new Set<string>();

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const response = await originalFetch(...args);

    if (!isVideoPlayerOpen()) return response;

    const url = args[0] instanceof Request ? args[0].url : String(args[0]);

    if (/douyinvod\.com/.test(url) && /\/video\//.test(url)) {
      const path = url.split("?")[0];
      if (!seenPaths.has(path)) {
        seenPaths.add(path);
        console.log(`${PREFIX} ✅ 视频链接: ${url}`);
      }
    }

    return response;
  };
}
