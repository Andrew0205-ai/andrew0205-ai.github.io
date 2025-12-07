// js/comment-board.js
import { auth, db } from "./firebase.js";
import {
  signInWithPopup, GoogleAuthProvider,
  signOut, onAuthStateChanged, updateProfile,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, reload
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ---------- Cloudinary 設定（請確認 cloud name 與 preset） ---------- */
const CLOUD_NAME = "df0hlwcrd";     // 你給的 cloud name
const UPLOAD_PRESET = "guest-upload"; // unsigned preset

/* ---------- 元素綁定（等 DOM） ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const googleLoginBtn = document.getElementById("google-login-btn");
  const showEmailFormBtn = document.getElementById("show-email-form-btn");
  const emailForm = document.getElementById("email-form");
  const emailLoginBtn = document.getElementById("email-login-btn");
  const emailRegisterBtn = document.getElementById("email-register-btn");
  const forgotBtn = document.getElementById("forgot-btn");
  const emailInput = document.getElementById("email-input");
  const passwordInput = document.getElementById("password-input");

  const userInfo = document.getElementById("user-info");
  const userPhoto = document.getElementById("user-photo");
  const userNameEl = document.getElementById("user-name");
  const nicknameInput = document.getElementById("nickname-input");
  const avatarUpload = document.getElementById("avatar-upload");
  const uploadBtn = document.getElementById("upload-btn");
  const updateProfileBtn = document.getElementById("update-profile-btn");
  const logoutBtn = document.getElementById("logout-btn");

  const commentBox = document.getElementById("comment-box");
  const commentInput = document.getElementById("comment-input");
  const anonymousCheckbox = document.getElementById("anonymous-checkbox");
  const sendBtn = document.getElementById("send-btn");
  const commentList = document.getElementById("comment-list");
  const previewContainer = document.getElementById("preview-container");
  const googleProvider = new GoogleAuthProvider();

  // 顯示/隱藏 email form
  showEmailFormBtn?.addEventListener("click", () => {
    if (!emailForm) return;
    emailForm.classList.toggle("hidden");
  });

  // Google 登入
  googleLoginBtn?.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // 成功後 onAuthStateChanged 會更新 UI
    } catch (err) {
      alert("Google 登入失敗：" + err.message);
      console.error(err);
    }
  });

  // Email 登入
  emailLoginBtn?.addEventListener("click", async () => {
    try {
      await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (err) {
      alert("Email 登入失敗：" + err.message);
      console.error(err);
    }
  });

  // Email 註冊
  emailRegisterBtn?.addEventListener("click", async () => {
    try {
      await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
      alert("註冊成功，請使用 Email 登入或 Google 登入（如適用）。");
    } catch (err) {
      alert("註冊失敗：" + err.message);
      console.error(err);
    }
  });

  // 忘記密碼
  forgotBtn?.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    if (!email) return alert("請輸入註冊用的電子郵件來接收重設信。");
    try {
      await sendPasswordResetEmail(auth, email);
      alert("已寄出密碼重設信，請到信箱查看。");
    } catch (err) {
      alert("寄送重設信失敗：" + err.message);
    }
  });

  // 登出
  logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
    // UI will be updated by onAuthStateChanged
  });

  // 點擊上傳按鈕觸發檔案選擇
  uploadBtn?.addEventListener("click", () => avatarUpload?.click());

  // 預覽本地檔案（暫時顯示，尚未上傳 Cloudinary）
  avatarUpload?.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    previewContainer.innerHTML = ""; // 清除
    const img = document.createElement("img");
    img.src = URL.createObjectURL(f);
    img.style.maxWidth = "180px";
    img.style.borderRadius = "8px";
    previewContainer.appendChild(img);
  });

  // 上傳到 Cloudinary 的 helper
  async function uploadToCloudinary(file) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    // 可選：fd.append("folder","comment-photos");
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: fd
    });
    if (!res.ok) throw new Error("Cloudinary upload failed");
    const data = await res.json();
    return data.secure_url; // 回傳可公開存取的 URL
  }

  // 更新資料（上傳頭像 -> 更新 Firebase profile -> reload 使用者）
  updateProfileBtn?.addEventListener("click", async () => {
    if (!auth.currentUser) return alert("請先登入！");
    const nick = nicknameInput.value.trim();
    if (!nick) return alert("請輸入暱稱！");

    let photoURL = auth.currentUser.photoURL || userPhoto.src;

    // 如果有新檔案：先上傳 Cloudinary 再取回 secure_url
    const file = avatarUpload?.files?.[0];
    if (file) {
      try {
        photoURL = await uploadToCloudinary(file);
      } catch (err) {
        console.error(err);
        return alert("頭像上傳失敗：" + err.message);
      }
    }

    try {
      await updateProfile(auth.currentUser, {
        displayName: nick,
        photoURL: photoURL
      });
      // reload 確保 currentUser 有最新資料
      await reload(auth.currentUser);
      alert("更新成功！");
      // 更新 UI
      userNameEl.textContent = `📢歡迎，${auth.currentUser.displayName || auth.currentUser.email}！`;
      userPhoto.src = auth.currentUser.photoURL || userPhoto.src;
      loadComments();
      previewContainer.innerHTML = ""; avatarUpload.value = "";
    } catch (err) {
      console.error(err);
      alert("更新失敗：" + err.message);
    }
  });

  // 送出留言（把當時最新的 user.photoURL 與 displayName 存進 comment doc）
  sendBtn?.addEventListener("click", async () => {
    const txt = commentInput.value.trim();
    if (!txt) return alert("請輸入留言內容！");
    if (!auth.currentUser) return alert("請先登入再留言！");

    const isAnon = anonymousCheckbox.checked;
    const nickname = isAnon ? "匿名" : (auth.currentUser.displayName || auth.currentUser.email);
    const avatarUrl = isAnon ? "images/default-avatar.png" : (auth.currentUser.photoURL || "images/default-avatar.png");

    try {
      await addDoc(collection(db, "comments"), {
        uid: auth.currentUser.uid,
        nickname,
        avatarUrl,
        content: txt,
        createdAt: serverTimestamp()
      });
      commentInput.value = "";
      loadComments();
    } catch (err) {
      console.error(err);
      alert("留言失敗：" + err.message);
    }
  });

  // 監聽登入狀態並更新 UI
  onAuthStateChanged(auth, (user) => {
    const loginButtons = document.getElementById("auth-buttons");
    const googleBtn = document.getElementById("google-login-btn");
    if (user) {
      // 隱藏登入按鈕，顯示 user info（只有登出按鈕）
      googleBtn?.classList.add("hidden");
      if (loginButtons) loginButtons.classList.add("hidden");
      userInfo.classList.remove("hidden");
      commentBox.classList.remove("hidden");
      userNameEl.textContent = `📢歡迎，${user.displayName || user.email}！`;
      userPhoto.src = user.photoURL || "images/default-avatar.png";
      nicknameInput.value = user.displayName || "";
    } else {
      // 未登入：顯示登入按鈕、隱藏 user block
      googleBtn?.classList.remove("hidden");
      if (loginButtons) loginButtons.classList.remove("hidden");
      userInfo.classList.add("hidden");
      commentBox.classList.add("hidden");
    }
    loadComments(); // 每次狀態改變重新載入留言（以顯示最新）
  });

  /* ---------- 載入留言函式 ---------- */
  async function loadComments() {
    commentList.innerHTML = "<p class='muted'>載入留言中…</p>";
    try {
      const q = query(collection(db, "comments"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      commentList.innerHTML = "";
      if (snapshot.empty) {
        commentList.innerHTML = "<p class='muted'>目前沒有留言。</p>";
        return;
      }

      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        const el = document.createElement("div");
        el.className = "comment-item";
        // 使用安全的 avatarUrl 與 nickname
        const avatar = d.avatarUrl || "images/default-avatar.png";
        const nick = d.nickname || "訪客";
        const content = d.content || "";
        const time = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleString() : "";

        el.innerHTML = `
          <img src="${avatar}" class="avatar" alt="avatar">
          <div style="flex:1">
            <strong>${escapeHtml(nick)}</strong>
            <p>${escapeHtml(content)}</p>
            <small>${time}</small>
          </div>
        `;

        // 刪除按鈕：只有留言的 uid 等於當前 user.uid 才顯示
        if (auth.currentUser && d.uid === auth.currentUser.uid) {
          const del = document.createElement("button");
          del.className = "delete-btn";
          del.textContent = "刪除";
          del.addEventListener("click", async () => {
            if (!confirm("確定刪除這則留言？")) return;
            await deleteDoc(doc(collection(db,"comments").parent || db, "comments", docSnap.id));
            // 上面 deleteDoc path building 以防不同環境；如果有錯，改用： deleteDoc(doc(db, "comments", docSnap.id))
            try {
              await deleteDoc(doc(db, "comments", docSnap.id));
            } catch(e){
              console.warn(e);
            }
            loadComments();
          });
          el.appendChild(del);
        }

        commentList.appendChild(el);
      });
    } catch (err) {
      console.error(err);
      commentList.innerHTML = "<p class='muted'>無法載入留言（請檢查網路或設定）。</p>";
    }
  }

  // 小工具：避免 XSS
  function escapeHtml(text){
    if(!text) return "";
    return String(text)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'", "&#039;");
  }

  // 首次載入留言
  loadComments();
});
