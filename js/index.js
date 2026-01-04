// =======================
// Firebase
// =======================
const auth = firebase.auth()
const db = firebase.firestore()

// =======================
// 設定
// =======================
const PAGE_SIZE = 10
const COOLDOWN_MS = 30 * 1000
const ADMIN_UIDS = ["mKU5cngfmNXyXupfM9XAc8MqgNU2"]

// =======================
// DOM
// =======================
let imageInput, commentInput, count, comments
let userName, userAvatar
let editModal, emailModal
let editInput
let postBtn
let verifyAlert

let currentUser = null
let currentEditId = null
let lastDoc = null
let cooldownTimer = null

// =======================
// 初始化
// =======================
document.addEventListener("DOMContentLoaded", () => {
  imageInput = document.getElementById("imageInput")
  commentInput = document.getElementById("commentInput")
  count = document.getElementById("count")
  comments = document.getElementById("comments")
  userName = document.getElementById("userName")
  userAvatar = document.getElementById("userAvatar")
  editInput = document.getElementById("editInput")
  postBtn = document.querySelector("button.btn.btn-primary")

  editModal = new bootstrap.Modal(document.getElementById("editModal"))
  emailModal = new bootstrap.Modal(document.getElementById("emailModal"))

  commentInput?.addEventListener("input", e => {
    count.innerText = e.target.value.length
  })

  imageInput?.addEventListener("change", handleImageUpload)

  listenComments()
})

// =======================
// Auth 狀態
// =======================
auth.onAuthStateChanged(async user => {
  currentUser = user

  loginArea.classList.toggle("d-none", !!user)
  userArea.classList.toggle("d-none", !user)
  commentArea.classList.toggle("d-none", !user)

  removeVerifyAlert()

  if (!user) return

  userName.innerText = user.displayName || "未命名"
  userAvatar.src = user.photoURL || "images/defult-avatar.png"

  // 🧾 Email 未驗證提醒
  if (
    user.providerData[0].providerId === "password" &&
    !user.emailVerified
  ) {
    showVerifyAlert()
  }

  // 🕒 冷卻續算
  resumeCooldown()
})

// =======================
// 登入 / 登出
// =======================
function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider()
  auth.signInWithPopup(provider)
}

function logout() {
  auth.signOut()
}

// =======================
// Email 驗證提醒條
// =======================
function showVerifyAlert() {
  verifyAlert = document.createElement("div")
  verifyAlert.className = "alert alert-warning mt-2"
  verifyAlert.innerHTML = `
    ⚠️ 你的 Email 尚未驗證，完成驗證後才能留言。
    <button class="btn btn-sm btn-outline-dark ms-2" onclick="resendVerify()">
      重新寄送驗證信
    </button>
  `
  commentArea.prepend(verifyAlert)
}

function removeVerifyAlert() {
  if (verifyAlert) verifyAlert.remove()
}

function resendVerify() {
  currentUser.sendEmailVerification()
  alert("驗證信已寄出，請檢查信箱")
}

// =======================
// 使用者資料
// =======================
function changeNickname() {
  const name = prompt("輸入新暱稱")
  if (!name) return
  currentUser.updateProfile({ displayName: name })
  userName.innerText = name
}

function changeAvatar() {
  uploadImage(true)
}

// =======================
// Cloudinary 圖片
// =======================
function uploadImage(isAvatar = false) {
  imageInput.dataset.avatar = isAvatar ? "1" : "0"
  imageInput.click()
}

async function handleImageUpload() {
  const file = imageInput.files[0]
  if (!file || !file.type.startsWith("image/")) return

  const form = new FormData()
  form.append("file", file)
  form.append("upload_preset", "guest-upload")

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload",
    { method: "POST", body: form }
  )
  const data = await res.json()

  if (imageInput.dataset.avatar === "1") {
    await currentUser.updateProfile({ photoURL: data.secure_url })
    userAvatar.src = data.secure_url
  } else {
    commentInput.value += `\n\n![](${data.secure_url})\n`
  }

  imageInput.value = ""
}

