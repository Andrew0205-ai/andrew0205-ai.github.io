// 🏅 badge.js — 小宏的隱藏任務系統（升級版）

window.addEventListener("DOMContentLoaded", () => {
  const badgeContainer = document.getElementById("badgeList");
  const secretImg = document.getElementById("avatar");
  const taskSection = document.getElementById("task-section");

  let clickCount = 0;
  let lastClickTime = 0;

  // 顯示徽章
  function showBadges() {
    let badges = JSON.parse(localStorage.getItem("badges") || "[]");
    badgeContainer.innerHTML = "";

    if (badges.length === 0) {
      badgeContainer.innerHTML = "<p>你還沒有徽章，快去完成任務吧！</p>";
    } else {
      badges.forEach((b, i) => {
        let div = document.createElement("div");
        div.className = "badge";
        div.innerText = b;

        // 每個徽章延遲出現
        div.style.animationDelay = `${i * 0.15}s`;

        badgeContainer.appendChild(div);
      });
    }
  }

  showBadges();

  // ⚙️ 點三下圖片觸發任務區塊（神秘啟動動畫）
  if (secretImg) {
    secretImg.addEventListener("click", () => {
      const now = performance.now();

      // 間隔過久會重置
      if (now - lastClickTime > 600) clickCount = 0;

      clickCount++;
      lastClickTime = now;

      if (clickCount === 3) {
        // ✨ 神秘啟動動畫（旋轉 + 放大 + 閃光）
        secretImg.animate(
          [
            { transform: "scale(1) rotate(0deg) brightness(1)" },
            { transform: "scale(1.25) rotate(10deg) brightness(1.8)" },
            { transform: "scale(1) rotate(0deg) brightness(1)" }
          ],
          { duration: 600, easing: "ease-out" }
        );

        // 顯示任務區塊（帶滑動效果）
        taskSection.classList.remove("hidden");
        setTimeout(() => {
          taskSection.classList.add("show");
        }, 50);

        alert("🎯 成功啟動任務模式！");
        console.log("🎯 成功啟動任務模式！")
        clickCount = 0;
      }
    });
  }

  // 🚀 「開始任務」按鈕
  window.goTask = function () {
    const token = Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem("taskToken", token);
    window.location.href = "/tasks.html";
  };

  // 🔙 「返回」按鈕
  window.closeTask = function () {
    taskSection.classList.remove("show");

    // 加回 hidden（晚一點避免動畫硬切）
    setTimeout(() => {
      taskSection.classList.add("hidden");
    }, 300);

    // 隨機鼓勵語
    const messages = [
      "💪 加油，一定能完成任務！",
      "🌈 不急，慢慢來也沒關係喔～",
      "⭐ 下次再挑戰吧，你最棒了！",
      "🚀 我相信你一定能成功！"
    ];
    alert(messages[Math.floor(Math.random() * messages.length)]);
  };
});
