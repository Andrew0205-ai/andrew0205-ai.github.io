import { auth, db } from "./firebase.js";
import { 
  signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, updateProfile 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// DOM 元素
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");
const userNameEl = document.getElementById("user-name");
const userPhotoEl = document.getElementById("user-photo");
const nicknameInput = document.getElementById("nickname-input");
const updateProfileBtn = document.getElementById("update-profile-btn");
const commentBox = document.getElementById("comment-box");
const commentInput = document.getElementById("comment-input");
const anonymousCheckbox = document.getElementById("anonymous-checkbox");
const sendBtn = document.getElementById("send-btn");
const commentList = document.getElementById("comment-list");
const avatarUpload = document.getElementById("avatar-upload");
const uploadBtn = document.getElementById("upload-btn");

// === Cloudinary 設定 ===
const CLOUD_NAME = "df0hlwcrd";
const UPLOAD_PRESET = "guest-upload";

// Google 登入
loginBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    alert("登入失敗：" + err.message);
  }
});

// 登出
logoutBtn.addEventListener("click", () => signOut(auth));

// 上傳頭像
async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  return data.secure_url;
}

// 點擊上傳按鈕觸發檔案選擇
uploadBtn.addEventListener("click", () => avatarUpload.click());

// 預覽頭像
avatarUpload.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = event => userPhotoEl.src = event.target.result;
  reader.readAsDataURL(file);
});

// 更新暱稱與頭像（完整）
updateProfileBtn.addEventListener("click", async () => {
  const nickname = nicknameInput.value.trim();
  if (!nickname) return alert("請輸入暱稱！");

  let newPhotoURL = userPhotoEl.src;

  // 若有選新頭像 → 先上傳 Cloudinary 再更新 Firebase Profile
  if (avatarUpload.files && avatarUpload.files[0]) {
    newPhotoURL = await uploadAvatar(avatarUpload.files[0]);
  }

  try {
    await updateProfile(auth.currentUser, {
      displayName: nickname,
      photoURL: newPhotoURL
    });

    alert("資料已更新！");
  } catch (err) {
    alert("更新失敗：" + err.message);
  }
});

// =========================
// ⭐ 送出留言
// =========================
sendBtn.addEventListener("click", async () => {
  const text = commentInput.value.trim();
  if (!text) return alert("留言不能空白！");

  const user = auth.currentUser;

  const isAnonymous = anonymousCheckbox.checked;

  await addDoc(collection(db, "comments"), {
    text,
    anonymous: isAnonymous,
    userName: isAnonymous ? "匿名" : user.displayName,
    photoURL: isAnonymous ? "images/default-avatar.png" : user.photoURL,
    createdAt: serverTimestamp(),
    uid: user.uid
  });

  commentInput.value = "";
});

// =========================
// ⭐ 讀取留言（最新版本）
// =========================
async function loadComments() {
  const q = query(collection(db, "comments"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);

  commentList.innerHTML = "";

  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "comment-item";

    div.innerHTML = `
      <img src="${data.photoURL}" class="avatar">
      <strong>${data.userName}</strong>
      <p>${data.text}</p>
      <small>${data.createdAt ? data.createdAt.toDate().toLocaleString() : ""}</small>
    `;

    commentList.appendChild(div);
  });
}

// =========================
// ⭐ Firebase 登入狀態
// =========================
onAuthStateChanged(auth, user => {
  if (user) {
    // 顯示 user info
    userInfo.classList.remove("hidden");
    userNameEl.textContent = user.displayName || "未命名";
    userPhotoEl.src = user.photoURL || "images/default-avatar.png";
    commentBox.style.display = "block";
  } else {
    userInfo.classList.add("hidden");
    commentBox.style.display = "none";
  }

  loadComments();
});

