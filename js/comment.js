// Firebase 設定
var firebaseConfig = {
  apiKey: "AIzaSyClktI5_wSo-u9LuwdsBVzH6buizJPXMAs",
  authDomain: "mycomment-ad1ba.firebaseapp.com",
  projectId: "mycomment-ad1ba",
  storageBucket: "mycomment-ad1ba.appspot.com",
  messagingSenderId: "1076313273646",
  appId: "1:1076313273646:web:2b5aaa8c6bd5824828f6bf"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// Google 登入
function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
}

// Email 登入
function emailLogin() {
  const email = prompt("Email");
  const password = prompt("Password");
  auth.signInWithEmailAndPassword(email, password)
    .catch(() => {
      auth.createUserWithEmailAndPassword(email, password);
    });
}

// 登出
function logout() {
  auth.signOut();
}

// 監聽登入狀態
auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("loginArea").classList.add("d-none");
    document.getElementById("userArea").classList.remove("d-none");
    document.getElementById("commentInput").classList.remove("d-none");

    loadUserProfile(user);
  } else {
    document.getElementById("loginArea").classList.remove("d-none");
    document.getElementById("userArea").classList.add("d-none");
    document.getElementById("commentInput").classList.add("d-none");
  }
});

// 載入使用者資料
function loadUserProfile(user) {
  db.collection("users").doc(user.uid).get().then(doc => {
    let data = doc.data() || {};
    document.getElementById("userName").innerText = data.name || user.displayName || "匿名";
    document.getElementById("userAvatar").src =
      data.avatar || user.photoURL || "https://via.placeholder.com/50";
  });
}

// 修改暱稱 / 頭像
function changeProfile() {
  const name = prompt("新的暱稱");
  const avatar = prompt("Cloudinary 圖片網址");

  const user = auth.currentUser;
  db.collection("users").doc(user.uid).set({
    name: name,
    avatar: avatar
  });
}

// 發送留言
function sendComment() {
  const text = document.getElementById("commentText").value;
  const user = auth.currentUser;

  db.collection("comments").add({
    text: text,
    uid: user.uid,
    time: firebase.firestore.FieldValue.serverTimestamp()
  });

  document.getElementById("commentText").value = "";
}

// 顯示留言（不需登入）
db.collection("comments")
  .orderBy("time", "desc")
  .onSnapshot(snapshot => {
    const list = document.getElementById("commentList");
    list.innerHTML = "";

    snapshot.forEach(doc => {
      const data = doc.data();
      list.innerHTML += `
        <div class="border rounded p-2 mb-2">
          <p>${data.text}</p>
        </div>
      `;
    });
  });
