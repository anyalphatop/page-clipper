chrome.runtime.onInstalled.addListener(() => {
  console.log("Page Clipper installed");
});

chrome.runtime.onMessage.addListener((msg) => {
  console.log("[PageClipper BG] 收到消息", msg);
  if (msg.type === "download" && msg.url) {
    console.log("[PageClipper BG] 开始下载", msg.url);
    chrome.downloads.download(
      { url: msg.url, filename: msg.filename },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("[PageClipper BG] download 失败:", chrome.runtime.lastError.message);
        } else {
          console.log("[PageClipper BG] download 成功 id=", downloadId);
        }
      }
    );
  }
});
