
// firebase.js
export const firebaseConfig = {
  apiKey: "AIzaSyClktI5_wSo-u9LuwdsBVzH6buizJPXMAs",
  authDomain: "mycomment-ad1ba.firebaseapp.com",
  projectId: "mycomment-ad1ba",
  storageBucket: "mycomment-ad1ba.appspot.com",
  messagingSenderId: "1076313273646",
  appId: "1:1076313273646:web:2b5aaa8c6bd5824828f6bf",
  measurementId: "G-3NGHCWH7TP"
};
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase.js";

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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

// 送出留言
sendBtn.addEventListener("click", async () => {
  const content = commentInput.value.trim();
  if (!content) return alert("請輸入留言內容！");
  const user = auth.currentUser;
  if (!user) return alert("請先登入！");
  try {
    await addDoc(collection(db, "comments"), {
      uid: user.uid,
      nickname: anonymousCheckbox.checked ? "匿名" : (user.displayName || user.email),
      avatarUrl: anonymousCheckbox.checked ? "default-avatar.png" : (user.photoURL || "default-avatar.png"),
      content,
      timestamp: serverTimestamp()
    });
    commentInput.value = "";
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
    userNameEl.textContent = user.displayName || user.email;
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
        <small>${data.timestamp?.toDate().toLocaleString() || ""}</small>
      `;

      // 刪除按鈕（僅本人可見）
      if (currentUser && data.uid === currentUser.uid) {
        const delBtn = document.createElement("button");
        delBtn.textContent = "刪除";
        delBtn.className = "delete-btn";
        delBtn.addEventListener("click", async () => {
          if (confirm("確定要刪除這則留言嗎？")) {
            await deleteDoc(doc(db, "comments", docSnap.id));
            loadComments();
          }
        });
        div.appendChild(delBtn);
      }

      commentList.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    commentList.innerHTML = "<p>無法載入留言。</p>";
  }
}