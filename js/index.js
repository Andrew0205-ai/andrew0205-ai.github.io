// =======================
// index.js V3.2 - 小宏留言板
// =======================
console.log("📢 index.js V3.2 運作中 (相對時間優化版)......");

// -----------------------
// Firebase 初始化
// -----------------------
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

// -----------------------
// DOM 變數
// -----------------------
const loginArea = document.getElementById("loginArea");
const userArea = document.getElementById("userArea");
const userNameEl = document.getElementById("userName");
const userAvatarEl = document.getElementById("userAvatar");
const commentArea = document.getElementById("commentArea");
const commentInput = document.getElementById("commentInput");
const countEl = document.getElementById("count");
const commentsEl = document.getElementById("comments");
const imageInput = document.getElementById("imageInput");
const editModalEl = document.getElementById("editModal");
const editInput = document.getElementById("editInput");
const emailModalEl = document.getElementById("emailModal");
const emailModalTitle = document.getElementById("emailModalTitle");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const nameInput = document.getElementById("nameInput");
const avatarInput = document.getElementById("avatarInput");
const emailError = document.getElementById("emailError");

// --- 個人資料 Modal 專用 DOM ---
const profileModalEl = document.getElementById('profileModal');
const modalPreviewImg = document.getElementById('modalPreviewImg');
const modalFileBtn = document.getElementById('modalFileBtn');
const modalNameInput = document.getElementById('modalNameInput');
const uploadProgress = document.getElementById('uploadProgress');

let emailMode = "login";
let editId = null;
let lastVisible = null;

// -----------------------
// 工具函式：相對時間計算
// -----------------------
function timeAgo(ts) {
  if (!ts) return "剛剛";
  // Firestore timestamp 轉 JS Date
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

function showEmailError(msg) {
  emailError.textContent = msg;
  emailError.classList.remove("d-none");
  setTimeout(() => emailError.classList.add("d-none"), 4000);
}

function welcomeAnimation(msg) {
  const toast = document.createElement("div");
  toast.className = "position-fixed top-0 start-50 translate-middle-x mt-3 p-3 bg-success text-white rounded shadow";
  toast.style.zIndex = "9999";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

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

// -----------------------
// 個人資料管理
// -----------------------
function openProfileModal() {
  if (!currentUser) return;
  modalNameInput.value = currentUser.displayName || "";
  modalPreviewImg.src = currentUser.photoURL || "images/andrew.png";
  if (uploadProgress) uploadProgress.classList.add("d-none");
  const modal = new bootstrap.Modal(profileModalEl);
  modal.show();
}

if (modalFileBtn) {
  modalFileBtn.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => modalPreviewImg.src = event.target.result;
      reader.readAsDataURL(file);
    }
  });
}

async function saveProfileChanges() {
  const newName = modalNameInput.value.trim();
  const file = modalFileBtn.files[0];
  if (!newName) return alert("請輸入名字");

  try {
    if (uploadProgress) uploadProgress.classList.remove("d-none");
    let finalPhotoURL = currentUser.photoURL;

    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "guest-upload");
      const res = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      finalPhotoURL = data.secure_url;
    }

    await currentUser.updateProfile({ displayName: newName, photoURL: finalPhotoURL });

    const batch = db.batch();
    const userComments = await db.collection("comments").where("uid", "==", currentUser.uid).get();
    userComments.forEach(doc => {
      batch.update(doc.ref, { name: newName, avatar: finalPhotoURL });
    });
    await batch.commit();

    bootstrap.Modal.getInstance(profileModalEl).hide();
    updateUI();
    loadComments(true);
    welcomeAnimation("資料更新成功！");
  } catch (err) {
    alert("更新失敗：" + err.message);
  } finally {
    if (uploadProgress) uploadProgress.classList.add("d-none");
  }
}

// -----------------------
// 登入功能
// -----------------------
async function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const res = await auth.signInWithPopup(provider);
    currentUser = res.user;
    updateUI();
    welcomeAnimation(`歡迎回來，${currentUser.displayName} 👋`);
  } catch (err) { console.error(err); }
}

function logout() {
  auth.signOut();
  currentUser = null;
  updateUI();
}

function openEmailModal(mode) {
  emailMode = mode;
  emailModalTitle.textContent = mode === "login" ? "Email 登入" : mode === "signup" ? "註冊新帳號" : "忘記密碼";
  document.getElementById("nameRow").style.display = mode === "signup" ? "block" : "none";
  document.getElementById("avatarRow").style.display = mode === "signup" ? "block" : "none";
  document.getElementById("passwordRow").style.display = mode === "reset" ? "none" : "block";
  new bootstrap.Modal(emailModalEl).show();
}

