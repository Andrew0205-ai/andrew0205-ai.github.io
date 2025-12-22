firebase.initializeApp({
  apiKey: "AIzaSyClktI5_wSo-u9LuwdsBVzH6buizJPXMAs",
  authDomain: "mycomment-ad1ba.firebaseapp.com",
  projectId: "mycomment-ad1ba"
});

const db = firebase.firestore();
let currentUser = { uid: "guest" };

function postComment() {
  const raw = document.getElementById("commentInput").value;
  if (!raw) return;

  db.collection("comments").add({
    content: raw,
    uid: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  document.getElementById("commentInput").value = "";
}

function loadComments() {
  db.collection("comments")
    .orderBy("createdAt", "desc")
    .onSnapshot(snap => {
      const box = document.getElementById("comments");
      box.innerHTML = "";

      snap.forEach(doc => {
        const c = doc.data();
        box.innerHTML += `
          <div class="border p-2 mb-2">
            ${renderContent(c.content)}
          </div>
        `;
      });
    });
}

loadComments();
