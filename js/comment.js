/********************
 * Firebase 初始化
 ********************/
var firebaseConfig = {
  apiKey: "AIzaSyClktI5_wSo-u9LuwdsBVzH6buizJPXMAs",
  authDomain: "mycomment-ad1ba.firebaseapp.com",
  projectId: "mycomment-ad1ba",
  storageBucket: "mycomment-ad1ba.appspot.com",
  messagingSenderId: "1076313273646",
  appId: "1:1076313273646:web:2b5aaa8c6bd5824828f6bf"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

/********************
 * 登入 / 登出
 ********************/
function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
}

function emailLogin() {
  const email = prompt("請輸入 Email");
  const password = prompt("請輸入密碼");

  auth.signInWithEmailAndPassword(email, password)
    .catch(() => {
      auth.createUserWithEmailAndPassword(email, password);
    });
}

function logout() {
  auth.signOut();
}

/********************
 * 監聽登入狀態
 ********************/
auth.onAuthStateChanged(user => {
  const loginArea = document.getElementById("loginArea");
  const userArea = document.getElementById("userArea");
  const commentInput = document.getElementById("commentInput");

  if (user) {
    loginArea.classList.add("d-none");
    userArea.classList.remove("d-none");
    commentInput.classList.remove("d-none");
    loadUserProfile(user);
  } else {
    loginArea.classList.remove("d-none");
    userArea.classList.add("d-none");
    commentInput.classList.add("d-none");
  }
});

/********************
 * 載入使用者資料
 ********************/
function loadUserProfile(user) {
  db.collection("users").doc(user.uid).get().then(doc => {
    const data = doc.exists ? doc.data() : {};

    document.getElementById("userName").innerText =
      data.name || user.displayName || "匿名";

    document.getElementById("userAvatar").src =
      data.avatar || user.photoURL || "https://via.placeholder.com/50";
  });
}

/********************
 * Modal 開啟時帶入資料
 ********************/
document.getElementById("profileModal")
  .addEventListener("show.bs.modal", () => {
    const user = auth.currentUser;
    if (!user) return;

    db.collection("users").doc(user.uid).get().then(doc => {
      if (doc.exists) {
        document.getElementById("editName").value =
          doc.data().name || "";
      }
    });
  });

/********************
 * 儲存個人資料
 ********************/
function saveProfile() {
  const name = document.getElementById("editName").value.trim();
  const file = document.getElementById("avatarFile").files[0];
  const user = auth.currentUser;

  if (!user) return;

  if (name) {
    db.collection("users").doc(user.uid).set({
      name: name
    }, { merge: true });
  }

  if (file) {
    uploadAvatar(file);
  }

  const modal = bootstrap.Modal.getInstance(
    document.getElementById("profileModal")
  );
  modal.hide();
}

/********************
 * Cloudinary 自動上傳頭像
 ********************/
function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "avatar_upload"); // 你的 unsigned preset

  fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", {
    method: "POST",
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    const url = data.secure_url;
    const user = auth.currentUser;

    db.collection("users").doc(user.uid).set({
      avatar: url
    }, { merge: true });

    document.getElementById("userAvatar").src = url;
  })
  .catch(() => {
    alert("頭像上傳失敗");
  });
}

/********************
 * 發送留言
 ********************/
function sendComment() {
  const text = document.getElementById("commentText").value.trim();
  const user = auth.currentUser;

  if (!text || !user) return;

  db.collection("comments").add({
    uid: user.uid,
    text: text,
    time: firebase.firestore.FieldValue.serverTimestamp()
  });

  document.getElementById("commentText").value = "";
}

/********************
 * 顯示留言（不需登入）
 ********************/
db.collection("comments")
  .orderBy("time", "desc")
  .onSnapshot(snapshot => {
    const list = document.getElementById("commentList");
    list.innerHTML = "";

    snapshot.forEach(doc => {
      const data = doc.data();

      list.innerHTML += `
        <div class="border rounded p-2 mb-2">
          <p class="mb-1">${data.text}</p>
        </div>
      `;
    });
  });
