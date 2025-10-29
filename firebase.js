// firebase.js
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

// ---------------------------
// 🚀 初始化 Firebase
// ---------------------------
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ---------------------------
// 👀 登入狀態監聽
// ---------------------------
auth.onAuthStateChanged(user => {
  if (user) {
    console.log("✅ 已登入：", user.email);
    const userInfo = document.getElementById("user-info");
    if (userInfo) userInfo.textContent = `登入中：${user.email}`;
  } else {
    console.log("🚫 未登入");
    const userInfo = document.getElementById("user-info");
    if (userInfo) userInfo.textContent = "未登入";
  }
});

// ---------------------------
// 💬 新增留言
// ---------------------------
async function addComment(content) {
  const user = auth.currentUser;
  if (!user) {
    alert("請先登入再留言！");
    return;
  }

  try {
    await db.collection("comments").add({
      uid: user.uid,
      email: user.email,
      content: content,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("留言已送出！");
    loadComments();
  } catch (error) {
    console.error("留言失敗：", error);
    alert("留言失敗：" + error.message);
  }
}

// ---------------------------
// 📖 取得留言
// ---------------------------
async function loadComments() {
  const container = document.getElementById("comment-list");
  if (!container) return;

  container.innerHTML = "<p>載入中...</p>";
  try {
    const snapshot = await db.collection("comments").orderBy("timestamp", "desc").get();
    container.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement("div");
      div.className = "comment";
      div.innerHTML = `<strong>${data.email}</strong>：${data.content}`;
      container.appendChild(div);
    });
  } catch (error) {
    console.error("留言載入失敗：", error);
    container.innerHTML = "<p>無法載入留言。</p>";
  }
}

// ---------------------------
// 🔑 登入 / 登出功能
// ---------------------------
function loginEmail(email, password) {
  return auth.signInWithEmailAndPassword(email, password)
    .then(() => alert("登入成功！"))
    .catch(err => alert("登入失敗：" + err.message));
}

function registerEmail(email, password) {
  return auth.createUserWithEmailAndPassword(email, password)
    .then(() => alert("註冊成功！"))
    .catch(err => alert("註冊失敗：" + err.message));
}

function logout() {
  auth.signOut();
  alert("已登出");
}

