const PREFIX = "[PageClipper]";

const isDouyin =
  location.hostname === "douyin.com" ||
  location.hostname.endsWith(".douyin.com");

if (!isDouyin) {
  // 非抖音域名，不做任何事
} else {
  console.log(`${PREFIX} ▶ 脚本启动 — ${location.href}`);

  function isVideoPlayerOpen(): boolean {
    return !!document.querySelector('[data-e2e="video-player-collect"]');
  }

  function getModalId(): string | null {
    const m = location.search.match(/modal_id=(\d+)/);
    return m ? m[1] : null;
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

  function tryLog() {
    const modalId = getModalId();
    if (!modalId || modalId === lastModalId) return;
    if (!isVideoPlayerOpen()) return;
    const url = readCombinedMp4Url();
    if (url) {
      lastModalId = modalId;
      console.log(`${PREFIX} ✅ 视频链接: ${url}`);
    } else {
      console.log(`${PREFIX} ⏳ 播放器未就绪: modal_id=${modalId}`);
    }
  }

  function onUrlChange() {
    // 等待播放器完成切换后再读取
    setTimeout(tryLog, 500);
  }

  // 拦截 SPA 导航
  const origPushState = history.pushState.bind(history);
  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    origPushState(...args);
    onUrlChange();
  };

  const origReplaceState = history.replaceState.bind(history);
  history.replaceState = function (
    ...args: Parameters<typeof history.replaceState>
  ) {
    origReplaceState(...args);
    onUrlChange();
  };

  window.addEventListener("popstate", onUrlChange);

  // 初次加载（直接带 modal_id 打开页面）
  setTimeout(tryLog, 2000);
}
