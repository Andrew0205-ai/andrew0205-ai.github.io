// ===============================
//  Firebase 設定區
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyClktI5_wSo-u9LuwdsBVzH6buizJPXMAs",
  authDomain: "mycomment-ad1ba.firebaseapp.com",
  projectId: "mycomment-ad1ba",
  storageBucket: "mycomment-ad1ba.appspot.com",
  messagingSenderId: "1076313273646",
  appId: "1:1076313273646:web:2b5aaa8c6bd5824828f6bf",
  measurementId: "G-3NGHCWH7TP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ===============================
//  Cloudinary 設定區
// ===============================
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_upload";

// ===============================
//  DOM 元素
// ===============================
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");
const userNameEl = document.getElementById("user-name");
const userPhotoEl = document.getElementById("user-photo");
const nicknameInput = document.getElementById("nickname-input");
const avatarUpload = document.getElementById("avatar-upload");
const updateProfileBtn = document.getElementById("update-profile-btn");
const commentBox = document.getElementById("comment-box");
const commentInput = document.getElementById("comment-input");
const sendBtn = document.getElementById("send-btn");
const commentList = document.getElementById("comment-list");
const anonymousCheckbox = document.getElementById("anonymous-checkbox");
const imageUpload = document.getElementById("image-upload");

// ===============================
//  登入/登出功能
// ===============================
loginBtn.addEventListener("click", async () => {
  await signInWithPopup(auth, provider);
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, user => {
  if (user) {
    loginBtn.style.display = "none";
    userInfo.classList.remove("hidden");
    commentBox.style.display = "block";
    userPhotoEl.src = user.photoURL || "default-avatar.png";
    userNameEl.textContent = "📢 歡迎，" + (user.displayName || user.email) + "！";
  } else {
    loginBtn.style.display = "block";
    userInfo.classList.add("hidden");
    commentBox.style.display = "none";
  }
});

// ===============================
//  上傳自訂頭像
// ===============================
avatarUpload.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
  const data = await response.json();

  userPhotoEl.src = data.secure_url;
});

// ===============================
//  更新暱稱與頭像
// ===============================
updateProfileBtn.addEventListener("click", async () => {
  alert("✅ 暱稱與頭像已更新（僅本地顯示）");
});

// ===============================
//  上傳留言圖片
// ===============================
async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_URL, {
    method: "POST",
    body: formData
  });

  const data = await response.json();
  return data.secure_url;
}

// ===============================
//  送出留言
// ===============================
sendBtn.addEventListener("click", async () => {
  const text = commentInput.value.trim();
  const file = imageUpload?.files[0];
  if (!text && !file) return alert("請輸入留言或選擇圖片！");

  let imageUrl = "";
  if (file) imageUrl = await uploadImage(file);

  const user = auth.currentUser;
  const commentData = {
    text: anonymousCheckbox.checked ? "（匿名）" : text,
    imageUrl,
    nickname: anonymousCheckbox.checked ? "匿名訪客" : (nicknameInput.value || user?.displayName || "訪客"),
    avatar: anonymousCheckbox.checked ? "default-avatar.png" : (userPhotoEl.src || "default-avatar.png"),
    time: new Date().toLocaleString("zh-TW")
  };

  await addDoc(collection(db, "comments"), commentData);
  commentInput.value = "";
  if (imageUpload) imageUpload.value = "";
});

// ===============================
//  顯示留言
// ===============================
onSnapshot(query(collection(db, "comments"), orderBy("time", "desc")), snapshot => {
  commentList.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.className = "comment-item";

    div.innerHTML = `
      <img src="${data.avatar}" class="avatar">
      <div>
        <strong>${data.nickname}</strong><br>
        <span>${data.text}</span><br>
        ${data.imageUrl ? `<img src="${data.imageUrl}" class="comment-image">` : ""}
        <small>${data.time}</small>
      </div>
    `;
    commentList.appendChild(div);
  });
});
