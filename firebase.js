// ====================== Firebase.js (v10 模組化版本) ======================

// 匯入 Firebase 套件
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔧 Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyClktI5_wSo-u9LuwdsBVzH6buizJPXMAs",
  authDomain: "mycomment-ad1ba.firebaseapp.com",
  projectId: "mycomment-ad1ba",
  storageBucket: "mycomment-ad1ba.appspot.com",
  messagingSenderId: "1076313273646",
  appId: "1:1076313273646:web:2b5aaa8c6bd5824828f6bf",
  measurementId: "G-3NGHCWH7TP"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- 防止 XSS 攻擊 ---
function sanitize(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// === 登入 ===
window.login = function() {
  signInWithPopup(auth, provider)
    .then(result => {
      console.log("登入成功：", result.user.displayName);
    })
    .catch(error => {
      console.error("登入錯誤：", error);
    });
};

// === 登出 ===
window.logout = function() {
  signOut(auth).catch(error => console.error("登出錯誤：", error));
};

// === 新增留言 ===
window.addComment = async function() {
  const messageInput = document.getElementById("message");
  if (!messageInput) {
    console.error("❌ 找不到輸入欄位（message）。請確認 HTML id 正確。");
    return;
  }

  const message = sanitize(messageInput.value.trim());
  if (!message) {
    alert("請輸入留言內容！");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("請先登入再留言！");
    return;
  }

  try {
    await addDoc(collection(db, "comment"), {
      name: user.displayName,
      photo: user.photoURL,
      message: message,
      uid: user.uid,
      timestamp: serverTimestamp()
    });
    console.log("留言已送出！");
    messageInput.value = "";
  } catch (error) {
    console.error("留言失敗：", error);
  }
};

// === 刪除留言 ===
window.deleteComment = async function(docId) {
  if (!confirm("確定要刪除這則留言？")) return;
  try {
    await deleteDoc(doc(db, "comment", docId));
    console.log("留言已刪除：", docId);
  } catch (e) {
    console.error("刪除失敗：", e);
    alert("刪除留言時發生錯誤！");
  }
};

// === 監聽登入狀態並更新畫面 ===
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

// === 即時顯示留言 ===
const messagesDiv = document.getElementById("messages");
const q = query(collection(db, "comment"), orderBy("timestamp", "desc"));

onSnapshot(q, snapshot => {
  if (!messagesDiv) return;
  messagesDiv.innerHTML = "";

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;
    const time = data.timestamp
      ? data.timestamp.toDate().toLocaleString()
      : "（時間未知）";

    // 建立留言卡片
    const div = document.createElement("div");
    div.className = "comment-card";
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <img src="${data.photo || ""}" style="width:32px;height:32px;border-radius:50%;" alt="">
        <b>${sanitize(data.name || "訪客")}</b>
      </div>
      <p>${sanitize(data.message || "")}</p>
      <small>${time}</small>
    `;

    // 若為留言者本人則顯示刪除按鈕
    const currentUser = auth.currentUser;
    if (currentUser && data.uid === currentUser.uid) {
      const delBtn = document.createElement("button");
      delBtn.textContent = "🗑 刪除";
      delBtn.onclick = () => window.deleteComment(id);
      div.appendChild(delBtn);
    }

    messagesDiv.appendChild(div);
  });
});
