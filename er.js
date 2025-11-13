// er.js — 手機版偵錯工具（僅在 debug 模式啟用）

(function () {
  // 檢查網址是否包含 ?debug
  if (location.search.includes('debug')) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/eruda';
    document.body.appendChild(script);
    script.onload = function () {
      eruda.init();
      console.log('%cEruda 已啟用 (debug 模式)', 'color: green; font-weight: bold;');
    };
  } else {
    console.log('%cEruda 未載入（非 debug 模式）', 'color: gray;');
  }
})();