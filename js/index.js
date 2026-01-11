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
// 3. 外部連結安全跳轉（核心）
// ==========================================

// 只有這兩個網域可以直接開啟（不經 redirect.html）
const TRUSTED_DOMAINS = [
  "andrew0205-ai.github.io",
  "andrew0205blogs.blogspot.com"
];

function safeOpen(url) {
  let targetUrl;

  try {
    targetUrl = new URL(url, location.origin);
  } catch {
    showToast("連結格式錯誤", "danger");
    return;
  }

  // 只允許 http / https
  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    showToast("不安全的連結已被阻擋", "danger");
    return;
  }

  // 站內連結 → 直接開
  if (targetUrl.hostname === location.hostname) {
    location.href = targetUrl.href;
    return;
  }

  // 信任網域 → 直接開（不經 redirect）
  if (TRUSTED_DOMAINS.includes(targetUrl.hostname)) {
    location.href = targetUrl.href;
    return;
  }

  // 其他外部網站 → 一律導向 redirect.html
  const encoded = encodeURIComponent(targetUrl.href);
  location.href = `redirect.html?url=${encoded}`;
}

// 攔截留言區所有 <a> 點擊，自動走 safeOpen
document.addEventListener("click", e => {
  const link = e.target.closest("a");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href) return;

  e.preventDefault();
  safeOpen(href);
});

// ==========================================
// 4. 留言核心功能
// ==========================================

function hasBadWords(text) {
  const lowText = text.toLowerCase();
  return FORBIDDEN_WORDS.some(word => lowText.includes(word));
}

async function postComment() {
  const input = document.getElementById("commentInput");
  const text = input.value.trim();
  if (!text || isCooldown) return;

  if (text.length > 500) return showToast("留言最多 500 字", "danger");
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
  } catch (e) {
    console.error(e);
    showToast("發布失敗", "danger");
  } finally {
    setTimeout(() => (isCooldown = false), 3000);
  }
}

async function loadComments(reset = false) {
  let query = db.collection("comments").orderBy("timestamp", "desc").limit(10);
  if (!reset && lastVisible) query = query.startAfter(lastVisible);

  const snap = await query.get();
  const commentsEl = document.getElementById("comments");
  if (reset) {
    commentsEl.innerHTML = "";
    lastVisible = null;
  }
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
            <strong>
              ${d.name}
              ${d.uid === ADMIN_UID ? '<span class="badge bg-danger ms-1">板主</span>' : ''}
            </strong>
            <small class="text-muted">
              ${d.timestamp ? new Date(d.timestamp.toDate()).toLocaleString() : '剛剛'}
            </small>
          </div>

          <div class="mt-2 text-dark">
            ${marked.parse(DOMPurify.sanitize(d.text))}
          </div>

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
    showToast("留言已刪除 🗑️");
  } catch (e) {
    console.error(e);
    showToast("刪除失敗", "danger");
  }
}

// 修正：精準抓留言內容
let currentEditId = null;
function editComment(id) {
  const el = document.getElementById(`comment-${id}`);
  const text = el.querySelector(".text-dark").innerText;
  currentEditId = id;
  document.getElementById("editInput").value = text;
  new bootstrap.Modal(document.getElementById("editModal")).show();
}

async function saveEdit() {
  const text = document.getElementById("editInput").value.trim();
  if (!text) return showToast("留言不可空白！", "danger");

  try {
    await db.collection("comments").doc(currentEditId).update({ text });
    document.querySelector(`#comment-${currentEditId} .text-dark`).innerHTML =
      marked.parse(DOMPurify.sanitize(text));
    bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
    showToast("留言已更新 ✏️");
  } catch (e) {
    console.error(e);
    showToast("更新失敗", "danger");
  }
}

// ==========================================
// 5. 使用者資料 & 頭像
// ==========================================

let profileModal, profileNameInput, profileAvatarInput, profileAvatarUrl = null;

document.addEventListener("DOMContentLoaded", () => {
  profileModal = new bootstrap.Modal(document.getElementById("profileModal"));
  profileNameInput = document.getElementById("modalNameInput");
  profileAvatarInput = document.getElementById("modalFileBtn");
});

function updateUserCommentsUI(uid, name, avatar) {
  document.querySelectorAll(`#comments div[id^="comment-"]`).forEach(commentEl => {
    if (commentEl.datasetUid === uid) {
      const imgEl = commentEl.querySelector("img");
      const nameEl = commentEl.querySelector("strong");
      if (!imgEl || !nameEl) return;

      const badge = nameEl.querySelector(".badge");
      nameEl.textContent = name;
      if (badge) nameEl.appendChild(badge);

      imgEl.src = avatar;
    }
  });
}

async function uploadAvatarToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "guest-upload");

  const res = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  if (!data.secure_url) throw new Error("Cloudinary 上傳失敗");
  return data.secure_url;
}

// ==========================================
// 6. 圖片上傳（留言）
// ==========================================

async function uploadImage() {
  const fileInput = document.getElementById("imageInput");
  fileInput.click();

  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/"))
      return showToast("只能上傳圖片檔案", "danger");

    if (file.size > 5 * 1024 * 1024)
      return showToast("圖片需小於 5MB", "danger");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "guest-upload");

    try {
      showToast("圖片上傳中... ☁️");
      const res = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!data.secure_url) throw new Error("上傳失敗");

      const input = document.getElementById("commentInput");
      input.value += `\n![圖片](${data.secure_url})\n`;
      document.getElementById("count").textContent = input.value.length;
      showToast("圖片上傳成功！📸");
    } catch (e) {
      console.error(e);
      showToast("圖片上傳失敗", "danger");
    }
  };
}

// ==========================================
// 7. Email 錯誤中文化
// ==========================================

function parseAuthError(err) {
  if (err.code === "auth/wrong-password") return "密碼錯誤";
  if (err.code === "auth/user-not-found") return "帳號不存在";
  if (err.code === "auth/email-already-in-use") return "此 Email 已被註冊";
  return "操作失敗，請稍後再試";
}
