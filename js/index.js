// Firebase 初始化
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 使用者狀態
let currentUser = null;

auth.onAuthStateChanged(user => {
  currentUser = user;
  loadComments();
});

// Cloudinary 上傳
async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", "guest_upload");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload",
    { method: "POST", body: fd }
  );

  const data = await res.json();
  return data.secure_url || "";
}

// XSS 防護
function sanitizeHTML(html) { /* ← 用上面那段 */ }

// 載入留言
function loadComments() {
  db.collection("comments")
    .orderBy("createdAt", "desc")
    .onSnapshot(snap => {
      const box = document.getElementById("comments");
      box.innerHTML = "";

      snap.forEach(doc => {
        const c = doc.data();
        box.innerHTML += `
          <div class="comment">
            <div>${c.content}</div>
            ${currentUser?.uid === c.uid
              ? `<button onclick="openEdit('${doc.id}', \`${c.content}\`)">編輯</button>`
              : ""}
          </div>
        `;
      });
    });
}
