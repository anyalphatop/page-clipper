// ISOLATED world 桥接：接收 MAIN world 的 CustomEvent，转发给 background
console.log("[PageClipper Bridge] 已加载");
window.addEventListener("__pageclipper_download__", (e: Event) => {
  const { url, filename } = (e as CustomEvent<{ url: string; filename: string }>).detail ?? {};
  console.log("[PageClipper Bridge] 收到事件，url=", url, "filename=", filename);
  if (url) {
    chrome.runtime.sendMessage({ type: "download", url, filename }, (resp) => {
      console.log("[PageClipper Bridge] sendMessage 回调", resp, chrome.runtime.lastError);
    });
  }
});
