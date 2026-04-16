// 轮询间隔（ms）
const POLL_INTERVAL = 500;

// 下载按钮的 CSS class
const DOWNLOAD_BTN_CLASS = "__page_clipper_download_btn__";

// 下载按钮文字标签的 CSS class，用于在下载过程中更新进度文字
const DOWNLOAD_BTN_LABEL_CLASS = "__page_clipper_download_btn_label__";

// 下载按钮图标 span 的 CSS class，用于在下载过程中切换图标
const DOWNLOAD_BTN_ICON_CLASS = "__page_clipper_download_btn_icon__";

// 下载按钮内的图标 SVG
const DOWNLOAD_BTN_ICON = `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" style="font-size:36px;">
  <path d="M18 4a1.5 1.5 0 0 1 1.5 1.5v14.379l4.94-4.94a1.5 1.5 0 1 1 2.12 2.122l-7.5 7.5a1.5 1.5 0 0 1-2.12 0l-7.5-7.5a1.5 1.5 0 1 1 2.12-2.121l4.94 4.939V5.5A1.5 1.5 0 0 1 18 4zM7 26.5a1.5 1.5 0 0 0 0 3h22a1.5 1.5 0 0 0 0-3H7z" fill="currentColor"/>
</svg>`;

// 下载中的加载圈图标 SVG（配合 CSS animation 旋转）
const DOWNLOAD_BTN_ICON_LOADING = `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" style="font-size:30px; animation: __pc_spin__ 1s linear infinite;">
  <circle cx="18" cy="18" r="14" stroke="currentColor" stroke-width="3" stroke-dasharray="60 28" stroke-linecap="round"/>
</svg>`;

// 获取当前可见的活跃视频元素
function getActiveVideo(): Element | null {
  // Feed 页
  const feedVideos = Array.from(document.querySelectorAll('[data-e2e="feed-active-video"]'))
    .filter((el) => (el as HTMLElement).offsetWidth > 0);

  if (feedVideos.length > 1 && location.pathname === '/follow') {
    return feedVideos[feedVideos.length - 1];
  }
  if (feedVideos.length > 0) return feedVideos[0];

  // 视频页
  const detailVideo = document.querySelector('[data-e2e="video-detail"]') as HTMLElement | null;
  if (detailVideo && detailVideo.offsetWidth > 0) return detailVideo;

  return null;
}

// 判断视频元素中是否包含「听抖音」文字
function hasTingDouyin(video: Element): boolean {
  return !!(video as HTMLElement).innerText?.includes("听抖音");
}

// 在活跃视频中找到「听抖音」按钮：
// 1. 找到直接包含「听抖音」文字的元素
// 2. 从该元素向上最多遍历 5 层，找到带 data-popupid 属性的外层容器（5 层为经验值）
function findTingDouyinBtn(activeVideo: Element): Element | null {
  const tingDouyinTextEl = Array.from(activeVideo.querySelectorAll("*")).find((el) =>
    Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent?.includes("听抖音"))
  );
  if (!tingDouyinTextEl) return null;

  let tingDouyinBtn: Element | null = tingDouyinTextEl;
  for (let i = 0; i < 5; i++) {
    tingDouyinBtn = tingDouyinBtn.parentElement;
    if (!tingDouyinBtn) break;
    if (tingDouyinBtn.hasAttribute("data-popupid")) break;
  }
  return tingDouyinBtn;
}

// 向页面注入旋转动画 keyframes（只注入一次）
function injectSpinKeyframes(): void {
  if (document.getElementById("__pc_spin_style__")) return;
  const style = document.createElement("style");
  style.id = "__pc_spin_style__";
  style.textContent = "@keyframes __pc_spin__ { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }";
  document.head.appendChild(style);
}

// 判断视频元素中是否已注入下载按钮
function hasDownloadBtn(video: Element): boolean {
  return !!video.querySelector(`.${DOWNLOAD_BTN_CLASS}`);
}

