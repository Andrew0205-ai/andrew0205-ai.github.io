// ==========================================
// 1. 初始化 Firebase 與環境變數
// ==========================================
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;
const ADMIN_UID = "mKU5cngfmNXyXupfM9XAc8MqgNU2";
const FORBIDDEN_WORDS = ["白痴", "垃圾", "靠", "死", "fuck", "shit", "北七", "笨蛋"];
let myTempId = localStorage.getItem('myTempId') || 'temp_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem('myTempId', myTempId);
let lastVisible = null;
let isCooldown = false;

// ==========================================
// 2. Toast 功能
// ==========================================
function showToast(msg, type = "success") {
    const toastContainerId = "toastContainer";
    let container = document.getElementById(toastContainerId);
    if (!container) {
        container = document.createElement("div");
        container.id = toastContainerId;
        container.className = "position-fixed top-0 end-0 p-3";
        container.style.zIndex = "11000";
        document.body.appendChild(container);
    }
    const toastEl = document.createElement("div");
    toastEl.className = `toast align-items-center text-bg-${type} border-0 mb-2`;
    toastEl.setAttribute("role", "alert");
    toastEl.setAttribute("aria-live", "assertive");
    toastEl.setAttribute("aria-atomic", "true");
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${msg}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    container.appendChild(toastEl);
    const bsToast = new bootstrap.Toast(toastEl, { delay: 2500 });
    bsToast.show();
}

// ==========================================
// 3. 核心功能：留言板邏輯 (發布/讀取/過濾)
// ==========================================
function hasBadWords(text) {
    const lowText = text.toLowerCase();
    return FORBIDDEN_WORDS.some(word => lowText.includes(word));
}

async function postComment() {
    const input = document.getElementById("commentInput");
    const text = input.value.trim();
    if (!text || isCooldown) return;
    if (hasBadWords(text)) return showToast("⚠️ 留言包含不當字眼！", "danger");
    saveComment(text, false);
}

async function postQuickComment(msg) {
    if (isCooldown) return;
    saveComment(msg, true);
}

async function saveComment(text, isQuick) {
    isCooldown = true;

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
        showToast("留言成功！💖");
        loadComments(true);
        setTimeout(() => { isCooldown = false; }, 3000);
    } catch (e) {
        console.error(e);
        showToast("發布失敗，請檢查權限。", "danger");
        isCooldown = false;
    }
}

