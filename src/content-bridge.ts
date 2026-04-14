// ISOLATED world 桥接：接收 MAIN world 的 CustomEvent，转发给 background
window.addEventListener("__pageclipper_download__", (e: Event) => {
  const url = (e as CustomEvent<{ url: string }>).detail?.url;
  if (url) {
    chrome.runtime.sendMessage({ type: "download", url });
  }
});
