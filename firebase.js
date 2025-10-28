// firebase.js
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

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 登入監聽
auth.onAuthStateChanged(user => {
  if (user) {
    console.log("已登入：", user.email);
  } else {
    console.log("未登入");
  }
});

// 新增留言
async function addComment(content) {
  const user = auth.currentUser;
  if (!user) {
    alert("請先登入再留言！");
    return;
  }

  await db.collection("comments").add({
    uid: user.uid,
    email: user.email,
    content: content,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
  alert("留言已送出！");
}

// 取得留言
async function loadComments() {
  const container = document.getElementById("comment-list");
  container.innerHTML = "";
  const snapshot = await db.collection("comments").orderBy("timestamp", "desc").get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.className = "comment";
    div.textContent = `${data.email}: ${data.content}`;
    container.appendChild(div);
  });
}

//  登入、登出
function loginEmail(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}
function logout() {
  auth.signOut();
  alert("已登出");
}