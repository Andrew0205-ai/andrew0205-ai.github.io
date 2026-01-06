// ==========================================
// index.js V4.1 - 小宏的留言板 (終極修復版)
// ==========================================

// 1. 初始化 Firebase
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

// --- 【重要：請修改此處】 ---
// 請填入你自己的 UID，這樣你才能刪除別人的惡作劇留言
const ADMIN_UID = "你的_FIREBASE_UID_貼在這裡"; 

// --- 【安全設定】髒話黑名單 ---
const FORBIDDEN_WORDS = ["白痴", "垃圾", "靠", "死", "fuck", "shit"];

// 2. 匿名者身分證 (LocalStorage)
let myTempId = localStorage.getItem('myTempId') || 'temp_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem('myTempId', myTempId);

let lastVisible = null;
let isCooldown = false;

// -----------------------
// 功能：髒話過濾檢查
// -----------------------
function hasBadWords(text) {
    const lowText = text.toLowerCase();
    return FORBIDDEN_WORDS.some(word => lowText.includes(word));
}

// -----------------------
// 功能：相對時間格式化
// -----------------------
function timeAgo(ts) {
    if (!ts) return "剛剛";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "剛剛";
    if (seconds < 3600) return Math.floor(seconds / 60) + " 分鐘前";
    if (seconds < 86400) return Math.floor(seconds / 3600) + " 小時前";
    return Math.floor(seconds / 86400) + " 天前";
}

// -----------------------
// 功能：發布留言 (一般 & 快捷)
// -----------------------
async function postQuickComment(msg) {
    if (isCooldown) return;
    saveComment(msg, true);
}

async function postComment() {
    const input = document.getElementById("commentInput");
    const text = input.value.trim();
    if (!text) return;
    if (hasBadWords(text)) {
        alert("⚠️ 留言包含不當字眼，請修正後再送出喔！");
        return;
    }
    saveComment(text, false);
}

async function saveComment(text, isQuick) {
    isCooldown = true;
    const data = {
        uid: currentUser ? currentUser.uid : "anonymous",
        authorTempId: currentUser ? "member" : myTempId, // 匿名者存入專屬臨時 ID
        name: currentUser ? (currentUser.displayName || "朋友") : "路過的匿名朋友",
        avatar: currentUser ? (currentUser.photoURL || "") : "https://cdn-icons-png.flaticon.com/512/1144/1144760.png",
        text: text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("comments").add(data);
        if (!isQuick) {
            document.getElementById("commentInput").value = "";
            document.getElementById("count").textContent = "0";
        }
        welcomeAnimation("留言成功！💖");
        loadComments(true);
        setTimeout(() => { isCooldown = false; }, 3000);
    } catch (e) {
        console.error("發布失敗，請檢查 Firestore Rules:", e);
        alert("發布失敗，可能是權限不足，請檢查資料庫 Rules 設定。");
        isCooldown = false;
    }
}

// -----------------------
// 功能：讀取留言列表
// -----------------------
async function loadComments(reset = false) {
    let query = db.collection("comments").orderBy("timestamp", "desc").limit(10);
    if (!reset && lastVisible) query = query.startAfter(lastVisible);

    const snap = await query.get();
    const commentsEl = document.getElementById("comments");
    if (reset) { commentsEl.innerHTML = ""; lastVisible = null; }
    if (snap.empty) return;
    lastVisible = snap.docs[snap.docs.length - 1];

    snap.forEach(doc => {
        const d = doc.data();
        const id = doc.id;
        
        // 權限判斷：1. 管理員 2. 登入的主人 3. 匿名發布者(比對 LocalStorage)
        const canManage = (currentUser && currentUser.uid === ADMIN_UID) || 
                          (currentUser && currentUser.uid === d.uid) || 
                          (!currentUser && d.authorTempId === myTempId);

        const html = `
            <div class="d-flex mb-4" id="comment-${id}">
                <img src="${d.avatar || 'images/andrew.png'}" width="50" height="50" class="rounded-circle me-3 border shadow-sm">
                <div class="flex-grow-1 border-bottom pb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <strong>
                            ${d.name} 
                            ${d.uid === ADMIN_UID ? '<span class="admin-badge">板主</span>' : ''}
                        </strong>
                        <small class="text-muted" style="font-size:0.75rem">${timeAgo(d.timestamp)}</small>
                    </div>
                    <div class="mt-2 text-dark">${marked.parse(DOMPurify.sanitize(d.text))}</div>
                    ${canManage ? `
                        <div class="mt-2">
                            <span class="text-primary cursor-pointer me-3 small" onclick="editComment('${id}')">編輯</span>
                            <span class="text-danger cursor-pointer small" onclick="deleteComment('${id}')">刪除</span>
                        </div>` : ""}
                </div>
            </div>`;
        commentsEl.insertAdjacentHTML("beforeend", html);
    });
}

// -----------------------
// 功能：刪除與編輯
// -----------------------
async function deleteComment(id) {
    if (!confirm("確定要移除這則留言嗎？")) return;
    try {
        await db.collection("comments").doc(id).delete();
        document.getElementById(`comment-${id}`).remove();
        welcomeAnimation("已成功刪除");
    } catch (e) {
        alert("刪除失敗，權限不足。");
    }
}

