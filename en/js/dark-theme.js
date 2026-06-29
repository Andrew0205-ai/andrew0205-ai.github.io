// ==========================================
//專門處理 UI 裝飾（深色模式）
// ==========================================

// 1. 立即執行的初始化 (避免白閃)
(function() {
    const savedTheme = localStorage.getItem("theme");
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.setAttribute("data-bs-theme", savedTheme || systemTheme);
})();

// 2. 切換函式 (讓 HTML 按鈕呼叫)
function toggleDarkMode() {
    const current = document.documentElement.getAttribute("data-bs-theme");
    const target = current === "dark" ? "light" : "dark";
    
    document.documentElement.setAttribute("data-bs-theme", target);
    localStorage.setItem("theme", target);
    
    // 更新按鈕文字與圖示 (如果有的話)
    const icon = document.getElementById("themeIcon");
    if(icon) icon.textContent = (target === "dark" ? "🌙" : "☀️");
    
    // 如果主程式的 showToast 已經載入了，就可以用
    if(typeof showToast === "function") {
        
    }
}
