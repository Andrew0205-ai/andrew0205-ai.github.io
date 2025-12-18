// === Firebase 初始化 ===
// 你原本的 firebase-config.js 與 firebase.js 必須先載入
// firebase v8
// firebase.auth(), firebase.firestore()

// DOM
const loginArea = document.getElementById('loginArea');
const userArea = document.getElementById('userArea');
const commentInputArea = document.getElementById('commentInputArea');
const commentList = document.getElementById('comment-list');
const emailModal = document.getElementById('emailModal');

// 使用者資料
let currentUser = null;
const adminEmail = "andrewwork03295@gmail.com";

// === 登入 / 登出 ===
function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).then(result => {
    currentUser = result.user;
    afterLogin();
  });
}

function emailLoginPrompt() {
  emailModal.style.display = 'block';
  document.getElementById('authNickname').classList.add('d-none');
  document.getElementById('authAvatar').classList.add('d-none');
  document.getElementById('registerBtn').classList.remove('d-none');
}

function login() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(res => {
      currentUser = res.user;
      closeEmailModal();
      afterLogin();
    })
    .catch(err => alert(err.message));
}

function register() {
  document.getElementById('authNickname').classList.remove('d-none');
  document.getElementById('authAvatar').classList.remove('d-none');

  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const nickname = document.getElementById('authNickname').value;
  const avatarFile = document.getElementById('authAvatar').files[0];

  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(async res => {
      currentUser = res.user;

      // 上傳頭像到 Cloudinary
      let avatarURL = '';
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        formData.append('upload_preset', '你的Cloudinary預設');
        const r = await fetch(`https://api.cloudinary.com/v1_1/你的CloudName/image/upload`, {
          method: 'POST', body: formData
        });
        const data = await r.json();
        avatarURL = data.secure_url;
      }

      // 存暱稱 & 頭像
      await firebase.firestore().collection('users').doc(currentUser.uid).set({
        nickname: nickname,
        avatar: avatarURL
      });

      closeEmailModal();
      afterLogin();
    }).catch(err => alert(err.message));
}

function logout() {
  firebase.auth().signOut().then(() => {
    currentUser = null;
    loginArea.style.display = 'block';
    userArea.classList.add('d-none');
    commentInputArea.classList.add('d-none');
  });
}

function forgotPassword() {
  const email = document.getElementById('authEmail').value;
  if (!email) return alert('請輸入電子郵件');
  firebase.auth().sendPasswordResetEmail(email)
    .then(()=> alert('已發送重置密碼信件'))
    .catch(err => alert(err.message));
}

// === 登入後 UI 更新 ===
async function afterLogin() {
  loginArea.style.display = 'none';
  userArea.classList.remove('d-none');
  commentInputArea.classList.remove('d-none');

  // 讀取暱稱和頭像
  const doc = await firebase.firestore().collection('users').doc(currentUser.uid).get();
  const data = doc.data() || {};
  document.getElementById('userName').textContent = data.nickname || currentUser.email;
  document.getElementById('userAvatar').src = data.avatar || 'default-avatar.png';

  loadCommentsRealtime();
}

// === 修改暱稱 / 頭像 ===
function changeNickname() {
  const newName = prompt('輸入新暱稱');
  if (!newName) return;
  firebase.firestore().collection('users').doc(currentUser.uid).update({nickname: newName});
  document.getElementById('userName').textContent = newName;
}

async function changeAvatar() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.onchange = async e => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', '你的Cloudinary預設');
    const r = await fetch(`https://api.cloudinary.com/v1_1/你的CloudName/image/upload`, {
      method: 'POST', body: formData
    });
    const data = await r.json();
    const url = data.secure_url;
    await firebase.firestore().collection('users').doc(currentUser.uid).update({avatar: url});
    document.getElementById('userAvatar').src = url;
  };
  fileInput.click();
}

// === 留言功能 ===
function postComment() {
  const text = document.getElementById('comment-input').value.trim();
  if (!text) return;
  const markdownText = marked.parse(text); // marked.js 支援 Markdown

  firebase.firestore().collection('comments').add({
    uid: currentUser.uid,
    email: currentUser.email,
    nickname: document.getElementById('userName').textContent,
    avatar: document.getElementById('userAvatar').src,
    text: markdownText,
    timestamp: Date.now()
  });

  document.getElementById('comment-input').value = '';
}

// === 即時更新留言 ===
function loadCommentsRealtime() {
  firebase.firestore().collection('comments').orderBy('timestamp')
    .onSnapshot(snapshot => {
      commentList.innerHTML = '';
      snapshot.forEach(doc => {
        const c = doc.data();
        const div = document.createElement('div');
        div.classList.add('mb-2', 'p-2', 'border', 'rounded');

        div.innerHTML = `
          <img src="${c.avatar}" width="30" class="rounded-circle me-2">
          <strong>${c.nickname}</strong> 
          <small>${new Date(c.timestamp).toLocaleString()}</small>
          <div>${c.text}</div>
        `;

        // 編輯 / 刪除按鈕
        if (currentUser.uid === c.uid || currentUser.email === adminEmail) {
          const editBtn = document.createElement('button');
          editBtn.textContent = '編輯';
          editBtn.className = 'btn btn-sm btn-warning me-1';
          editBtn.onclick = () => editComment(doc.id, c.text);
          div.appendChild(editBtn);

          const delBtn = document.createElement('button');
          delBtn.textContent = '刪除';
          delBtn.className = 'btn btn-sm btn-danger';
          delBtn.onclick = () => firebase.firestore().collection('comments').doc(doc.id).delete();
          div.appendChild(delBtn);
        }

        commentList.appendChild(div);
      });
    });
}

// 編輯留言 Modal
function editComment(id, oldText) {
  const newText = prompt('修改留言內容', oldText); // 可改成自訂 modal
  if (!newText) return;
  firebase.firestore().collection('comments').doc(id).update({
    text: marked.parse(newText)
  });
}

// 插入圖片 / 連結
function insertImageOrLink() {
  const type = prompt('輸入 "img" 來插入圖片，"link" 來插入連結');
  if (!type) return;

  if (type.toLowerCase() === 'img') {
    const url = prompt('請輸入圖片網址，如果沒有則選本地檔案');
    if (url) {
      document.getElementById('comment-input').value += `<img src="${url}" alt="圖片">`;
    } else {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = async e => {
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', '你的Cloudinary預設');
        const r = await fetch(`https://api.cloudinary.com/v1_1/你的CloudName/image/upload`, {
          method: 'POST', body: formData
        });
        const data = await r.json();
        const url = data.secure_url;
        document.getElementById('comment-input').value += `<img src="${url}" alt="圖片">`;
      };
      fileInput.click();
    }
  } else if (type.toLowerCase() === 'link') {
    const url = prompt('請輸入網址');
    const text = prompt('顯示文字');
    if (url && text) document.getElementById('comment-input').value += `<a href="${url}" target="_blank">${text}</a>`;
  }
}

// === Email Modal 控制 ===
function closeEmailModal() { emailModal.style.display = 'none'; }

// === 初始化 ===
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    afterLogin();
  }
});
