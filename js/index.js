// ==========================================
// 1. 初始化 Firebase 與環境變數
// ==========================================
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

// 管理員 UID（可多個）
const ADMIN_UIDS = [
  "mKU5cngfmNXyXupfM9XAc8MqgNU2"
];

// 不雅字詞
const FORBIDDEN_WORDS = ["白痴", "垃圾", "靠", "死", "fuck", "shit", "北七", "笨蛋"];

// 匿名者識別碼
let myTempId = localStorage.getItem("myTempId") || 
  "temp_" + Math.random().toString(36).substr(2, 9);
localStorage.setItem("myTempId", myTempId);

let lastVisible = null;
let isCooldown = false;
let profileModal, editModal;
let currentEditId = null;

// ==========================================
// 2. 工具函式
// ==========================================
function isAdmin() {
  return currentUser && ADMIN_UIDS.includes(currentUser.uid);
}

function hasBadWords(text) {
  const clean = text.toLowerCase().replace(/\s/g, "");
  return FORBIDDEN_WORDS.some(word => clean.includes(word));
}

function welcomeAnimation(msg) {
  const t = document.createElement("div");
  t.className = "position-fixed top-0 start-50 translate-middle-x mt-3 p-3 bg-success text-white rounded shadow-lg";
  t.style.zIndex = "10000";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ==========================================
// 3. 發布留言
// ==========================================
async function postComment() {
  const input = document.getElementById("commentInput");
  const text = input.value.trim();
  if (!text || isCooldown) return;

  if (text.length > 500) {
    alert("留言請勿超過 500 字");
    return;
  }

  if (hasBadWords(text)) {
    alert("⚠️ 留言包含不當字眼");
    return;
  }

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
    avatar: currentUser ? 
      (currentUser.photoURL || "images/andrew.png") :
      "https://cdn-icons-png.flaticon.com/512/1144/1144760.png",
    text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    clientTime: Date.now()
  };

  try {
    await db.collection("comments").add(data);

    if (!isQuick) {
      document.getElementById("commentInput").value = "";
      document.getElementById("count").textContent = "0";
    }

    welcomeAnimation("留言成功！💖");
    loadComments(true);

    setTimeout(() => isCooldown = false, 2500);
  } catch (e) {
    alert("發布失敗");
    isCooldown = false;
  }
}

// ==========================================
// 4. 讀取留言（分頁）
// ==========================================
async function loadComments(reset = false) {
  let query = db.collection("comments")
    .orderBy("timestamp", "desc")
    .orderBy("clientTime", "desc")
    .limit(10);

  if (!reset && lastVisible) {
    query = query.startAfter(lastVisible);
  }

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
      (currentUser && (isAdmin() || currentUser.uid === d.uid)) ||
      (!currentUser && d.authorTempId === myTempId);

    const html = `
      <div class="d-flex mb-4" id="comment-${id}">
        <img src="${d.avatar}" width="50" height="50" class="rounded-circle me-3 border shadow-sm">
        <div class="flex-grow-1 border-bottom pb-3">
          <div class="d-flex justify-content-between align-items-center">
            <strong>
              ${d.name}
              ${d.uid && ADMIN_UIDS.includes(d.uid) ? '<span class="badge bg-danger ms-1">板主</span>' : ''}
            </strong>
            <small class="text-muted">
              ${d.timestamp ? new Date(d.timestamp.toDate()).toLocaleString() : "剛剛"}
            </small>
          </div>

          <div class="mt-2 text-dark">
            ${marked.parse(DOMPurify.sanitize(d.text))}
          </div>

          ${canManage ? `
            <div class="mt-2 small">
              <span class="text-primary cursor-pointer me-2" onclick="editComment('${id}')">編輯</span>
              <span class="text-danger cursor-pointer" onclick="deleteComment('${id}')">刪除</span>
            </div>
          ` : ""}
        </div>
      </div>
    `;

    commentsEl.insertAdjacentHTML("beforeend", html);
  });
}

// ==========================================
// 5. 刪除留言（安全驗證）
// ==========================================
async function deleteComment(id) {
  if (!confirm("確定要刪除這則留言嗎？")) return;

  try {
    const ref = db.collection("comments").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return;

    const d = doc.data();

    const canDelete =
      (currentUser && (isAdmin() || currentUser.uid === d.uid)) ||
      (!currentUser && d.authorTempId === myTempId);

    if (!canDelete) {
      alert("你沒有刪除權限");
      return;
    }

    await ref.delete();
    document.getElementById(`comment-${id}`)?.remove();
    welcomeAnimation("已刪除留言 🗑️");

  } catch (e) {
    alert("刪除失敗");
  }
}

// ==========================================
// 6. 編輯留言
// ==========================================
async function editComment(id) {
  try {
    const ref = db.collection("comments").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return;

    const d = doc.data();
    const canEdit =
      (currentUser && (isAdmin() || currentUser.uid === d.uid)) ||
      (!currentUser && d.authorTempId === myTempId);

    if (!canEdit) {
      alert("你沒有編輯權限");
      return;
    }

    currentEditId = id;
    document.getElementById("editInput").value = d.text;
    editModal.show();

  } catch (e) {
    alert("讀取留言失敗");
  }
}

async function saveEdit() {
  const text = document.getElementById("editInput").value.trim();
  if (!text || !currentEditId) return;

  if (hasBadWords(text)) {
    alert("內容包含不當字眼");
    return;
  }

  try {
    await db.collection("comments").doc(currentEditId).update({
      text,
      editedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    editModal.hide();
    loadComments(true);
    welcomeAnimation("修改完成 ✨");
    currentEditId = null;

  } catch (e) {
    alert("修改失敗");
  }
}

// ==========================================
// 7. 圖片上傳（Cloudinary）
// ==========================================
function uploadImage() {
  document.getElementById("imageInput").click();
}

async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("只能上傳圖片");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("圖片請小於 5MB");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "guest-upload");

  try {
    welcomeAnimation("圖片上傳中 ☁️");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload",
      { method: "POST", body: formData }
    );
    const data = await res.json();

    const input = document.getElementById("commentInput");
    input.value += `\n![圖片](${data.secure_url})\n`;
    document.getElementById("count").textContent = input.value.length;

    welcomeAnimation("圖片上傳完成 📸");

  } catch (e) {
    alert("圖片上傳失敗");
  }
}

// ==========================================
// 8. 使用者 UI
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

// ==========================================
// 9. 登入監聽
// ==========================================
auth.onAuthStateChanged(user => {
  currentUser = user;
  updateUI();
  loadComments(true);
});

function googleLogin() {
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
}

function logout() {
  auth.signOut();
}

// ==========================================
// 10. 初始化
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Modal 初始化
  const profileEl = document.getElementById("profileModal");
  const editEl = document.getElementById("editModal");

  if (profileEl) profileModal = new bootstrap.Modal(profileEl);
  if (editEl) editModal = new bootstrap.Modal(editEl);

  // 圖片上傳監聽
  const imageInput = document.getElementById("imageInput");
  if (imageInput) {
    imageInput.addEventListener("change", handleImageUpload);
  }

  // 字數監聽
  const commentInput = document.getElementById("commentInput");
  if (commentInput) {
    commentInput.addEventListener("input", function () {
      document.getElementById("count").textContent = this.value.length;
    });
  }
});