const PREFIX = "[PageClipper]";

const isDouyin =
  location.hostname === "douyin.com" ||
  location.hostname.endsWith(".douyin.com");

if (!isDouyin) {
  // 非抖音域名，不做任何事
} else {
  console.log(`${PREFIX} ▶ 脚本启动 — ${location.href}`);

  // ── 策略：解析 RENDER_DATA（适用于带 modal_id 的页面） ────────────
  function extractByRenderData(): string {
    const scriptEl = document.getElementById("RENDER_DATA");
    if (!scriptEl?.textContent) return "";

    try {
      const json = JSON.parse(decodeURIComponent(scriptEl.textContent));
      const playAddrArr = (json as Record<string, unknown>)
        ?.app as Record<string, unknown>
        | undefined;
      const videoDetail = playAddrArr?.videoDetail as
        | Record<string, unknown>
        | undefined;
      const video = videoDetail?.video as Record<string, unknown> | undefined;
      const addrs = video?.playAddr as { src: string }[] | undefined;
      return addrs?.[0]?.src ?? "";
    } catch {
      return "";
    }
  }

  // ── 路由：根据 URL 选择策略 ────────────────────────────────────────
  function detectStrategy(): "renderData" | "unsupported" {
    if (/[?&]modal_id=/.test(location.href)) return "renderData";
    return "unsupported";
  }

  // ── 主流程 ────────────────────────────────────────────────────────
  window.addEventListener("DOMContentLoaded", () => {
    const strategy = detectStrategy();

    if (strategy === "renderData") {
      const url = extractByRenderData();
      if (url) {
        console.log(`${PREFIX} ✅ 视频链接: ${url}`);
      } else {
        console.log(`${PREFIX} ❌ RENDER_DATA 中未找到视频链接`);
      }
    } else {
      console.log(`${PREFIX} 当前页面暂不支持提取视频链接`);
    }
  });
}
