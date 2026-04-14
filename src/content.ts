const PREFIX = "[PageClipper]";

const isDouyin =
  location.hostname === "douyin.com" ||
  location.hostname.endsWith(".douyin.com");

if (isDouyin) {
  console.log(`${PREFIX} ▶ 脚本启动 — ${location.href}`);

  function getModalId(): string | null {
    const m = location.search.match(/modal_id=(\d+)/);
    return m ? m[1] : null;
  }

  function isVideoPlayerOpen(): boolean {
    return !!document.querySelector('[data-e2e="video-player-collect"]');
  }

  // 从 bitRateList 里找 format=mp4 且 h264 的最高码率条目（音视频合并）
  function readCombinedMp4Url(): string {
    const bitRateList: any[] =
      (window as any).player?.config?.awemeInfo?.video?.bitRateList ?? [];
    const best = bitRateList
      .filter((b) => b.format === "mp4" && !b.isH265)
      .sort((a, b) => b.bitRate - a.bitRate)[0];
    return best?.playAddr?.[0]?.src ?? best?.urlList?.[0]?.src ?? "";
  }

  let lastModalId = "";
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  // 尝试读取并打印视频链接，播放器未就绪时最多重试 retries 次（每次间隔 300ms）
  function tryLog(retries = 5) {
    const modalId = getModalId();
    if (!modalId || modalId === lastModalId) return;

    const url = readCombinedMp4Url();
    if (url && isVideoPlayerOpen()) {
      lastModalId = modalId;
      console.log(`${PREFIX} ✅ 视频链接: ${url}`);
      return;
    }

    if (retries > 0) {
      retryTimer = setTimeout(() => tryLog(retries - 1), 300);
    }
  }

  function onNavigate() {
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    setTimeout(() => tryLog(), 500);
  }

  // 拦截 SPA 导航
  const origPushState = history.pushState.bind(history);
  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    origPushState(...args);
    onNavigate();
  };

  const origReplaceState = history.replaceState.bind(history);
  history.replaceState = function (
    ...args: Parameters<typeof history.replaceState>
  ) {
    origReplaceState(...args);
    onNavigate();
  };

  window.addEventListener("popstate", onNavigate);

  // 初次加载（直接带 modal_id 打开页面）
  setTimeout(() => tryLog(), 2000);
}
