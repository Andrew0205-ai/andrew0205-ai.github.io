// Firebase 初始化


export const firebaseConfig = {
  apiKey: "AIzaSyClktI5_wSo-u9LuwdsBVzH6buizJPXMAs",
  authDomain: "mycomment-ad1ba.firebaseapp.com",
  projectId: "mycomment-ad1ba",
  storageBucket: "mycomment-ad1ba.appspot.com",
  messagingSenderId: "1076313273646",
  appId: "1:1076313273646:web:2b5aaa8c6bd5824828f6bf",
  measurementId: "G-3NGHCWH7TP"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 元素
const googleLoginBtn = document.getElementById("google-login");
const emailLoginBtn = document.getElementById("email-login");
const registerBtn = document.getElementById("register");
const logoutBtn = document.getElementById("logout");
const userInfo = document.getElementById("user-info");
const userNameEl = document.getElementById("user-name");
const userTitleEl = document.getElementById("user-title");
const userAvatar = document.getElementById("user-avatar");
const avatarUpload = document.getElementById("avatar-upload");
const displayNameInput = document.getElementById("display-name-input");
const userTitleInput = document.getElementById("user-title-input");
const saveProfileBtn = document.getElementById("save-profile");
const commentInput = document.getElementById("comment-input");
const postCommentBtn = document.getElementById("post-comment");
const commentList = document.getElementById("comment-list");

// Cloudinary 上傳
async function uploadAvatarToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "ml_default"); 
  const res = await fetch(url, { method: "POST", body: formData });
  const data = await res.json();
  return data.secure_url;
}

// 顯示使用者資料
async function showUserData(user) {
  const doc = await db.collection("users").doc(user.uid).get();
  const data = doc.exists ? doc.data() : {};
  userNameEl.textContent = data.displayName || user.displayName || "未設定暱稱";
  userTitleEl.textContent = data.title || "";
  userAvatar.src = data.avatarUrl || user.photoURL || "https://via.placeholder.com/36";
  displayNameInput.value = data.displayName || "";
  userTitleInput.value = data.title || "";
  userInfo.classList.remove("hidden");
}

// 登入/登出 UI 控制
auth.onAuthStateChanged(user => {
  if (user) {
    googleLoginBtn.classList.add("hidden");
    emailLoginBtn.classList.add("hidden");
    registerBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    showUserData(user);
    loadComments();
  } else {
    googleLoginBtn.classList.remove("hidden");
    emailLoginBtn.classList.remove("hidden");
    registerBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userInfo.classList.add("hidden");
    commentList.innerHTML = "";
  }
});

// Google 登入
googleLoginBtn.addEventListener("click", async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  await auth.signInWithPopup(provider);
});

// Email 登入
emailLoginBtn.addEventListener("click", async () => {
  const email = prompt("輸入 Email");
  const password = prompt("輸入密碼");
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      alert("帳號不存在");
    } else if (err.code === "auth/wrong-password") {
      alert("密碼錯誤");
    } else {
      alert(err.message);
    }
  }
});

// 註冊
registerBtn.addEventListener("click", async () => {
  const email = prompt("輸入 Email");
  const password = prompt("輸入密碼");
  try {
    const res = await auth.createUserWithEmailAndPassword(email, password);
    alert("註冊成功！");
  } catch (err) {
    alert(err.message);
  }
});

// 忘記密碼（Email 登入）
emailLoginBtn.addEventListener("dblclick", async () => {
  const email = prompt("輸入 Email 以重設密碼");
  if (email) {
    await auth.sendPasswordResetEmail(email);
    alert("已發送重設密碼信件");
  }
});

// 登出
logoutBtn.addEventListener("click", () => auth.signOut());

// 儲存個人資料
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  let avatarUrl = userAvatar.src;
  const file = avatarUpload.files[0];
  if (file) {
    avatarUrl = await uploadAvatarToCloudinary(file);
    userAvatar.src = avatarUrl;
  }
  await db.collection("users").doc(user.uid).set({
    displayName: displayNameInput.value,
    title: userTitleInput.value,
    avatarUrl: avatarUrl
  }, { merge: true });
  showUserData(user);
  alert("資料已儲存！");
});

// 發佈留言
postCommentBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("請先登入");
  const text = commentInput.value.trim();
  if (!text) return;
  const docRef = db.collection("comments").doc();
  const userData = (await db.collection("users").doc(user.uid).get()).data();
  await docRef.set({
    uid: user.uid,
    displayName: userData.displayName || user.displayName,
    title: userData.title || "",
    avatarUrl: userData.avatarUrl || user.photoURL || "https://via.placeholder.com/36",
    text: text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  commentInput.value = "";
  loadComments();
});

// 載入留言
async function loadComments() {
  const snapshot = await db.collection("comments").orderBy("createdAt", "desc").get();
  commentList.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.classList.add("comment-card");
    div.innerHTML = `
      <img class="avatar" src="${data.avatarUrl}">
      <b>${data.displayName} (${data.title})</b>
      <p>${data.text}</p>
    `;
    commentList.appendChild(div);
  });
}
