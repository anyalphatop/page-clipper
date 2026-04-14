const PREFIX = "[PageClipper]";

const isDouyin =
  location.hostname === "douyin.com" ||
  location.hostname.endsWith(".douyin.com");

if (!isDouyin) {
  // 非抖音域名，不做任何事
} else {
  console.log(`${PREFIX} ▶ 脚本启动 — ${location.href}`);

  // ── Feed 缓存：aweme_id → play_url ──────────────────────────────────
  // 拦截 aweme/v2/web/module/feed/ 响应，提前把 aweme_list 里所有视频的
  // 播放链接存下来，供 SPA 跳转时直接查询
  const feedCache = new Map<string, string>();

  function indexFeedResponse(json: unknown): void {
    const list = (json as Record<string, unknown>)?.aweme_list as
      | Record<string, unknown>[]
      | undefined;
    if (!list?.length) return;

    let count = 0;
    for (const item of list) {
      const awemeId = item.aweme_id as string | undefined;
      const video = item.video as Record<string, unknown> | undefined;
      const urlList = (video?.play_addr as Record<string, unknown>)
        ?.url_list as string[] | undefined;
      const url = urlList?.[0];
      if (awemeId && url) {
        feedCache.set(awemeId, url);
        count++;
      }
    }
    if (count > 0) {
      console.log(`${PREFIX} feed 缓存更新，新增 ${count} 条，共 ${feedCache.size} 条`);
    }
  }

  // 拦截 fetch，同时覆盖 feed 和 aweme/detail
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const response = await originalFetch(...args);
    const url = args[0] instanceof Request ? args[0].url : String(args[0]);

    if (/\/aweme\/v2\/web\/module\/feed\//.test(url)) {
      response.clone().json().then(indexFeedResponse).catch(() => {});
    }

    return response;
  };

  const originalXhrOpen = XMLHttpRequest.prototype.open;
  (XMLHttpRequest.prototype as { open: unknown }).open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    const urlStr = typeof url === "string" ? url : url.toString();
    if (/\/aweme\/v2\/web\/module\/feed\//.test(urlStr)) {
      this.addEventListener("load", function (this: XMLHttpRequest) {
        try { indexFeedResponse(JSON.parse(this.responseText)); } catch {}
      });
    }
    return (originalXhrOpen as (...a: unknown[]) => void).apply(this, [
      method,
      url,
      ...rest,
    ]);
  };

  // ── 策略 A：解析 RENDER_DATA（初始加载时有效） ───────────────────────
  function extractByRenderData(modalId: string): string {
    const scriptEl = document.getElementById("RENDER_DATA");
    if (!scriptEl?.textContent) return "";

    try {
      const json = JSON.parse(decodeURIComponent(scriptEl.textContent));
      const app = (json as Record<string, unknown>)?.app as
        | Record<string, unknown>
        | undefined;
      const videoDetail = app?.videoDetail as
        | Record<string, unknown>
        | undefined;

      // RENDER_DATA 的 awemeId 必须和当前 modal_id 匹配，否则是过期数据
      if ((videoDetail?.awemeId as string) !== modalId) return "";

      const video = videoDetail?.video as Record<string, unknown> | undefined;
      const addrs = video?.playAddr as { src: string }[] | undefined;
      return addrs?.[0]?.src ?? "";
    } catch {
      return "";
    }
  }

  // ── 策略 B：从 feed 缓存查询（SPA 跳转时有效） ──────────────────────
  function extractByFeedCache(modalId: string): string {
    return feedCache.get(modalId) ?? "";
  }

  // ── 路由与提取 ───────────────────────────────────────────────────────
  function runExtraction() {
    const match = location.search.match(/[?&]modal_id=(\d+)/);
    if (!match) {
      console.log(`${PREFIX} 当前页面暂不支持提取视频链接`);
      return;
    }

    const modalId = match[1];
    console.log(`${PREFIX} 检测到 modal_id: ${modalId}`);

    // 先试 RENDER_DATA（初始加载），再试 feed 缓存（SPA 跳转）
    const videoUrl =
      extractByRenderData(modalId) || extractByFeedCache(modalId);

    if (videoUrl) {
      console.log(`${PREFIX} ✅ 视频链接: ${videoUrl}`);
    } else {
      console.log(`${PREFIX} ❌ 未能提取视频链接（modal_id: ${modalId}）`);
    }
  }

  // ── 监听 SPA 内部导航 ─────────────────────────────────────────────────
  const originalPushState = history.pushState.bind(history);
  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    originalPushState(...args);
    setTimeout(runExtraction, 100);
  };

  const originalReplaceState = history.replaceState.bind(history);
  history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
    originalReplaceState(...args);
    setTimeout(runExtraction, 100);
  };

  window.addEventListener("popstate", () => setTimeout(runExtraction, 100));

  // ── 初始加载 ──────────────────────────────────────────────────────────
  window.addEventListener("DOMContentLoaded", runExtraction);
}