async function submitEmailAuth() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const name = nameInput.value.trim();
  const avatarFile = avatarInput.files[0];

  try {
    if (emailMode === "login") {
      const res = await auth.signInWithEmailAndPassword(email, password);
      currentUser = res.user;
    } else if (emailMode === "signup") {
      const res = await auth.createUserWithEmailAndPassword(email, password);
      currentUser = res.user;
      let avatarURL = "";
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        formData.append("upload_preset", "guest-upload"); 
        const cloudRes = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", { method: "POST", body: formData });
        const data = await cloudRes.json();
        avatarURL = data.secure_url;
      }
      await currentUser.updateProfile({ displayName: name || "新朋友", photoURL: avatarURL || "" });
    } else if (emailMode === "reset") {
      await auth.sendPasswordResetEmail(email);
      showEmailError("重設信已寄出！");
      return;
    }
    bootstrap.Modal.getInstance(emailModalEl).hide();
    updateUI();
    welcomeAnimation(`成功登入！`);
  } catch (err) { showEmailError(err.message); }
}

// -----------------------
// 留言板核心邏輯
// -----------------------
commentInput.addEventListener("input", () => { countEl.textContent = commentInput.value.length; });

async function uploadImage() { imageInput.click(); }

imageInput.addEventListener("change", async () => {
  const file = imageInput.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "guest-upload");
  const res = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", { method: "POST", body: formData });
  const data = await res.json();
  commentInput.value += `![](${data.secure_url})\n`;
  countEl.textContent = commentInput.value.length;
});

async function postComment() {
  if (!currentUser) return showEmailError("請先登入！");
  const text = commentInput.value.trim();
  if (!text) return;
  await db.collection("comments").add({
    uid: currentUser.uid,
    name: currentUser.displayName || currentUser.email,
    avatar: currentUser.photoURL || "",
    text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
  commentInput.value = "";
  countEl.textContent = 0;
  loadComments(true);
}

async function loadComments(reset = false) {
  let query = db.collection("comments").orderBy("timestamp", "desc").limit(10);
  if (!reset && lastVisible) query = query.startAfter(lastVisible);
  const snapshot = await query.get();
  
  if (reset) {
    commentsEl.innerHTML = "";
    lastVisible = null;
  }
  
  if (snapshot.empty) return;
  lastVisible = snapshot.docs[snapshot.docs.length - 1];

  snapshot.forEach(doc => {
    const data = doc.data();
    const id = doc.id;
    // 使用相對時間
    const displayTime = timeAgo(data.timestamp);

    const html = `
      <div class="d-flex mb-3 align-items-start" id="comment-${id}">
        <img src="${data.avatar || 'images/andrew.png'}" width="40" height="40" class="rounded-circle me-3 shadow-sm border">
        <div class="flex-grow-1 border-bottom pb-3">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <strong class="text-dark">${data.name}</strong>
            <small class="text-muted" style="font-size: 0.75rem;">${displayTime}</small>
          </div>
          <div class="comment-content text-secondary">
            ${marked.parse(DOMPurify.sanitize(data.text))}
          </div>
          ${currentUser && currentUser.uid === data.uid ? `
            <div class="mt-2">
              <span class="text-primary cursor-pointer me-2 small" onclick="editComment('${id}')">編輯</span>
              <span class="text-danger cursor-pointer small" onclick="deleteComment('${id}')">刪除</span>
            </div>` : ""}
        </div>
      </div>`;
    commentsEl.insertAdjacentHTML("beforeend", html);
  });
}

function editComment(id) {
  editId = id;
  const contentEl = document.querySelector(`#comment-${id} .comment-content`);
  // 取得純文字內容 (去除 HTML)
  editInput.value = contentEl.textContent.trim();
  new bootstrap.Modal(editModalEl).show();
}

async function saveEdit() {
  if (!editId) return;
  await db.collection("comments").doc(editId).update({ text: editInput.value.trim() });
  bootstrap.Modal.getInstance(editModalEl).hide();
  loadComments(true);
}

async function deleteComment(id) {
  if (!currentUser || !confirm("確定要刪除這條留言嗎？")) return;
  const doc = await db.collection("comments").doc(id).get();
  if (doc.exists && doc.data().uid === currentUser.uid) {
    await db.collection("comments").doc(id).delete();
    document.getElementById(`comment-${id}`).remove();
    welcomeAnimation("留言已刪除");
  }
}

// -----------------------
// 初始載入
// -----------------------
auth.onAuthStateChanged(user => {
  currentUser = user;
  updateUI();
  loadComments(true);
});
