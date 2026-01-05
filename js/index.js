// =======================
// index.js V3.3 - 小宏留言板
// =======================

// Firebase 配置 (請確保你的 HTML 已引入 Firebase SDK)
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

// --- DOM 元素選取 ---
const loginArea = document.getElementById("loginArea");
const userArea = document.getElementById("userArea");
const userNameEl = document.getElementById("userName");
const userAvatarEl = document.getElementById("userAvatar");
const commentArea = document.getElementById("commentArea");
const commentInput = document.getElementById("commentInput");
const countEl = document.getElementById("count");
const commentsEl = document.getElementById("comments");
const imageInput = document.getElementById("imageInput");

// Modals
const profileModalEl = document.getElementById('profileModal');
const editModalEl = document.getElementById("editModal");
const editInput = document.getElementById("editInput");
const emailModalEl = document.getElementById("emailModal");

// Profile Modal 內部元素
const modalPreviewImg = document.getElementById('modalPreviewImg');
const modalFileBtn = document.getElementById('modalFileBtn');
const modalNameInput = document.getElementById('modalNameInput');
const uploadProgress = document.getElementById('uploadProgress');

// 變數控制
let lastVisible = null;
let isCooldown = false;
let editId = null;

// -----------------------
// 1. 工具函式：相對時間
// -----------------------
function timeAgo(ts) {
  if (!ts) return "剛剛";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return "剛剛";
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + " 年前";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + " 個月前";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + " 天前";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + " 小時前";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + " 分鐘前";
  return "剛剛";
}

// -----------------------
// 2. 快捷祝福 (免登入邏輯)
// -----------------------
async function postQuickComment(blessingText) {
  if (isCooldown) return;
  isCooldown = true;

  try {
    const data = {
      uid: currentUser ? currentUser.uid : "anonymous",
      name: currentUser ? (currentUser.displayName || "朋友") : "路過的匿名朋友",
      avatar: currentUser ? (currentUser.photoURL || "") : "https://cdn-icons-png.flaticon.com/512/1144/1144760.png",
      text: blessingText,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("comments").add(data);
    welcomeAnimation("感謝你的祝福！💖");
    loadComments(true);

    // 3 秒冷卻防刷
    setTimeout(() => { isCooldown = false; }, 3000);
  } catch (err) {
    console.error("發布失敗:", err);
    isCooldown = false;
  }
}

// -----------------------
// 3. 使用者資料管理
// -----------------------
function openProfileModal() {
  if (!currentUser) return;
  modalNameInput.value = currentUser.displayName || "";
  modalPreviewImg.src = currentUser.photoURL || "images/andrew.png";
  uploadProgress.classList.add("d-none");
  new bootstrap.Modal(profileModalEl).show();
}

// 預覽圖片
modalFileBtn.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => modalPreviewImg.src = ev.target.result;
    reader.readAsDataURL(file);
  }
});

async function saveProfileChanges() {
  const newName = modalNameInput.value.trim();
  const file = modalFileBtn.files[0];
  if (!newName) return alert("請輸入名字");

  try {
    uploadProgress.classList.remove("d-none");
    let finalURL = currentUser.photoURL;

    // 如果有選新圖片，上傳到 Cloudinary
    if (file) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "guest-upload");
      const res = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", { method: "POST", body: fd });
      const cloudData = await res.json();
      finalURL = cloudData.secure_url;
    }

    // 1. 更新 Firebase Auth 資料
    await currentUser.updateProfile({ displayName: newName, photoURL: finalURL });

    // 2. 更新 Firestore 中該使用者的所有舊留言 (Batch 更新)
    const batch = db.batch();
    const snap = await db.collection("comments").where("uid", "==", currentUser.uid).get();
    snap.forEach(doc => {
      batch.update(doc.ref, { name: newName, avatar: finalURL });
    });
    await batch.commit();

    bootstrap.Modal.getInstance(profileModalEl).hide();
    updateUI();
    loadComments(true);
    welcomeAnimation("個人資料已更新！");
  } catch (err) {
    alert("更新失敗：" + err.message);
  } finally {
    uploadProgress.classList.add("d-none");
  }
}

// -----------------------
// 4. 留言板核心功能
// -----------------------
async function postComment() {
  const text = commentInput.value.trim();
  if (!text || !currentUser) return;

  await db.collection("comments").add({
    uid: currentUser.uid,
    name: currentUser.displayName || currentUser.email,
    avatar: currentUser.photoURL || "",
    text: text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  commentInput.value = "";
  countEl.textContent = "0";
  loadComments(true);
}

async function loadComments(reset = false) {
  let query = db.collection("comments").orderBy("timestamp", "desc").limit(10);
  if (!reset && lastVisible) query = query.startAfter(lastVisible);

  const snapshot = await query.get();
  if (reset) { commentsEl.innerHTML = ""; lastVisible = null; }
  if (snapshot.empty) return;

  lastVisible = snapshot.docs[snapshot.docs.length - 1];

  snapshot.forEach(doc => {
    const data = doc.data();
    const displayTime = timeAgo(data.timestamp);
    const html = `
      <div class="d-flex mb-4 align-items-start" id="comment-${doc.id}">
        <img src="${data.avatar || 'https://cdn-icons-png.flaticon.com/512/1144/1144760.png'}" 
             width="45" height="45" class="rounded-circle me-3 shadow-sm border">
        <div class="flex-grow-1 border-bottom pb-3">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <strong class="text-dark">${data.name}</strong>
            <small class="text-muted">${displayTime}</small>
          </div>
          <div class="comment-content">
            ${marked.parse(DOMPurify.sanitize(data.text))}
          </div>
          ${currentUser && currentUser.uid === data.uid ? `
            <div class="mt-2 small">
              <span class="text-primary cursor-pointer me-2" onclick="editComment('${doc.id}')">編輯</span>
              <span class="text-danger cursor-pointer" onclick="deleteComment('${doc.id}')">刪除</span>
            </div>` : ""}
        </div>
      </div>`;
    commentsEl.insertAdjacentHTML("beforeend", html);
  });
}

// -----------------------
// 5. 其他功能 (登入、登出、上傳圖)
// -----------------------
function updateUI() {
  if (currentUser) {
    loginArea.classList.add("d-none");
    userArea.classList.remove("d-none");
    commentArea.classList.remove("d-none");
    userNameEl.textContent = currentUser.displayName || currentUser.email;
    userAvatarEl.src = currentUser.photoURL || "images/andrew.png";
  } else {
    loginArea.classList.remove("d-none");
    userArea.classList.add("d-none");
    commentArea.classList.add("d-none");
  }
}

async function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const res = await auth.signInWithPopup(provider);
    currentUser = res.user;
    updateUI();
    loadComments(true);
  } catch (err) { console.error(err); }
}

function logout() {
  auth.signOut().then(() => {
    currentUser = null;
    updateUI();
    loadComments(true);
  });
}

function welcomeAnimation(msg) {
  const toast = document.createElement("div");
  toast.className = "position-fixed top-0 start-50 translate-middle-x mt-3 p-3 bg-success text-white rounded shadow-lg";
  toast.style.zIndex = "9999";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// 監聽 Auth 狀態
auth.onAuthStateChanged(user => {
  currentUser = user;
  updateUI();
  loadComments(true);
});

// 監聽輸入字數
commentInput.addEventListener("input", () => {
  countEl.textContent = commentInput.value.length;
});
