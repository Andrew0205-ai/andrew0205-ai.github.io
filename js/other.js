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
// 🎄 聖誕期間自動顯示（12/1～12/25）
  const today = new Date();
  const month = today.getMonth() + 1;
  const date = today.getDate();

  if (!(month === 12 && date <= 25)) {
    const banner = document.getElementById("christmasBanner");
    if (banner) banner.style.display = "none";
  }
  const snowContainer = document.getElementById("snow-container");
  const snowCount = 30; // 雪花數量

  for (let i = 0; i < snowCount; i++) {
    const snow = document.createElement("div");
    snow.className = "snowflake";
    snow.innerHTML = "❄️";

    // 隨機位置與大小
    snow.style.left = Math.random() * 100 + "vw";
    snow.style.fontSize = (10 + Math.random() * 12) + "px";
    snow.style.opacity = Math.random();

    // 隨機速度
    const duration = 8 + Math.random() * 7;
    snow.style.animationDuration = duration + "s";
    snow.style.animationDelay = Math.random() * 5 + "s";

    snowContainer.appendChild(snow);
  }
