// firebase.js (v10 module)
// 匯入 Firebase 套件
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase 設定（請保留）
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
import { getFirestore, collection, addDoc } from "firebase/firestore";
const db = getFirestore(app);


// DOM 元素（確保你的 HTML 有相對應 id）
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");
const userPhoto = document.getElementById("user-photo");
const userName = document.getElementById("user-name");
const loginBox = document.getElementById("login-box");
const commentBox = document.getElementById("comment-box");
const sendBtn = document.getElementById("send-btn");
const messagesDiv = document.getElementById("messages");
const nameInput = document.getElementById("name");
const messageInput = document.getElementById("message");

// --- sanitize 防 XSS（一定要先定義） ---
function sanitize(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- 登入 / 登出 ---
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    signInWithPopup(auth, provider).catch(err => console.error("登入錯誤：", err));
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => signOut(auth).catch(err => console.error("登出錯誤：", err)));
}

// --- 將 addComment 放到全域，對應 HTML 的 onclick（避免 ReferenceError） ---
// 送出留言
window.addComment = function() {
  const messageInput = document.getElementById("message");
  if (!messageInput) {
    console.error("找不到輸入欄位（message）。請確認 HTML id 正確。");
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

  const comment = {
    name: user.displayName,
    photo: user.photoURL,
    message: message,
    uid: user.uid,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection("comments").add(comment)
    .then(() => {
      console.log("留言已送出！");
      messageInput.value = "";
    })
    .catch(error => {
      console.error("留言失敗：", error);
    });
};

// 同時也綁 sendBtn（若你使用 id 綁定）
if (sendBtn) {
  sendBtn.addEventListener("click", () => {
    // 若 HTML 同時有 onclick 和這裡，會呼叫兩次 => 建議僅保留一種
    window.addComment();
  });
}

// --- 刪除留言（若你要） ---
window.deleteComment = async function(docId) {
  if (!confirm("確定要刪除這則留言？")) return;
  try {
    await deleteDoc(doc(db, "comment", docId));
  } catch (e) {
    console.error("刪除失敗：", e);
    alert("刪除失敗");
  }
};

// --- 監聽登入狀態，並切換 UI ---
onAuthStateChanged(auth, user => {
  if (user) {
    if (userPhoto) userPhoto.src = user.photoURL || "";
    if (userName) userName.innerText = `👋 歡迎，${user.displayName || ""}`;
    if (userInfo) userInfo.style.display = "flex";
    if (loginBox) loginBox.style.display = "none";
    if (commentBox) commentBox.style.display = "block";
  } else {
    if (userInfo) userInfo.style.display = "none";
    if (loginBox) loginBox.style.display = "block";
    if (commentBox) commentBox.style.display = "none";
  }
});

// --- 顯示留言（即時） ---
const q = query(collection(db, "comment"), orderBy("timestamp", "desc"));
onSnapshot(q, snapshot => {
  messagesDiv && (messagesDiv.innerHTML = "");
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;
    const time = data.timestamp ? data.timestamp.toDate().toLocaleString() : "（時間未知）";

    // 建立留言卡片
    const div = document.createElement("div");
    div.className = "comment-card";
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <img src="${data.photoURL || ''}" style="width:32px;height:32px;border-radius:50%;" alt="">
        <b>${sanitize(data.name || (data.authorName || "訪客"))}</b>
      </div>
      <p>${sanitize(data.message || "")}</p>
      <small>${time}</small>
    `;

    // 若使用者已登入且為作者，顯示刪除按鈕（前端檢查，真正安全要靠 rules）
    const currentUser = auth.currentUser;
    if (currentUser && data.uid && currentUser.uid === data.uid) {
      const delBtn = document.createElement("button");
      delBtn.textContent = "🗑 刪除";
      delBtn.style.marginLeft = "8px";
      delBtn.onclick = () => window.deleteComment(id);
      div.appendChild(delBtn);
    }

    messagesDiv && messagesDiv.appendChild(div);
  });
});
