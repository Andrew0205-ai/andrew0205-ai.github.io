document.addEventListener("DOMContentLoaded", () => {

  // ===== DOM =====
  const googleLoginBtn = document.getElementById("googleLoginBtn");
  const emailLoginBtn = document.getElementById("emailLoginBtn");
  const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const userArea = document.getElementById("userArea");
  const userAvatar = document.getElementById("userAvatar");
  const userName = document.getElementById("userName");

  const commentInput = document.getElementById("comment-input");
  const postBtn = document.getElementById("post-comment");
  const commentList = document.getElementById("commentList");

  let currentUser = null;

  // ===== Firebase 初始化 =====
  import { auth, db } from "./firebase.js";
  import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    signOut,
    updateProfile,
    onAuthStateChanged
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

  import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

  // ===== 綁定事件 =====
  if (googleLoginBtn) googleLoginBtn.addEventListener("click", googleLogin);
  if (emailLoginBtn) emailLoginBtn.addEventListener("click", emailLogin);
  if (forgotPasswordBtn) forgotPasswordBtn.addEventListener("click", forgotPassword);
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  if (userName) userName.addEventListener("click", editDisplayName);
  if (userAvatar) userAvatar.addEventListener("click", editAvatar);

  if (postBtn) postBtn.addEventListener("click", postComment);

  // ===== 登入 / 登出 =====
  async function googleLogin() {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      alert("Google 登入成功！");
    } catch (err) {
      alert("登入失敗：" + err.message);
    }
  }

  async function emailLogin() {
    const action = prompt("輸入 1 登入 / 2 註冊");
    if (!action) return;

    const email = prompt("請輸入 Email：");
    const password = prompt("請輸入密碼：");
    if (!email || !password) return;

    try {
      if (action === "1") {
        await signInWithEmailAndPassword(auth, email, password);
        alert("登入成功！");
      } else if (action === "2") {
        const displayName = prompt("請輸入暱稱：");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        await sendEmailVerification(userCredential.user);
        alert("註冊成功！請到 Email 驗證後再登入。");
      } else {
        alert("無效操作");
      }
    } catch (err) {
      alert("操作失敗：" + err.message);
    }
  }

  async function forgotPassword() {
    const email = prompt("請輸入你的 Email，用來重設密碼：");
    if (!email) return;
    try {
      await sendPasswordResetEmail(auth, email);
      alert("已寄送重設密碼信到 " + email + "，請前往收信並重設密碼！");
    } catch (err) {
      alert("重設密碼失敗：" + err.message);
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      alert("已登出！");
    } catch (err) {
      alert("登出失敗：" + err.message);
    }
  }

  // ===== 登入狀態監聽 =====
  onAuthStateChanged(auth, user => {
    currentUser = user;

    if (user && user.emailVerified) {
      userArea?.classList.remove("d-none");
      userAvatar.src = user.photoURL || "images/default-avatar.png";
      userName.textContent = user.displayName || "未命名使用者";

      commentInput.disabled = false;
      postBtn.disabled = false;

      googleLoginBtn?.classList.add("d-none");
      emailLoginBtn?.classList.add("d-none");
      forgotPasswordBtn?.classList.add("d-none");
      logoutBtn?.classList.remove("d-none");
    } else {
      userArea?.classList.add("d-none");

      commentInput.disabled = true;
      postBtn.disabled = true;

      googleLoginBtn?.classList.remove("d-none");
      emailLoginBtn?.classList.remove("d-none");
      forgotPasswordBtn?.classList.remove("d-none");
      logoutBtn?.classList.add("d-none");
    }
  });

  // ===== 編輯暱稱 =====
  async function editDisplayName() {
    if (!currentUser) return;
    const newName = prompt("請輸入新的暱稱：", currentUser.displayName || "");
    if (!newName) return;
    await updateProfile(currentUser, { displayName: newName });
    userName.textContent = newName;
  }

  // ===== 編輯頭像 =====
  function editAvatar() {
    if (!currentUser) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "YOUR_UPLOAD_PRESET"); // Cloudinary 上設定

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload",
        { method: "POST", body: fd }
      );
      const data = await res.json();
      await updateProfile(currentUser, { photoURL: data.secure_url });
      userAvatar.src = data.secure_url;
    };

    input.click();
  }

  // ===== 送出留言 =====
  async function postComment() {
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
  }

  // ===== 顯示留言 + 編輯 / 刪除 =====
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

});
