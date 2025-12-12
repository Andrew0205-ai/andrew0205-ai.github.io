import { auth, db } from "./firebase.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const userAvatar = document.getElementById("user-avatar");
const displayNameInput = document.getElementById("display-name-input");
const avatarUpload = document.getElementById("avatar-upload");
const saveProfileBtn = document.getElementById("save-profile");

auth.onAuthStateChanged(async user=>{
  if(!user) { alert("請先登入"); window.location.href="login.html"; return; }
  const docSnap = await getDoc(doc(db,"users",user.uid));
  const data = docSnap.exists()?docSnap.data():{};
  displayNameInput.value = data.displayName || user.displayName || "";
  userAvatar.src = data.avatarUrl || user.photoURL || "https://via.placeholder.com/36";
});

saveProfileBtn.addEventListener("click", async ()=>{
  const user = auth.currentUser;
  if(!user) return;
  let avatarUrl = userAvatar.src;
  const file = avatarUpload.files[0];
  if(file){
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset","ml_default");
    const res = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload",{method:"POST",body:fd});
    const data = await res.json();
    avatarUrl = data.secure_url;
  }
  await setDoc(doc(db,"users",user.uid), {displayName:displayNameInput.value, avatarUrl},{merge:true});
  alert("資料已儲存！");
  window.location.href = "index.html";
});
