// ==========================================
// index.js V4.0 - 小宏的留言板 (最強防禦版)
// ==========================================

const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

// --- 【重要設定】管理員 UID ---
// 登入後在 Console 輸入 firebase.auth().currentUser.uid 取得並貼在此處
const ADMIN_UID = "mKU5cngfmNXyXupfM9XAc8MqgNU2"; 

// --- 【安全設定】髒話過濾器 ---
const FORBIDDEN_WORDS = ["白痴", "垃圾", "靠", "死", "fuck", "shit"];

// 2. 匿名者身分證 (LocalStorage)
// 用來確保匿名者只能編輯/刪除「自己這台電腦」發出的留言
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
// 功能：發布留言 (核心邏輯)
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
        authorTempId: currentUser ? null : myTempId, // 匿名者標記
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
        // 3秒冷卻時間防止洗版
        setTimeout(() => { isCooldown = false; }, 3000);
    } catch (e) {
        console.error("發布失敗", e);
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
        
        // 權限判斷：1.你是管理員(小宏) 2.你是該留言登入主人 3.你是該匿名留言發布者
        const canManage = (currentUser && currentUser.uid === ADMIN_UID) || 
                          (currentUser && currentUser.uid === d.uid) || 
                          (!currentUser && d.authorTempId === myTempId);

        const html = `
            <div class="d-flex mb-4" id="comment-${id}">
                <img src="${d.avatar || 'images/andrew.png'}" width="50" height="50" class="rounded-circle me-3 border shadow-sm">
                <div class="flex-grow-1 border-bottom pb-3">
                    <div class="d-flex justify-content-between">
                        <strong>
                            ${d.name} 
                            ${d.uid === ADMIN_UID ? '<span class="admin-badge">板主</span>' : ''}
                        </strong>
                        <small class="text-muted" style="font-size:0.75rem">${timeAgo(d.timestamp)}</small>
                    </div>
                    <div class="mt-2 text-dark">${marked.parse(DOMPurify.sanitize(d.text))}</div>
                    ${canManage ? `
                        <div class="mt-2">
                            <span class="text-primary cursor-pointer me-3 small" onclick="editComment('${id}')"><i class="bi bi-pencil"></i> 編輯</span>
                            <span class="text-danger cursor-pointer small" onclick="deleteComment('${id}')"><i class="bi bi-trash"></i> 刪除</span>
                        </div>` : ""}
                </div>
            </div>`;
        commentsEl.insertAdjacentHTML("beforeend", html);
    });
}

// -----------------------
// 功能：管理員/作者刪除與編輯
// -----------------------
async function deleteComment(id) {
    if (!confirm("確定要移除這則留言嗎？")) return;
    await db.collection("comments").doc(id).delete();
    document.getElementById(`comment-${id}`).remove();
    welcomeAnimation("留言已移除");
}

let editId = null;
function editComment(id) {
    editId = id;
    const commentEl = document.querySelector(`#comment-${id} .mt-2`);
    // 這裡簡單處理，實際可彈出 Modal
    const oldText = commentEl.innerText;
    document.getElementById("editInput").value = oldText;
    new bootstrap.Modal(document.getElementById('editModal')).show();
}

async function saveEdit() {
    const newText = document.getElementById("editInput").value.trim();
    if (!newText || !editId) return;
    await db.collection("comments").doc(editId).update({ text: newText });
    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
    loadComments(true);
}

// -----------------------
// 功能：使用者介面切換 (Auth)
// -----------------------
function updateUI() {
    const loginArea = document.getElementById("loginArea");
    const userArea = document.getElementById("userArea");
    const commentArea = document.getElementById("commentArea");

    if (currentUser) {
        loginArea.classList.add("d-none");
        userArea.classList.remove("d-none");
        commentArea.classList.remove("d-none");
        document.getElementById("userName").textContent = currentUser.displayName || currentUser.email;
        document.getElementById("userAvatar").src = currentUser.photoURL || "images/andrew.png";
    } else {
        loginArea.classList.remove("d-none");
        userArea.classList.add("d-none");
        commentArea.classList.add("d-none");
    }
}

// -----------------------
// 其他基礎功能 (登入、登出、動畫)
// -----------------------
async function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
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
