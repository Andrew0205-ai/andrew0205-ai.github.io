// =======================
// DOM 變數
// =======================
let imageInput, commentInput, count, comments;
let userName, userAvatar;
let editModal, editInput;
let currentEditId = null;
let currentUser = null;
const ADMIN_UIDS = ["mKU5cngfmNXyXupfM9XAc8MqgNU2"];
let lastDoc = null;
const PAGE_SIZE = 10;

// =======================
// Firebase 初始化
// =======================
const auth = firebase.auth();
const db = firebase.firestore();

// =======================
// DOM 初始化
// =======================
document.addEventListener("DOMContentLoaded", () => {
  imageInput = document.getElementById("imageInput");
  commentInput = document.getElementById("commentInput");
  count = document.getElementById("count");
  comments = document.getElementById("comments");
  userName = document.getElementById("userName");
  userAvatar = document.getElementById("userAvatar");
  editInput = document.getElementById("editInput");
  editModal = new bootstrap.Modal(document.getElementById("editModal"));

  commentInput.addEventListener("input", e => count.innerText = e.target.value.length);
  imageInput.addEventListener("change", handleImageUpload);

  listenComments();
});

// =======================
// Auth 狀態監聽
// =======================
auth.onAuthStateChanged(user => {
  currentUser = user;

  loginArea.classList.toggle("d-none", !!user);
  userArea.classList.toggle("d-none", !user);
  commentArea.classList.toggle("d-none", !user);

  if (user) {
    userName.innerText = user.displayName || "未命名";
    userAvatar.src = user.photoURL || "images/defult-avatar.png";
  }
});

// =======================
// Google 登入 / 登出
// =======================
function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
}

function logout() {
  auth.signOut();
}

// =======================
// 使用者資料修改
// =======================
function changeNickname() {
  if (!currentUser) return;
  const name = prompt("新暱稱");
  if (!name) return;
  currentUser.updateProfile({ displayName: name });
  userName.innerText = name;
}

function changeAvatar() {
  uploadImage();
}

// =======================
// Cloudinary 圖片上傳
// =======================
function uploadImage() {
  imageInput.click();
}

async function handleImageUpload() {
  const file = imageInput.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) { alert("只能上傳圖片"); return; }
  if (file.size > 2 * 1024 * 1024) { alert("圖片不可超過 2MB"); return; }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", "guest-upload");

  const res = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", { method: "POST", body: form });
  const data = await res.json();

  // 如果是在留言輸入框，插入圖片 Markdown
  if (commentInput) {
    commentInput.value += `\n\n![](${data.secure_url})\n`;
  }
}

// =======================
// 發送留言
// =======================
function postComment() {
  if (!currentUser) return alert("請先登入");
  const text = commentInput.value.trim();
  if (!text) return;

  db.collection("comments").add({
    text,
    uid: currentUser.uid,
    name: currentUser.displayName,
    avatar: currentUser.photoURL,
    isAdmin: ADMIN_UIDS.includes(currentUser.uid),
    time: firebase.firestore.FieldValue.serverTimestamp()
  });

  commentInput.value = "";
  count.innerText = 0;
}

// =======================
// 讀取留言
// =======================
function listenComments() {
  db.collection("comments")
    .orderBy("time", "desc")
    .limit(PAGE_SIZE)
    .onSnapshot(snapshot => {
      comments.innerHTML = "";
      snapshot.forEach(renderComment);
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    });
}

