// Firebase 初始化
// 註：你已在 index.html 引用了 firebase-config.js，這裡不重複載入，
// 假設 firebase 已經在全域或被正確載入。

export const firebaseConfig = {
  apiKey: "AIzaSyClktI5_wSo-u9LuwdsBVzH6buizJPXMAs",
  authDomain: "mycomment-ad1ba.firebaseapp.com",
  projectId: "mycomment-ad1ba",
  storageBucket: "mycomment-ad1ba.appspot.com",
  messagingSenderId: "1076313273646",
  appId: "1:1076313273646:web:2b5aaa8c6bd5824828f6bf",
  measurementId: "G-3NGHCWH7TP"
};
// 假設 firebase 已經被正確引用
if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}

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
// ⭐ 修正：從 HTML 中正確取得 user-title-input 元素
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
  // ⭐ 修正：userTitleInput 已經被正確取得，可以設定 value
  if (userTitleInput) {
      userTitleInput.value = data.title || "";
  }
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
  if (!email || !password) return;
    
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
  
  if (!email || !password) return; // 檢查輸入是否為空

  try {
    const res = await auth.createUserWithEmailAndPassword(email, password);
    const user = res.user;

    alert("註冊成功！請設定您的暱稱與稱號。");

    // ⭐ 優化：註冊後立即提示設定初始資料
    const initialDisplayName = prompt("請輸入您的暱稱 (必填)");
    const initialTitle = prompt("請輸入您的稱號 (可選)");

    // 將初始資料存入 Firestore
    await db.collection("users").doc(user.uid).set({
      displayName: initialDisplayName || user.displayName || "新註冊使用者", 
      title: initialTitle || "", 
      avatarUrl: user.photoURL || "https://via.placeholder.com/36"
    }, { merge: true });

  } catch (err) {
    alert(err.message);
  }
});

// 忘記密碼（Email 登入）
emailLoginBtn.addEventListener("dblclick", async () => {
  const email = prompt("輸入 Email 以重設密碼");
  if (email) {
    try {
        await auth.sendPasswordResetEmail(email);
        alert("已發送重設密碼信件");
    } catch (err) {
        alert(err.message);
    }
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
  
  // 檢查 userTitleInput 是否存在，避免錯誤
  const titleValue = userTitleInput ? userTitleInput.value : "";
  
  await db.collection("users").doc(user.uid).set({
    displayName: displayNameInput.value,
    title: titleValue, // 使用正確的 title value
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
    displayName: userData.displayName || user.displayName || "匿名",
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
    
    // 顯示稱號，如果沒有則顯示空白
    const titleText = data.title ? ` (${data.title})` : ''; 
    
    div.innerHTML = `
      <img class="avatar" src="${data.avatarUrl}">
      <b>${data.displayName}${titleText}</b>
      <p>${data.text}</p>
    `;
    commentList.appendChild(div);
  });
}
