const PREFIX = "[PageClipper]";

const isDouyin =
  location.hostname === "douyin.com" ||
  location.hostname.endsWith(".douyin.com");

if (isDouyin) {
  console.log(`${PREFIX} ▶ 脚本启动 — ${location.href}`);

  // ── 下载按钮 ──────────────────────────────────────────────────────────

  const btn = document.createElement("button");
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
  `;
  btn.addEventListener("mouseenter", () => { btn.style.background = "#e0183d"; });
  btn.addEventListener("mouseleave", () => { btn.style.background = "#fe2c55"; });

  btn.addEventListener("click", async () => {
    // Step 1: 获取视频 ID
    const vid = (window as any).player?.config?.vid;
    console.log(`${PREFIX} vid =`, vid);
    if (!vid) {
      alert("未找到视频 ID，请确认视频正在播放");
      return;
    }

    btn.textContent = "获取中…";
    btn.style.pointerEvents = "none";

    try {
      // Step 2: 调详情接口获取下载链接
      const params = new URLSearchParams({
        device_platform: "webapp",
        aid: "6383",
        channel: "channel_pc_web",
        aweme_id: vid,
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

      const url: string | undefined = best?.play_addr?.url_list?.[0];
      console.log(`${PREFIX} 下载链接 =`, url);

      if (!url) {
        alert("未获取到下载链接");
        return;
      }

      // Step 3: 下载，文件名使用毫秒时间戳
      const filename = `${Date.now()}.mp4`;
      window.dispatchEvent(
        new CustomEvent("__pageclipper_download__", { detail: { url, filename } })
      );
    } catch (e) {
      console.error(`${PREFIX} 出错`, e);
      alert("出错：" + (e as Error).message);
    } finally {
      btn.textContent = "下载";
      btn.style.pointerEvents = "auto";
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    document.body.appendChild(btn);
  });

  // 若 DOMContentLoaded 已过，直接追加
  if (document.body) document.body.appendChild(btn);
}