let editId = null;
function editComment(id) {
    editId = id;
    // 取得原本純文字內容 (避開 Markdown 標籤)
    db.collection("comments").doc(id).get().then(doc => {
        document.getElementById("editInput").value = doc.data().text;
        new bootstrap.Modal(document.getElementById('editModal')).show();
    });
}

async function saveEdit() {
    const newText = document.getElementById("editInput").value.trim();
    if (!newText || !editId) return;
    try {
        await db.collection("comments").doc(editId).update({ text: newText });
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        loadComments(true);
        welcomeAnimation("修改成功");
    } catch (e) {
        alert("修改失敗");
    }
}

// -----------------------
// 功能：Auth 狀態與 UI
// -----------------------
function updateUI() {
    if (currentUser) {
        document.getElementById("loginArea").classList.add("d-none");
        document.getElementById("userArea").classList.remove("d-none");
        document.getElementById("commentArea").classList.remove("d-none");
        document.getElementById("userName").textContent = currentUser.displayName || currentUser.email;
        document.getElementById("userAvatar").src = currentUser.photoURL || "images/andrew.png";
    } else {
        document.getElementById("loginArea").classList.remove("d-none");
        document.getElementById("userArea").classList.add("d-none");
        document.getElementById("commentArea").classList.add("d-none");
    }
}

async function googleLogin() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
    } catch (e) { alert("登入失敗"); }
}

function logout() {
    auth.signOut();
}

function welcomeAnimation(msg) {
    const toast = document.createElement("div");
    toast.className = "position-fixed top-0 start-50 translate-middle-x mt-3 p-3 bg-success text-white rounded shadow-lg";
    toast.style.zIndex = "9999";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

// 監聽字數
document.getElementById("commentInput").addEventListener("input", function() {
    document.getElementById("count").textContent = this.value.length;
});

// 監聽 Auth 狀態
auth.onAuthStateChanged(user => {
    currentUser = user;
    updateUI();
    loadComments(true);
});
// -----------------------
// 功能：Email 登入視窗邏輯
// -----------------------

// 開啟視窗並切換模式 
function openEmailModal(mode) {
  const title = document.getElementById("emailModalTitle");
  const nameRow = document.getElementById("nameRow");
  const passRow = document.getElementById("passwordRow");
  const avatarRow = document.getElementById("avatarRow");
  const errorEl = document.getElementById("emailError");

  // 初始化狀態
  errorEl.classList.add("d-none");
  errorEl.innerText = "";
  
  // 記錄目前模式，方便送出時判斷
  emailModalEl.dataset.mode = mode;

  if (mode === 'login') {
    title.innerText = "Email 登入";
    nameRow.style.display = "none";
    passRow.style.display = "block";
    avatarRow.style.display = "none";
  } else if (mode === 'signup') {
    title.innerText = "新用戶註冊";
    nameRow.style.display = "block";
    passRow.style.display = "block";
    avatarRow.style.display = "block";
  } else if (mode === 'reset') {
    title.innerText = "重設密碼";
    nameRow.style.display = "none";
    passRow.style.display = "none";
    avatarRow.style.display = "none";
  }

  const modal = new bootstrap.Modal(document.getElementById('emailModal'));
  modal.show();
}

// 處理送出按鈕
async function submitEmailAuth() {
  const mode = emailModalEl.dataset.mode;
  const email = document.getElementById("emailInput").value.trim();
  const password = document.getElementById("passwordInput").value;
  const name = document.getElementById("nameInput").value.trim();
  const errorEl = document.getElementById("emailError");

  if (!email) return alert("請輸入 Email");

  try {
    if (mode === 'login') {
      // 登入
      await auth.signInWithEmailAndPassword(email, password);
    } else if (mode === 'signup') {
      // 註冊
      if (password.length < 6) throw new Error("密碼至少需要 6 位數");
      const res = await auth.createUserWithEmailAndPassword(email, password);
      
      // 如果有填暱稱，更新 Profile
      if (name) {
        await res.user.updateProfile({ displayName: name });
      }
      // 如果有選頭像，處理上傳 (可接 Cloudinary)
      const avatarFile = document.getElementById("avatarInput").files[0];
      if (avatarFile) {
        // 這裡可以呼叫你之前的 Cloudinary 上傳邏輯
        // const url = await uploadToCloudinary(avatarFile);
        // await res.user.updateProfile({ photoURL: url });
      }
    } else if (mode === 'reset') {
      // 忘記密碼
      await auth.sendPasswordResetEmail(email);
      alert("密碼重設信件已寄出，請檢查您的信箱。");
    }

    // 成功後關閉視窗
    bootstrap.Modal.getInstance(document.getElementById('emailModal')).hide();
    welcomeAnimation(mode === 'signup' ? "歡迎加入！" : "登入成功！");
    
  } catch (error) {
    errorEl.classList.remove("d-none");
    errorEl.innerText = error.message;
  }
}

