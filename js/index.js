const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let editingId = null;

/* 登入狀態 */
auth.onAuthStateChanged(user => {
  currentUser = user;

  document.getElementById("loginArea").classList.toggle("d-none", !!user);
  document.getElementById("userArea").classList.toggle("d-none", !user);
  document.getElementById("commentArea").classList.toggle("d-none", !user);

  if (user) {
    document.getElementById("userName").textContent =
      user.displayName || "未命名";
    document.getElementById("userAvatar").src =
      user.photoURL || "https://via.placeholder.com/36";
  }

  loadComments();
});

/* Google 登入 */
function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
}

/* 登出 */
function logout() {
  auth.signOut();
}

/* 字數計算 */
const input = document.getElementById("commentInput");
const count = document.getElementById("count");
input.oninput = () => count.textContent = input.value.length;

/* 發送留言 */
function postComment() {
  if (!input.value.trim()) return;

  db.collection("comments").add({
    uid: currentUser.uid,
    name: currentUser.displayName,
    avatar: currentUser.photoURL,
    content: input.value,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  input.value = "";
  count.textContent = "0";
}

/* 載入留言（即時） */
function loadComments() {
  db.collection("comments")
    .orderBy("createdAt", "desc")
    .onSnapshot(snap => {
      const box = document.getElementById("comments");
      box.innerHTML = "";

      snap.forEach(doc => {
        const c = doc.data();
        const mine = currentUser && c.uid === currentUser.uid;

        box.innerHTML += `
          <div class="border p-2 mb-2">
            <div class="d-flex align-items-center mb-1">
              <img src="${c.avatar}" width="24" class="rounded-circle me-2">
              <strong>${c.name}</strong>
            </div>
            <div>${c.content}</div>
            ${
              mine
                ? `<button class="btn btn-sm btn-link" onclick="openEdit('${doc.id}', \`${c.content}\`)">編輯</button>`
                : ""
            }
          </div>
        `;
      });
    });
}

/* 編輯留言 */
function openEdit(id, text) {
  editingId = id;
  document.getElementById("editInput").value = text;
  new bootstrap.Modal(document.getElementById("editModal")).show();
}

function saveEdit() {
  db.collection("comments").doc(editingId).update({
    content: document.getElementById("editInput").value
  });
}