// ==========================================
// 外部連結跳轉保護
// ==========================================
function transformLinks(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    const allowedDomains = [
        "andrew0205-ai.github.io",
        "andrew0205blogs.blogspot.com"
    ];
    div.querySelectorAll("a").forEach(a => {
        try {
            const href = new URL(a.href, location.origin);
            if (href.hostname !== location.hostname && !allowedDomains.includes(href.hostname)) {
                a.href = `redirect.html?url=${encodeURIComponent(a.href)}`;
                a.target = "_blank";
                a.rel = "noopener noreferrer";
            }
        } catch {}
    });
    return div.innerHTML;
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

        const sanitized = marked.parse(DOMPurify.sanitize(d.text));
        const safeHtml = transformLinks(sanitized);

        const html = `
            <div class="d-flex mb-4" id="comment-${id}" data-uid="${d.uid}">
                <img src="${d.avatar}" width="50" height="50" class="rounded-circle me-3 border shadow-sm">
                <div class="flex-grow-1 border-bottom pb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <strong>${d.name} ${d.uid === ADMIN_UID ? '<span class="badge bg-danger">板主</span>' : ''}</strong>
                        <small class="text-muted">${d.timestamp ? new Date(d.timestamp.toDate()).toLocaleString() : '剛剛'}</small>
                    </div>
                    <div class="mt-2 text-dark">${safeHtml}</div>
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
// 編輯 / 刪除留言
// ==========================================
async function deleteComment(id) {
    if (!confirm("確定要刪除此留言嗎？")) return;
    try {
        await db.collection("comments").doc(id).delete();
        document.getElementById(`comment-${id}`).remove();
        showToast("留言已刪除 🗑️");
    } catch (e) {
        console.error(e);
        showToast("刪除失敗", "danger");
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
    if (!text) return showToast("留言不可空白！", "danger");
    try {
        await db.collection("comments").doc(currentEditId).update({ text });
        document.getElementById(`comment-${currentEditId}`).querySelector("div.mt-2").innerHTML =
            marked.parse(DOMPurify.sanitize(text));
        bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
        showToast("留言已更新 ✏️");
    } catch (e) {
        console.error(e);
        showToast("更新失敗", "danger");
    }
}

// ==========================================
// 使用者資料編輯 & 頭像更新
// ==========================================
let profileModal, profileNameInput, profileAvatarInput, profileAvatarUrl = null;
document.addEventListener("DOMContentLoaded", () => {
    profileModal = new bootstrap.Modal(document.getElementById("profileModal"));
    profileNameInput = document.getElementById("modalNameInput");
    profileAvatarInput = document.getElementById("modalFileBtn");
    const previewImg = document.getElementById("modalPreviewImg");
    if (profileAvatarInput && previewImg) {
        profileAvatarInput.addEventListener("change", () => {
            const file = profileAvatarInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = e => { previewImg.src = e.target.result; };
            reader.readAsDataURL(file);
            profileAvatarUrl = null;
            showToast("已選擇新頭像 👀");
        });
    }
});

async function openProfileModal() {
    if (!currentUser) return showToast("請先登入", "danger");
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
        showToast("讀取資料失敗", "danger");
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

        showToast("資料已更新 💜");
        profileModal.hide();
        updateUserCommentsUI(currentUser.uid, name, avatarUrl);
        document.getElementById("userName").textContent = name;
        document.getElementById("userAvatar").src = avatarUrl;
    } catch (err) {
        console.error(err);
        showToast("儲存失敗", "danger");
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
        if (commentEl.datasetUid === uid) {
            const imgEl = commentEl.querySelector("img");
            const nameEl = commentEl.querySelector("strong");
            if (!imgEl || !nameEl) return;
            imgEl.src = avatar;
            nameEl.textContent = name;
        }
    });
}

// ==========================================
// Email Modal 功能 (登入/註冊/重設)
// ==========================================
function openEmailModal(mode) {
    const modalEl = document.getElementById("emailModal");
    const modal = new bootstrap.Modal(modalEl);
    const title = document.getElementById("emailModalTitle");
    const passwordRow = document.getElementById("passwordRow");
    const nameRow = document.getElementById("nameRow");
    const avatarRow = document.getElementById("avatarRow");
    const emailError = document.getElementById("emailError");
    emailError.classList.add("d-none");

    if (mode === "login") {
        title.textContent = "Email 登入";
        passwordRow.style.display = "block";
        nameRow.style.display = "none";
        avatarRow.style.display = "none";
    } else if (mode === "signup") {
        title.textContent = "Email 註冊";
        passwordRow.style.display = "block";
        nameRow.style.display = "block";
        avatarRow.style.display = "block";
    } else if (mode === "reset") {
        title.textContent = "重設密碼";
        passwordRow.style.display = "none";
        nameRow.style.display = "none";
        avatarRow.style.display = "none";
    }

    modal.show();
}

async function submitEmailAuth() {
    const email = document.getElementById("emailInput").value.trim();
    const password = document.getElementById("passwordInput").value;
    const name = document.getElementById("nameInput").value.trim();
    const avatarFile = document.getElementById("avatarInput").files[0];
    const emailError = document.getElementById("emailError");
    emailError.classList.add("d-none");

    const modalTitle = document.getElementById("emailModalTitle").textContent;
    try {
        if (modalTitle.includes("登入")) {
            await auth.signInWithEmailAndPassword(email, password);
            showToast("登入成功！");
            bootstrap.Modal.getInstance(document.getElementById("emailModal")).hide();
        } else if (modalTitle.includes("註冊")) {
            const res = await auth.createUserWithEmailAndPassword(email, password);
            let avatarUrl = null;
            if (avatarFile) avatarUrl = await uploadAvatarToCloudinary(avatarFile);
            await db.collection("users").doc(res.user.uid).set({
                name: name || "新朋友",
                avatar: avatarUrl || "images/andrew.png",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast("註冊成功！");
            bootstrap.Modal.getInstance(document.getElementById("emailModal")).hide();
        } else if (modalTitle.includes("重設")) {
            await auth.sendPasswordResetEmail(email);
            showToast("重設密碼信件已送出 ✉️");
            bootstrap.Modal.getInstance(document.getElementById("emailModal")).hide();
        }
    } catch (err) {
        console.error(err);
        emailError.textContent = err.message;
        emailError.classList.remove("d-none");
    }
}

// ==========================================
// 圖片上傳功能 (留言內)
// ==========================================
async function uploadImage() {
    const fileInput = document.getElementById("imageInput");
    fileInput.click();
    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file || file.size > 5 * 1024 * 1024) return showToast("檔案太大！請選擇 5MB 以下的圖片。", "danger");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "guest-upload");

        try {
            showToast("圖片傳送中... ☁️");
            const res = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", { method: "POST", body: formData });
            const data = await res.json();
            const input = document.getElementById("commentInput");
            input.value += `\n![圖片](${data.secure_url})\n`;
            document.getElementById("count").textContent = input.value.length;
            showToast("圖片上傳成功！📸");
        } catch (e) {
            console.error(e);
            showToast("上傳失敗", "danger");
        }
    };
}

// ==========================================
// 8. 字數監聽 & backToTop
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

// ==========================================
// 6. 初始化與 Auth 監聽
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

// 初始載入
document.addEventListener("DOMContentLoaded", () => {
    loadComments(true);
});
