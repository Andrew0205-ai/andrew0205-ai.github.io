// ==========================================
// 1. 初始化 Firebase 與環境變數
// ==========================================
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

const ADMIN_UID = "mKU5cngfmNXyXupfM9XAc8MqgNU2"; 
const FORBIDDEN_WORDS = ["白痴", "垃圾", "靠", "死", "fuck", "shit" , "北七" , "笨蛋"];

// 匿名者身分證 (LocalStorage)
let myTempId = localStorage.getItem('myTempId') || 'temp_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem('myTempId', myTempId);

let lastVisible = null;
let isCooldown = false;
let profileModal;

// ==========================================
// 2. 核心功能：留言板邏輯 (發布/讀取/過濾)
// ==========================================
function hasBadWords(text) {
    const lowText = text.toLowerCase();
    return FORBIDDEN_WORDS.some(word => lowText.includes(word));
}

async function postComment() {
    const input = document.getElementById("commentInput");
    const text = input.value.trim();
    if (!text || isCooldown) return;
    if (hasBadWords(text)) return alert("⚠️ 留言包含不當字眼喔！");
    
    saveComment(text, false);
}

async function postQuickComment(msg) {
    if (isCooldown) return;
    saveComment(msg, true);
}

async function saveComment(text, isQuick) {
    isCooldown = true;
    const data = {
        uid: currentUser ? currentUser.uid : "anonymous",
        authorTempId: currentUser ? "member" : myTempId,
        name: currentUser ? (currentUser.displayName || "朋友") : "路過的匿名朋友",
        avatar: currentUser ? (currentUser.photoURL || "images/andrew.png") : "https://cdn-icons-png.flaticon.com/512/1144/1144760.png",
        text: text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("comments").add(data);
        if (!isQuick) {
            document.getElementById("commentInput").value = "";
            document.getElementById("count").textContent = "0";
        }
        welcomeAnimation("留言成功！💖");
        loadComments(true);
        setTimeout(() => { isCooldown = false; }, 3000); // 3秒冷卻
    } catch (e) {
        alert("發布失敗，請檢查權限。");
        isCooldown = false;
    }
}

async function loadComments(reset = false) {
    let query = db.collection("comments").orderBy("timestamp", "desc").limit(10);
    if (!reset && lastVisible) query = query.startAfter(lastVisible);

    const snap = await query.get();
    const commentsEl = document.getElementById("comments");
    if (reset) { commentsEl.innerHTML = ""; lastVisible = null; }
    if (snap.empty) return;
    lastVisible = snap.docs[snap.docs.length - 1];

    snap.forEach(doc => {
        const d = doc.data();
        const id = doc.id;
        // 權限判斷
        const canManage = (currentUser && (currentUser.uid === ADMIN_UID || currentUser.uid === d.uid)) || 
                          (!currentUser && d.authorTempId === myTempId);

        const html = `
            <div class="d-flex mb-4" id="comment-${id}">
                <img src="${d.avatar}" width="50" height="50" class="rounded-circle me-3 border shadow-sm">
                <div class="flex-grow-1 border-bottom pb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <strong>${d.name} ${d.uid === ADMIN_UID ? '<span class="badge bg-danger">板主</span>' : ''}</strong>
                        <small class="text-muted">${d.timestamp ? new Date(d.timestamp.toDate()).toLocaleString() : '剛剛'}</small>
                    </div>
                    <div class="mt-2 text-dark">${marked.parse(DOMPurify.sanitize(d.text))}</div>
                    ${canManage ? `
                        <div class="mt-2 small">
                            <span class="text-primary cursor-pointer me-2" onclick="editComment('${id}')">編輯</span>
                            <span class="text-danger cursor-pointer" onclick="deleteComment('${id}')">刪除</span>
                        </div>` : ""}
                </div>
            </div>`;
        commentsEl.insertAdjacentHTML("beforeend", html);
    });
}

// ==========================================
// 3. 圖片上傳與個人資料更新
// ==========================================
async function uploadImage() {
    const fileInput = document.getElementById("imageInput");
    fileInput.click();
    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file || file.size > 5 * 1024 * 1024) return alert("檔案太大了！請選擇 5MB 以下的圖片。");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "guest-upload"); 

        try {
            welcomeAnimation("圖片傳送中... ☁️");
            const res = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", { method: "POST", body: formData });
            const data = await res.json();
            const input = document.getElementById("commentInput");
            input.value += `\n![圖片](${data.secure_url})\n`;
            document.getElementById("count").textContent = input.value.length;
            welcomeAnimation("圖片上傳成功！📸");
        } catch (e) { alert("上傳失敗"); }
    };
}

async function saveProfileChanges() {
    const newName = document.getElementById("modalNameInput").value.trim();
    const avatarFile = document.getElementById("modalFileBtn").files[0];
    const progress = document.getElementById("uploadProgress");

    if (!newName || !currentUser) return;
    if (progress) progress.classList.remove("d-none");

    try {
        let photoURL = currentUser.photoURL;
        if (avatarFile) {
            const formData = new FormData();
            formData.append("file", avatarFile);
            formData.append("upload_preset", "guest-upload");
            const res = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", { method: "POST", body: formData });
            const data = await res.json();
            photoURL = data.secure_url;
        }

        await currentUser.updateProfile({ displayName: newName, photoURL: photoURL });
        updateUI();
        profileModal.hide();
        welcomeAnimation("資料更新成功，小宏！");
    } catch (e) { alert("更新失敗"); }
    if (progress) progress.classList.add("d-none");
}

// ==========================================
// 4. 初始化與 Auth 監聽
// ==========================================
function updateUI() {
    const loginArea = document.getElementById("loginArea");
    const userArea = document.getElementById("userArea");
    const commentArea = document.getElementById("commentArea");
    
    if (currentUser) {
        loginArea.classList.add("d-none");
        userArea.classList.remove("d-none");
        commentArea.classList.remove("d-none");
        document.getElementById("userName").textContent = currentUser.displayName || "新朋友";
        document.getElementById("userAvatar").src = currentUser.photoURL || "images/andrew.png";
    } else {
        loginArea.classList.remove("d-none");
        userArea.classList.add("d-none");
        commentArea.classList.add("d-none");
    }
}

auth.onAuthStateChanged(user => {
    currentUser = user;
    updateUI();
    loadComments(true);
});

document.addEventListener('DOMContentLoaded', () => {
    // 取得最後更新日期
    const lastUpdate = document.getElementById("lastUpdate");
    if (lastUpdate) lastUpdate.textContent = new Date().toLocaleDateString("zh-TW");
    
    // 初始化 Modal
    const modalEl = document.getElementById('profileModal');
    if (modalEl) profileModal = new bootstrap.Modal(modalEl);

    // 字數監聽
    const commentInput = document.getElementById("commentInput");
    if (commentInput) {
        commentInput.addEventListener("input", function() {
            document.getElementById("count").textContent = this.value.length;
        });
    }
});

function openProfileModal() { if (profileModal) profileModal.show(); }
function logout() { auth.signOut(); }
async function googleLogin() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }

function welcomeAnimation(msg) {
    const t = document.createElement("div");
    t.className = "position-fixed top-0 start-50 translate-middle-x mt-3 p-3 bg-success text-white rounded shadow-lg";
    t.style.zIndex = "10000";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}