// =======================
// 發送留言（驗證 + 冷卻）
// =======================
async function postComment() {
  if (!currentUser) return alert("請先登入")

  if (
    currentUser.providerData[0].providerId === "password" &&
    !currentUser.emailVerified
  ) {
    return alert("請先完成 Email 驗證")
  }

  const text = commentInput.value.trim()
  if (!text) return

  const userRef = db.collection("users").doc(currentUser.uid)
  const snap = await userRef.get()
  const now = Date.now()

  if (snap.exists) {
    const last = snap.data().lastCommentTime || 0
    const remain = COOLDOWN_MS - (now - last)
    if (remain > 0) {
      startCooldown(remain)
      return
    }
  }

  await db.collection("comments").add({
    text,
    uid: currentUser.uid,
    name: currentUser.displayName,
    avatar: currentUser.photoURL,
    isAdmin: ADMIN_UIDS.includes(currentUser.uid),
    time: firebase.firestore.FieldValue.serverTimestamp()
  })

  await userRef.set({ lastCommentTime: now }, { merge: true })

  commentInput.value = ""
  count.innerText = 0

  startCooldown(COOLDOWN_MS)
}

// =======================
// 冷卻倒數
// =======================
function startCooldown(ms) {
  clearInterval(cooldownTimer)
  let remain = Math.ceil(ms / 1000)

  postBtn.disabled = true
  postBtn.innerText = `請稍候 ${remain} 秒`

  cooldownTimer = setInterval(() => {
    remain--
    if (remain <= 0) {
      clearInterval(cooldownTimer)
      postBtn.disabled = false
      postBtn.innerText = "送出"
    } else {
      postBtn.innerText = `請稍候 ${remain} 秒`
    }
  }, 1000)
}

async function resumeCooldown() {
  const ref = db.collection("users").doc(currentUser.uid)
  const snap = await ref.get()
  if (!snap.exists) return

  const last = snap.data().lastCommentTime || 0
  const remain = COOLDOWN_MS - (Date.now() - last)
  if (remain > 0) startCooldown(remain)
}

// =======================
// 讀取留言
// =======================
function listenComments() {
  db.collection("comments")
    .orderBy("time", "desc")
    .limit(PAGE_SIZE)
    .onSnapshot(snap => {
      comments.innerHTML = ""
      snap.forEach(renderComment)
      lastDoc = snap.docs[snap.docs.length - 1]
    })
}

function renderComment(doc) {
  const c = doc.data()
  const html = DOMPurify.sanitize(marked.parse(c.text))

  const div = document.createElement("div")
  div.className = "border rounded p-2 mb-2"
  div.innerHTML = `
    <div class="d-flex align-items-center mb-1">
      <img src="${c.avatar}" width="28" class="rounded-circle me-2">
      <strong>${c.name}</strong>
      ${c.isAdmin ? '<span class="badge bg-danger ms-2">👑 管理員</span>' : ""}
    </div>
    <div>${html}</div>
    ${currentUser?.uid === c.uid ? `
      <button class="btn btn-sm btn-outline-primary mt-1"
        onclick="openEdit('${doc.id}', \`${c.text.replace(/`/g, "\\`")}\`)">編輯</button>
      <button class="btn btn-sm btn-outline-danger mt-1"
        onclick="deleteComment('${doc.id}')">刪除</button>
    ` : ""}
  `
  comments.appendChild(div)
}

// =======================
// 編輯 / 刪除
// =======================
function openEdit(id, text) {
  currentEditId = id
  editInput.value = text
  editModal.show()
}

function saveEdit() {
  if (!currentEditId) return
  db.collection("comments").doc(currentEditId).update({
    text: editInput.value
  })
  editModal.hide()
  currentEditId = null
}

function deleteComment(id) {
  if (!confirm("確定刪除？")) return
  db.collection("comments").doc(id).delete()
}

// =======================
// 載入更多
// =======================
async function loadMore() {
  if (!lastDoc) return
  const snap = await db.collection("comments")
    .orderBy("time", "desc")
    .startAfter(lastDoc)
    .limit(PAGE_SIZE)
    .get()

  snap.forEach(renderComment)
  lastDoc = snap.docs[snap.docs.length - 1]
}
