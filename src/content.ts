const PREFIX = "[PageClipper]";

const isDouyin =
  location.hostname === "douyin.com" ||
  location.hostname.endsWith(".douyin.com");

if (!isDouyin) {
  // 非抖音域名，不做任何事
} else {
  console.log(`${PREFIX} ▶ 脚本启动 — ${location.href}`);

  // ── 策略 A：解析 RENDER_DATA（适用于带 modal_id 的初始页面加载） ──
  function extractByRenderData(): string {
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
      const video = videoDetail?.video as Record<string, unknown> | undefined;
      const addrs = video?.playAddr as { src: string }[] | undefined;
      return addrs?.[0]?.src ?? "";
    } catch {
      return "";
    }
  }

  // ── 策略 B：拦截 aweme/detail 接口（适用于 SPA 跳转后） ───────────
  // 全程拦截，无论哪种页面都在运行
  // 在 SPA 跳转到 modal_id 页面后，如果 RENDER_DATA 没有数据，
  // 等待页面发出的 aweme/detail 请求来补充
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const response = await originalFetch(...args);
    const url = args[0] instanceof Request ? args[0].url : String(args[0]);
    if (/\/aweme\/v1\/web\/aweme\/detail\//.test(url)) {
      response
        .clone()
        .json()
        .then((json: unknown) => {
          const detail = (json as Record<string, unknown>)
            ?.aweme_detail as Record<string, unknown> | undefined;
          const video = detail?.video as Record<string, unknown> | undefined;
          const addrs = (video?.play_addr as Record<string, unknown>)
            ?.url_list as string[] | undefined;
          const videoUrl = addrs?.[0] ?? "";
          if (videoUrl) {
            console.log(`${PREFIX} ✅ 视频链接（aweme/detail）: ${videoUrl}`);
          }
        })
        .catch(() => {});
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
    if (/\/aweme\/v1\/web\/aweme\/detail\//.test(urlStr)) {
      this.addEventListener("load", function (this: XMLHttpRequest) {
        try {
          const json = JSON.parse(this.responseText);
          const detail = (json as Record<string, unknown>)
            ?.aweme_detail as Record<string, unknown> | undefined;
          const video = detail?.video as Record<string, unknown> | undefined;
          const addrs = (video?.play_addr as Record<string, unknown>)
            ?.url_list as string[] | undefined;
          const videoUrl = addrs?.[0] ?? "";
          if (videoUrl) {
            console.log(`${PREFIX} ✅ 视频链接（aweme/detail XHR）: ${videoUrl}`);
          }
        } catch {}
      });
    }
    return (originalXhrOpen as (...a: unknown[]) => void).apply(this, [
      method,
      url,
      ...rest,
    ]);
  };

  // ── 路由：根据当前 URL 决定使用哪种策略 ────────────────────────────
  function detectStrategy(): "renderData" | "unsupported" {
    if (/[?&]modal_id=/.test(location.href)) return "renderData";
    return "unsupported";
  }

  // ── 执行提取 ────────────────────────────────────────────────────────
  function runExtraction() {
    const strategy = detectStrategy();
    console.log(`${PREFIX} 当前页面: ${location.href.substring(0, 80)}`);
    console.log(`${PREFIX} 使用策略: ${strategy}`);

    if (strategy === "renderData") {
      const videoUrl = extractByRenderData();
      if (videoUrl) {
        console.log(`${PREFIX} ✅ 视频链接（RENDER_DATA）: ${videoUrl}`);
      } else {
        // SPA 跳转时 RENDER_DATA 不会更新，等待 aweme/detail 接口
        console.log(`${PREFIX} RENDER_DATA 无数据，等待接口响应...`);
      }
    } else {
      console.log(`${PREFIX} 当前页面暂不支持提取视频链接`);
    }
  }

  // ── 监听 SPA 内部导航 ──────────────────────────────────────────────
  const originalPushState = history.pushState.bind(history);
  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    originalPushState(...args);
    setTimeout(runExtraction, 300); // 等 DOM 稳定后再提取
  };

  const originalReplaceState = history.replaceState.bind(history);
  history.replaceState = function (
    ...args: Parameters<typeof history.replaceState>
  ) {
    originalReplaceState(...args);
    setTimeout(runExtraction, 300);
  };

  window.addEventListener("popstate", () => {
    setTimeout(runExtraction, 300);
  });

  // ── 初始加载 ────────────────────────────────────────────────────────
  window.addEventListener("DOMContentLoaded", runExtraction);
}
