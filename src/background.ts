chrome.runtime.onInstalled.addListener(() => {
  console.log("Page Clipper installed");
});

chrome.runtime.onMessage.addListener((msg) => {
  console.log("[PageClipper BG] 收到消息", msg);
  if (msg.type === "download" && msg.url) {
    console.log("[PageClipper BG] 开始下载", msg.url);
    chrome.downloads.download(
      { url: msg.url, headers: [{ name: "Referer", value: "https://www.douyin.com/" }] },
      (downloadId) => {
        console.log("[PageClipper BG] download 回调 id=", downloadId, chrome.runtime.lastError);
      }
    );
  }
});
