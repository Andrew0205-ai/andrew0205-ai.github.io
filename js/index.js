// ==========================================
// 1. 初始化 Firebase 與環境變數
// ==========================================
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

const ADMIN_UID = "mKU5cngfmNXyXupfM9XAc8MqgNU2";
const FORBIDDEN_WORDS = ["白痴", "垃圾", "靠", "死", "fuck", "shit", "北七", "笨蛋"];

// 匿名者身分證 (LocalStorage)
let myTempId = localStorage.getItem('myTempId') || 'temp_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem('myTempId', myTempId);

let lastVisible = null;
let isCooldown = false;

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
    if (hasBadWords(text)) return alert("⚠️ 留言包含不當字眼！");

    saveComment(text, false);
}

async function postQuickComment(msg) {
    if (isCooldown) return;
    saveComment(msg, true);
}

async function saveComment(text, isQuick) {
    isCooldown = true;

    // 取得最新使用者資料
    let userData = { name: "路過的匿名朋友", avatar: "https://cdn-icons-png.flaticon.com/512/1144/1144760.png", uid: "anonymous" };
    if (currentUser) {
        const doc = await db.collection("users").doc(currentUser.uid).get();
        if (doc.exists) {
            const data = doc.data();
            userData.name = data.name || "朋友";
            userData.avatar = data.avatar || "images/andrew.png";
        } else {
            userData.name = currentUser.displayName || "朋友";
            userData.avatar = currentUser.photoURL || "images/andrew.png";
        }
        userData.uid = currentUser.uid;
    }

    const data = {
        uid: userData.uid,
        authorTempId: currentUser ? "member" : myTempId,
        name: userData.name,
        avatar: userData.avatar,
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
        setTimeout(() => { isCooldown = false; }, 3000);
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

async function deleteComment(id) {
    if (!confirm("確定要刪除此留言嗎？")) return;
    try {
        await db.collection("comments").doc(id).delete();
        document.getElementById(`comment-${id}`).remove();
        welcomeAnimation("留言已刪除 🗑️");
    } catch (e) {
        alert("刪除失敗");
    }
}

let currentEditId = null;
function editComment(id) {
    const el = document.getElementById(`comment-${id}`);
    const text = el.querySelector("div.mt-2").innerText;
    currentEditId = id;
    document.getElementById("editInput").value = text;
    const editModalEl = document.getElementById("editModal");
    const modal = new bootstrap.Modal(editModalEl);
    modal.show();
}

async function saveEdit() {
    const text = document.getElementById("editInput").value.trim();
    if (!text) return alert("留言不可空白！");
    try {
        await db.collection("comments").doc(currentEditId).update({ text });
        document.getElementById(`comment-${currentEditId}`).querySelector("div.mt-2").innerHTML =
            marked.parse(DOMPurify.sanitize(text));
        bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
        welcomeAnimation("留言已更新 ✏️");
    } catch (e) {
        alert("更新失敗");
    }
}

// ==========================================
// 3. 圖片上傳
// ==========================================
async function uploadImage() {
    const fileInput = document.getElementById("imageInput");
    fileInput.click();
    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file || file.size > 5 * 1024 * 1024) return alert("檔案太大！請選擇 5MB 以下的圖片。");

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

// ==========================================
// 4. 使用者資料編輯功能
// ==========================================
let profileModal, profileNameInput, profileAvatarInput, profileAvatarUrl = null

document.addEventListener("DOMContentLoaded", () => {
    profileModal = new bootstrap.Modal(document.getElementById("profileModal"));
    profileNameInput = document.getElementById("modalNameInput");
    profileAvatarInput = document.getElementById("modalFileBtn");
})

async function openProfileModal() {
    if (!currentUser) return alert("請先登入");
    try {
        const doc = await db.collection("users").doc(currentUser.uid).get();
        if (doc.exists) {
            const data = doc.data();
            profileNameInput.value = data.name || "";
            profileAvatarUrl = data.avatar || null;
        } else {
            profileNameInput.value = currentUser.displayName || "";
            profileAvatarUrl = currentUser.photoURL || null;
        }
        profileModal.show();
    } catch (err) {
        console.error(err);
        alert("讀取資料失敗");
    }
}

async function saveProfileChanges() {
    if (!currentUser) return;
    try {
        let avatarUrl = profileAvatarUrl;
        const file = profileAvatarInput.files[0];
        if (file) avatarUrl = await uploadAvatarToCloudinary(file);
        const name = profileNameInput.value.trim();
        await db.collection("users").doc(currentUser.uid).set({
            name, avatar: avatarUrl, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        welcomeAnimation("資料已更新 💜");
        profileModal.hide();
        // 更新所有留言的頭像與名稱
        updateUserCommentsUI(currentUser.uid, name, avatarUrl);
        // 更新右上角個人區
        document.getElementById("userName").textContent = name;
        document.getElementById("userAvatar").src = avatarUrl;
    } catch (err) {
        console.error(err);
        alert("儲存失敗");
    }
}

async function uploadAvatarToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "guest-upload");
    const res = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url;
}

function updateUserCommentsUI(uid, name, avatar) {
    document.querySelectorAll(`#comments div[id^="comment-"]`).forEach(commentEl => {
        const imgEl = commentEl.querySelector("img");
        const nameEl = commentEl.querySelector("strong");
        if (!imgEl || !nameEl) return;
        const commentUid = commentEl.querySelector("strong").textContent.includes("板主") ? ADMIN_UID : commentEl.id;
        // 以 Firebase 的 UID 為準
        if (commentEl.id && commentEl.datasetUid === uid) {
            imgEl.src = avatar;
            nameEl.textContent = name;
        }
    });
}

// ==========================================
// 5. 初始化與 Auth 監聽
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
})

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

// ==========================================
// 6. 字數監聽 & backToTop
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const commentInput = document.getElementById("commentInput");
    if (commentInput) {
        commentInput.addEventListener("input", function() {
            document.getElementById("count").textContent = this.value.length;
        });
    }

    const backBtn = document.getElementById("backToTop");
    if (backBtn) {
        backBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
});