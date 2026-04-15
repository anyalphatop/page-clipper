import { logger } from "../utils/logger";

export default defineContentScript({
  matches: ["*://*.douyin.com/*"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    const btn = document.createElement("button");
    btn.textContent = "下载";
    btn.style.cssText = `
      position: fixed; bottom: 80px; right: 24px; z-index: 99999;
      padding: 8px 18px; background: #fe2c55; color: #fff;
      border: none; border-radius: 6px; font-size: 15px;
      font-weight: 600; cursor: pointer;
    `;

    btn.style.display = "none";

    btn.addEventListener("click", async () => {
      const vid = (window as any).player?.config?.vid;
      logger.debug("vid =", vid);

      const params = new URLSearchParams({
        device_platform: "webapp", aid: "6383",
        channel: "channel_pc_web", aweme_id: vid,
        update_version_code: "170400",
      });
      const resp = await fetch(
        "https://www.douyin.com/aweme/v1/web/aweme/detail/?" + params,
        { headers: { Referer: "https://www.douyin.com/" }, credentials: "include" }
      );
      const data = await resp.json();
      const best = ((data.aweme_detail?.video?.bit_rate ?? []) as any[])
        .filter((b) => !b.audio_file_id)
        .sort((a, b) => b.bit_rate - a.bit_rate)[0];

      const url = best?.play_addr?.url_list?.[0];
      logger.debug("下载链接 =", url);

      const blob = await (await fetch(url)).blob();
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(blob),
        download: `${vid}.mp4`,
      });
      a.click();
    });

    const checkText = () => {
      const visible = document.body?.innerText?.includes("听抖音") ?? false;
      btn.style.display = visible ? "block" : "none";
      logger.debug("听抖音 检测:", visible);
    };

    const appendBtn = () => {
      if (!document.body.contains(btn)) document.body.appendChild(btn);
      checkText();
    };

    document.addEventListener("DOMContentLoaded", appendBtn);
    if (document.body) appendBtn();

    const observer = new MutationObserver(checkText);
    const startObserver = () => {
      if (document.body) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    };
    document.addEventListener("DOMContentLoaded", startObserver);
    if (document.body) startObserver();
  },
});
