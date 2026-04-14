const PREFIX = "[PageClipper]";

const isDouyin =
  location.hostname === "douyin.com" ||
  location.hostname.endsWith(".douyin.com");

if (!isDouyin) {
  // 非抖音域名，不做任何事
} else {
  console.log(`${PREFIX} ▶ 脚本启动 — ${location.href}`);

  // aweme_id → play_url 缓存，feed 响应到来时持续追加
  const cache = new Map<string, string>();
  let lastLoggedModalId = "";

  function isVideoPlayerOpen(): boolean {
    return !!document.querySelector('[data-e2e="video-player-collect"]');
  }

  function getModalId(): string | null {
    const m = location.search.match(/modal_id=(\d+)/);
    return m ? m[1] : null;
  }

  function tryLog(modalId: string) {
    if (modalId === lastLoggedModalId) return; // 同一个视频不重复打印
    if (!isVideoPlayerOpen()) return;
    const url = cache.get(modalId);
    if (url) {
      lastLoggedModalId = modalId;
      console.log(`${PREFIX} ✅ 视频链接: ${url}`);
    } else {
      console.log(`${PREFIX} ⏳ 未命中缓存: modal_id=${modalId}`);
    }
  }

  // 拦截 fetch：缓存 feed 响应里的 aweme_id → play_url
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const response = await originalFetch(...args);
    const url = args[0] instanceof Request ? args[0].url : String(args[0]);

    if (url.includes("aweme") && url.includes("feed")) {
      response
        .clone()
        .json()
        .then((json: any) => {
          const list = json.aweme_list || json.data?.aweme_list;
          if (Array.isArray(list)) {
            for (const item of list) {
              const id = String(item.aweme_id);
              const playUrl = item?.video?.play_addr?.url_list?.[0];
              if (id && playUrl) cache.set(id, playUrl);
            }
          }
        })
        .catch(() => {});
    }

    return response;
  };

  // 监听 URL 变化，modal_id 变化时查缓存
  function onUrlChange() {
    const modalId = getModalId();
    if (!modalId) return;
    // 等 DOM 更新后再检查播放器元素
    setTimeout(() => tryLog(modalId), 300);
  }

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
}
