import { auth, db } from "./firebase.js";

import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

/* DOM */
const textarea = document.getElementById("comment-input");
const postBtn = document.getElementById("post-comment");
const commentList = document.getElementById("comment-list");
const logoutBtn = document.getElementById("logout");

/* 登入狀態 */
onAuthStateChanged(auth, user => {
  if (user) {
    textarea.disabled = false;
    postBtn.disabled = false;
    logoutBtn.classList.remove("d-none");
  } else {
    textarea.disabled = true;
    postBtn.disabled = true;
    logoutBtn.classList.add("d-none");
  }
});

/* 送出留言 */
postBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) {
    alert("請先登入");
    return;
  }

  const text = textarea.value.trim();
  if (!text) return;

  await addDoc(collection(db, "comments"), {
    uid: user.uid,
    text: text,
    time: serverTimestamp()
  });

  textarea.value = "";
});

/* 顯示留言（所有人） */
const q = query(
  collection(db, "comments"),
  orderBy("time", "desc")
);

onSnapshot(q, snapshot => {
  commentList.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.className = "border rounded p-2 mb-2";
    div.textContent = data.text;
    commentList.appendChild(div);
  });
});

/* 登出 */
logoutBtn.addEventListener("click", () => {
  auth.signOut();
});
