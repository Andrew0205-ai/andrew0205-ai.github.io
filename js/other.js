// =======================
// 最後更新日期
// =======================
document.getElementById("lastUpdate").textContent =
  new Date().toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });


// =======================
// 回到頂部按鈕
// =======================
const backToTopButton = document.getElementById("backToTop");

window.addEventListener("scroll", () => {
  if (document.documentElement.scrollTop > 200) {
    backToTopButton.style.display = "block";
  } else {
    backToTopButton.style.display = "none";
  }
});

backToTopButton.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});


// =======================
// 複製遊戲 ID
// =======================
function copyGameID() {
  const idText = document.getElementById("gameID").textContent;
  navigator.clipboard.writeText(idText).then(() => {
    alert("已複製遊戲 ID：" + idText);
  });
}


// =======================
// 跑馬燈（公告輪播）
// =======================
const marqueeMessages = [
  "🎹 最近在練：Clementi Op.36 No.1",
  "🛠️ 網站留言板功能已完成",
  "🚇 正在撰寫《墾丁輕軌系統建設企劃書》",
  "📢 最新公告：節慶版面已上線！"
];

let marqueeIndex = 0;
const marqueeText = document.getElementById("marqueeText");

function showNextMarquee() {
  marqueeText.style.animation = "none";
  marqueeText.offsetHeight; // 強制重算

  marqueeText.textContent = marqueeMessages[marqueeIndex];
  marqueeIndex = (marqueeIndex + 1) % marqueeMessages.length;

  marqueeText.style.animation = "scroll 8s linear infinite";
}

if (marqueeText) {
  showNextMarquee();
  setInterval(showNextMarquee, 8000);
}


// =======================
// 節慶判斷（聖誕 / 新年）
// =======================
const today = new Date();
const month = today.getMonth() + 1;
const day = today.getDate();

const banner = document.getElementById("bannerText");
const footer = document.getElementById("footerText");
const snowContainer = document.getElementById("snow-container");

function showSnowflakes(count = 30) {
  if (!snowContainer) return;
  snowContainer.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const snow = document.createElement("div");
    snow.className = "snowflake";
    snow.textContent = "❄️";

    snow.style.left = Math.random() * 100 + "vw";
    snow.style.fontSize = 10 + Math.random() * 12 + "px";
    snow.style.opacity = Math.random();
    snow.style.animationDuration = 8 + Math.random() * 7 + "s";
    snow.style.animationDelay = Math.random() * 5 + "s";

    snowContainer.appendChild(snow);
  }
}

// ---------- 12/01 ～ 12/31 ----------
if (month === 12) {
  if (banner) banner.textContent = "🎄 聖誕快樂！願這個季節充滿平安與喜樂 ✨";
  if (footer) footer.textContent = "© 2025 小宏工作室 · Merry Christmas 🎄";
  showSnowflakes();
}

// ---------- 1/01 ～ 1/05 ----------
else if (month === 1 && day <= 5) {
  if (banner) banner.textContent = "🎉 2026 新年快樂！";
  if (footer) footer.textContent = "© 2025 小宏工作室 ·Happy New Year 2026 🎆";
  if (snowContainer) snowContainer.innerHTML = "";
}

// ---------- 1/06 ～ 2 月底 ----------
else if (month === 1 || month === 2) {
  if (banner) banner.textContent = "🎉 2026 新年快樂！";
  if (footer) footer.textContent = "© 2025 小宏工作室 ·Happy New Year 2026 🎆";
  showSnowflakes(20);
}
