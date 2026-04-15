import { logger } from "../utils/logger";

export default defineContentScript({
  matches: ["*://*.douyin.com/*"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    const BTN_ID = "__page_clipper_download_btn__";

    const downloadSvg = `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" style="font-size:36px;">
      <path d="M18 4a1.5 1.5 0 0 1 1.5 1.5v14.379l4.94-4.94a1.5 1.5 0 1 1 2.12 2.122l-7.5 7.5a1.5 1.5 0 0 1-2.12 0l-7.5-7.5a1.5 1.5 0 1 1 2.12-2.121l4.94 4.939V5.5A1.5 1.5 0 0 1 18 4zM7 26.5a1.5 1.5 0 0 0 0 3h22a1.5 1.5 0 0 0 0-3H7z" fill="currentColor"/>
    </svg>`;

    async function handleDownload() {
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
    }

    function injectBtn() {
      // 找到包含"听抖音"文字的元素
      const all = Array.from(document.querySelectorAll("*"));
      const tingEl = all.find((el) =>
        Array.from(el.childNodes).some(
          (n) => n.nodeType === 3 && n.textContent?.includes("听抖音")
        )
      );
      if (!tingEl) {
        logger.info("未找到「听抖音」元素，跳过注入");
        return;
      }
      logger.info("找到「听抖音」元素", tingEl);

      // 向上找到带 data-popupid 的外层容器
      let container: Element | null = tingEl;
      for (let i = 0; i < 5; i++) {
        container = container.parentElement;
        if (!container) break;
        if (container.hasAttribute("data-popupid")) break;
      }
      if (!container) {
        logger.info("未找到 data-popupid 容器，跳过注入");
        return;
      }
      logger.info("找到容器", container);

      // 检查容器后面是否已经插入了我们的按钮
      const alreadyExists = container.nextElementSibling?.id === BTN_ID;
      logger.info("下载按钮是否已存在:", alreadyExists);
      if (alreadyExists) return;

      // 构造按钮，复用页面已有 CSS 类
      const wrapper = document.createElement("div");
      wrapper.id = BTN_ID;
      wrapper.style.cssText = "position: relative; color: rgb(255, 255, 255); cursor: pointer;";

      const inner = document.createElement("div");
      inner.className = "fR9ZbClg JBKVqbn_";

      const iconSpan = document.createElement("span");
      iconSpan.setAttribute("role", "img");
      iconSpan.className = "semi-icon semi-icon-default";
      iconSpan.innerHTML = downloadSvg;

      const label = document.createElement("div");
      label.className = "rWZP7wQY";
      label.textContent = "下载";

      inner.appendChild(iconSpan);
      inner.appendChild(label);
      wrapper.appendChild(inner);

      wrapper.addEventListener("click", handleDownload);

      container.insertAdjacentElement("afterend", wrapper);
      logger.info("下载按钮已插入");
    }

    // 等待 #sliderVideo 出现，出现后设置精准监听
    function waitForSliderVideo() {
      const existing = document.querySelector("#sliderVideo");
      if (existing) {
        onSliderVideoFound(existing);
        return;
      }

      logger.info("等待 #sliderVideo 出现...");
      const bootstrapObserver = new MutationObserver(() => {
        const el = document.querySelector("#sliderVideo");
        if (el) {
          bootstrapObserver.disconnect();
          logger.info("#sliderVideo 已出现");
          onSliderVideoFound(el);
        }
      });
      bootstrapObserver.observe(document.body, { childList: true, subtree: true });
    }

    function onSliderVideoFound(sliderVideo: Element) {
      // 初次注入
      injectBtn();

      // 监听 class 属性变化——每次切换视频，class 里的 video_XXXX 必然更新
      const vidObserver = new MutationObserver(() => {
        logger.info("视频切换（#sliderVideo class 变化）");
        injectBtn();
      });
      vidObserver.observe(sliderVideo, { attributes: true, attributeFilter: ["class"] });
      logger.info("已开始监听 #sliderVideo class 变化");
    }

    function start() {
      logger.info("content script 启动");
      waitForSliderVideo();
    }

    document.addEventListener("DOMContentLoaded", start);
    if (document.body) start();
  },
});
