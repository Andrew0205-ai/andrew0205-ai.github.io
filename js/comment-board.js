import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, orderBy, query, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase 初始化
const firebaseConfig = {
  apiKey: "AIzaSyClktI5_wSo-u9LuwdsBVzH6buizJPXMAs",
  authDomain: "mycomment-ad1ba.firebaseapp.com",
  projectId: "mycomment-ad1ba",
  storageBucket: "mycomment-ad1ba.appspot.com",
  messagingSenderId: "1076313273646",
  appId: "1:1076313273646:web:2b5aaa8c6bd5824828f6bf",
  measurementId: "G-3NGHCWH7TP"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 元素
const googleLoginBtn = document.getElementById("google-login");
const emailLoginBtn = document.getElementById("email-login");
const registerBtn = document.getElementById("register");
const logoutBtn = document.getElementById("logout");
const userInfo = document.getElementById("user-info");
const displayNameInput = document.getElementById("display-name-input");
const userAvatar = document.getElementById("user-avatar");
const avatarUpload = document.getElementById("avatar-upload");
const saveProfileBtn = document.getElementById("save-profile");
const commentInput = document.getElementById("comment-input");
const postCommentBtn = document.getElementById("post-comment");
const commentList = document.getElementById("comment-list");

// 顯示使用者資料
async function showUserData(user) {
  const docSnap = await getDoc(doc(db, "users", user.uid));
  const data = docSnap.exists() ? docSnap.data() : {};
  displayNameInput.value = data.displayName || user.displayName || "";
  userAvatar.src = data.avatarUrl || user.photoURL || "https://via.placeholder.com/36";
  userInfo.classList.remove("d-none");
}

// 登入狀態監控
onAuthStateChanged(auth, async user => {
  if (user) {
    googleLoginBtn.classList.add("d-none");
    emailLoginBtn.classList.add("d-none");
    registerBtn.classList.add("d-none");
    logoutBtn.classList.remove("d-none");
    await showUserData(user);
    await loadComments();
  } else {
    googleLoginBtn.classList.remove("d-none");
    emailLoginBtn.classList.remove("d-none");
    registerBtn.classList.remove("d-none");
    logoutBtn.classList.add("d-none");
    userInfo.classList.add("d-none");
    commentList.innerHTML = "";
  }
});

// Google 登入
googleLoginBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
});

// Email 登入
emailLoginBtn.addEventListener("click", async () => {
  const email = prompt("輸入 Email");
  const password = prompt("輸入密碼");
  if (!email || !password) return;
  try { await signInWithEmailAndPassword(auth, email, password); } 
  catch(err) { alert(err.message); }
});

// 註冊
registerBtn.addEventListener("click", async () => {
  const email = prompt("輸入 Email");
  const password = prompt("輸入密碼");
  if (!email || !password) return;
  try {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const user = res.user;
    const displayName = prompt("請輸入暱稱");
    await setDoc(doc(db, "users", user.uid), { displayName, avatarUrl: user.photoURL || "https://via.placeholder.com/36" });
    alert("註冊成功！");
  } catch(err) { alert(err.message); }
});

// 登出
logoutBtn.addEventListener("click", () => signOut(auth));

// 儲存個人資料
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  let avatarUrl = userAvatar.src;
  const file = avatarUpload.files[0];
  if(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset","ml_default");
    const res = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", {method:"POST", body:formData});
    const data = await res.json();
    avatarUrl = data.secure_url;
    userAvatar.src = avatarUrl;
  }
  await setDoc(doc(db, "users", user.uid), { displayName: displayNameInput.value, avatarUrl }, { merge:true });
  alert("資料已儲存！");
});

// 發佈留言
postCommentBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if(!user) return alert("請先登入");
  const text = commentInput.value.trim();
  if(!text) return;
  await addDoc(collection(db, "comments"), {
    uid: user.uid,
    displayName: displayNameInput.value || "匿名",
    avatarUrl: userAvatar.src,
    text,
    createdAt: serverTimestamp()
  });
  commentInput.value = "";
  await loadComments();
});

// 刪除留言
async function deleteComment(commentId) {
  const user = auth.currentUser;
  if(!user) return alert("請先登入");
  if(!confirm("確定要刪除留言？")) return;
  await deleteDoc(doc(db, "comments", commentId));
  await loadComments();
}

// 載入留言
async function loadComments() {
  const q = query(collection(db, "comments"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  const user = auth.currentUser;
  commentList.innerHTML = "";
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.classList.add("comment-card");
    let deleteBtnHTML = "";
    if(user && user.uid === data.uid) deleteBtnHTML = `<button class="delete-comment-btn">刪除留言</button>`;
    div.innerHTML = `
      <img class="avatar" src="${data.avatarUrl}">
      <div class="user-info"><b>${data.displayName}</b></div>
      <p class="comment-text">${data.text}</p>
      <div class="comment-footer">${deleteBtnHTML}<span class="comment-timestamp">${data.createdAt ? new Date(data.createdAt.seconds*1000).toLocaleString('zh-TW',{hour12:false}) : '剛剛'}</span></div>
    `;
    commentList.appendChild(div);
    if(deleteBtnHTML) div.querySelector(".delete-comment-btn").addEventListener("click", ()=>deleteComment(docSnap.id));
  });
}
