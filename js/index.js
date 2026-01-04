// =======================
// index.js V3.0 - 小宏留言板
// =======================
console.log("📢 index.js V3.0 運作中......");

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

function welcomeAnimation(name) {
  const toast = document.createElement("div");
  toast.className = "position-fixed top-0 start-50 translate-middle-x mt-3 p-3 bg-success text-white rounded shadow";
  toast.textContent = `歡迎回來，${name} 👋`;
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
// Google 登入
// -----------------------
async function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const res = await auth.signInWithPopup(provider);
    currentUser = res.user;
    updateUI();
    welcomeAnimation(currentUser.displayName || "朋友");
  } catch (err) {
    console.error(err);
  }
}

// -----------------------
// Email Modal 控制
// -----------------------
function openEmailModal(mode) {
  emailMode = mode;
  emailModalTitle.textContent = mode === "login" ? "Email 登入" : mode === "signup" ? "註冊新帳號" : "忘記密碼";
  if (mode === "signup") {
    nameInput.parentElement.style.display = "block";
    avatarInput.parentElement.style.display = "block";
    passwordInput.parentElement.style.display = "block";
  } else if (mode === "login") {
    nameInput.parentElement.style.display = "none";
    avatarInput.parentElement.style.display = "none";
    passwordInput.parentElement.style.display = "block";
  } else {
    nameInput.parentElement.style.display = "none";
    avatarInput.parentElement.style.display = "none";
    passwordInput.parentElement.style.display = "none";
  }
  const modal = new bootstrap.Modal(emailModalEl);
  modal.show();
}

// -----------------------
// Email Auth（含 Cloudinary 上傳頭像）
// -----------------------
async function submitEmailAuth() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const name = nameInput.value.trim();
  const avatarFile = avatarInput.files[0];

  try {
    if (emailMode === "login") {
      const res = await auth.signInWithEmailAndPassword(email, password);
      currentUser = res.user;
      bootstrap.Modal.getInstance(emailModalEl).hide();
      updateUI();
      welcomeAnimation(currentUser.displayName || "朋友");
    } else if (emailMode === "signup") {
      const res = await auth.createUserWithEmailAndPassword(email, password);
      currentUser = res.user;

      // Cloudinary 上傳
      let avatarURL = "";
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        formData.append("upload_preset", "guest-upload"); 
        const cloudRes = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", {
          method: "POST",
          body: formData
        });
        const data = await cloudRes.json();
        avatarURL = data.secure_url;
      }

      await currentUser.updateProfile({
        displayName: name || "新朋友",
        photoURL: avatarURL || ""
      });

      bootstrap.Modal.getInstance(emailModalEl).hide();
      updateUI();
      welcomeAnimation(currentUser.displayName || "朋友");
    } else if (emailMode === "reset") {
      await auth.sendPasswordResetEmail(email);
      showEmailError("密碼重設信已寄出，請檢查信箱！");
    }
  } catch (err) {
    showEmailError(err.message);
  }
}

// -----------------------
// 登出
// -----------------------
function logout() {
  auth.signOut();
  currentUser = null;
  updateUI();
}

// -----------------------
// 留言板功能
// -----------------------
commentInput.addEventListener("input", () => {
  countEl.textContent = commentInput.value.length;
});

async function uploadImage() {
  imageInput.click();
}

imageInput.addEventListener("change", async () => {
  const file = imageInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "guest-upload");

  const res = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", {
    method: "POST",
    body: formData
  });
  const data = await res.json();
  commentInput.value += `![](${data.secure_url})\n`;
  countEl.textContent = commentInput.value.length;
});

// 發布留言
async function postComment() {
  if (!currentUser) return showEmailError("請先登入才能留言！");
  const text = commentInput.value.trim();
  if (!text) return;
  const timestamp = firebase.firestore.FieldValue.serverTimestamp();

  const docRef = await db.collection("comments").add({
    uid: currentUser.uid,
    name: currentUser.displayName || currentUser.email,
    avatar: currentUser.photoURL || "",
    text,
    timestamp
  });

  commentInput.value = "";
  countEl.textContent = 0;
  loadComments(true);
}

// 載入留言
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

// 編輯留言
function editComment(id) {
  editId = id;
  const content = document.querySelector(`#comment-${id} div.flex-grow-1 div`).innerHTML;
  editInput.value = content.replace(/<[^>]+>/g, "");
  const modal = new bootstrap.Modal(editModalEl);
  modal.show();
}

async function saveEdit() {
  if (!editId) return;
  const newText = editInput.value.trim();
  await db.collection("comments").doc(editId).update({ text: newText });
  bootstrap.Modal.getInstance(editModalEl).hide();
  loadComments(true);
}

// 刪除留言
async function deleteComment(id) {
  if (!currentUser) return;
  const doc = await db.collection("comments").doc(id).get();
  if (doc.exists && doc.data().uid === currentUser.uid) {
    await db.collection("comments").doc(id).delete();
    document.getElementById(`comment-${id}`).remove();
  } else {
    showEmailError("你只能刪除自己的留言！");
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
