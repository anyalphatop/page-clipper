chrome.runtime.onInstalled.addListener(() => {
  console.log("Page Clipper installed");
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "download" && msg.url) {
    chrome.downloads.download({
      url: msg.url,
      headers: [{ name: "Referer", value: "https://www.douyin.com/" }],
    });
  }
});
