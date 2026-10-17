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
if (backToTopButton) {
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
}

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
// 5. 跑馬燈邏輯 (修正逗號與優化版)
// ===============================
const marqueeMessages = [
  "賀!台南鐵路地下化於10/17通~車~",
  "台中捷運藍線動工!等了30年(哈)",  
  "慶賀新北捷運三鶯線通車!!!🎉🎉",
  "恭喜北捷新車CR381A抵台!🚇",
  "🎹 最近在練：庫勞Op.20 No.1",
  "🛠️ 歡迎大家到留言板跟我交流"
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
// 6. 全年節慶與特效
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
    const currentYear = new Date().getFullYear();
    
    // 先預設顯示橫幅容器（如果有特定節日會覆蓋樣式）
    if (bannerContainer) bannerContainer.style.display = "block";
    if (snowContainer) snowContainer.innerHTML = "";

    // 1. 1-2月：新年與寒假出國季
    if (month === 1 || month === 2) {
        if (bannerText) {
            bannerText.textContent = (month === 1 && day < 28) 
                ? `🧧 ${currentYear} 新年快樂！準備出發去新加坡囉 ✈️` 
                : `🦁 已平安抵台!🇸🇬`;
        }
        if (bannerContainer) bannerContainer.style.background = "linear-gradient(90deg, #d4a017, #b8860b)";
        if (footerText) footerText.textContent = `© ${currentYear} 小宏工作室`;
        
        if (!(month === 1 && day <= 5)) {
            showSnowflakes(35);
        }
    } 
    // 2. 4月：兒童節連假 (4/1 ~ 4/7)
    else if (month === 4 && day <= 7) {
        if (bannerText) bannerText.textContent = "🎉 兒童節快樂！童心未泯，探索無限可能！🎈";
        if (bannerContainer) bannerContainer.style.background = "linear-gradient(90deg, #ff7b93, #ffb347)";
        if (footerText) footerText.textContent = `© ${currentYear} 小宏工作室`;
    } 
    // 3. 5月：母親節 (5月第二個週日附近，約 5/1 ~ 5/14)
    else if (month === 5 && day <= 14) {
        if (bannerText) bannerText.textContent = "💐 母親節快樂！感謝媽媽一路相伴與支持 💕";
        if (bannerContainer) bannerContainer.style.background = "linear-gradient(90deg, #ff9a9e, #fecfef)";
        if (footerText) footerText.textContent = `© ${currentYear} 小宏工作室`;
    } 
    // 4. 6月：端午節 / 畢業季 (6/1 ~ 6/15)
    else if (month === 6 && day <= 15) {
        if (bannerText) bannerText.textContent = "🛶 端午節安康！祝大家佳節愉快、事事順心 🌿";
        if (bannerContainer) bannerContainer.style.background = "linear-gradient(90deg, #43e97b, #38f9d7)";
        if (footerText) footerText.textContent = `© ${currentYear} 小宏工作室`;
    } 
    // 5. 9月底 - 10月初：中秋節與國慶日 (9/20 ~ 10/12 左右可依農曆彈性，這裡用國曆日期區間)
    else if ((month === 9 && day >= 20) || (month === 10 && day <= 12)) {
        if (bannerText) {
            bannerText.textContent = (month === 10 && day <= 10) 
                ? `🇹🇼 雙十國慶快樂！普天同慶，祝台灣生日快樂 🎉` 
                : `🥮 中秋節快樂！花好月圓人團圓 ✨`;
        }
        if (bannerContainer) bannerContainer.style.background = "linear-gradient(90deg, #fa709a, #fee140)";
        if (footerText) footerText.textContent = `© ${currentYear} 小宏工作室`;
    } 
    // 6. 12月：聖誕季
    else if (month === 12) {
        if (bannerText) bannerText.textContent = "🎄 聖誕快樂！願這個季節充滿平安與喜樂 ✨";
        if (bannerContainer) bannerContainer.style.background = "linear-gradient(90deg, #1b5e20, #2e7d32)";
        if (footerText) footerText.textContent = `© ${currentYear} 小宏工作室 · Merry Christmas 🎄`;
        showSnowflakes(30);
    } 
    // 7. 平時狀態（沒有特別節日時隱藏上方橫幅）
    else {
        if (bannerContainer) bannerContainer.style.display = "none";
        if (footerText) footerText.textContent = `© ${currentYear} 小宏工作室`;
    }
}

// 啟動節慶判定
updateFestival();

// ===============================
// 7. 全成就大師煙火特效
// ===============================
const finalBadges = ["板南線數據大師", "海中尋船徽章", "尋寶徽章", "射手座徽章", "摩羯座徽章", "水瓶座徽章", "天空尋星徽章"];
const userEarned = JSON.parse(localStorage.getItem("badges") || "[]");
const isMaster = finalBadges.every(badge => userEarned.includes(badge));

let stopFireworks = false;

if (isMaster) {
    startFireworks();
    
    // 建立文字標籤
    const trophy = document.createElement("div");
    trophy.id = "master-trophy";
    trophy.innerHTML = "🏆 恭喜達成全成就大師！ 🏆";
    trophy.style = "position:fixed; top:20px; left:50%; transform:translateX(-50%); background:linear-gradient(to right, #bf953f, #fcf6ba, #b38728); color:#5d4037; padding:15px 30px; border-radius:30px; font-weight:bold; z-index:1000000; font-size:20px; box-shadow: 0 0 20px rgba(255,215,0,0.8); border: 2px solid #fff; transition: opacity 2s;";
    document.body.appendChild(trophy);

    // --- 設定 10 秒後淡出並移除 ---
    setTimeout(() => {
        trophy.style.opacity = "0";
        stopFireworks = true; 
        
        setTimeout(() => {
            trophy.remove();
            const canvas = document.getElementById('fireworksCanvas');
            if (canvas) canvas.remove();
        }, 2000);
    }, 10000);
}

function startFireworks() {
    const canvas = document.getElementById('fireworksCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    let particles = [];
    class Particle {
        constructor(x, y, color) {
            this.x = x; this.y = y; this.color = color;
            this.velocity = { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 };
            this.alpha = 1; this.friction = 0.95;
            this.gravity = 0.08;
        }
        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.beginPath(); ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = this.color; ctx.fill();
            ctx.restore();
        }
        update() {
            this.velocity.x *= this.friction;
            this.velocity.y *= this.friction;
            this.velocity.y += this.gravity;
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.alpha -= 0.01;
        }
    }

    function createFirework() {
        if (stopFireworks) return;
        const x = Math.random() * canvas.width;
        const y = Math.random() * (canvas.height * 0.6);
        const color = `hsl(${Math.random() * 360}, 100%, 60%)`;
        for (let i = 0; i < 50; i++) { particles.push(new Particle(x, y, color)); }
    }

    function animate() {
        if (!document.getElementById('fireworksCanvas')) return;
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p, i) => {
            if (p.alpha > 0) { p.update(); p.draw(); } 
            else { particles.splice(i, 1); }
        });
        if (Math.random() < 0.1) createFirework();
    }
    animate();
}
