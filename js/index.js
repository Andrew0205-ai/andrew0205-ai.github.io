// =======================
// Firebase
// =======================
const auth = firebase.auth()
const db = firebase.firestore()
let currentUser = null

// 管理員 UID
const ADMIN_UIDS = ["你的FirebaseUID放這裡"]

// =======================
// 登入 / 登出
// =======================
function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider()
  auth.signInWithPopup(provider)
}

function emailLogin() {
  const email = prompt("輸入 Email")
  const password = prompt("輸入 密碼")
  if (!email || !password) return
  auth.signInWithEmailAndPassword(email, password)
    .catch(e => alert(e.message))
}

function logout() {
  auth.signOut()
}

auth.onAuthStateChanged(user => {
  currentUser = user
  document.getElementById("loginArea").classList.toggle("d-none", !!user)
  document.getElementById("userArea").classList.toggle("d-none", !user)
  document.getElementById("commentArea").classList.toggle("d-none", !user)
  if (user) {
    userName.innerText = user.displayName || "未命名"
    userAvatar.src = user.photoURL || "https://i.imgur.com/1X6zY4K.png"
  }
})

// =======================
// 改暱稱 / 頭像
// =======================
function changeNickname() {
  if (!currentUser) return
  const name = prompt("輸入新暱稱")
  if (!name) return
  currentUser.updateProfile({ displayName: name })
  userName.innerText = name
}

function changeAvatar() {
  if (!currentUser) return
  const url = prompt("輸入頭像圖片網址")
  if (!url) return
  currentUser.updateProfile({ photoURL: url })
  userAvatar.src = url
}

// =======================
// 字數顯示
// =======================
commentInput.addEventListener("input", e => {
  count.innerText = e.target.value.length
})

// =======================
// Cloudinary 圖片上傳
// =======================
function uploadImage() {
  imageInput.click()
}

imageInput.addEventListener("change", async () => {
  const file = imageInput.files[0]
  if (!file) return
  const form = new FormData()
  form.append("file", file)
  form.append("upload_preset", "guest_upload") // 你的 preset
  const res = await fetch("https://api.cloudinary.com/v1_1/你的cloud_name/image/upload", {
    method: "POST",
    body: form
  })
  const data = await res.json()
  commentInput.value += `\n\n![](${data.secure_url})\n`
})

// =======================
// 發送留言
// =======================
function postComment() {
  if (!currentUser) return alert("請先登入")
  const text = commentInput.value.trim()
  if (!text) return
  db.collection("comments").add({
    text,
    uid: currentUser.uid,
    name: currentUser.displayName,
    avatar: currentUser.photoURL,
    isAdmin: ADMIN_UIDS.includes(currentUser.uid),
    time: firebase.firestore.FieldValue.serverTimestamp()
  })
  commentInput.value = ""
  count.innerText = 0
}

// =======================
// 顯示留言（Markdown + XSS 防護）
// =======================
db.collection("comments").orderBy("time", "desc")
  .onSnapshot(snapshot => {
    comments.innerHTML = ""
    snapshot.forEach(doc => {
      const c = doc.data()
      const rawHtml = marked.parse(c.text)
      const safeHtml = DOMPurify.sanitize(rawHtml)
      const div = document.createElement("div")
      div.className = "border rounded p-2 mb-2"
      div.innerHTML = `
        <div class="d-flex align-items-center mb-1">
          <img src="${c.avatar}" width="28" class="rounded-circle me-2">
          <strong>${c.name}</strong>
          ${c.isAdmin ? '<span class="badge bg-danger ms-2">👑 管理員</span>' : ""}
        </div>
        <div class="comment-body">${safeHtml}</div>
        ${c.uid === currentUser?.uid ? 
          `<button class="btn btn-sm btn-danger mt-1" onclick="deleteComment('${doc.id}')">刪除</button>` 
          : ""}
      `
      comments.appendChild(div)
    })
  })

// =======================
// 刪除留言
// =======================
function deleteComment(id) {
  if (!confirm("確定刪除這則留言？")) return
  db.collection("comments").doc(id).delete()
}
