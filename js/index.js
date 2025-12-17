import { auth, db } from "./firebase.js"; 
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  collection,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // DOM
  const googleBtn = document.getElementById("google-login");
  const emailBtn = document.getElementById("email-login"); 
  const logoutBtn = document.getElementById("logout");
  const userArea = document.getElementById("userArea");
  const userAvatar = document.getElementById("userAvatar");
  const userName = document.getElementById("userName");
  const loginArea = document.getElementById("loginArea");
  const commentInputArea = document.getElementById("commentInputArea");
  const textarea = document.getElementById("comment-input");
  const postBtn = document.getElementById("post-comment");
  const commentList = document.getElementById("comment-list");

  const changeAvatarInput = document.createElement("input");
  changeAvatarInput.type = "file";
  changeAvatarInput.accept = "image/*";
  changeAvatarInput.classList.add("d-none");
  document.body.appendChild(changeAvatarInput);

  // 初始化
  commentInputArea.classList.add("d-none");
  userArea.classList.add("d-none");

  // 登入狀態
  onAuthStateChanged(auth, user => {
    if (user) {
      userAvatar.src = user.photoURL || "images/andrew.png";
      userName.textContent = user.displayName || "匿名";

      userArea.classList.remove("d-none");
      loginArea.classList.add("d-none");
      commentInputArea.classList.remove("d-none");
    } else {
      userArea.classList.add("d-none");
      loginArea.classList.remove("d-none");
      commentInputArea.classList.add("d-none");
    }
  });

  // Google 登入
  googleBtn.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    try { await signInWithPopup(auth, provider); } 
    catch(err){ console.error(err); alert("登入失敗："+err.message); }
  });

  // 登出
  logoutBtn.addEventListener("click", async () => { await signOut(auth); });

  // 留言
  postBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if(!user){ alert("請先登入"); return; }
    const text = textarea.value.trim();
    if(!text) return;
    await addDoc(collection(db, "comments"), {
      uid: user.uid,
      name: user.displayName || "匿名",
      avatar: user.photoURL || "",
      text: text,
      time: serverTimestamp()
    });
    textarea.value = "";
  });

  // 顯示留言
  const q = query(collection(db, "comments"), orderBy("time","desc"));
  onSnapshot(q, snapshot => {
    commentList.innerHTML="";
    snapshot.forEach(docSnap=>{
      const data = docSnap.data();
      const div = document.createElement("div");
      div.className="border rounded p-2 mb-2 d-flex align-items-start gap-2";

      const img = document.createElement("img");
      img.src=data.avatar || "images/andrew.png";
      img.alt="頭像";
      img.className="rounded-circle";
      img.style.width="40px"; img.style.height="40px";

      const contentDiv = document.createElement("div");
      const nameP = document.createElement("p");
      nameP.className="mb-1 fw-bold"; nameP.textContent=data.name||"匿名";
      const textP = document.createElement("p");
      textP.className="mb-0"; textP.textContent=data.text;

      contentDiv.appendChild(nameP); contentDiv.appendChild(textP);
      div.appendChild(img); div.appendChild(contentDiv);
      commentList.appendChild(div);
    });
  });

  // 點頭像修改
  userAvatar.addEventListener("click", ()=>{ changeAvatarInput.click(); });
  changeAvatarInput.addEventListener("change", async (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "guest-upload"); 

    const res = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload",{
      method:"POST", body:formData
    });
    const data = await res.json();
    const user = auth.currentUser;
    await updateProfile(user, { photoURL: data.secure_url });
    await updateDoc(doc(db,"users",user.uid), { avatar: data.secure_url });
    userAvatar.src = data.secure_url;
  });

  // 點暱稱修改
  userName.addEventListener("click", async ()=>{
    const newName = prompt("輸入新暱稱", userName.textContent);
    if(!newName) return;
    const user = auth.currentUser;
    await updateProfile(user,{ displayName: newName });
    await updateDoc(doc(db,"users",user.uid), { name: newName });
    userName.textContent = newName;
  });

});
