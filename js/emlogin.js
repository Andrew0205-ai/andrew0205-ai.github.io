// ./js/emlogin.js
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { app } from "./firebase.js"; // 假設你的 firebase.js 已經 export 了 app

const auth = getAuth(app);

// DOM 元素
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const statusEl = document.getElementById("status");

// 登入函式
window.loginEmailUser = async function() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    statusEl.textContent = "請輸入 Email 與密碼";
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    statusEl.textContent = `登入成功！歡迎 ${user.email}`;
    
    // 登入後跳回首頁
    setTimeout(() => {
      window.location.href = "index.html";
    }, 800);
  } catch (err) {
    console.error(err);
    statusEl.textContent = `登入失敗: ${err.message}`;
  }
};

// 登出函式
window.logout = async function() {
  try {
    await signOut(auth);
    statusEl.textContent = "已登出";
  } catch (err) {
    console.error(err);
    statusEl.textContent = `登出失敗: ${err.message}`;
  }
};

// 密碼顯示/隱藏切換
const toggleBtn = document.getElementById("togglePassword");
toggleBtn.addEventListener("click", () => {
  if (!passwordInput) return;
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
  } else {
    passwordInput.type = "password";
  }
});
