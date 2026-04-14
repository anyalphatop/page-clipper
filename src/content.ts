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

  // ── 下载按钮 ──────────────────────────────────────────────
  let btn: HTMLButtonElement | null = null;

  function getOrCreateBtn(): HTMLButtonElement {
    if (btn) return btn;

    btn = document.createElement("button");
    btn.textContent = "下载";
    btn.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 24px;
      z-index: 99999;
      padding: 8px 18px;
      background: #fe2c55;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: none;
    `;
    btn.addEventListener("mouseenter", () => {
      btn!.style.background = "#e0183d";
    });
    btn.addEventListener("mouseleave", () => {
      btn!.style.background = "#fe2c55";
    });
    btn.addEventListener("click", async () => {
      const url = btn!.dataset.url;
      if (!url) return;
      btn!.textContent = "下载中…";
      btn!.style.opacity = "0.6";
      btn!.style.pointerEvents = "none";
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = "douyin_video.mp4";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } catch (e) {
        console.error(`${PREFIX} 下载失败`, e);
        alert("下载失败，请重试");
      } finally {
        btn!.textContent = "下载";
        btn!.style.opacity = "1";
        btn!.style.pointerEvents = "auto";
      }
    });
    document.body.appendChild(btn);
    return btn;
  }

  function showBtn(url: string) {
    const b = getOrCreateBtn();
    b.dataset.url = url;
    b.style.display = "block";
  }

  function hideBtn() {
    if (btn) btn.style.display = "none";
  }

  // ── 核心逻辑 ─────────────────────────────────────────────
  let lastModalId = "";
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  function tryLog(retries = 5) {
    const modalId = getModalId();
    if (!modalId || modalId === lastModalId) return;

    const url = readCombinedMp4Url();
    if (url && isVideoPlayerOpen()) {
      lastModalId = modalId;
      console.log(`${PREFIX} ✅ 视频链接: ${url}`);
      showBtn(url);
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
    // 关闭视频时隐藏按钮
    if (!getModalId()) hideBtn();
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
