import { auth } from "./firebase.js";
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Google 登入
const googleLoginBtn = document.getElementById("google-login");
googleLoginBtn.addEventListener("click", async () => {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        alert("登入成功！即將回到首頁");
        window.location.href = "index.html";
    } catch (err) {
        console.error(err);
        alert("登入失敗：" + err.message);
    }
});

// Email 登入
const emailLoginBtn = document.getElementById("email-login");
emailLoginBtn.addEventListener("click", async () => {
    const email = prompt("請輸入 Email");
    const password = prompt("請輸入密碼");
    if (!email || !password) return;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert("登入成功！即將回到首頁");
        window.location.href = "index.html";
    } catch (err) {
        console.error(err);
        if (err.code === "auth/user-not-found") alert("帳號不存在");
        else if (err.code === "auth/wrong-password") alert("密碼錯誤");
        else alert("登入失敗：" + err.message);
    }
});

// 雙擊 Email 按鈕可重設密碼
emailLoginBtn.addEventListener("dblclick", async () => {
    const email = prompt("輸入 Email 以重設密碼");
    if (!email) return;
    try {
        await auth.sendPasswordResetEmail(email);
        alert("已發送重設密碼信件");
    } catch (err) {
        console.error(err);
        alert("重設密碼失敗：" + err.message);
    }
});

