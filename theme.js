// 🌗 深淺色模式控制
document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const savedTheme = localStorage.getItem("theme");

  // 如果有儲存過，就套用上次設定
  if (savedTheme) {
    body.classList.add(savedTheme);
  } else {
    // 若無設定，根據系統主題自動選擇
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    body.classList.add(prefersDark ? "dark-mode" : "light-mode");
  }

  // 建立按鈕
  const button = document.createElement("button");
  button.className = "theme-toggle";
  button.textContent = body.classList.contains("dark-mode") ? "☀️ 淺色模式" : "🌙 深色模式";
  document.body.prepend(button);

  // 按鈕點擊事件
  button.addEventListener("click", () => {
    if (body.classList.contains("light-mode")) {
      body.classList.replace("light-mode", "dark-mode");
      localStorage.setItem("theme", "dark-mode");
      button.textContent = "☀️ 淺色模式";
    } else {
      body.classList.replace("dark-mode", "light-mode");
      localStorage.setItem("theme", "light-mode");
      button.textContent = "🌙 深色模式";
    }
  });
});