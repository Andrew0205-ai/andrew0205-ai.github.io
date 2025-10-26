// ====================== Firebase.js (v10 模組化版本) ======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Firebase 初始化
const firebaseConfig = {
  apiKey: "AIzaSyClktI5_wSo-u9LuwdsBVzH6buizJPXMAs",
  authDomain: "mycomment-ad1ba.firebaseapp.com",
  projectId: "mycomment-ad1ba",
  storageBucket: "mycomment-ad1ba.appspot.com",
  messagingSenderId: "1076313273646",
  appId: "1:1076313273646:web:2b5aaa8c6bd5824828f6bf",
  measurementId: "G-3NGHCWH7TP"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const storage = getStorage(app);

// 防 XSS
function sanitize(str) {
  if (typeof str !== "string") return "";
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
            .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

// 登入 / 登出
window.login = () => signInWithPopup(auth, provider).catch(console.error);
window.logout = () => signOut(auth).catch(console.error);

// 新增留言
window.addComment = async function() {
  const messageInput = document.getElementById("message");
  const customNameInput = document.getElementById("custom-name");
  const customPhotoInput = document.getElementById("custom-photo");
  const anonymousCheckbox = document.getElementById("anonymous");

  if (!messageInput) return console.error("找不到輸入欄位 message");
  const message = sanitize(messageInput.value.trim());
  if (!message) return alert("請輸入留言內容！");
  const user = auth.currentUser;
  if (!user) return alert("請先登入！");

  // 處理名字
  let name = user.displayName || "訪客";
  if (anonymousCheckbox.checked) name = "匿名";
  else if (customNameInput && customNameInput.value.trim() !== "") 
    name = sanitize(customNameInput.value.trim());

  // 處理頭像
  let photo = user.photoURL || "";
  if (customPhotoInput && customPhotoInput.files[0]) {
    const file = customPhotoInput.files[0];
    const storageRef = ref(storage, `comment-photos/${Date.now()}-${file.name}`);
    await uploadBytes(storageRef, file);
    photo = await getDownloadURL(storageRef);
  }

  // 新增留言
  try {
    await addDoc(collection(db, "comment"), {
      name,
      photo,
      message,
      uid: user.uid,
      timestamp: serverTimestamp()
    });
    messageInput.value = "";
    if (customNameInput) customNameInput.value = "";
    if (customPhotoInput) customPhotoInput.value = "";
  } catch (e) {
    console.error("留言失敗", e);
  }
};

// 刪除留言
window.deleteComment = async function(docId) {
  if (!confirm("確定刪除？")) return;
  try { await deleteDoc(doc(db,"comment",docId)); } 
  catch(e){console.error(e); alert("刪除失敗");}
};

// 監聽登入狀態
onAuthStateChanged(auth, user => {
  const userInfo = document.getElementById("user-info");
  const userPhoto = document.getElementById("user-photo");
  const userName = document.getElementById("user-name");
  const loginBox = document.getElementById("login-box");
  const commentBox = document.getElementById("comment-box");
  if(user){
    if(userPhoto) userPhoto.src=user.photoURL||"";
    if(userName) userName.innerText=`👋 歡迎，${user.displayName||""}`;
    if(userInfo) userInfo.style.display="flex";
    if(loginBox) loginBox.style.display="none";
    if(commentBox) commentBox.style.display="block";
  }else{
    if(userInfo) userInfo.style.display="none";
    if(loginBox) loginBox.style.display="block";
    if(commentBox) commentBox.style.display="none";
  }
});

// 即時顯示留言
const messagesDiv = document.getElementById("messages");
const q = query(collection(db,"comment"),orderBy("timestamp","desc"));
onSnapshot(q, snapshot=>{
  if(!messagesDiv) return;
  messagesDiv.innerHTML="";
  snapshot.forEach(docSnap=>{
    const data=docSnap.data();
    const id=docSnap.id;
    const time=data.timestamp?data.timestamp.toDate().toLocaleString():"（時間未知）";
    const div=document.createElement("div");
    div.className="comment-card";
    div.innerHTML=`
      <div style="display:flex;align-items:center;gap:8px;">
        <img src="${data.photo||''}" style="width:32px;height:32px;border-radius:50%;" alt="">
        <b>${sanitize(data.name||"訪客")}</b>
      </div>
      <p>${sanitize(data.message||"")}</p>
      <small>${time}</small>
    `;
    const currentUser = auth.currentUser;
    if(currentUser && data.uid===currentUser.uid){
      const delBtn=document.createElement("button");
      delBtn.textContent="🗑 刪除";
      delBtn.onclick=()=>window.deleteComment(id);
      div.appendChild(delBtn);
    }
    messagesDiv.appendChild(div);
  });
});
