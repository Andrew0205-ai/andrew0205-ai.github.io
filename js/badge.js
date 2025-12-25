// 任務列表
const tasks = [
  { name: "海中尋船", desc: "在海面上找出那艘神秘的小船", img: "images/task1.png", link: "task.html", badge: "海中尋船徽章" },
  { name: "海底寶藏", desc: "在深海裡尋找閃亮的寶箱", img: "images/task2.png", link: "treasure.html", badge: "海底寶藏徽章" },
  { name: "天空尋星任務", desc: "點擊天空中的星星收集徽章", img: "images/task3.png", link: "star.html", badge: "天空尋星徽章" },
  { name: "星座探索任務", desc: "找出指定星座獲得專屬星座徽章", img: "images/task4.png", link: "xinzou.html", badge: "星座探索徽章" }
];

// 讀取已完成徽章
let completedBadges = JSON.parse(localStorage.getItem("badges") || "[]");

// 找到首頁容器
const badgeList = document.getElementById("badgeList");

// 渲染任務卡片
tasks.forEach((task, index) => {
  const card = document.createElement("div");
  card.className = "task-card";
  card.style.animationDelay = `${0.1 + index * 0.1}s`;

  const completed = completedBadges.includes(task.badge);

  card.innerHTML = `
    <img src="${task.img}">
    <div class="task-info">
      <h2>${task.name} ${completed ? "✅" : ""}</h2>
      <div class="task-desc">${task.desc}</div>
      <a class="task-btn" href="${task.link}">開始任務</a>
    </div>
  `;
  badgeList.appendChild(card);
});
