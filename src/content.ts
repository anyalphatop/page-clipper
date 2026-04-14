const PREFIX = "[PageClipper]";

const isDouyin =
  location.hostname === "douyin.com" ||
  location.hostname.endsWith(".douyin.com");

if (!isDouyin) {
  // 非抖音域名，不做任何事
} else {
  console.log(`${PREFIX} ▶ 脚本启动 — ${location.href}`);

  let videoFound = false;

  // ── 方案 A：解析 RENDER_DATA（精选/modal 页） ──────────────────────
  function tryExtractFromRenderData(): boolean {
    const scriptEl = document.getElementById("RENDER_DATA");
    if (!scriptEl?.textContent) return false;

    try {
      const json = JSON.parse(decodeURIComponent(scriptEl.textContent));
      const videoDetail = (json as Record<string, unknown>)?.app as
        | Record<string, unknown>
        | undefined;
      const detail = videoDetail?.videoDetail as
        | Record<string, unknown>
        | undefined;
      if (!detail) return false;

      const video = detail.video as Record<string, unknown> | undefined;
      const playAddrArr = video?.playAddr as { src: string }[] | undefined;
      if (!playAddrArr?.length) return false;

      videoFound = true;
      const playUrls = playAddrArr.map((p) => p.src);

      console.log(`${PREFIX} ✅ 视频链接提取成功（来自 RENDER_DATA）`, {
        awemeId: (detail.awemeId as string) || "",
        desc: (detail.desc as string) || "",
        playAddr: playUrls,
      });
      return true;
    } catch {
      return false;
    }
  }

  // ── 方案 B：拦截 aweme/detail 接口（标准视频页） ────────────────────
  function handleAwemeDetail(json: unknown): void {
    const detail = (json as Record<string, unknown>)
      ?.aweme_detail as Record<string, unknown> | undefined;
    const video = detail?.video as Record<string, unknown> | undefined;

    if (!video) {
      console.log(
        `${PREFIX} aweme/detail 接口已响应，但无视频数据（非视频页或接口异常）`
      );
      return;
    }

    videoFound = true;

    const playAddr =
      ((video.play_addr as Record<string, unknown>)?.url_list as string[]) || [];
    const downloadAddr =
      ((video.download_addr as Record<string, unknown>)?.url_list as string[]) || [];

    console.log(`${PREFIX} ✅ 视频链接提取成功（来自 aweme/detail 接口）`, {
      awemeId: (detail.aweme_id as string) || "",
      desc: (detail.desc as string) || "",
      playAddr,
      downloadAddr,
    });
  }

  // 拦截 fetch
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const response = await originalFetch(...args);
    const url = args[0] instanceof Request ? args[0].url : String(args[0]);
    if (/\/aweme\/v1\/web\/aweme\/detail\//.test(url)) {
      console.log(`${PREFIX} 捕获到 aweme/detail 请求（fetch）`);
      response
        .clone()
        .json()
        .then(handleAwemeDetail)
        .catch(() => {
          console.log(`${PREFIX} ❌ aweme/detail fetch 响应解析失败`);
        });
    }
    return response;
  };

  // 拦截 XMLHttpRequest
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  (XMLHttpRequest.prototype as { open: unknown }).open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    const urlStr = typeof url === "string" ? url : url.toString();
    if (/\/aweme\/v1\/web\/aweme\/detail\//.test(urlStr)) {
      console.log(`${PREFIX} 捕获到 aweme/detail 请求（XHR）`);
      this.addEventListener("load", function (this: XMLHttpRequest) {
        try {
          handleAwemeDetail(JSON.parse(this.responseText));
        } catch {
          console.log(`${PREFIX} ❌ aweme/detail XHR 响应解析失败`);
        }
      });
    }
    return (originalXhrOpen as (...a: unknown[]) => void).apply(this, [
      method,
      url,
      ...rest,
    ]);
  };

  // DOM 就绪后先尝试 RENDER_DATA
  window.addEventListener("DOMContentLoaded", () => {
    console.log(`${PREFIX} DOMContentLoaded，尝试从 RENDER_DATA 提取...`);
    tryExtractFromRenderData();
  });

  // 页面加载完毕后等 5 秒，输出最终结论
  window.addEventListener("load", () => {
    console.log(`${PREFIX} 页面 load 事件触发，等待 5 秒后输出结论...`);
    setTimeout(() => {
      if (!videoFound) {
        console.log(
          `${PREFIX} ■ 结束 — 未检测到视频链接（当前页面可能不是视频页）`
        );
      } else {
        console.log(`${PREFIX} ■ 结束 — 视频链接已提取完毕`);
      }
    }, 5000);
  });
}
