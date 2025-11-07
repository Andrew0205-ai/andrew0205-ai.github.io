// comment-board.js
// ---------------------------
// 🔧 Firebase 設定
// ---------------------------
const firebaseConfig = {
apiKey: "AIzaSyClktI5_wSo-u9LuwdsBVzH6buizJPXMAs",
authDomain: "mycomment-ad1ba.firebaseapp.com",
projectId: "mycomment-ad1ba",
storageBucket: "mycomment-ad1ba.appspot.com",
messagingSenderId: "1076313273646",
appId: "1:1076313273646:web:2b5aaa8c6bd5824828f6bf",
measurementId: "G-3NGHCWH7TP"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// 🚀 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------------------------
// 👀 DOM 元素
// ---------------------------
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');
const userPhoto = document.getElementById('user-photo');
const userName = document.getElementById('user-name');
const commentBox = document.getElementById('comment-box');
const commentInput = document.getElementById('comment-input');
const sendBtn = document.getElementById('send-btn');
const commentList = document.getElementById('comment-list');

// ---------------------------
// 🔑 登入 / 登出
// ---------------------------
loginBtn?.addEventListener('click', async () => {
const provider = new GoogleAuthProvider();
try {
await signInWithPopup(auth, provider);
} catch (err) {
alert("登入失敗：" + err.message);
}
});

logoutBtn?.addEventListener('click', async () => {
await signOut(auth);
});

// ---------------------------
// 👀 監聽登入狀態
// ---------------------------
onAuthStateChanged(auth, user => {
if (user) {
loginBtn.style.display = 'none';
logoutBtn.style.display = 'inline-block';
userInfo.classList.remove('hidden');
userPhoto.src = user.photoURL || 'default-avatar.png';
userName.textContent = user.displayName || user.email;
commentBox.style.display = 'block';
loadComments();
} else {
loginBtn.style.display = 'inline-block';
logoutBtn.style.display = 'none';
userInfo.classList.add('hidden');
commentBox.style.display = 'none';
loadComments();
}
});

// ---------------------------
// 💬 送出留言
// ---------------------------
sendBtn?.addEventListener('click', async () => {
const user = auth.currentUser;
const content = commentInput.value.trim();
if (!content) return alert("請輸入留言內容！");
if (!user) return alert("請先登入！");

try {
await addDoc(collection(db, "comments"), {
text: content,
userEmail: user.email,
userName: user.displayName || "匿名",
userPhoto: user.photoURL || "default-avatar.png",
time: serverTimestamp()
});
commentInput.value = '';
loadComments();
} catch (err) {
console.error(err);
alert("留言失敗：" + err.message);
}
});

// ---------------------------
// 📖 載入留言
// ---------------------------
async function loadComments() {
if (!commentList) return;
commentList.innerHTML = "<p>載入中...</p>";

try {
const q = query(collection(db, "comments"), orderBy("time", "desc"));
const snapshot = await getDocs(q);
commentList.innerHTML = "";

snapshot.forEach(docItem => {
  const data = docItem.data();
  const div = document.createElement('div');
  div.classList.add('comment-item');
  div.innerHTML = `
    <img src="${data.userPhoto}" alt="頭像" class="avatar-small">
    <strong>${data.userName}</strong>
    <p>${data.text}</p>
    <small>${data.time?.toDate ? data.time.toDate().toLocaleString() : ''}</small>
  `;

  // 如果是留言作者，可以刪除
  if (auth.currentUser && auth.currentUser.email === data.userEmail) {
    const delBtn = document.createElement('button');
    delBtn.textContent = "刪除";
    delBtn.addEventListener('click', async () => {
      try {
        await deleteDoc(doc(db, "comments", docItem.id));
        loadComments();
      } catch (err) {
        console.error(err);
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

// ---------------------------
// 🖌 更新使用者資料（自訂名稱與頭像）
// ---------------------------
window.updateProfileInfo = async (name, photoURL) => {
const user = auth.currentUser;
if (!user) return;
try {
await updateProfile(user, { displayName: name, photoURL: photoURL });
userPhoto.src = photoURL;
userName.textContent = name;
} catch (err) {
console.error(err);
alert("更新資料失敗：" + err.message);
}
};