// ==========================================
// 0. 網域跳轉保護 (Redirect 外部網站)
// ==========================================
(function(){
  const allowedDomains = [
    "andrew0205-ai.github.io",
    "andrew0205blogs.blogspot.com"
  ];
  const currentDomain = window.location.hostname;
  if (!allowedDomains.includes(currentDomain)) {
    const url = encodeURIComponent(window.location.href);
    window.location.href = `redirect.html?url=${url}`;
  }
})();

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
// ⭐ Redirect 工具
// ==========================================
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function redirectTo(url) {
  if (!url) return;
  window.location.href = url;
}

const REDIRECT_AFTER_LOGIN = getQueryParam("redirect"); 
const REDIRECT_AFTER_LOGOUT = "index.html";

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
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  container.appendChild(toastEl);

  const bsToast = new bootstrap.Toast(toastEl, { delay: 2500 });
  bsToast.show();
}

// ==========================================
// 3. 留言板功能
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

  let userData = { 
    name: "路過的匿名朋友", 
    avatar: "https://cdn-icons-png.flaticon.com/512/1144/1144760.png", 
    uid: "anonymous" 
  };

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
    text,
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
    setTimeout(() => isCooldown = false, 3000);
  } catch (e) {
    console.error(e);
    showToast("發布失敗", "danger");
    isCooldown = false;
  }
}

async function loadComments(reset = false) {
  const commentsEl = document.getElementById("comments");
  if (reset) {
    lastVisible = null;
    commentsEl.innerHTML = "";
  }

  let query = db.collection("comments").orderBy("timestamp", "desc").limit(10);
  if (lastVisible) query = query.startAfter(lastVisible);

  const snap = await query.get();
  if (snap.empty) return;
  lastVisible = snap.docs[snap.docs.length - 1];

  snap.forEach(doc => {
    const d = doc.data();
    const id = doc.id;
    const canManage =
      (currentUser && (currentUser.uid === ADMIN_UID || currentUser.uid === d.uid)) ||
      (!currentUser && d.authorTempId === myTempId);

    const html = `
      <div class="d-flex mb-4" id="comment-${id}" data-uid="${d.uid}">
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
// 4. 使用者資料 & 頭像上傳 (保留原功能)
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
      reader.onload = e => previewImg.src = e.target.result;
      reader.readAsDataURL(file);
      profileAvatarUrl = null;
      showToast("已選擇新頭像 👀");
    });
  }
});

async function uploadAvatarToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "guest-upload");
  const res = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", { method: "POST", body: formData });
  const data = await res.json();
  return data.secure_url;
}

// ==========================================
// 5. Email 登入 / 註冊 / 重設
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
      await auth.signInWithEmailAndPassword(email,password);
      showToast("登入成功！");
      bootstrap.Modal.getInstance(document.getElementById("emailModal")).hide();
    } else if (modalTitle.includes("註冊")) {
      const res = await auth.createUserWithEmailAndPassword(email,password);
      let avatarUrl = avatarFile ? await uploadAvatarToCloudinary(avatarFile) : null;
      await db.collection("users").doc(res.user.uid).set({
        name:name || "新朋友",
        avatar: avatarUrl || "images/andrew.png",
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
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
// 6. Auth 監聽 & UI 更新
// ==========================================
function updateUI() {
  const loginArea = document.getElementById("loginArea");
  const userArea = document.getElementById("userArea");
  const commentArea = document.getElementById("commentArea");

  if (currentUser) {
    loginArea?.classList.add("d-none");
    userArea?.classList.remove("d-none");
    commentArea?.classList.remove("d-none");
    document.getElementById("userName")?.textContent = currentUser.displayName || "新朋友";
    document.getElementById("userAvatar")?.src = currentUser.photoURL || "images/andrew.png";
  } else {
    loginArea?.classList.remove("d-none");
    userArea?.classList.add("d-none");
    commentArea?.classList.add("d-none");
  }
}

auth.onAuthStateChanged(user => {
  const wasLoggedIn = !!currentUser;
  currentUser = user;
  updateUI();
  loadComments(true);

  if (!wasLoggedIn && user && REDIRECT_AFTER_LOGIN) {
    showToast("登入成功，跳轉中...");
    setTimeout(() => redirectTo(REDIRECT_AFTER_LOGIN), 800);
  }
  if (wasLoggedIn && !user) {
    showToast("已登出，返回首頁");
    setTimeout(() => redirectTo(REDIRECT_AFTER_LOGOUT), 800);
  }
});

function logout() { auth.signOut(); }
async function googleLogin() { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }

// ==========================================
// 7. 圖片上傳功能
// ==========================================
async function uploadImage() {
  const fileInput = document.getElementById("imageInput");
  fileInput.click();
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file || file.size > 5*1024*1024) return showToast("檔案太大！請選擇 5MB 以下的圖片。", "danger");
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
  if (commentInput) commentInput.addEventListener("input", () => {
    document.getElementById("count").textContent = commentInput.value.length;
  });

  const backBtn = document.getElementById("backToTop");
  if (backBtn) backBtn.addEventListener("click", () => window.scrollTo({top:0, behavior:"smooth"}));
});
