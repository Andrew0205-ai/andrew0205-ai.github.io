// ===============================
// 1. Initialization & Global Variables
// ===============================
const today = new Date();
const year = today.getFullYear(); // 2026
const month = today.getMonth() + 1;
const day = today.getDate();

const bannerText = document.getElementById("bannerText");
const footerText = document.getElementById("footerText");
const bannerContainer = document.getElementById("christmasBanner");
const snowContainer = document.getElementById("snow-container"); // Fixed HTML ID

// ===============================
// 2. Last Updated Date
// ===============================
const lastUpdateEl = document.getElementById("lastUpdate");
if (lastUpdateEl) {
    lastUpdateEl.textContent = today.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

// ===============================
// 3. Back To Top Button
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
// 4. Copy Game ID
// ===============================
function copyGameID() {
    const gameID = document.getElementById("gameID");
    if (!gameID) return;

    const idText = gameID.textContent;
    navigator.clipboard.writeText(idText).then(() => {
        showToast("ID copied: K3Q92B, come play with me in Township!");
    });
}

// ===============================
// 5. Marquee Logic
// ===============================
const marqueeMessages = [
    "🎹 Currently practicing: Clementi Op.36 No.1",
    "🛠️ Website comment system completed",
    "🇸🇬 Planning a winter trip to explore Singapore",
    "📢 Latest announcement: Festival theme is now online!",
    "🌍 Idiom of the month: A miss is as good as a mile."
];

let marqueeIndex = 0;
const marqueeText = document.getElementById("marqueeText");

function showNextMarquee() {
    if (!marqueeText) return;

    // Simple fade transition
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
// 6. Festival & Snow Effect
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
    // December: Christmas season
    if (month === 12) {
        if (bannerText) {
            bannerText.textContent = "🎄 Merry Christmas! May this season be filled with peace and joy ✨";
        }
        if (footerText) {
            footerText.textContent = `© ${year} Andrew's Studio · Merry Christmas 🎄`;
        }
        showSnowflakes(30);
    } 
    // January–February: New Year & winter travel season
    else if (month === 1 || month === 2) {
        if (bannerText) {
            bannerText.textContent =
                (month === 1 && day < 20)
                    ? `🧧 Happy New Year ${year}! Getting ready to head to Singapore ✈️`
                    : `🦁 Andrew's Singapore city exploration in progress! 🇸🇬`;
        }

        if (bannerContainer) {
            bannerContainer.style.background = "linear-gradient(90deg, #d4a017, #b8860b)";
        }

        // No snow from Jan 1–5, snow effect starts afterwards
        if (!(month === 1 && day <= 5)) {
            showSnowflakes(35);
        }
    } 
    else {
        // Normal state
        if (bannerContainer) bannerContainer.style.display = "none";
        if (snowContainer) snowContainer.innerHTML = "";
    }
}

// Start festival detection
updateFestival();
