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

  // 读取 xgplayer 当前视频流 URL
  function readPlayerUrl(): string {
    return (window as any).player?.config?.url?.[0]?.src ?? "";
  }

  // 读取音频流 URL（视频和音频是分离的 DASH 流）
  function readAudioUrl(): string {
    return (
      (window as any).player?.config?.awemeInfo?.video
        ?.bitRateAudioList?.[0]?.urlList?.[0]?.src ?? ""
    );
  }

  let lastModalId = "";

  function tryLog() {
    const modalId = getModalId();
    if (!modalId || modalId === lastModalId) return;
    if (!isVideoPlayerOpen()) return;
    const videoUrl = readPlayerUrl();
    const audioUrl = readAudioUrl();
    if (videoUrl) {
      lastModalId = modalId;
      console.log(`${PREFIX} ✅ 视频流: ${videoUrl}`);
      if (audioUrl) {
        console.log(`${PREFIX} 🔊 音频流: ${audioUrl}`);
      }
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