// =======================
// 渲染留言
// =======================
function renderComment(doc) {
  const c = doc.data();
  const safeHtml = DOMPurify.sanitize(marked.parse(c.text));

  const div = document.createElement("div");
  div.className = "border rounded p-2 mb-2";
  div.innerHTML = `
    <div class="d-flex align-items-center mb-1">
      <img src="${c.avatar}" width="28" class="rounded-circle me-2">
      <strong>${c.name}</strong>
      ${c.isAdmin ? '<span class="badge bg-danger ms-2">👑 管理員</span>' : ""}
    </div>
    <div class="comment-body">${safeHtml}</div>
    ${currentUser?.uid === c.uid ? `
      <button class="btn btn-sm btn-outline-primary mt-1" onclick="openEdit('${doc.id}', \`${c.text.replace(/`/g,"\\`")}\`)">編輯</button>
      <button class="btn btn-sm btn-outline-danger mt-1" onclick="deleteComment('${doc.id}')">刪除</button>
    ` : ""}
  `;
  comments.appendChild(div);
}

// =======================
// 編輯留言
// =======================
function openEdit(id, text) {
  currentEditId = id;
  editInput.value = text;
  editModal.show();
}

function saveEdit() {
  if (!currentEditId) return;
  db.collection("comments").doc(currentEditId).update({ text: editInput.value });
  editModal.hide();
  currentEditId = null;
}

// =======================
// 刪除留言
// =======================
function deleteComment(id) {
  if (!confirm("確定刪除？")) return;
  db.collection("comments").doc(id).delete();
}

// =======================
// 載入更多留言
// =======================
async function loadMore() {
  if (!lastDoc) return;
  const snap = await db.collection("comments")
    .orderBy("time", "desc")
    .startAfter(lastDoc)
    .limit(PAGE_SIZE)
    .get();
  snap.forEach(renderComment);
  lastDoc = snap.docs[snap.docs.length - 1];
}

// =======================
// Email Modal (登入 / 註冊 / 忘記密碼)
// =======================
const emailModal = new bootstrap.Modal(document.getElementById("emailModal"));
const emailForm = document.getElementById("emailForm");
const emailModalTitle = document.getElementById("emailModalTitle");
const toggleSignupBtn = document.getElementById("toggleSignup");
const toggleForgotBtn = document.getElementById("toggleForgot");
const nameGroup = document.getElementById("nameGroup");
const emailName = document.getElementById("emailName");
const avatarGroup = document.getElementById("avatarGroup");
const emailAvatar = document.getElementById("emailAvatar");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const emailSubmit = document.getElementById("emailSubmit");

let mode = "login";

function openEmailModal(initMode = "login") {
  mode = initMode;
  updateModalUI();
  emailModal.show();
}

function updateModalUI() {
  if (mode === "login") {
    emailModalTitle.innerText = "Email 登入";
    nameGroup.style.display = "none";
    avatarGroup.style.display = "none";
    emailSubmit.innerText = "登入";
    toggleSignupBtn.style.display = "inline";
    toggleForgotBtn.style.display = "inline";
  } else if (mode === "signup") {
    emailModalTitle.innerText = "Email 註冊";
    nameGroup.style.display = "block";
    avatarGroup.style.display = "block";
    emailSubmit.innerText = "註冊";
    toggleSignupBtn.style.display = "none";
    toggleForgotBtn.style.display = "none";
  } else if (mode === "forgot") {
    emailModalTitle.innerText = "重設密碼";
    nameGroup.style.display = "none";
    avatarGroup.style.display = "none";
    emailSubmit.innerText = "送出重設信";
    toggleSignupBtn.style.display = "inline";
    toggleForgotBtn.style.display = "none";
  }
}

toggleSignupBtn.addEventListener("click", () => { mode = "signup"; updateModalUI(); });
toggleForgotBtn.addEventListener("click", () => { mode = "forgot"; updateModalUI(); });

emailForm.addEventListener("submit", async e => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) return alert("請填寫 Email 與密碼");

  try {
    if (mode === "login") {
      await auth.signInWithEmailAndPassword(email, password);
      emailModal.hide();
    } else if (mode === "signup") {
      if (!emailName.value.trim()) return alert("請填寫暱稱");
      const avatarFile = emailAvatar.files[0];
      const res = await auth.createUserWithEmailAndPassword(email, password);
      const user = res.user;
      let photoURL = "";
      if (avatarFile) {
        const form = new FormData();
        form.append("file", avatarFile);
        form.append("upload_preset", "guest-upload");
        const r = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", { method: "POST", body: form });
        const data = await r.json();
        photoURL = data.secure_url;
      }
      await user.updateProfile({ displayName: emailName.value.trim(), photoURL });
      emailModal.hide();
    } else if (mode === "forgot") {
      await auth.sendPasswordResetEmail(email);
      alert("重設密碼信已發送");
      emailModal.hide();
    }
  } catch (err) { alert(err.message); }
});
