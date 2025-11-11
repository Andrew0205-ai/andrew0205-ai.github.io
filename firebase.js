import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase.js";

// Cloudinary
const cloudName = "df0hlwcrd";
const uploadPreset = "884924477174612";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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

const uploadBtn = document.getElementById("upload-btn");
const imageUpload = document.getElementById("image-upload");
const previewContainer = document.getElementById("preview-container");

let uploadedImageUrl = "";

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
logoutBtn.addEventListener("click", () => {
  signOut(auth);
});

// 更新暱稱與頭像
updateProfileBtn.addEventListener("click", async () => {
  const nickname = nicknameInput.value.trim();
  if (!nickname) return alert("請輸入暱稱！");
  try {
    await updateProfile(auth.currentUser, {
      displayName: nickname,
      photoURL: userPhotoEl.src
    });
    loadComments();
    alert("更新成功！");
  } catch (err) {
    alert("更新失敗：" + err.message);
  }
});

// 圖片上傳按鈕觸發 file input
uploadBtn.addEventListener("click", () => imageUpload.click());

// 選擇檔案後上傳至 Cloudinary
imageUpload.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  previewContainer.innerHTML = "<p>上傳中...</p>";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    uploadedImageUrl = data.secure_url;
    previewContainer.innerHTML = `<img src="${uploadedImageUrl}" alt="預覽圖片">`;
  } catch (err) {
    console.error(err);
    alert("圖片上傳失敗");
  }
});

// 發佈留言
sendBtn.addEventListener("click", async () => {
  const content = commentInput.value.trim();
  const user = auth.currentUser;
  if (!user) return alert("請先登入！");
  if (!content && !uploadedImageUrl) return alert("請輸入文字或上傳圖片");

  try {
    await addDoc(collection(db, "comments"), {
      uid: user.uid,
      nickname: anonymousCheckbox.checked ? "匿名" : (user.displayName || user.email),
      avatarUrl: anonymousCheckbox.checked ? "default-avatar.png" : (user.photoURL || "default-avatar.png"),
      content,
      imageUrl: uploadedImageUrl,
      timestamp: serverTimestamp()
    });
    commentInput.value = "";
    uploadedImageUrl = "";
    previewContainer.innerHTML = "";
    loadComments();
  } catch (err) {
    console.error(err);
    alert("留言失敗：" + err.message);
  }
});

// 監聽登入狀態
onAuthStateChanged(auth, user => {
  if (user) {
    loginBtn.style.display = "none";
    userInfo.classList.remove("hidden");
    commentBox.style.display = "block";
    userNameEl.textContent = "📢歡迎，" + (user.displayName || user.email) + "！";
    userPhotoEl.src = user.photoURL || "default-avatar.png";
    nicknameInput.value = user.displayName || "";
  } else {
    loginBtn.style.display = "inline-block";
    userInfo.classList.add("hidden");
    commentBox.style.display = "none";
  }
  loadComments();
});

// 載入留言
async function loadComments() {
  commentList.innerHTML = "<p>載入中...</p>";
  try {
    const q = query(collection(db, "comments"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    commentList.innerHTML = "";
    const currentUser = auth.currentUser;

    if (snapshot.empty) {
      commentList.innerHTML = "<p>目前沒有留言。</p>";
      return;
    }

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement("div");
      div.className = "comment-item";
      div.innerHTML = `
        <img src="${data.avatarUrl}" alt="頭像" class="avatar">
        <strong>${data.nickname}</strong>
        <p>${data.content}</p>
        ${data.imageUrl ? `<img src="${data.imageUrl}" alt="留言圖片" class="comment-image">` : ""}
        <small>${data.timestamp?.toDate().toLocaleString() || ""}</small>
      `;
      commentList.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    commentList.innerHTML = "<p>無法載入留言。</p>";
  }
}
