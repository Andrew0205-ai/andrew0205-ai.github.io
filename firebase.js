import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyClktI5_wSo-u9LuwdsBVzH6buizJPXMAs",
  authDomain: "mycomment-ad1ba.firebaseapp.com",
  projectId: "mycomment-ad1ba",
  storageBucket: "mycomment-ad1ba.appspot.com",
  messagingSenderId: "1076313273646",
  appId: "1:1076313273646:web:2b5aaa8c6bd5824828f6bf",
  measurementId: "G-3NGHCWH7TP"
};

// 初始化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// 防 XSS
function sanitize(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 登入 / 登出
window.login = () => signInWithPopup(auth, provider).catch(err => console.error(err));
window.logout = () => signOut(auth).catch(err => console.error(err));

// 送出留言
window.addComment = async () => {
  const messageInput = document.getElementById("message");
  if (!messageInput) return alert("找不到留言欄位！");

  let message = sanitize(messageInput.value.trim());
  if (!message) return alert("請輸入留言內容！");

  const user = auth.currentUser;
  const customName = document.getElementById("custom-name")?.value.trim();
  const customPhoto = document.getElementById("custom-photo-url")?.value.trim();
  const anonymous = document.getElementById("anonymous")?.checked;

  if (!user && !anonymous) return alert("請登入或勾選匿名留言！");

  const commentData = {
    name: anonymous ? "匿名" : (customName || (user ? user.displayName : "訪客")),
    photo: anonymous ? "" : (customPhoto || (user ? user.photoURL : "")),
    message: message,
    uid: user ? user.uid : null,
    timestamp: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "comment"), commentData);
    messageInput.value = "";
  } catch (e) {
    console.error("留言失敗：", e);
  }
};

// 刪除留言
window.deleteComment = async (docId) => {
  if (!confirm("確定要刪除這則留言？")) return;
  try {
    await deleteDoc(doc(db, "comment", docId));
  } catch (e) {
    console.error(e);
    alert("刪除失敗！");
  }
};

// 監聽登入狀態
onAuthStateChanged(auth, user => {
  const userInfo = document.getElementById("user-info");
  const userPhoto = document.getElementById("user-photo");
  const userName = document.getElementById("user-name");
  const loginBox = document.getElementById("login-box");
  const commentBox = document.getElementById("comment-box");

  if (user) {
    if (userPhoto) userPhoto.src = user.photoURL || "";
    if (userName) userName.innerText = `👋 歡迎，${user.displayName}`;
    if (userInfo) userInfo.style.display = "flex";
    if (loginBox) loginBox.style.display = "none";
    if (commentBox) commentBox.style.display = "block";
  } else {
    if (userInfo) userInfo.style.display = "none";
    if (loginBox) loginBox.style.display = "block";
    if (commentBox) commentBox.style.display = "none";
  }
});

// 顯示留言
const messagesDiv = document.getElementById("messages");
const q = query(collection(db, "comment"), orderBy("timestamp", "desc"));
onSnapshot(q, snapshot => {
  if (!messagesDiv) return;
  messagesDiv.innerHTML = "";
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;
    const time = data.timestamp ? data.timestamp.toDate().toLocaleString() : "（時間未知）";

    const div = document.createElement("div");
    div.className = "comment-card";
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <img src="${data.photo || ''}" style="width:32px;height:32px;border-radius:50%;" alt="">
        <b>${sanitize(data.name || "訪客")}</b>
      </div>
      <p>${sanitize(data.message || "")}</p>
      <small>${time}</small>
    `;

    // 刪除按鈕（登入者本人）
    if (data.uid && auth.currentUser && auth.currentUser.uid === data.uid) {
      const delBtn = document.createElement("button");
      delBtn.textContent = "🗑 刪除";
      delBtn.onclick = () => window.deleteComment(id);
      div.appendChild(delBtn);
    }

    messagesDiv.appendChild(div);
  });
});
