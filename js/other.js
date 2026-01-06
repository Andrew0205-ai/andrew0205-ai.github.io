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
        alert("小宏：已複製遊戲 ID " + idText + "，快來夢想小鎮找我玩！");
    });
}

// ===============================
// 5. 跑馬燈邏輯
// ===============================
const marqueeMessages = [
    "🎹 最近在練：Clementi Op.36 No.1",
    "🛠️ 網站留言板功能已完成",
    "🇸🇬 正在規劃寒假新加坡城市探索之旅",
    "📢 最新公告：節慶版面已上線！"
];

let marqueeIndex = 0;
const marqueeText = document.getElementById("marqueeText");

function showNextMarquee() {
    if (!marqueeText) return;
    // 簡單淡出切換
    marqueeText.style.opacity = 0;
    setTimeout(() => {
        marqueeText.textContent = marqueeMessages[marqueeIndex];
        marqueeIndex = (marqueeIndex + 1) % marqueeMessages.length;
        marqueeText.style.opacity = 1;
    }, 500);
}

if (marqueeText) {
    showNextMarquee();
    setInterval(showNextMarquee, 8000);
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
        snowflake.textContent = "❄";
        
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
            bannerText.textContent = (month === 1 && day < 20) 
                ? `🧧 ${year} 新年快樂！準備出發去新加坡囉 ✈️` 
                : `🦁 小宏的新加坡城市探索進行中！🇸🇬`;
        }
        if (bannerContainer) bannerContainer.style.background = "linear-gradient(90deg, #d4a017, #b8860b)";
        
        // 1/1~1/5 不下雪，之後模擬冬季氛圍
        if (!(month === 1 && day <= 5)) {
            showSnowflakes(20);
        }
    } else {
        // 平時狀態
        if (bannerContainer) bannerContainer.style.display = "none";
        if (snowContainer) snowContainer.innerHTML = "";
    }
}


// 啟動節慶判定
updateFestival();
