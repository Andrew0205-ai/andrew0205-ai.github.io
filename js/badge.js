// 📌 徽章資料
const badges = [
  { id: 1, name: "第一步達成！", desc: "完成了你的第一個任務！", unlocked: true },
  { id: 2, name: "每日挑戰者", desc: "連續三天登入。", unlocked: false },
  { id: 3, name: "任務大師", desc: "完成 10 個任務。", unlocked: false },
  { id: 4, name: "探索者", desc: "瀏覽所有頁面。", unlocked: true }
];

// ✅ 顯示徽章
function showBadges() {
  const badgeList = document.getElementById("badgeList");
  if (!badgeList) return;

  badgeList.innerHTML = "";

  badges.forEach(badge => {
    const card = document.createElement("div");
    card.className =
      "badge-card card shadow-sm p-3 mb-3 " +
      (badge.unlocked ? "border-success unlocked" : "border-secondary locked");

    card.innerHTML = `
      <div class="d-flex align-items-center">
        <div class="badge-icon me-3">
          ${badge.unlocked ? "🏅" : "🔒"}
        </div>

        <div>
          <h5 class="card-title mb-1">${badge.name}</h5>
          <p class="card-text small text-muted">${badge.desc}</p>
        </div>
      </div>
    `;

    badgeList.appendChild(card);
  });
}


// 🌟 加入閃爍、縮放、hover 動畫
document.addEventListener("DOMContentLoaded", () => {
  const style = document.createElement("style");
  style.innerHTML = `
    
    /* 卡片出現動畫 */
    .badge-card {
      animation: popIn 0.5s ease forwards;
      transform-origin: center;
      cursor: pointer;
      border-radius: 12px;
    }

    @keyframes popIn {
      0% { transform: scale(0.6); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    /* 已解鎖：發亮 */
    .badge-card.unlocked {
      animation: popIn 0.5s ease, shine 2s infinite;
    }

    @keyframes shine {
      0% { box-shadow: 0 0 5px rgba(0,255,100,0.4); }
      50% { box-shadow: 0 0 15px rgba(0,255,100,0.7); }
      100% { box-shadow: 0 0 5px rgba(0,255,100,0.4); }
    }

    /* 滑過時跳一下 */
    .badge-card:hover {
      transform: scale(1.03);
      transition: 0.2s;
    }

    /* 未解鎖：灰色 */
    .badge-card.locked {
      filter: grayscale(1);
      opacity: 0.6;
    }

    .badge-icon {
      font-size: 2.5rem;
    }
  `;
  document.head.appendChild(style);
});

