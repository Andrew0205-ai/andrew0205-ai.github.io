import { auth, db } from "./firebase.js";
import {
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* ===== DOM ===== */
const googleLoginBtn = document.getElementById("google-login");
const emailLoginBtn = document.getElementById("email-login");
const logoutBtn = document.getElementById("logoutBtn");

const userArea = document.getElementById("userArea");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");

const commentInput = document.getElementById("comment-input");
const postBtn = document.getElementById("post-comment");
const commentList = document.getElementById("commentList");

let currentUser = null;

/* ===== 登入/登出按鈕事件 ===== */
googleLoginBtn.addEventListener("click", () => googleLogin());
emailLoginBtn.addEventListener("click", () => emailLogin());

logoutBtn.addEventListener("click", async () => {
  if (!currentUser) return;
  try {
    await signOut(auth);
    alert("已登出！");
  } catch (err) {
    console.error(err);
  }
});

/* ===== 登入狀態監聽 ===== */
onAuthStateChanged(auth, user => {
  currentUser = user;

  if (user && user.emailVerified) {
    userArea.classList.remove("d-none");
    userAvatar.src = user.photoURL || "images/default-avatar.png";
    userName.textContent = user.displayName || "未命名使用者";

    commentInput.disabled = false;
    postBtn.disabled = false;

    googleLoginBtn.classList.add("d-none");
    emailLoginBtn.classList.add("d-none");
    logoutBtn.classList.remove("d-none");
  } else {
    userArea.classList.add("d-none");

    commentInput.disabled = true;
    postBtn.disabled = true;

    googleLoginBtn.classList.remove("d-none");
    emailLoginBtn.classList.remove("d-none");
    logoutBtn.classList.add("d-none");
  }
});

/* ===== 點暱稱修改 ===== */
userName.addEventListener("click", async () => {
  if (!currentUser) return;

  const newName = prompt("請輸入新的暱稱：", currentUser.displayName || "");
  if (!newName) return;

  await updateProfile(currentUser, { displayName: newName });
  userName.textContent = newName;
});

/* ===== 點頭像修改 ===== */
userAvatar.addEventListener("click", () => {
  if (!currentUser) return;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", "YOUR_UPLOAD_PRESET");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload",
      { method: "POST", body: fd }
    );

    const data = await res.json();
    await updateProfile(currentUser, { photoURL: data.secure_url });
    userAvatar.src = data.secure_url;
  };

  input.click();
});

/* ===== 送出留言 ===== */
postBtn.addEventListener("click", async () => {
  if (!currentUser) return;
  const text = commentInput.value.trim();
  if (!text) return;

  await addDoc(collection(db, "comments"), {
    text,
    uid: currentUser.uid,
    name: currentUser.displayName,
    avatar: currentUser.photoURL,
    createdAt: serverTimestamp()
  });

  commentInput.value = "";
});

/* ===== 顯示留言（即時）+ 編輯/刪除 ===== */
const q = query(collection(db, "comments"), orderBy("createdAt", "desc"));

onSnapshot(q, snapshot => {
  commentList.innerHTML = "";

  snapshot.forEach(docSnap => {
    const c = docSnap.data();
    const id = docSnap.id;

    const div = document.createElement("div");
    div.className = "card p-2 mb-2";

    div.innerHTML = `
      <div class="d-flex align-items-center mb-1">
        <img src="${c.avatar || 'images/default-avatar.png'}" width="32" class="rounded-circle me-2">
        <strong>${c.name || "匿名"}</strong>
      </div>
      <p class="mb-1">${c.text}</p>
    `;

    if (currentUser && currentUser.uid === c.uid) {
      const editBtn = document.createElement("button");
      editBtn.textContent = "編輯";
      editBtn.className = "btn btn-sm btn-primary me-1";
      editBtn.onclick = async () => {
        const newText = prompt("修改留言內容：", c.text);
        if (!newText || newText === c.text) return;
        await updateDoc(doc(db, "comments", id), { text: newText });
      };

      const delBtn = document.createElement("button");
      delBtn.textContent = "刪除";
      delBtn.className = "btn btn-sm btn-danger";
      delBtn.onclick = async () => {
        if (confirm("確定要刪除這則留言？")) {
          await deleteDoc(doc(db, "comments", id));
        }
      };

      div.appendChild(editBtn);
      div.appendChild(delBtn);
    }

    commentList.appendChild(div);
  });
});
