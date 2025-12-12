// ================================================
// 🔐 安全初始化 Firebase（避免 IndexedDB 問題）
// ================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyClktI5_wSo-u9LuwdsBVzH6buizJPXMAs",
  authDomain: "mycomment-ad1ba.firebaseapp.com",
  projectId: "mycomment-ad1ba",
  storageBucket: "mycomment-ad1ba.appspot.com",
  messagingSenderId: "1076313273646",
  appId: "1:1076313273646:web:2b5aaa8c6bd5824828f6bf",
  measurementId: "G-3NGHCWH7TP"
};

let app, auth, db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("✅ Firebase 初始化成功");
} catch (err) {
  console.warn("⚠ Firebase 初始化失敗，可能是隱私模式或 IndexedDB 問題", err);
  // fallback：僅提供登入/註冊介面但不操作 Firestore
}


// ================================
//  監聽登入狀態
// ================================
auth.onAuthStateChanged((user) => {
  if (user) {
    loadComments();
  } else {
    console.log("使用者未登入");
  }
});

// ================================
//  發送留言
// ================================
async function sendComment() {
  const input = document.getElementById("commentInput");
  const text = input.value.trim();
  const user = auth.currentUser;

  if (!user) {
    alert("請先登入！");
    return;
  }

  if (text === "") {
    alert("不能送出空白留言！");
    return;
  }

  await db.collection("comments").add({
    text: text,
    uid: user.uid,
    name: user.displayName || "匿名",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  input.value = "";
  loadComments();
}

// ================================
//  顯示留言
// ================================
async function loadComments() {
  const list = document.getElementById("commentList");
  list.innerHTML = "";

  const snapshot = await db.collection("comments")
    .orderBy("createdAt", "desc")
    .get();

  snapshot.forEach((doc) => {
    const data = doc.data();
    const div = document.createElement("div");
    div.className = "comment-item";

    const canDelete = auth.currentUser && auth.currentUser.uid === data.uid;

    div.innerHTML = `
      <p class="comment-text">${data.text}</p>
      <p class="comment-author">— ${data.name}</p>
      ${
        canDelete
          ? `<button class="delete-btn" onclick="deleteComment('${doc.id}')">
               ❌ 刪除
             </button>`
          : ""
      }
    `;

    list.appendChild(div);
  });
}

// ================================
//  刪除留言（僅本人）
// ================================
async function deleteComment(id) {
  const user = auth.currentUser;
  if (!user) return;

  const docRef = await db.collection("comments").doc(id).get();

  if (docRef.data().uid !== user.uid) {
    alert("只能刪除自己的留言！");
    return;
  }

  await db.collection("comments").doc(id).delete();
  loadComments();
}
