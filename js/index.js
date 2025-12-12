import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { collection, getDocs, addDoc, orderBy, query, serverTimestamp, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const commentInput = document.getElementById("comment-input");
const postCommentBtn = document.getElementById("post-comment");
const commentList = document.getElementById("comment-list");
const logoutBtn = document.getElementById("logout");

onAuthStateChanged(auth, async user=>{
  if(user) logoutBtn.classList.remove("d-none");
  else logoutBtn.classList.add("d-none");
  await loadComments();
});

logoutBtn.addEventListener("click", ()=>signOut(auth));

postCommentBtn.addEventListener("click", async ()=>{
  const user = auth.currentUser;
  if(!user) return alert("請先登入");
  const text = commentInput.value.trim();
  if(!text) return;
  await addDoc(collection(db,"comments"),{
    uid: user.uid,
    displayName: user.displayName || "匿名",
    text,
    createdAt: serverTimestamp()
  });
  commentInput.value="";
  await loadComments();
});

async function loadComments(){
  const q = query(collection(db,"comments"), orderBy("createdAt","desc"));
  const snapshot = await getDocs(q);
  commentList.innerHTML="";
  snapshot.forEach(docSnap=>{
    const data = docSnap.data();
    const div = document.createElement("div");
    div.classList.add("comment-card");
    let deleteBtnHTML="";
    const user = auth.currentUser;
    if(user && user.uid === data.uid) deleteBtnHTML=`<button class="delete-comment-btn">刪除留言</button>`;
    div.innerHTML=`<b>${data.displayName}</b>: ${data.text} ${deleteBtnHTML}`;
    commentList.appendChild(div);
    if(deleteBtnHTML) div.querySelector(".delete-comment-btn").addEventListener("click",()=>deleteComment(docSnap.id));
  });
}

async function deleteComment(commentId){
  const user = auth.currentUser;
  if(!user) return alert("請先登入");
  if(!confirm("確定刪除留言？")) return;
  await deleteDoc(doc(db,"comments",commentId));
  await loadComments();
}
