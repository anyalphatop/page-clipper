// 轮询间隔（ms）
const POLL_INTERVAL = 500;

// 下载按钮的 CSS class
const DOWNLOAD_BTN_CLASS = "__page_clipper_download_btn__";

// 下载按钮文字标签的 CSS class，用于在下载过程中更新进度文字
const DOWNLOAD_BTN_LABEL_CLASS = "__page_clipper_download_btn_label__";

// 下载按钮图标 span 的 CSS class，用于在下载过程中切换图标
const DOWNLOAD_BTN_ICON_CLASS = "__page_clipper_download_btn_icon__";

// 转文本按钮的 CSS class
const TEXT_BTN_CLASS = "__page_clipper_text_btn__";

// 转文本按钮文字标签的 CSS class，用于更新状态文字
const TEXT_BTN_LABEL_CLASS = "__page_clipper_text_btn_label__";

// 转文本按钮图标 span 的 CSS class，用于切换图标
const TEXT_BTN_ICON_CLASS = "__page_clipper_text_btn_icon__";

// 下载按钮内的图标 SVG
const DOWNLOAD_BTN_ICON = `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" style="font-size:36px;">
  <path d="M18 4a1.5 1.5 0 0 1 1.5 1.5v14.379l4.94-4.94a1.5 1.5 0 1 1 2.12 2.122l-7.5 7.5a1.5 1.5 0 0 1-2.12 0l-7.5-7.5a1.5 1.5 0 1 1 2.12-2.121l4.94 4.939V5.5A1.5 1.5 0 0 1 18 4zM7 26.5a1.5 1.5 0 0 0 0 3h22a1.5 1.5 0 0 0 0-3H7z" fill="currentColor"/>
</svg>`;

// 下载中的加载圈图标 SVG（配合 CSS animation 旋转）
const DOWNLOAD_BTN_ICON_LOADING = `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" style="font-size:30px; animation: __pc_spin__ 1s linear infinite;">
  <circle cx="18" cy="18" r="14" stroke="currentColor" stroke-width="3" stroke-dasharray="60 28" stroke-linecap="round"/>
</svg>`;

