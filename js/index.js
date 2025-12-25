// =======================
// DOM 變數
// =======================
let imageInput, commentInput, count, comments
let userName, userAvatar
let editModal, editInput
let currentEditId = null

// =======================
// Firebase
// =======================
const auth = firebase.auth()
const db = firebase.firestore()
let currentUser = null

// 管理員 UID（一定要是真實 UID）
const ADMIN_UIDS = [
  "PUT_REAL_ADMIN_UID_HERE"
]

// =======================
// 初始化 DOM
// =======================
document.addEventListener("DOMContentLoaded", () => {
  imageInput   = document.getElementById("imageInput")
  commentInput = document.getElementById("commentInput")
  count        = document.getElementById("count")
  comments     = document.getElementById("comments")
  userName     = document.getElementById("userName")
  userAvatar   = document.getElementById("userAvatar")
  editInput    = document.getElementById("editInput")
  editModal    = new bootstrap.Modal(document.getElementById("editModal"))

  commentInput.addEventListener("input", e => {
    count.innerText = e.target.value.length
  })

  imageInput.addEventListener("change", handleImageUpload)

  listenComments()
})

// =======================
// 登入 / 登出
// =======================
function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider()
  auth.signInWithPopup(provider)
}

function emailLogin() {
  const email = prompt("Email")
  const password = prompt("Password")
  if (!email || !password) return
  auth.signInWithEmailAndPassword(email, password)
    .catch(e => alert(e.message))
}

function logout() {
  auth.signOut()
}

auth.onAuthStateChanged(user => {
  currentUser = user

  loginArea.classList.toggle("d-none", !!user)
  userArea.classList.toggle("d-none", !user)
  commentArea.classList.toggle("d-none", !user)

  if (user) {
    userName.innerText = user.displayName || "未命名"
    userAvatar.src = user.photoURL || "images/defult-avatar.png"
  }
})

// =======================
// 使用者資料
// =======================
function changeNickname() {
  if (!currentUser) return
  const name = prompt("新暱稱")
  if (!name) return
  currentUser.updateProfile({ displayName: name })
  userName.innerText = name
}

function changeAvatar() {
  uploadImage()
}

// =======================
// Cloudinary 圖片上傳
// =======================
function uploadImage() {
  imageInput.click()
}

async function handleImageUpload() {
  const file = imageInput.files[0]
  if (!file) return

  // 類型限制
  if (!file.type.startsWith("image/")) {
    alert("只能上傳圖片")
    return
  }

  // 大小限制（2MB）
  if (file.size > 2 * 1024 * 1024) {
    alert("圖片不可超過 2MB")
    return
  }

  const form = new FormData()
  form.append("file", file)
  form.append("upload_preset", "guest_upload")

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload",
    { method: "POST", body: form }
  )

  const data = await res.json()
  commentInput.value += `\n\n![](${data.secure_url})\n`
}

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
// 讀取留言（Lazy Load）
// =======================
let lastDoc = null
const PAGE_SIZE = 10

function listenComments() {
  let query = db.collection("comments")
    .orderBy("time", "desc")
    .limit(PAGE_SIZE)

  query.onSnapshot(snapshot => {
    comments.innerHTML = ""
    snapshot.forEach(renderComment)
    lastDoc = snapshot.docs[snapshot.docs.length - 1]
  })
}

function loadMore() {
  if (!lastDoc) return

  db.collection("comments")
    .orderBy("time", "desc")
    .startAfter(lastDoc)
    .limit(PAGE_SIZE)
    .get()
    .then(snapshot => {
      snapshot.forEach(renderComment)
      lastDoc = snapshot.docs[snapshot.docs.length - 1]
    })
}

// =======================
// 渲染留言
// =======================
function renderComment(doc) {
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

    ${currentUser?.uid === c.uid ? `
      <button class="btn btn-sm btn-outline-primary mt-1"
        onclick="openEdit('${doc.id}', \`${c.text.replace(/`/g, "\\`")}\`)">
        編輯
      </button>
      <button class="btn btn-sm btn-outline-danger mt-1"
        onclick="deleteComment('${doc.id}')">
        刪除
      </button>
    ` : ""}
  `

  comments.appendChild(div)
}

// =======================
// 編輯留言
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

// =======================
// 刪除留言
// =======================
function deleteComment(id) {
  if (!confirm("確定刪除？")) return
  db.collection("comments").doc(id).delete()
}
