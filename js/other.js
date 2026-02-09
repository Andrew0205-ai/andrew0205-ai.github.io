// ===============================
// 1. 初始化與全域變數
// ===============================
const today = new Date();
const year = today.getFullYear(); // 2026
const month = today.getMonth() + 1;
const day = today.getDate();

const bannerText = document.getElementById("bannerText");
const footerText = document.getElementById("footerText");
const bannerContainer = document.getElementById("christmasBanner");
const snowContainer = document.getElementById("snow-container"); // 修正 HTML ID

// ===============================
// 2. 最後更新日期
// ===============================
const lastUpdateEl = document.getElementById("lastUpdate");
if (lastUpdateEl) {
    lastUpdateEl.textContent = today.toLocaleDateString("zh-TW", {
        year: "numeric", month: "long", day: "numeric"
    });
}

// ===============================
// 3. 回到頂部按鈕
// ===============================
const backToTopButton = document.getElementById("backToTop");
window.addEventListener("scroll", () => {
    if (document.documentElement.scrollTop > 200) {
        backToTopButton.style.opacity = "1";
        backToTopButton.style.display = "block";
    } else {
        backToTopButton.style.display = "none";
    }
});

backToTopButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// ===============================
// 4. 複製遊戲 ID
// ===============================
function copyGameID() {
    const gameID = document.getElementById("gameID");
    if (!gameID) return;
    const idText = gameID.textContent;
    navigator.clipboard.writeText(idText).then(() => {
            showToast("已複製ID:K3Q92B，快來夢想小鎮來和我玩！");
    });
}

// ===============================
// 5. 跑馬燈邏輯 (優化版)
// ===============================
const marqueeMessages = [
  "📢公告:由於系統更新，之前的留言都被刪光了😭😭😭敬請見諒!!!",
  "🎹 最近在練：Clementi Op.36 No.1",
  "🇸🇬 新加坡之旅圓滿結束！整理照片中...", // 更新旅遊狀態
  "🛠️ 歡迎大家到留言板跟我交流",
  "📢 最新公告：節慶版面已上線！",
  "🌍 本月金句：Never put off what you can do today until tomorrow."
];

let marqueeIndex = 0;
const marqueeText = document.getElementById("marqueeText");
const marqueeElement = document.getElementById("marquee");

function updateMarquee() {
  if (marqueeText) {
    marqueeText.textContent = marqueeMessages[marqueeIndex];
    marqueeIndex = (marqueeIndex + 1) % marqueeMessages.length;
  }
}

// 確保元素存在再掛載監聽器
if (marqueeElement) {
  marqueeElement.addEventListener('animationiteration', updateMarquee);
  // 初始化第一則訊息
  updateMarquee();
}
// ===============================
// 6. 節慶與雪花特效
// ===============================
function showSnowflakes(count) {
    if (!snowContainer) return;
    snowContainer.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const snowflake = document.createElement("div");
        snowflake.className = "snowflake";
        snowflake.textContent = "❄️";
        
        const startLeft = Math.random() * 100; 
        const duration = Math.random() * 5 + 5; 
        const delay = Math.random() * 5;
        const size = Math.random() * 10 + 10;

        snowflake.style.left = `${startLeft}vw`;
        snowflake.style.animationDuration = `${duration}s`;
        snowflake.style.animationDelay = `-${delay}s`;
        snowflake.style.fontSize = `${size}px`;
        snowflake.style.opacity = Math.random();

        snowContainer.appendChild(snowflake);
    }
}

function updateFestival() {
    // 12月聖誕季
    if (month === 12) {
        if (bannerText) bannerText.textContent = "🎄 聖誕快樂！願這個季節充滿平安與喜樂 ✨";
        if (footerText) footerText.textContent = `© ${year} 小宏工作室 · Merry Christmas 🎄`;
        showSnowflakes(30);
    } 
    // 1-2月新年與寒假出國季
    else if (month === 1 || month === 2) {
        if (bannerText) {
            bannerText.textContent = (month === 1 && day < 28) 
                ? `🧧 ${year} 新年快樂！準備出發去新加坡囉 ✈️` 
                : `🦁 已平安抵台!🇸🇬`;
        }
        if (bannerContainer) bannerContainer.style.background = "linear-gradient(90deg, #d4a017, #b8860b)";
        
        // 1/1~1/5 不下雪，之後模擬冬季氛圍
        if (!(month === 1 && day <= 5)) {
            showSnowflakes(35);
        }
    } else {
        // 平時狀態
        if (bannerContainer) bannerContainer.style.display = "none";
        if (snowContainer) snowContainer.innerHTML = "";
    }
}


// 啟動節慶判定
updateFestival();
//======================================
document.getElementById("footerText").textContent =
  `© ${new Date().getFullYear()} 小宏工作室`;
// 1. 檢查是否達成全成就
const finalBadges = ["板南線數據大師", "海中尋船徽章", "尋寶徽章", "射手座徽章", "摩羯座徽章", "水瓶座徽章", "天空尋星徽章"];
const userEarned = JSON.parse(localStorage.getItem("badges") || "[]");
const isMaster = finalBadges.every(badge => userEarned.includes(badge));

if (isMaster) {
    startFireworks();
    console.log("全成就達成！啟動慶祝煙火！");
}

// 2. 煙火動畫邏輯
function startFireworks() {
    const canvas = document.getElementById('fireworksCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.velocity = {
                x: (Math.random() - 0.5) * 8,
                y: (Math.random() - 0.5) * 8
            };
            this.alpha = 1;
            this.friction = 0.95;
        }

        draw() {
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        update() {
            this.velocity.x *= this.friction;
            this.velocity.y *= this.friction;
            this.y += 0.05; // 重力
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.alpha -= 0.01;
        }
    }

    function createFirework() {
        const x = Math.random() * canvas.width;
        const y = Math.random() * (canvas.height / 2);
        const color = `hsl(${Math.random() * 360}, 50%, 50%)`;
        for (let i = 0; i < 30; i++) {
            particles.push(new Particle(x, y, color));
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p, i) => {
            if (p.alpha > 0) {
                p.update();
                p.draw();
            } else {
                particles.splice(i, 1);
            }
        });

        if (Math.random() < 0.05) createFirework(); // 控制煙火密度
    }

    animate();
}
