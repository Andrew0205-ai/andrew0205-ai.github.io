console.log('📢index.js V2.1.1 運作中......')
// ================= Firebase =================
const auth = firebase.auth()
const db = firebase.firestore()

let currentUser = null
let emailMode = 'login'
let emailModal

// ================= DOM =================
document.addEventListener('DOMContentLoaded', () => {
  emailModal = new bootstrap.Modal(document.getElementById('emailModal'))

  commentInput.addEventListener('input', e => {
    count.innerText = e.target.value.length
  })

  imageInput.addEventListener('change', handleImageUpload)
})

// ================= 登入狀態 =================
auth.onAuthStateChanged(user => {
  currentUser = user

  loginArea.classList.toggle('d-none', !!user)
  userArea.classList.toggle('d-none', !user)
  commentArea.classList.toggle('d-none', !user)

  if (user) {
    userName.innerText = user.displayName || '未命名'
    userAvatar.src = user.photoURL || 'images/default-avatar.png'
    showWelcome(user.displayName)
    listenComments()
  }
})

// ================= Google =================
function googleLogin() {
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
}

function logout() {
  auth.signOut()
}

// ================= Email Modal =================
function openEmailModal(mode) {
  emailMode = mode
  emailError.classList.add('d-none')

  nameRow.style.display = mode === 'signup' ? '' : 'none'
  avatarRow.style.display = mode === 'signup' ? '' : 'none'
  passwordRow.style.display = mode === 'reset' ? 'none' : ''

  emailModalTitle.innerText =
    mode === 'login' ? 'Email 登入' :
    mode === 'signup' ? '註冊新帳號' : '重設密碼'

  emailModal.show()
}

// ================= Email Auth =================
async function submitEmailAuth() {
  try {
    toggleEmailLoading(true)

    const email = emailInput.value
    const password = passwordInput.value

    if (emailMode === 'login') {
      await auth.signInWithEmailAndPassword(email, password)
    }

    if (emailMode === 'signup') {
      const name = nameInput.value
      const avatar = avatarFile.files[0]

      const res = await auth.createUserWithEmailAndPassword(email, password)

      let avatarURL = ''
      if (avatar) avatarURL = await uploadToCloudinary(avatar)

      await res.user.updateProfile({
        displayName: name,
        photoURL: avatarURL
      })
    }

    if (emailMode === 'reset') {
      await auth.sendPasswordResetEmail(email)
      showEmailError('已寄送重設信件')
      toggleEmailLoading(false)
      return
    }

    emailModal.hide()
  } catch (e) {
    showEmailError(e.message)
  }
  toggleEmailLoading(false)
}

function toggleEmailLoading(on) {
  emailSpinner.classList.toggle('d-none', !on)
  emailBtnText.innerText = on ? '處理中...' : '送出'
}

function showEmailError(msg) {
  emailError.innerText = msg
  emailError.classList.remove('d-none')
}

// ================= Cloudinary =================
async function uploadToCloudinary(file) {
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', 'guest-upload')

  const res = await fetch(
    'https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload',
    { method: 'POST', body: form }
  )

  const data = await res.json()
  return data.secure_url
}

// ================= 留言 =================
function postComment() {
  if (!currentUser) return

  db.collection('comments').add({
    text: commentInput.value,
    uid: currentUser.uid,
    name: currentUser.displayName,
    avatar: currentUser.photoURL,
    time: firebase.firestore.FieldValue.serverTimestamp()
  })

  commentInput.value = ''
  count.innerText = 0
}

function listenComments() {
  db.collection('comments')
    .orderBy('time', 'desc')
    .onSnapshot(snap => {
      comments.innerHTML = ''
      snap.forEach(renderComment)
    })
}

function renderComment(doc) {
  const c = doc.data()
  const div = document.createElement('div')
  div.className = 'border rounded p-2 mb-2'

  div.innerHTML = `
    <div class="d-flex align-items-center mb-1">
      <img src="${c.avatar}" width="28" class="rounded-circle me-2">
      <strong>${c.name}</strong>
    </div>
    <div>${DOMPurify.sanitize(marked.parse(c.text))}</div>
    ${currentUser?.uid === c.uid ? `
      <button class="btn btn-sm btn-outline-danger mt-1"
        onclick="db.collection('comments').doc('${doc.id}').delete()">
        刪除
      </button>` : ''}
  `

  comments.appendChild(div)
}

// ================= 歡迎動畫 =================
function showWelcome(name) {
  const toast = document.createElement('div')
  toast.className = 'position-fixed top-0 end-0 m-3 alert alert-success'
  toast.innerText = `歡迎回來，${name} 👋`
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2500)
}
