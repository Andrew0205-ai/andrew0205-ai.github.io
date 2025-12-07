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
  
  if (!email || !password) return;

  try {
    const res = await auth.createUserWithEmailAndPassword(email, password);
    const user = res.user;

    alert("註冊成功！請設定您的暱稱與稱號。");

    const initialDisplayName = prompt("請輸入您的暱稱 (必填)");
    const initialTitle = prompt("請輸入您的稱號 (可選)");

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
  
  const titleValue = userTitleInput ? userTitleInput.value : "";
  
  await db.collection("users").doc(user.uid).set({
    displayName: displayNameInput.value,
    title: titleValue,
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

// ⭐ 新增功能：刪除留言函式
async function deleteComment(commentId) {
    const user = auth.currentUser;
    if (!user) {
        alert("請先登入！");
        return;
    }
    
    if (confirm("確定要刪除這則留言嗎？此操作無法復原。")) {
        try {
            await db.collection("comments").doc(commentId).delete();
            alert("留言已刪除！");
            loadComments(); // 重新載入留言列表以更新 UI
        } catch (error) {
            console.error("刪除留言失敗: ", error);
            alert("刪除留言失敗，請檢查權限或網路連線。");
        }
    }
}

// 載入留言 (已修改以實現新的排版結構)
async function loadComments() {
  const snapshot = await db.collection("comments").orderBy("createdAt", "desc").get();
  commentList.innerHTML = "";
  
  const currentUser = auth.currentUser;

  snapshot.forEach(doc => {
    const data = doc.data();
    const commentId = doc.id;
    const isAuthor = currentUser && currentUser.uid === data.uid;
    
    // 處理時間戳記 (如果存在，格式化為易讀的格式)
    const timestamp = data.createdAt ? 
      new Date(data.createdAt.seconds * 1000).toLocaleString('zh-TW', { hour12: false }) : 
      '剛剛';

    const div = document.createElement("div");
    div.classList.add("comment-card");
    
    const titleText = data.title ? ` (${data.title})` : ''; 
    
    // ⭐ 建立刪除按鈕的 HTML
    let deleteButtonHTML = '';
    if (isAuthor) {
        deleteButtonHTML = `<button class="delete-comment-btn" data-comment-id="${commentId}">刪除留言</button>`;
    }
    
    // ⭐ 新的 HTML 結構
    div.innerHTML = `
      <div class="comment-header">
        <img class="avatar" src="${data.avatarUrl}">
        <div class="user-info">
          <span class="user-name-title"><b>${data.displayName}</b>${titleText}</span>
        </div>
      </div>
      <p class="comment-text">${data.text}</p>
      <div class="comment-footer">
          ${deleteButtonHTML} 
          <span class="comment-timestamp">${timestamp}</span>
      </div>
    `;
    
    commentList.appendChild(div);

    // 為動態生成的刪除按鈕添加事件監聽器
    if (isAuthor) {
        const deleteBtn = div.querySelector('.delete-comment-btn');
        deleteBtn.addEventListener('click', () => deleteComment(commentId));
    }
  });
}
    // ⭐ 建立刪除按鈕的 HTML
    let deleteButtonHTML = '';
    if (isAuthor) {
        // 使用 data-comment-id 儲存 ID，方便稍後找到並添加事件
        deleteButtonHTML = `<button class="delete-comment-btn" data-comment-id="${commentId}">刪除</button>`;
    }
    
    div.innerHTML = `
      <div class="comment-header">
        <img class="avatar" src="${data.avatarUrl}">
        <b>${data.displayName}${titleText}</b>
        ${deleteButtonHTML} 
      </div>
      <p>${data.text}</p>
    `;
    
    commentList.appendChild(div);

    // ⭐ 為動態生成的刪除按鈕添加事件監聽器
    if (isAuthor) {
        const deleteBtn = div.querySelector('.delete-comment-btn');
        deleteBtn.addEventListener('click', () => deleteComment(commentId));
    }
  });
}
