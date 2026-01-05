// =======================
// index.js V3.1 - 小宏留言板
// =======================
console.log("📢 index.js V3.1 運作中......");

// -----------------------
// Firebase 初始化
// -----------------------
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

// -----------------------
// DOM 變數 (包含原本的與新 Modal 的)
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

// --- 新增個人資料 Modal 專用 DOM ---
const profileModalEl = document.getElementById('profileModal');
const modalPreviewImg = document.getElementById('modalPreviewImg');
const modalFileBtn = document.getElementById('modalFileBtn');
const modalNameInput = document.getElementById('modalNameInput');
const uploadProgress = document.getElementById('uploadProgress');

let emailMode = "login";
let editId = null;
let lastVisible = null;

// -----------------------
// 工具函式
// -----------------------
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
// 更新個人資料 (解決 ReferenceError)
// -----------------------
function openProfileModal() {
  if (!currentUser) return;
  modalNameInput.value = currentUser.displayName || "";
  modalPreviewImg.src = currentUser.photoURL || "images/andrew.png";
  if (uploadProgress) uploadProgress.classList.add("d-none");
  
  const modal = new bootstrap.Modal(profileModalEl);
  modal.show();
}

// 處理 Modal 內的圖片預覽
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

// 儲存變更核心邏輯
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
    welcomeAnimation("個人資料更新成功！✨");
  } catch (err) {
    console.error(err);
    alert("更新失敗：" + err.message);
  } finally {
    if (uploadProgress) uploadProgress.classList.add("d-none");
  }
}

// -----------------------
// 登入與登出
// -----------------------
async function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const res = await auth.signInWithPopup(provider);
    currentUser = res.user;
    updateUI();
    welcomeAnimation(`歡迎回來，${currentUser.displayName || "朋友"} 👋`);
  } catch (err) {
    console.error(err);
  }
}

function logout() {
  auth.signOut();
  currentUser = null;
  updateUI();
}

// -----------------------
// Email Auth
// -----------------------
function openEmailModal(mode) {
  emailMode = mode;
  emailModalTitle.textContent = mode === "login" ? "Email 登入" : mode === "signup" ? "註冊新帳號" : "忘記密碼";
  nameInput.parentElement.style.display = mode === "signup" ? "block" : "none";
  avatarInput.parentElement.style.display = mode === "signup" ? "block" : "none";
  passwordInput.parentElement.style.display = mode === "reset" ? "none" : "block";
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
      showEmailError("密碼重設信已寄出！");
      return;
    }
    bootstrap.Modal.getInstance(emailModalEl).hide();
    updateUI();
    welcomeAnimation(`登入成功，${currentUser.displayName}！`);
  } catch (err) { showEmailError(err.message); }
}

// -----------------------
// 留言板功能
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
  if (!currentUser) return showEmailError("請先登入才能留言！");
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
  if (snapshot.empty) return;
  if (reset) commentsEl.innerHTML = "";
  lastVisible = snapshot.docs[snapshot.docs.length - 1];
  snapshot.forEach(doc => {
    const data = doc.data();
    const id = doc.id;
    const html = `
      <div class="d-flex mb-2 align-items-start" id="comment-${id}">
        <img src="${data.avatar || "images/andrew.png"}" width="36" height="36" class="rounded-circle me-2">
        <div class="flex-grow-1">
          <strong>${data.name}</strong>
          <div>${marked.parse(DOMPurify.sanitize(data.text))}</div>
        </div>
        ${currentUser && currentUser.uid === data.uid ? `
          <button class="btn btn-sm btn-outline-secondary ms-2" onclick="editComment('${id}')">編輯</button>
          <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteComment('${id}')">刪除</button>` : ""}
      </div>`;
    commentsEl.insertAdjacentHTML("beforeend", html);
  });
}

function editComment(id) {
  editId = id;
  const content = document.querySelector(`#comment-${id} div.flex-grow-1 div`).innerHTML;
  editInput.value = content.replace(/<[^>]+>/g, "");
  new bootstrap.Modal(editModalEl).show();
}

async function saveEdit() {
  if (!editId) return;
  await db.collection("comments").doc(editId).update({ text: editInput.value.trim() });
  bootstrap.Modal.getInstance(editModalEl).hide();
  loadComments(true);
}

async function deleteComment(id) {
  if (!currentUser) return;
  const doc = await db.collection("comments").doc(id).get();
  if (doc.exists && doc.data().uid === currentUser.uid) {
    await db.collection("comments").doc(id).delete();
    document.getElementById(`comment-${id}`).remove();
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
