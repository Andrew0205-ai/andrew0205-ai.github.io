console.log('📢index.js V2.1.0 運作中......')
// =======================
// Firebase
// =======================
const auth = firebase.auth()
const db = firebase.firestore()
let currentUser = null

// =======================
// DOM
// =======================
const loginArea = document.getElementById("loginArea")
const userArea = document.getElementById("userArea")
const userNameEl = document.getElementById("userName")
const userAvatarEl = document.getElementById("userAvatar")
const commentArea = document.getElementById("commentArea")

// =======================
// Email Modal 狀態
// =======================
let emailMode = "login" // login | signup | reset
let emailModal = null

document.addEventListener("DOMContentLoaded", () => {
  const modalEl = document.getElementById("emailModal")
  if (modalEl && typeof bootstrap !== "undefined") {
    emailModal = new bootstrap.Modal(modalEl)
  }
})

// =======================
// 開啟 Email Modal
// =======================
function emailLogin() {
  openEmailModal("login")
}

function openEmailModal(mode) {
  emailMode = mode
  renderEmailModal()
  emailModal.show()
}

// =======================
// Modal 內容渲染
// =======================
function renderEmailModal() {
  document.getElementById("emailModalTitle").innerText =
    emailMode === "login" ? "Email 登入" :
    emailMode === "signup" ? "Email 註冊" :
    "重設密碼"

  toggleRow("nameRow", emailMode === "signup")
  toggleRow("avatarRow", emailMode === "signup")
  toggleRow("passwordRow", emailMode !== "reset")

  clearEmailError()
}

function toggleRow(id, show) {
  const el = document.getElementById(id)
  if (!el) return
  el.style.display = show ? "block" : "none"
  el.classList.remove("fade-in")
  if (show) requestAnimationFrame(() => el.classList.add("fade-in"))
}

// =======================
// 錯誤顯示（Modal 內）
// =======================
function showEmailError(msg) {
  const box = document.getElementById("emailError")
  box.innerText = msg
  box.classList.remove("d-none")
}

function clearEmailError() {
  const box = document.getElementById("emailError")
  box.classList.add("d-none")
  box.innerText = ""
}

// =======================
// Email 動作
// =======================
async function submitEmailAuth() {
  clearEmailError()

  const email = document.getElementById("emailInput").value.trim()
  const password = document.getElementById("passwordInput")?.value
  const nickname = document.getElementById("nameInput")?.value.trim()
  const avatar = document.getElementById("avatarInput")?.value.trim()

  try {
    if (emailMode === "login") {
      await auth.signInWithEmailAndPassword(email, password)
      emailModal.hide()
    }

    if (emailMode === "signup") {
      if (!nickname) return showEmailError("請填寫暱稱")

      const cred = await auth.createUserWithEmailAndPassword(email, password)
      await db.collection("users").doc(cred.user.uid).set({
        name: nickname,
        avatar: avatar || "images/andrew.png",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      })
      emailModal.hide()
    }

    if (emailMode === "reset") {
      await auth.sendPasswordResetEmail(email)
      showEmailError("📨 已寄送重設密碼信件")
    }
  } catch (err) {
    showEmailError(err.message)
  }
}

// =======================
// Google 登入
// =======================
function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider()
  auth.signInWithPopup(provider)
}

// =======================
// 登出
// =======================
function logout() {
  auth.signOut()
}

// =======================
// Auth 狀態監聽
// =======================
auth.onAuthStateChanged(async user => {
  if (!user) {
    currentUser = null
    loginArea.classList.remove("d-none")
    userArea.classList.add("d-none")
    commentArea.classList.add("d-none")
    return
  }

  currentUser = user
  loginArea.classList.add("d-none")
  userArea.classList.remove("d-none")
  commentArea.classList.remove("d-none")

  const snap = await db.collection("users").doc(user.uid).get()
  const data = snap.exists ? snap.data() : {}

  userNameEl.innerText = data.name || user.email
  userAvatarEl.src = data.avatar || "images/andrew.png"
})

// =======================
// 小工具
// =======================
function copyGameID() {
  navigator.clipboard.writeText("K3Q92B")
}
