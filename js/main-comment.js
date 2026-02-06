// ==========================================
// 1. 初始化與全域變數
// ==========================================
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;
const ADMIN_UID = "mKU5cngfmNXyXupfM9XAc8MqgNU2";
const FORBIDDEN_WORDS = ["白痴","垃圾","死","fuck","shit","北七","笨蛋"];
let myTempId = localStorage.getItem('myTempId') || 'temp_' + Math.random().toString(36).substr(2,9);
localStorage.setItem('myTempId', myTempId);

let lastVisible = null;
let isCooldown = false;
let currentParentId = null; // 新增：記錄目前正在回覆哪一則留言

// ==========================================
// 2. 工具函式 (Toast, 檢查, 連結轉換)
// ==========================================
function showToast(msg, type="success") {
    let container = document.getElementById("toastContainer");
    if(!container){
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "position-fixed top-0 end-0 p-3";
        container.style.zIndex = "11000";
        document.body.appendChild(container);
    }
    const toastEl = document.createElement("div");
    toastEl.className = `toast align-items-center text-bg-${type} border-0 mb-2`;
    toastEl.setAttribute("role","alert");
    toastEl.setAttribute("aria-live","assertive");
    toastEl.setAttribute("aria-atomic","true");
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${msg}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>`;
    container.appendChild(toastEl);
    const bsToast = new bootstrap.Toast(toastEl,{delay:2500});
    bsToast.show();
}

function hasBadWords(text){
    const lowText = text.toLowerCase();
    return FORBIDDEN_WORDS.some(word => lowText.includes(word));
}

function transformLinks(html){
    const div = document.createElement("div");
    div.innerHTML=html;
    const allowedDomains=["andrew0205-ai.github.io","andrew0205blogs.blogspot.com"];
    div.querySelectorAll("a").forEach(a=>{
        try{
            const href = new URL(a.href,location.origin);
            if(href.hostname !== location.hostname && !allowedDomains.includes(href.hostname)){
                a.href = `redirect.html?url=${encodeURIComponent(a.href)}`;
                a.target="_blank";
                a.rel="noopener noreferrer";
            }
        }catch{}
    });
    return div.innerHTML;
}

// ==========================================
// 3. 留言發布邏輯 (支援回覆)
// ==========================================
async function postComment(){
    const input = document.getElementById("commentInput");
    const text = input.value.trim();
    if(!text || isCooldown) return;
    if(hasBadWords(text)) return showToast("⚠️ 留言包含不當字眼！","danger");
    saveComment(text, false);
}

// 準備回覆功能
function prepareReply(parentId, parentName) {
    currentParentId = parentId;
    const input = document.getElementById("commentInput");
    input.focus();
    showToast(`正在回覆 ${parentName}... 💬`);
    
    // 如果有取消按鈕可以顯示，讓使用者反悔
    input.placeholder = `正在回覆 ${parentName}...`;
}

async function saveComment(text, isQuick){
    isCooldown = true;
    let userData = {name:"路過的匿名朋友", avatar:"https://cdn-icons-png.flaticon.com/512/1144/1144760.png", uid:"anonymous"};
    
    if(currentUser){
        const doc = await db.collection("users").doc(currentUser.uid).get();
        if(doc.exists){
            const data = doc.data();
            userData.name = data.name || "朋友";
            userData.avatar = data.avatar || "images/andrew.png";
        } else {
            userData.name = currentUser.displayName || "朋友";
            userData.avatar = currentUser.photoURL || "images/andrew.png";
        }
        userData.uid = currentUser.uid;
    }

    const data = {
        uid: userData.uid,
        authorTempId: currentUser ? "member" : myTempId,
        name: userData.name,
        avatar: userData.avatar,
        text: text,
        parentId: currentParentId || null, // 關鍵：記錄父留言 ID
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("comments").add(data);
        if(!isQuick){
            const input = document.getElementById("commentInput");
            input.value = "";
            input.placeholder = "說點什麼吧...";
            document.getElementById("count").textContent = "0";
        }
        currentParentId = null; // 重設回覆 ID
        showToast("發布成功！💖");
        loadComments(true);
        setTimeout(() => { isCooldown = false; }, 3000);
    } catch(e) {
        console.error(e);
        showToast("發布失敗，請檢查權限。", "danger");
        isCooldown = false;
    }
}

// ==========================================
// 4. 載入與渲染 (巢狀結構)
// ==========================================
async function loadComments(reset=false){
    let query = db.collection("comments").orderBy("timestamp", "asc"); // 回覆功能建議用正序，或抓全部後前端排序
    
    const snap = await query.get();
    const commentsEl = document.getElementById("comments");
    if(reset) { commentsEl.innerHTML = ""; }
    if(snap.empty) return;

    const allComments = [];
    snap.forEach(doc => allComments.push({ id: doc.id, ...doc.data() }));

    // 區分主留言與回覆
    const mainComments = allComments.filter(c => !c.parentId);
    const replies = allComments.filter(c => c.parentId);

    // 先渲染主留言
    mainComments.forEach(c => renderSingleComment(c, "comments"));
    
    // 再將回覆插入對應的主留言下方
    replies.forEach(r => {
        const replyContainerId = `replies-${r.parentId}`;
        // 確保父容器存在
        if(document.getElementById(replyContainerId)){
            renderSingleComment(r, replyContainerId, true);
        }
    });
}

function renderSingleComment(d, containerId, isReply = false) {
    const container = document.getElementById(containerId);
    const canManage = (currentUser && (currentUser.uid===ADMIN_UID || currentUser.uid===d.uid)) ||
                      (!currentUser && d.authorTempId===myTempId);
    const safeHtml = transformLinks(marked.parse(DOMPurify.sanitize(d.text)));
    
    const html = `
    <div class="d-flex ${isReply ? 'mt-3 ms-4 ps-2 border-start' : 'mb-4'}" id="comment-${d.id}" data-uid="${d.uid}">
        <img src="${d.avatar}" width="${isReply?35:50}" height="${isReply?35:50}" class="rounded-circle me-3 border shadow-sm" alt="${d.name}">
        <div class="flex-grow-1 ${!isReply ? 'border-bottom pb-3' : ''}">
            <div class="d-flex justify-content-between align-items-center">
                <strong>${d.name} ${d.uid===ADMIN_UID?'<span class="badge bg-danger badge-red">板主</span>':''}</strong>
                <small class="text-muted">${d.timestamp ? new Date(d.timestamp.toDate()).toLocaleString() : '剛剛'}</small>
            </div>
            <div class="mt-2 text-dark">${safeHtml}</div>
            <div class="mt-2 small">
                ${!isReply ? `<span role="button" class="text-primary cursor-pointer me-2" onclick="prepareReply('${d.id}', '${d.name}')">回覆</span>` : ''}
                ${canManage ? `
                    <span role="button" class="text-secondary cursor-pointer me-2" onclick="editComment('${d.id}')">編輯</span>
                    <span role="button" class="text-danger cursor-pointer" onclick="deleteComment('${d.id}')">刪除</span>
                ` : ""}
            </div>
            ${!isReply ? `<div id="replies-${d.id}"></div>` : ""}
        </div>
    </div>`;
    
    container.insertAdjacentHTML("beforeend", html);
}

// ==========================================
// 5. 編輯 / 刪除 / 使用者管理 (維持原樣)
// ==========================================
// ... 這裡保留你原本的 deleteComment, editComment, saveEdit, uploadAvatarToCloudinary 等功能 ...
// ... 以及你的 Auth 監聽邏輯 ...

async function deleteComment(id){
    if(!confirm("確定要刪除此留言嗎？（這將不會刪除其下的回覆）")) return;
    try{
        await db.collection("comments").doc(id).delete();
        document.getElementById(`comment-${id}`).remove();
        showToast("留言已刪除 🗑️");
    }catch(e){
        showToast("刪除失敗","danger");
    }
}

// ==========================================
// 6. 初始化執行
// ==========================================
auth.onAuthStateChanged(user=>{
    currentUser=user;
    updateUI();
    loadComments(true);
});

async function logout(){
    await auth.signOut();
    showToast("已成功登出 👋");
}

function updateUI(){
    const loginArea=document.getElementById("loginArea");
    const userArea=document.getElementById("userArea");
    const commentArea=document.getElementById("commentArea");
    if(currentUser){
        loginArea.classList.add("d-none");
        userArea.classList.remove("d-none");
        commentArea.classList.remove("d-none");
        document.getElementById("userName").textContent=currentUser.displayName||"新朋友";
        document.getElementById("userAvatar").src=currentUser.photoURL||"images/andrew.png";
    }else{
        loginArea.classList.remove("d-none");
        userArea.classList.add("d-none");
        commentArea.classList.add("d-none");
    }
}
