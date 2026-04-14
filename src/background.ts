// 给 douyinvod CDN 请求注入 Referer，避免直接打开链接时 403
function applyDouyinRefererRule() {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            {
              header: "Referer",
              operation: "set",
              value: "https://www.douyin.com/",
            },
          ],
        },
        condition: {
          requestDomains: ["douyinvod.com"],
          resourceTypes: ["main_frame", "sub_frame", "media", "xmlhttprequest", "other"],
        },
      },
    ],
  });
}

chrome.runtime.onInstalled.addListener(() => {
  applyDouyinRefererRule();
});

// service worker 重启后规则仍持久，但保险起见也在 startup 时更新
chrome.runtime.onStartup.addListener(() => {
  applyDouyinRefererRule();
});
