// ==========================================
// 1. 初始化 Firebase 與環境變數
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
let currentParentId = null; // 紀錄目前正在回覆哪一則留言

// ==========================================
// 2. 工具函式 (Toast, 內容檢查, 連結跳轉)
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
// 3. 留言發布與回覆邏輯
// ==========================================
async function postComment(){
    const input = document.getElementById("commentInput");
    const text = input.value.trim();
    if(!text || isCooldown) return;
    if(hasBadWords(text)) return showToast("⚠️ 留言包含不當字眼！","danger");
    saveComment(text, false);
}

function prepareReply(parentId, parentName) {
    currentParentId = parentId;
    const input = document.getElementById("commentInput");
    input.focus();
    input.placeholder = `正在回覆 ${parentName}...`;
    showToast(`正在回覆 ${parentName}... 💬`);
}

async function postQuickComment(msg){
    if(isCooldown) return;
    saveComment(msg, true);
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
        parentId: currentParentId || null,
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
        currentParentId = null;
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
async function loadComments(reset = false) {
    const commentsEl = document.getElementById("comments");
    const loadMoreBtn = document.getElementById("loadMoreBtn");

    if (reset) {
        lastVisible = null;
        commentsEl.innerHTML = ""; 
    }

    try {
        let query = db.collection("comments")
                      .where("parentId", "==", null)
                      .orderBy("timestamp", "desc")
                      .limit(10);

        if (!reset && lastVisible) query = query.startAfter(lastVisible);

        const snap = await query.get();
        
        if (snap.empty) {
            if (loadMoreBtn) loadMoreBtn.style.display = "none";
            if (reset) commentsEl.innerHTML = '<p class="text-center text-muted my-5">目前還沒有留言喔，來當第一個吧！</p>';
            return;
        }

        lastVisible = snap.docs[snap.docs.length - 1];

        // 使用 for...of 確保順序
        for (const doc of snap.docs) {
            const d = { ...doc.data(), id: doc.id };
            
            // 1. 先渲染主留言
            renderSingleComment(d, "comments", false);
            
            // 2. 抓取該留言下的回覆
            const replySnap = await db.collection("comments")
                                      .where("parentId", "==", d.id)
                                      .orderBy("timestamp", "asc")
                                      .get();
            
            // 3. 渲染回覆（加一個小檢查確保容器存在）
            replySnap.forEach(rDoc => {
                const rd = { ...rDoc.data(), id: rDoc.id };
                const replyContainer = document.getElementById(`replies-${d.id}`);
                if (replyContainer) {
                    renderSingleComment(rd, `replies-${d.id}`, true);
                }
            });
        }

        // 4. 所有留言渲染完後，再決定按鈕要不要出現
        if (loadMoreBtn) {
            loadMoreBtn.style.display = (snap.docs.length < 10) ? "none" : "block";
        }

    } catch (err) {
        console.error("載入失敗：", err);
        showToast("系統載入異常，請重新整理", "danger");
    }
}, containerId, isReply = false) {
    const container = document.getElementById(containerId);
    if(!container) return;

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
// 5. 編輯 / 刪除 / 圖片上傳
// ==========================================
async function deleteComment(id){
    if(!confirm("確定要刪除此留言嗎？")) return;
    try{
        await db.collection("comments").doc(id).delete();
        const el = document.getElementById(`comment-${id}`);
        if(el) el.remove();
        showToast("留言已刪除 🗑️");
    }catch(e){
        showToast("刪除失敗","danger");
    }
}

let currentEditId=null;
function editComment(id){
    const el = document.getElementById(`comment-${id}`);
    const text = el.querySelector("div.mt-2").innerText;
    currentEditId=id;
    document.getElementById("editInput").value=text;
    const modal = new bootstrap.Modal(document.getElementById("editModal"));
    modal.show();
}

async function saveEdit(){
    const text=document.getElementById("editInput").value.trim();
    if(!text) return showToast("留言不可空白！","danger");
    try{
        await db.collection("comments").doc(currentEditId).update({text});
        const el = document.getElementById(`comment-${currentEditId}`);
        el.querySelector("div.mt-2").innerHTML = marked.parse(DOMPurify.sanitize(text));
        bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
        showToast("留言已更新 ✏️");
    }catch(e){
        showToast("更新失敗","danger");
    }
}

async function uploadImage(){
    const fileInput = document.getElementById("imageInput");
    fileInput.click();
    fileInput.onchange = async ()=>{
        const file=fileInput.files[0];
        if(!file || file.size>5*1024*1024) return showToast("檔案太大！請選擇 5MB 以下。","danger");
        const formData=new FormData();
        formData.append("file",file);
        formData.append("upload_preset","guest-upload");
        try{
            showToast("圖片傳送中... ☁️");
            const res=await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload",{method:"POST",body:formData});
            const data=await res.json();
            const input=document.getElementById("commentInput");
            input.value+=`\n![圖片](${data.secure_url})\n`;
            showToast("圖片上傳成功！📸");
        }catch(e){
            showToast("上傳失敗","danger");
        }
    };
}

// ==========================================
// 6. 使用者管理與 Auth
// ==========================================
async function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (!userDoc.exists) {
            await db.collection("users").doc(user.uid).set({
                name: user.displayName || "新朋友",
                avatar: user.photoURL || "images/defult-avatar.png",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        showToast(`歡迎回來，${user.displayName}！✨`);
    } catch (error) {
        showToast("登入失敗", "danger");
    }
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
        document.getElementById("userAvatar").src=currentUser.photoURL||"images/defult-avatar.png";
    }else{
        loginArea.classList.remove("d-none");
        userArea.classList.add("d-none");
        commentArea.classList.add("d-none");
    }
}

auth.onAuthStateChanged(user=>{
    currentUser=user;
    updateUI();
    loadComments(true);
});

async function logout(){
    try{
        await auth.signOut();
        showToast("已成功登出 👋");
    }catch(err){
        showToast("登出失敗","danger");
    }
}

// ==========================================
// 7. 初始化執行
// ==========================================
document.addEventListener("DOMContentLoaded",()=>{
    const commentInput = document.getElementById("commentInput");
    if(commentInput){
        commentInput.addEventListener("input",function(){
            document.getElementById("count").textContent=this.value.length;
        });
    }
    const backBtn = document.getElementById("backToTop");
    if(backBtn) backBtn.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
});
// ==========================================
// 1. 打開個人資料彈窗
// ==========================================
async function openProfileModal() {
    if (!currentUser) return showToast("請先登入才能修改資料喔！", "danger");
    
    const previewImg = document.getElementById("modalPreviewImg");
    const nameInput = document.getElementById("modalNameInput");
    
    try {
        const doc = await db.collection("users").doc(currentUser.uid).get();
        if (doc.exists) {
            const data = doc.data();
            nameInput.value = data.name || "";
            previewImg.src = data.avatar || "images/andrew.png";
        } else {
            nameInput.value = currentUser.displayName || "";
            previewImg.src = currentUser.photoURL || "images/andrew.png";
        }
        
        // 顯示 Modal
        const profileModal = new bootstrap.Modal(document.getElementById("profileModal"));
        profileModal.show();
    } catch (err) {
        console.error(err);
        showToast("讀取資料失敗", "danger");
    }
}

// ==========================================
// 2. 儲存個人資料變動
// ==========================================
async function saveProfileChanges() {
    if (!currentUser) return;
    
    const nameInput = document.getElementById("modalNameInput");
    const fileInput = document.getElementById("modalFileBtn");
    const progress = document.getElementById("uploadProgress");
    const newName = nameInput.value.trim();
    
    if (!newName) return showToast("名稱不能空白喔！", "danger");

    try {
        progress.classList.remove("d-none"); // 顯示進度條
        let avatarUrl = document.getElementById("modalPreviewImg").src; // 預設使用目前的圖片
        
        // 如果有選新檔案，才上傳到 Cloudinary
        if (fileInput.files[0]) {
            avatarUrl = await uploadAvatarToCloudinary(fileInput.files[0]);
        }
        
        // 更新 Firestore 中的使用者資料
        await db.collection("users").doc(currentUser.uid).set({
            name: newName,
            avatar: avatarUrl,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // 同步更新當前 UI 上的頭像與名字
        document.getElementById("userName").textContent = newName;
        document.getElementById("userAvatar").src = avatarUrl;
        
        showToast("資料更新成功！💖");
        
        // 隱藏 Modal
        const modalEl = document.getElementById("profileModal");
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance.hide();
        
        // 重新載入留言讓名字更新
        loadComments(true);

    } catch (err) {
        console.error(err);
        showToast("儲存失敗，請再試一次。", "danger");
    } finally {
        progress.classList.add("d-none"); // 隱藏進度條
    }
}
