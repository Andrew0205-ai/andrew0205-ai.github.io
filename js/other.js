document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const date = today.getDate();

  const banner = document.getElementById("christmasBanner");
  const snowContainer = document.getElementById("snow-container");
  const footer = document.querySelector("footer");

  let bannerText = "";
  let footerText = "";
  let showSnow = false;
  let showChristmasDecor = false;

  // 🎄 12/01 – 12/31
  if (month === 12) {
    bannerText = "🎄 聖誕快樂！願這個季節充滿平安與喜樂 ✨";
    footerText = "© 2025 小宏工作室 · Merry Christmas 🎄";
    showSnow = true;
    showChristmasDecor = true;
  }

  // 🎆 1/1 – 1/5
  else if (month === 1 && date <= 5) {
    bannerText = "🎆 2026 新年快樂！";
    footerText = "🎆 Happy New Year 2026";
    showSnow = false;
  }

  // 🎆 1/6 – 2/最後一天
  else if (month === 1 || month === 2) {
    bannerText = "🎆 2026 新年快樂！";
    footerText = "🎆 Happy New Year 2026";
    showSnow = true;
  }

  // 其他時間全部隱藏
  else {
    banner.style.display = "none";
    snowContainer.innerHTML = "";
    return;
  }

  // 套用 Banner / Footer
  banner.textContent = bannerText;
  footer.textContent = footerText;

  // 標題是否顯示 🎄
  document.documentElement.style.setProperty(
    "--after-icon",
    showChristmasDecor ? '" 🎄"' : '""'
  );

  // 雪花
  snowContainer.innerHTML = "";
  if (showSnow) {
    const count = 35;
    for (let i = 0; i < count; i++) {
      const snow = document.createElement("div");
      snow.className = "snowflake";
      snow.innerHTML = "❄️";

      snow.style.left = Math.random() * 100 + "vw";
      snow.style.fontSize = 10 + Math.random() * 14 + "px";
      snow.style.opacity = 0.4 + Math.random() * 0.6;
      snow.style.animationDuration = 8 + Math.random() * 10 + "s";
      snow.style.animationDelay = Math.random() * 10 + "s";

      snowContainer.appendChild(snow);
    }
  }
});
