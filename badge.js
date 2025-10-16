// 🏅 badge.js — 小宏的隱藏任務系統（點三下圖片解鎖）

window.addEventListener("DOMContentLoaded", () => {
  const badgeContainer = document.getElementById("badgeList");
  const secretImg = document.getElementById("avatar"); // 圖片 ID
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

  // ⚙️ 點三下圖片觸發任務
  if (secretImg) {
    secretImg.addEventListener("click", () => {
      const now = Date.now();
      // 如果兩次點擊間隔太久 (>1.2秒)，就重算
      if (now - lastClickTime > 1200) {
        clickCount = 0;
      }
      clickCount++;
      lastClickTime = now;

      if (clickCount === 3) {
        // ✅ 成功三下，生成 token 並導向任務頁
        const token = Math.random().toString(36).substring(2, 10);
        sessionStorage.setItem("taskToken", token);
        alert("🎯 成功啟動任務模式！");
        window.location.href = "ship.html?key=" + token;
        clickCount = 0;
      }
    });
  }
});