// 转文本按钮内的图标 SVG
const TEXT_BTN_ICON = `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" style="font-size:36px;">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M12 7L24 7Q26 7 26 9L26 27Q26 29 24 29L12 29Q10 29 10 27L10 9Q10 7 12 7ZM13 13L23 13L23 15L13 15ZM13 17L23 17L23 19L13 19ZM13 21L19 21L19 23L13 23Z" fill="currentColor"/>
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

// 判断视频元素中是否包含互动区（点赞、评论、收藏、分享四个按钮同时存在）
function hasInteraction(video: Element): boolean {
  return (
    !!video.querySelector('[data-e2e="video-player-digg"]') &&
    !!video.querySelector('[data-e2e="feed-comment-icon"]') &&
    !!video.querySelector('[data-e2e="video-player-collect"]') &&
    !!video.querySelector('[data-e2e="video-player-share"]')
  );
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

// 从分享按钮中动态提取样式，用于注入按钮时复用
// 分享按钮结构：wrapper > inner > iconWrapper > iconSpan，label 是 inner 的兄弟节点
interface BtnStyles {
  wrapperClass: string;
  innerClass: string;
  iconWrapperClass: string;
  iconClass: string;
  labelClass: string;
}

function extractBtnStyles(activeVideo: Element): BtnStyles | null {
  const shareBtn = activeVideo.querySelector('[data-e2e="video-player-share"]');
  if (!shareBtn) return null;
  const inner = shareBtn.firstElementChild;
  if (!inner) return null;
  const iconWrapper = inner.firstElementChild;
  if (!iconWrapper) return null;
  const iconSpan = iconWrapper.firstElementChild;
  if (!iconSpan) return null;
  const label = inner.nextElementSibling;
  if (!label) return null;
  return {
    wrapperClass: shareBtn.className,
    innerClass: inner.className,
    iconWrapperClass: iconWrapper.className,
    iconClass: iconSpan.className,
    labelClass: label.className,
  };
}

// 创建下载按钮
function createDownloadBtn(styles: BtnStyles): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = `${styles.wrapperClass} ${DOWNLOAD_BTN_CLASS}`;

  const inner = document.createElement("div");
  inner.className = styles.innerClass;

  const iconWrapper = document.createElement("div");
  iconWrapper.className = styles.iconWrapperClass;

  const iconSpan = document.createElement("span");
  iconSpan.setAttribute("role", "img");
  iconSpan.className = `${styles.iconClass} ${DOWNLOAD_BTN_ICON_CLASS}`;
  iconSpan.innerHTML = DOWNLOAD_BTN_ICON;

  const label = document.createElement("div");
  label.className = `${styles.labelClass} ${DOWNLOAD_BTN_LABEL_CLASS}`;
  label.textContent = "下载";

  iconWrapper.appendChild(iconSpan);
  inner.appendChild(iconWrapper);
  wrapper.appendChild(inner);
  wrapper.appendChild(label);
  wrapper.addEventListener("click", handleDownload);

  return wrapper;
}

// 将下载按钮从活跃视频中移除
function removeDownloadBtn(activeVideo: Element): void {
  activeVideo.querySelector(`.${DOWNLOAD_BTN_CLASS}`)?.remove();
}

// 创建转文本按钮
function createTranscribeBtn(styles: BtnStyles): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = `${styles.wrapperClass} ${TEXT_BTN_CLASS}`;

  const inner = document.createElement("div");
  inner.className = styles.innerClass;

  const iconWrapper = document.createElement("div");
  iconWrapper.className = styles.iconWrapperClass;

  const iconSpan = document.createElement("span");
  iconSpan.setAttribute("role", "img");
  iconSpan.className = `${styles.iconClass} ${TEXT_BTN_ICON_CLASS}`;
  iconSpan.innerHTML = TEXT_BTN_ICON;

  const label = document.createElement("div");
  label.className = `${styles.labelClass} ${TEXT_BTN_LABEL_CLASS}`;
  label.textContent = "转文本";

  iconWrapper.appendChild(iconSpan);
  inner.appendChild(iconWrapper);
  wrapper.appendChild(inner);
  wrapper.appendChild(label);
  wrapper.addEventListener("click", handleTranscribe);

  return wrapper;
}

// 将转文本按钮从活跃视频中移除
function removeTranscribeBtn(activeVideo: Element): void {
  activeVideo.querySelector(`.${TEXT_BTN_CLASS}`)?.remove();
}

// 找到插入锚点：优先用「听抖音」按钮，没有则退回到分享按钮
function findInsertAnchor(activeVideo: Element): Element | null {
  const tingDouyinTextEl = Array.from(activeVideo.querySelectorAll("*")).find((el) =>
    Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent?.includes("听抖音"))
  );
  if (tingDouyinTextEl) {
    let el: Element | null = tingDouyinTextEl;
    for (let i = 0; i < 5; i++) {
      el = el.parentElement;
      if (!el) break;
      if (el.hasAttribute("data-popupid")) return el;
    }
  }
  return activeVideo.querySelector('[data-e2e="video-player-share"]');
}

// 将下载按钮和转文本按钮注入到锚点按钮的后面
function injectBtns(activeVideo: Element): void {
  if (hasDownloadBtn(activeVideo)) return;

  const styles = extractBtnStyles(activeVideo);
  if (!styles) return;

  const anchor = findInsertAnchor(activeVideo);
  if (!anchor) return;

  const downloadBtn = createDownloadBtn(styles);
  anchor.insertAdjacentElement("afterend", downloadBtn);
  downloadBtn.insertAdjacentElement("afterend", createTranscribeBtn(styles));
}

// 将下载按钮和转文本按钮从活跃视频中移除
function removeBtns(activeVideo: Element): void {
  removeDownloadBtn(activeVideo);
  removeTranscribeBtn(activeVideo);
}

// 从页面播放器实例中获取当前视频 ID
function getVid(): string {
  return (window as any).player?.config?.vid;
}

// 从 URL 的 mime_type 查询参数中解析视频文件扩展名，默认 mp4
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
// 2. 从 bit_rate 中按码率降序排序，取码率最高的版本
// 3. 返回 play_addr.url_list[0] 及从 mime_type 解析的扩展名
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
    .sort((a, b) => b.bit_rate - a.bit_rate)[0];
  const url = best?.play_addr?.url_list?.[0];
  if (!url) return null;
  return { url, ext: mimeTypeToExt(url) };
}

// 获取最小音频文件的下载链接：
// 1. 调用抖音 aweme/detail 接口获取视频详情
// 2. 从 bit_rate_audio 中按文件大小升序排序，取文件最小的版本
// 3. 返回 audio_meta.url_list.main_url 及从 mime_type 解析的扩展名
async function fetchSmallestAudioUrl(vid: string): Promise<{ url: string; ext: string } | null> {
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
  const best = ((data.aweme_detail?.video?.bit_rate_audio ?? []) as any[])
    .sort((a, b) => a.audio_meta?.size - b.audio_meta?.size)[0];
  const url = best?.audio_meta?.url_list?.main_url;
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
    download: `page_clipper_douyin_${vid}.${ext}`,
  });
  a.click();
}

// 处理转文本：与下载按钮行为相同，防重复点击，实时更新进度，完成后恢复
async function handleTranscribe(event: Event): Promise<void> {
  const wrapper = event.currentTarget as HTMLElement;
  if (wrapper.dataset.downloading === "true") return;

  const label = wrapper.querySelector(`.${TEXT_BTN_LABEL_CLASS}`) as HTMLElement | null;
  const icon = wrapper.querySelector(`.${TEXT_BTN_ICON_CLASS}`) as HTMLElement | null;

  const vid = getVid();
  if (!vid) return;

  const result = (await fetchSmallestAudioUrl(vid)) ?? (await fetchBestVideoUrl(vid));
  if (!result) return;

  wrapper.dataset.downloading = "true";
  if (icon) icon.innerHTML = DOWNLOAD_BTN_ICON_LOADING;
  try {
    await triggerDownload(result.url, vid, result.ext, (pct) => {
      if (label) label.textContent = `${pct}%`;
    });
  } finally {
    wrapper.dataset.downloading = "false";
    if (icon) icon.innerHTML = TEXT_BTN_ICON;
    if (label) label.textContent = "转文本";
  }
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
      if (!video) return;

      if (hasTingDouyin(video) || hasInteraction(video)) {
        injectBtns(video);
        return;
      }

      if (hasDownloadBtn(video)) {
        removeBtns(video);
      }
    }, POLL_INTERVAL);
  },
});
