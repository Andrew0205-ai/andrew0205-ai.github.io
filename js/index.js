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

  // ===== 綁定事件 =====
  googleLoginBtn?.addEventListener("click", googleLogin);
  emailLoginBtn?.addEventListener("click", emailLogin);
  forgotPasswordBtn?.addEventListener("click", forgotPassword);
  logoutBtn?.addEventListener("click", logout);

  userName?.addEventListener("click", editDisplayName);
  userAvatar?.addEventListener("click", editAvatar);
  postBtn?.addEventListener("click", postComment);

  // ===== 登入 / 登出 =====
  function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
      .then(() => alert("Google 登入成功！"))
      .catch(err => alert("登入失敗：" + err.message));
  }

  function emailLogin() {
    const action = prompt("輸入 1 登入 / 2 註冊");
    if (!action) return;

    const email = prompt("請輸入 Email：");
    const password = prompt("請輸入密碼：");
    if (!email || !password) return;

    if (action === "1") {
      firebase.auth().signInWithEmailAndPassword(email, password)
        .then(() => alert("登入成功！"))
        .catch(err => alert("登入失敗：" + err.message));
    } else if (action === "2") {
      const displayName = prompt("請輸入暱稱：") || "未命名";
      firebase.auth().createUserWithEmailAndPassword(email, password)
        .then(res => {
          res.user.updateProfile({ displayName });
          res.user.sendEmailVerification();
          alert("註冊成功！請到 Email 驗證後再登入。");
        })
        .catch(err => alert("註冊失敗：" + err.message));
    } else {
      alert("無效操作");
    }
  }

  function forgotPassword() {
    const email = prompt("請輸入你的 Email 用來重設密碼：");
    if (!email) return;

    firebase.auth().sendPasswordResetEmail(email)
      .then(() => alert("已寄送重設密碼信到 " + email))
      .catch(err => alert("重設密碼失敗：" + err.message));
  }

  function logout() {
    firebase.auth().signOut()
      .then(() => alert("已登出"))
      .catch(err => alert("登出失敗：" + err.message));
  }

  // ===== 登入狀態監聽 =====
  firebase.auth().onAuthStateChanged(user => {
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
    loadComments(); // 每次狀態改變重載留言
  });

  // ===== 編輯暱稱 =====
  function editDisplayName() {
    if (!currentUser) return;
    const newName = prompt("請輸入新的暱稱：", currentUser.displayName || "");
    if (!newName) return;

    currentUser.updateProfile({ displayName: newName })
      .then(() => { userName.textContent = newName; });
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
      fd.append("upload_preset", "YOUR_UPLOAD_PRESET"); // Cloudinary 設定

      const res = await fetch("https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload", {
        method: "POST", body: fd
      });
      const data = await res.json();
      currentUser.updateProfile({ photoURL: data.secure_url })
        .then(() => { userAvatar.src = data.secure_url; });
    };

    input.click();
  }

  // ===== 送出留言 =====
  function postComment() {
    if (!currentUser) return;
    const text = commentInput.value.trim();
    if (!text) return;

    firebase.firestore().collection("comments").add({
      text,
      uid: currentUser.uid,
      name: currentUser.displayName,
      avatar: currentUser.photoURL,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      commentInput.value = "";
    });
  }

  // ===== 顯示留言 =====
  function loadComments() {
    const q = firebase.firestore().collection("comments").orderBy("createdAt", "desc");
    q.onSnapshot(snapshot => {
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

        // 編輯 / 刪除只限自己
        if (currentUser && currentUser.uid === c.uid) {
          const editBtn = document.createElement("button");
          editBtn.textContent = "編輯";
          editBtn.className = "btn btn-sm btn-primary me-1";
          editBtn.onclick = () => {
            const newText = prompt("修改留言內容：", c.text);
            if (!newText || newText === c.text) return;
            firebase.firestore().collection("comments").doc(id).update({ text: newText });
          };

          const delBtn = document.createElement("button");
          delBtn.textContent = "刪除";
          delBtn.className = "btn btn-sm btn-danger";
          delBtn.onclick = () => {
            if (confirm("確定要刪除這則留言？")) {
              firebase.firestore().collection("comments").doc(id).delete();
            }
          };

          div.appendChild(editBtn);
          div.appendChild(delBtn);
        }

        commentList.appendChild(div);
      });
    });
  }

});
