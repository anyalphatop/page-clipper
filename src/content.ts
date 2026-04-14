const isDouyin =
  location.hostname === "douyin.com" ||
  location.hostname.endsWith(".douyin.com");

if (!isDouyin) {
  // 非抖音域名，不做任何事
} else {
  console.log("[Page Clipper] 抖音域名已检测，启动视频链接监听");

  let videoFound = false;

  function handleAwemeDetail(json: unknown): void {
    const detail = (json as Record<string, unknown>)
      ?.aweme_detail as Record<string, unknown> | undefined;
    const video = detail?.video as Record<string, unknown> | undefined;

    if (!video) {
      // aweme/detail 接口有响应，但没有 video 字段——不是视频页或接口返回异常
      console.log(
        "[Page Clipper] 检测到 aweme/detail 接口，但响应中没有视频数据"
      );
      return;
    }

    videoFound = true;

    const playAddr =
      ((video.play_addr as Record<string, unknown>)
        ?.url_list as string[]) || [];
    const downloadAddr =
      ((video.download_addr as Record<string, unknown>)
        ?.url_list as string[]) || [];

    console.log("[Page Clipper] 抖音视频链接提取成功", {
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
    const url =
      args[0] instanceof Request ? args[0].url : String(args[0]);
    if (/\/aweme\/v1\/web\/aweme\/detail\//.test(url)) {
      response
        .clone()
        .json()
        .then(handleAwemeDetail)
        .catch(() => {
          console.log("[Page Clipper] aweme/detail fetch 响应解析失败");
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
      this.addEventListener("load", function (this: XMLHttpRequest) {
        try {
          handleAwemeDetail(JSON.parse(this.responseText));
        } catch {
          console.log("[Page Clipper] aweme/detail XHR 响应解析失败");
        }
      });
    }
    return (originalXhrOpen as (...a: unknown[]) => void).apply(this, [
      method,
      url,
      ...rest,
    ]);
  };

  // 页面加载完毕后等 5 秒，若仍未抓到视频则提示
  window.addEventListener("load", () => {
    setTimeout(() => {
      if (!videoFound) {
        console.log("[Page Clipper] 当前抖音页面未检测到视频链接");
      }
    }, 5000);
  });
}
