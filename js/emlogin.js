// ./js/emlogin.js
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { app } from "./firebase.js"; // 你的 modular firebase.js

const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const togglePasswordBtn = document.getElementById("togglePassword");
  const statusEl = document.getElementById("status");

  // 顯示/隱藏密碼
  togglePasswordBtn?.addEventListener("click", () => {
    if (!passwordInput) return;
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
  });

  // 登入
  window.loginEmailUser = async function() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) {
      statusEl.textContent = "請輸入 Email 與密碼";
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      statusEl.textContent = "登入成功！即將返回首頁...";
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/user-not-found") statusEl.textContent = "帳號不存在";
      else if (err.code === "auth/wrong-password") statusEl.textContent = "密碼錯誤";
      else statusEl.textContent = err.message;
    }
  };

  // 登出
  window.logout = async function() {
    try {
      await signOut(auth);
      statusEl.textContent = "已登出";
    } catch (err) {
      console.error(err);
      statusEl.textContent = "登出失敗";
    }
  };
});
