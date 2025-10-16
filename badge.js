// 🏅 badge.js — 小宏的隱藏任務系統（點三下圖片解鎖）

window.addEventListener("DOMContentLoaded", () => {
  const badgeContainer = document.getElementById("badgeList");
  const secretImg = document.getElementById("avatar"); // 圖片 ID
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
        div.style.animationDelay = `${i * 0.2}s`;

        // 彈跳動畫
        div.animate(
          [
            { transform: "translateY(0px)" },
            { transform: "translateY(-8px)" },
            { transform: "translateY(0px)" }
          ],
          { duration: 800, iterations: Infinity, delay: i * 200 }
        );

        badgeContainer.appendChild(div);
      });
    }
  }

  showBadges();

  // ⚙️ 點三下圖片觸發任務區塊
  if (secretImg) {
    secretImg.addEventListener("click", () => {
      const now = Date.now();

      // 點擊間隔太久則重算
      if (now - lastClickTime > 1200) clickCount = 0;

      clickCount++;
      lastClickTime = now;

      if (clickCount === 3) {
        alert("🎯 成功啟動任務模式！");
        taskSection.classList.remove("hidden");
        taskSection.classList.add("show");

        // 🔆 小動畫提示任務已啟動
        secretImg.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(1.2)" },
            { transform: "scale(1)" }
          ],
          { duration: 500 }
        );

        clickCount = 0;
      }
    });
  }

  // 「開始任務」按鈕功能
  window.goTask = function () {
    const token = Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem("taskToken", token);
    window.location.href = "ship.html?key=" + token;
  };

  // 「返回」按鈕功能
  window.closeTask = function () {
    taskSection.classList.remove("show");
    taskSection.classList.add("hidden");

    // 🌟 小彩蛋：隨機鼓勵語
    const messages = [
      "💪 加油，小宏一定能完成任務！",
      "🌈 不急，慢慢來也沒關係喔～",
      "⭐ 下次再挑戰吧，小宏最棒了！",
      "🚀 我相信你一定能成功！"
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    alert(msg);
  };
});