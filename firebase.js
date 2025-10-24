// 匯入 Firebase 套件（v10 模組化語法）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// 登入
function login() {
  signInWithPopup(auth, provider)
    .then(result => {
      console.log("登入成功：", result.user.displayName);
    })
    .catch(error => {
      console.error("登入錯誤：", error);
    });
}

// 登出
function logout() {
  signOut(auth);
}

// 監聽登入狀態
onAuthStateChanged(auth, user => {
  const userInfo = document.getElementById("user-info");
  const loginBox = document.getElementById("login-box");
  const commentBox = document.getElementById("comment-box");

  if (user) {
    document.getElementById("user-photo").src = user.photoURL;
    document.getElementById("user-name").innerText = `👋 歡迎，${user.displayName}`;
    userInfo.style.display = "flex";
    loginBox.style.display = "none";
    commentBox.style.display = "block";
  } else {
    userInfo.style.display = "none";
    loginBox.style.display = "block";
    commentBox.style.display = "none";
  }
});

