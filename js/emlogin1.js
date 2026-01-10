// ./js/emlogin.js
import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// 將函式掛到 window 上，HTML 才能呼叫
window.loginEmailUser = async function() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const statusEl = document.getElementById("status");

    if (!email || !password) {
        statusEl.textContent = "請輸入 Email 和密碼";
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        statusEl.textContent = "登入成功，3 秒後回首頁...";
        setTimeout(() => {
            window.location.href = "index.html";
        }, 3000);
    } catch (err) {
        console.error(err);
        statusEl.textContent = `登入失敗: ${err.message}`;
    }
};

window.logout = async function() {
    try {
        await signOut(auth);
        document.getElementById("status").textContent = "已登出";
    } catch (err) {
        console.error(err);
        document.getElementById("status").textContent = `登出失敗: ${err.message}`;
    }
};

// 顯示/隱藏密碼
document.getElementById("togglePassword").addEventListener("click", () => {
    const pwInput = document.getElementById("password");
    pwInput.type = pwInput.type === "password" ? "text" : "password";
});

