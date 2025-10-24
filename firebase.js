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
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// 登入
function login() {
  auth.signInWithPopup(provider)
    .then(result => {
      console.log("登入成功：", result.user.displayName);
    })
    .catch(error => {
      console.error("登入錯誤：", error);
    });
}

// 登出
function logout() {
  auth.signOut();
}

// 監聽登入狀態
auth.onAuthStateChanged(user => {
  const userInfo = document.getElementById("user-info");
  const loginBox = document.getElementById("login-box");
  const commentBox = document.getElementById("comment-box");

  if (user) {
    // 登入後
    document.getElementById("user-photo").src = user.photoURL;
    document.getElementById("user-name").innerText = `👋 歡迎，${user.displayName}`;
    userInfo.style.display = "flex";
    loginBox.style.display = "none";
    commentBox.style.display = "block";
  } else {
    // 登出後
    userInfo.style.display = "none";
    loginBox.style.display = "block";
    commentBox.style.display = "none";
  }
});

// 防止 XSS
function sanitize(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 新增留言
function addComment() {
  const user = auth.currentUser;
  const message = document.getElementById("message").value.trim();

  if (!user) {
    alert("請先登入再留言！");
    return;
  }

  if (!message) {
    alert("請輸入留言內容！");
    return;
  }

  db.collection("comment").add({
    name: user.displayName,
    photo: user.photoURL,
    message: sanitize(message),
    uid: user.uid,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  document.getElementById("message").value = "";
}

// 顯示留言
const messagesDiv = document.getElementById("messages");
db.collection("comment").orderBy("timestamp", "desc").onSnapshot(snapshot => {
  messagesDiv.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const time = data.timestamp ? data.timestamp.toDate().toLocaleString() : "（時間未知）";
    messagesDiv.innerHTML += `
      <div class="comment-card" style="border-bottom:1px solid #ccc;margin-bottom:8px;padding:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <img src="${data.photo || ''}" style="width:30px;height:30px;border-radius:50%;">
          <b>${data.name}</b>
        </div>
        <p>${data.message}</p>
        <small>${time}</small>
      </div>
    `;
  });
});
