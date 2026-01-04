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

// 節慶自動切換邏輯
const today = new Date();
const year = today.getFullYear(); // 2026
const month = today.getMonth() + 1;
const day = today.getDate();

const banner = document.getElementById("bannerText");
const footer = document.getElementById("footerText");
const bannerContainer = document.getElementById("christmasBanner"); 
const snowContainer = document.getElementById("snowContainer"); 

function updateFestival() {
  if (month === 12) {
    // 12月聖誕季
    if (banner) banner.textContent = "🎄 聖誕快樂！願這個季節充滿平安與喜樂 ✨";
    if (footer) footer.textContent = `© ${year} 小宏工作室 · Merry Christmas 🎄`;
    if (bannerContainer) bannerContainer.style.background = "linear-gradient(90deg, #1e7e34, #198754)";
    showSnowflakes(30);
  } 
  else if (month === 1 || month === 2) {
    // 1-2月新年季 
    if (banner) banner.textContent = `🎉 ${year} 新年快樂！迎接美好的新開始`;
    if (footer) footer.textContent = `© ${year} 小宏工作室 · Happy New Year ${year} 🎆`;
    if (bannerContainer) bannerContainer.style.background = "linear-gradient(90deg, #d4a017, #b8860b)"; // 新年改用金色系
    
    // 1/1~1/5 休息不下雪，之後才下
    if (month === 1 && day <= 5) {
       if (snowContainer) snowContainer.innerHTML = "";
    } else {
       showSnowflakes(20);
    }
  }
}

// 執行判斷
updateFestival();
