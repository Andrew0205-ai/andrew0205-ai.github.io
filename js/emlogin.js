// ./js/emlogin.js
import { auth } from "./firebase.js"; // 確保 firebase.js 已 export auth

document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const togglePasswordBtn = document.getElementById("togglePassword");
  const statusEl = document.getElementById("status");

  // 切換密碼可見性
  togglePasswordBtn?.addEventListener("click", () => {
    if (!passwordInput) return;
    if (passwordInput.type === "password") {
      passwordInput.type = "text";
    } else {
      passwordInput.type = "password";
    }
  });

  // 登入函式
  window.loginEmailUser = async function() {
    if (!emailInput || !passwordInput) return;
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      statusEl.textContent = "請輸入 Email 與密碼";
      return;
    }

    try {
      await auth.signInWithEmailAndPassword(email, password);
      statusEl.textContent = "登入成功！即將返回首頁...";
      // 登入成功後跳回 index.html
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    } catch (err) {
      console.error("登入失敗:", err);
      if (err.code === "auth/user-not-found") {
        statusEl.textContent = "帳號不存在";
      } else if (err.code === "auth/wrong-password") {
        statusEl.textContent = "密碼錯誤";
      } else {
        statusEl.textContent = err.message;
      }
    }
  };

  // 登出函式
  window.logout = async function() {
    try {
      await auth.signOut();
      statusEl.textContent = "已登出";
    } catch (err) {
      console.error("登出失敗:", err);
      statusEl.textContent = "登出失敗";
    }
  };
});
