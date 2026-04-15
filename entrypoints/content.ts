// 下载按钮的 CSS class
const DOWNLOAD_BTN_CLASS = "__page_clipper_download_btn__";

// 下载按钮内的图标 SVG
const DOWNLOAD_BTN_ICON = `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" style="font-size:36px;">
  <path d="M18 4a1.5 1.5 0 0 1 1.5 1.5v14.379l4.94-4.94a1.5 1.5 0 1 1 2.12 2.122l-7.5 7.5a1.5 1.5 0 0 1-2.12 0l-7.5-7.5a1.5 1.5 0 1 1 2.12-2.121l4.94 4.939V5.5A1.5 1.5 0 0 1 18 4zM7 26.5a1.5 1.5 0 0 0 0 3h22a1.5 1.5 0 0 0 0-3H7z" fill="currentColor"/>
</svg>`;

function getVid(): string {
  return (window as any).player?.config?.vid;
}

async function fetchBestVideoUrl(vid: string): Promise<string> {
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
  return best?.play_addr?.url_list?.[0];
}

async function triggerDownload(url: string, vid: string): Promise<void> {
  const blob = await (await fetch(url)).blob();
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: `${vid}.mp4`,
  });
  a.click();
}

async function handleDownload(): Promise<void> {
  const vid = getVid();
  const url = await fetchBestVideoUrl(vid);
  await triggerDownload(url, vid);
}

function findTingContainer(activeVideo: Element): Element | null {
  const tingEl = Array.from(activeVideo.querySelectorAll("*")).find((el) =>
    Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent?.includes("听抖音"))
  );
  if (!tingEl) return null;

  let container: Element | null = tingEl;
  for (let i = 0; i < 5; i++) {
    container = container.parentElement;
    if (!container) break;
    if (container.hasAttribute("data-popupid")) break;
  }
  return container;
}

function createDownloadBtn(): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = DOWNLOAD_BTN_CLASS;
  wrapper.style.cssText = "position: relative; color: rgb(255, 255, 255); cursor: pointer;";

  const inner = document.createElement("div");
  inner.className = "fR9ZbClg JBKVqbn_";

  const iconSpan = document.createElement("span");
  iconSpan.setAttribute("role", "img");
  iconSpan.className = "semi-icon semi-icon-default";
  iconSpan.innerHTML = DOWNLOAD_BTN_ICON;

  const label = document.createElement("div");
  label.className = "rWZP7wQY";
  label.textContent = "下载";

  inner.appendChild(iconSpan);
  inner.appendChild(label);
  wrapper.appendChild(inner);
  wrapper.addEventListener("click", handleDownload);

  return wrapper;
}

function injectBtnInto(activeVideo: Element): void {
  if (activeVideo.querySelector(`.${DOWNLOAD_BTN_CLASS}`)) return;

  const container = findTingContainer(activeVideo);
  if (!container) return;

  container.insertAdjacentElement("afterend", createDownloadBtn());
}

// 获取当前可见的活跃视频元素
function getActiveVideos(): Element[] {
  return Array.from(document.querySelectorAll('[data-e2e="feed-active-video"]'))
    .filter((el) => (el as HTMLElement).offsetWidth > 0);
}

export default defineContentScript({
  matches: ["*://*.douyin.com/*"],
  runAt: "document_idle",
  world: "MAIN",
  main() {
    setInterval(() => {
      getActiveVideos().forEach((video) => {
        if ((video as HTMLElement).innerText?.includes("听抖音")) {
          injectBtnInto(video);
        }
      });
    }, 500);
  },
});