// 创建下载按钮
function createDownloadBtn(): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = DOWNLOAD_BTN_CLASS;
  wrapper.style.cssText = "position: relative; color: rgb(255, 255, 255); cursor: pointer;";

  const inner = document.createElement("div");
  inner.className = "fR9ZbClg JBKVqbn_";

  const iconSpan = document.createElement("span");
  iconSpan.setAttribute("role", "img");
  iconSpan.className = `semi-icon semi-icon-default ${DOWNLOAD_BTN_ICON_CLASS}`;
  iconSpan.innerHTML = DOWNLOAD_BTN_ICON;

  const label = document.createElement("div");
  label.className = `rWZP7wQY ${DOWNLOAD_BTN_LABEL_CLASS}`;
  label.textContent = "下载";

  inner.appendChild(iconSpan);
  inner.appendChild(label);
  wrapper.appendChild(inner);
  wrapper.addEventListener("click", handleDownload);

  return wrapper;
}

// 将下载按钮注入到「听抖音」按钮的后面
function injectDownloadBtn(activeVideo: Element): void {
  if (hasDownloadBtn(activeVideo)) return;

  const tingDouyinBtn = findTingDouyinBtn(activeVideo);
  if (!tingDouyinBtn) return;

  tingDouyinBtn.insertAdjacentElement("afterend", createDownloadBtn());
}

// 从页面播放器实例中获取当前视频 ID
function getVid(): string {
  return (window as any).player?.config?.vid;
}

// 从 URL 的 mime_type 查询参数中解析文件扩展名，默认 mp4
function mimeTypeToExt(url: string): string {
  const mimeType = new URL(url).searchParams.get("mime_type") ?? "";
  const map: Record<string, string> = {
    "video_mp4": "mp4",
    "video/mp4": "mp4",
    "video_webm": "webm",
    "video/webm": "webm",
  };
  return map[mimeType] ?? "mp4";
}

// 获取最佳画质的视频下载链接：
// 1. 调用抖音 aweme/detail 接口获取视频详情
// 2. 过滤掉纯音频条目，按码率降序排序，取画质最高的版本
// 3. 返回该版本的第一个播放地址及对应的文件扩展名
async function fetchBestVideoUrl(vid: string): Promise<{ url: string; ext: string } | null> {
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
  if (!url) return null;
  return { url, ext: mimeTypeToExt(url) };
}

// 流式下载视频，通过 onProgress 回调实时上报进度（0~100），完成后触发浏览器文件下载
async function triggerDownload(url: string, vid: string, ext: string, onProgress: (pct: number) => void): Promise<void> {
  const resp = await fetch(url);
  const total = parseInt(resp.headers.get("content-length") || "0");
  const reader = resp.body!.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total) onProgress(Math.round(received / total * 100));
  }

  const blob = new Blob(chunks);
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: `${vid}.${ext}`,
  });
  a.click();
}

// 处理下载：防重复点击，实时更新按钮进度文字，完成后恢复
async function handleDownload(event: Event): Promise<void> {
  const wrapper = event.currentTarget as HTMLElement;
  if (wrapper.dataset.downloading === "true") return;

  const label = wrapper.querySelector(`.${DOWNLOAD_BTN_LABEL_CLASS}`) as HTMLElement | null;
  const icon = wrapper.querySelector(`.${DOWNLOAD_BTN_ICON_CLASS}`) as HTMLElement | null;

  const vid = getVid();
  if (!vid) return;

  const result = await fetchBestVideoUrl(vid);
  if (!result) return;

  wrapper.dataset.downloading = "true";
  if (icon) icon.innerHTML = DOWNLOAD_BTN_ICON_LOADING;
  try {
    await triggerDownload(result.url, vid, result.ext, (pct) => {
      if (label) label.textContent = `${pct}%`;
    });
  } finally {
    wrapper.dataset.downloading = "false";
    if (icon) icon.innerHTML = DOWNLOAD_BTN_ICON;
    if (label) label.textContent = "下载";
  }
}

export default defineContentScript({
  matches: ["*://*.douyin.com/*"], // 仅在抖音页面生效
  runAt: "document_idle",         // 页面加载完成后执行
  world: "MAIN",                  // 运行在页面主环境，可访问页面的 JS 变量
  // 入口：启动轮询
  main() {
    injectSpinKeyframes();
    setInterval(() => {
      const video = getActiveVideo();
      if (video && hasTingDouyin(video)) {
        injectDownloadBtn(video);
      }
    }, POLL_INTERVAL);
  },
});
