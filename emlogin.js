// 取得元件
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const statusText = document.getElementById("status");

// 切換密碼顯示
togglePassword.addEventListener("click", () => {
  const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);
  togglePassword.textContent = type === "password" ? "👁️" : "🙈";
});

// Email 登入
function loginEmailUser() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("請輸入完整的 Email 和密碼！");
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      statusText.textContent = `✅ 已登入：${user.email}`;
      alert("登入成功！");
      window.location.href = "index.html";
    })
    .catch((error) => {
      alert("登入失敗：" + error.message);
    });
}

// 登出
function logout() {
  auth.signOut().then(() => {
    statusText.textContent = "已登出";
  });
}
