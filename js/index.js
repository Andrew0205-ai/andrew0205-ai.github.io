import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {

  /* DOM */
  const textarea = document.getElementById("comment-input");
  const postBtn = document.getElementById("post-comment");
  const commentList = document.getElementById("comment-list");
  const logoutBtn = document.getElementById("logout");
  const googleLoginBtn = document.getElementById("google-login");

  /* 初始化狀態 */
  textarea.disabled = true;
  postBtn.disabled = true;

  /* 登入狀態監控 */
  onAuthStateChanged(auth, user => {
    if (user) {
      textarea.disabled = false;
      postBtn.disabled = false;
      logoutBtn.classList.remove("d-none");
      googleLoginBtn.classList.add("d-none");
    } else {
      textarea.disabled = true;
      postBtn.disabled = true;
      logoutBtn.classList.add("d-none");
      googleLoginBtn.classList.remove("d-none");
    }
  });

  /* Google 登入 */
  googleLoginBtn.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      alert("登入失敗：" + err.message);
    }
  });

  /* 登出 */
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
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
      name: user.displayName || "匿名",
      avatar: user.photoURL || "",
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
      div.className = "border rounded p-2 mb-2 d-flex align-items-start gap-2";

      // 頭像
      const img = document.createElement("img");
      img.src = data.avatar || "images/andrew.png";
      img.alt = "頭像";
      img.className = "rounded-circle";
      img.style.width = "40px";
      img.style.height = "40px";

      // 名稱 + 內容
      const contentDiv = document.createElement("div");
      const nameP = document.createElement("p");
      nameP.className = "mb-1 fw-bold";
      nameP.textContent = data.name || "匿名";

      const textP = document.createElement("p");
      textP.className = "mb-0";
      textP.textContent = data.text;

      contentDiv.appendChild(nameP);
      contentDiv.appendChild(textP);

      div.appendChild(img);
      div.appendChild(contentDiv);

      commentList.appendChild(div);
    });
  });

});
