const PREFIX = "[PageClipper]";

const isDouyin =
  location.hostname === "douyin.com" ||
  location.hostname.endsWith(".douyin.com");

if (isDouyin) {
  console.log(`${PREFIX} ▶ 脚本启动 — ${location.href}`);

  // ── 公共工具 ──────────────────────────────────────────────────────────

  function getModalId(): string | null {
    const m = location.search.match(/modal_id=(\d+)/);
    return m ? m[1] : null;
  }

  function isVideoPlayerOpen(): boolean {
    return !!document.querySelector('[data-e2e="video-player-collect"]');
  }

  /** 从 window.player 的 bitRateList 取最高码率 mp4+h264 URL */
  function readPlayerUrl(): string {
    const bitRateList: any[] =
      (window as any).player?.config?.awemeInfo?.video?.bitRateList ?? [];
    const best = bitRateList
      .filter((b) => b.format === "mp4" && !b.isH265)
      .sort((a, b) => b.bitRate - a.bitRate)[0];
    return best?.playAddr?.[0]?.src ?? best?.urlList?.[0]?.src ?? "";
  }

  /** 从 React fiber 的 item.video.bitRateList 取当前激活视频 URL */
  function readFiberUrl(): string {
    const activeEl = document.querySelector('[data-e2e="feed-active-video"]');
    if (!activeEl) return "";

    const fiberKey = Object.keys(activeEl).find((k) =>
      k.startsWith("__reactFiber")
    );
    if (!fiberKey) return "";

    let fiber: any = (activeEl as any)[fiberKey];
    let depth = 0;
    while (fiber && depth < 80) {
      const props = fiber.memoizedProps || fiber.pendingProps;
      if (props?.item?.video?.bitRateList) {
        const bitRateList: any[] = props.item.video.bitRateList;
        const best = bitRateList
          .filter((b) => b.format === "mp4" && !b.isH265)
          .sort((a, b) => b.bitRate - a.bitRate)[0];
        return best?.playAddr?.[0]?.src ?? "";
      }
      fiber = fiber.return;
      depth++;
    }
    return "";
  }

  // ── 下载按钮 ──────────────────────────────────────────────────────────
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

  // ══════════════════════════════════════════════════════════════════════
  // 路径 A：Modal 模式（jingxuan?modal_id=...）
  //   - 触发：URL 包含 modal_id（pushState / replaceState / popstate）
  //   - 数据：window.player.config.awemeInfo.video.bitRateList
  // ══════════════════════════════════════════════════════════════════════

  let lastModalId = "";
  let modalRetryTimer: ReturnType<typeof setTimeout> | null = null;

  function modalTryLog(retries = 5) {
    const modalId = getModalId();
    if (!modalId || modalId === lastModalId) return;

    const url = readPlayerUrl();
    if (url && isVideoPlayerOpen()) {
      lastModalId = modalId;
      console.log(`${PREFIX} [Modal] ✅ ${modalId} → ${url.substring(0, 80)}`);
      showBtn(url);
      return;
    }

    if (retries > 0) {
      modalRetryTimer = setTimeout(() => modalTryLog(retries - 1), 300);
    }
  }

  function onModalNavigate() {
    if (modalRetryTimer !== null) {
      clearTimeout(modalRetryTimer);
      modalRetryTimer = null;
    }
    if (!getModalId()) hideBtn();
    setTimeout(() => modalTryLog(), 500);
  }

  // 拦截 SPA 导航（Modal 路径）
  const origPushState = history.pushState.bind(history);
  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    origPushState(...args);
    onModalNavigate();
    // 同时通知 feed 路径，新 URL 可能不含 modal_id
    onFeedNavigate();
  };

  const origReplaceState = history.replaceState.bind(history);
  history.replaceState = function (
    ...args: Parameters<typeof history.replaceState>
  ) {
    origReplaceState(...args);
    onModalNavigate();
    onFeedNavigate();
  };

  window.addEventListener("popstate", () => {
    onModalNavigate();
    onFeedNavigate();
  });

  // 初次加载（直接带 modal_id 打开）
  setTimeout(() => modalTryLog(), 2000);

  // ══════════════════════════════════════════════════════════════════════
  // 路径 B：Feed 流模式（/?recommend=1 或 /jingxuan 无 modal_id 滚动）
  //   - 触发：轮询 window.player.config.awemeInfo.aweme_id 变化
  //           + MutationObserver 监听 feed-active-video class 变化
  //   - 数据：优先 window.player，fallback React fiber item.video
  // ══════════════════════════════════════════════════════════════════════

  let feedPollTimer: ReturnType<typeof setInterval> | null = null;
  let lastFeedAwemeId = "";
  let feedActive = false; // 当前是否处于 feed 模式

  function isFeedMode(): boolean {
    // 没有 modal_id，且存在 feed 容器元素
    return (
      !getModalId() &&
      !!(
        document.querySelector('[data-e2e="slideList"]') ||
        document.querySelector('[data-e2e="feed-active-video"]') ||
        document.querySelector('[data-e2e="feed-item"]')
      )
    );
  }

  function feedTryShow() {
    if (getModalId()) return; // modal 打开时让路径 A 负责

    // 优先从 window.player 读（最可靠）
    let url = readPlayerUrl();
    const awemeId: string =
      (window as any).player?.config?.awemeInfo?.awemeId ??
      (window as any).player?.config?.vid ??
      "";

    // fallback：从 React fiber 读
    if (!url) url = readFiberUrl();

    if (url && awemeId && awemeId !== lastFeedAwemeId) {
      lastFeedAwemeId = awemeId;
      console.log(`${PREFIX} [Feed] ✅ ${awemeId} → ${url.substring(0, 80)}`);
      showBtn(url);
    } else if (url && !lastFeedAwemeId && awemeId) {
      // 初次进入 feed，直接展示
      lastFeedAwemeId = awemeId;
      console.log(`${PREFIX} [Feed] ✅ 初次 ${awemeId} → ${url.substring(0, 80)}`);
      showBtn(url);
    }
  }

  function startFeedPoll() {
    if (feedPollTimer !== null) return;
    feedActive = true;
    console.log(`${PREFIX} [Feed] 开始轮询`);
    feedPollTimer = setInterval(() => {
      if (getModalId()) return; // modal 时暂停
      feedTryShow();
    }, 500);
  }

  function stopFeedPoll() {
    if (feedPollTimer !== null) {
      clearInterval(feedPollTimer);
      feedPollTimer = null;
    }
    feedActive = false;
    lastFeedAwemeId = "";
  }

  function onFeedNavigate() {
    // URL 变化后判断是否需要启停 feed 轮询
    if (getModalId()) {
      // modal 打开了：停止 feed 轮询，隐藏 feed 按钮
      if (feedActive) stopFeedPoll();
      return;
    }
    // 无 modal_id：延迟检测 feed 元素是否出现
    setTimeout(() => {
      if (isFeedMode()) {
        startFeedPoll();
      }
    }, 800);
  }

  // MutationObserver：监听 feed-active-video class 变化（视频切换时触发）
  const feedObserver = new MutationObserver(() => {
    if (getModalId()) return;
    if (!feedActive) return;
    feedTryShow();
  });

  function attachFeedObserver() {
    feedObserver.disconnect();
    const slideList =
      document.querySelector('[data-e2e="slideList"]') ||
      document.querySelector('[data-e2e="feed-item"]')?.parentElement ||
      document.body;
    if (slideList) {
      feedObserver.observe(slideList, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    }
  }

  // 初次检测：等页面渲染后启动 feed 模式
  function initFeed() {
    if (isFeedMode()) {
      attachFeedObserver();
      startFeedPoll();
    } else {
      // 用 MutationObserver 等待 feed 元素出现
      const waitObs = new MutationObserver(() => {
        if (isFeedMode()) {
          waitObs.disconnect();
          attachFeedObserver();
          startFeedPoll();
        }
      });
      waitObs.observe(document.body, { childList: true, subtree: true });
    }
  }

  setTimeout(() => initFeed(), 2000);
}
