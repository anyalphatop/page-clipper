chrome.runtime.onInstalled.addListener(() => {
  console.log("Page Clipper installed");
});

// 用 URL 做 key，存储待用的文件名（chrome.downloads.download 里的 filename 会被服务器
// Content-Disposition 覆盖，onDeterminingFilename 是唯一能强制覆盖的方式）
const pendingFilenames = new Map<string, string>();

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  const fname = pendingFilenames.get(item.url);
  if (fname) {
    pendingFilenames.delete(item.url);
    suggest({ filename: fname });
  } else {
    suggest({});
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  console.log("[PageClipper BG] 收到消息", msg);
  if (msg.type === "download" && msg.url) {
    if (msg.filename) {
      pendingFilenames.set(msg.url, msg.filename);
    }
    console.log("[PageClipper BG] 开始下载", msg.url, "→", msg.filename);
    chrome.downloads.download({ url: msg.url }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("[PageClipper BG] download 失败:", chrome.runtime.lastError.message);
        pendingFilenames.delete(msg.url); // 清理
      } else {
        console.log("[PageClipper BG] download 成功 id=", downloadId);
      }
    });
  }
});
