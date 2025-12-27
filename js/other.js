   document.getElementById("lastUpdate").textContent =
      new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" });

 // 回到頂部按鈕控制
const backToTopButton = document.getElementById("backToTop");

window.onscroll = function() {
  if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
    backToTopButton.style.display = "block";
  } else {
    backToTopButton.style.display = "none";
  }
};

backToTopButton.addEventListener("click", function() {
  window.scrollTo({ top: 0, behavior: "smooth" });
});   

function copyGameID() {
  const idText = document.getElementById("gameID").textContent;
  navigator.clipboard.writeText(idText).then(() => {
    alert("已複製遊戲 ID：" + idText);
  });
}

document.addEventListener("DOMContentLoaded", function() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const date = today.getDate();

  const banner = document.getElementById("christmasBanner");
  const snowContainer = document.getElementById("snow-container");

  // 12/1 ~ 12/31 顯示，其他時間隱藏
  if (month !== 12) {
    if (banner) banner.style.display = "none";
    if (snowContainer) snowContainer.innerHTML = ""; // 清空雪花
    return;
  }

  // 產生 35 顆雪花
  for (let i = 0; i < 35; i++) {
    const snow = document.createElement("div");
    snow.className = "snowflake";
    snow.innerHTML = "❄️";

    snow.style.left = Math.random() * 100 + "vw";
    snow.style.fontSize = (10 + Math.random() * 15) + "px";
    snow.style.opacity = 0.5 + Math.random() * 0.5;
    
    // 隨機的速度與延遲，讓雪花看起來錯落有致
    const duration = 10 + Math.random() * 10;
    const delay = Math.random() * 15;
    
    snow.style.animationDuration = duration + "s";
    snow.style.animationDelay = delay + "s";

     const messages = [
  "🎹 最近在練：Clementi Op.36 No.1",
  "🛠️ 網站留言板功能已完成",
  "🚇 正在撰寫《墾丁輕軌系統建設企劃書》",
  "📢 最新公告: 聖誕節特別活動將於 12/30 開始，敬請期待！"
];

let index = 0;
const marqueeText = document.getElementById("marqueeText");

function showNextMessage() {
  marqueeText.textContent = messages[index];
  index = (index + 1) % messages.length;
}

// 初始顯示第一條
showNextMessage();

// 每 3 秒切換下一條
setInterval(showNextMessage, 3000);
    snowContainer.appendChild(snow);
  }
});
