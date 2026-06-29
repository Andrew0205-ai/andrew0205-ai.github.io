// ==========================================
// 1. 初始化 Firebase 與環境變數 
// ==========================================
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;
const ADMIN_UID = "mKU5cngfmNXyXupfM9XAc8MqgNU2";
const FORBIDDEN_WORDS = ["白痴","垃圾","死","fuck","shit","北七","笨蛋","fuck","Fuck","FUCK"];
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
    if(hasBadWords(text)) return showToast("⚠️ Bad words found in comment!","danger");
    saveComment(text, false);
}

function prepareReply(parentId, parentName) {
    currentParentId = parentId;
    const input = document.getElementById("commentInput");
    input.focus();
    input.placeholder = `Reply to ${parentName}...`;
    showToast(`Now Replying to ${parentName}... 💬`);
}

async function postQuickComment(msg){
    if(isCooldown) return;
    saveComment(msg, true);
}

async function saveComment(text, isQuick){
    isCooldown = true;
    let userData = {name:"Friend", avatar:"https://cdn-icons-png.flaticon.com/512/1144/1144760.png", uid:"anonymous"};
    
    if(currentUser){
        const doc = await db.collection("users").doc(currentUser.uid).get();
        if(doc.exists){
            const data = doc.data();
            userData.name = data.name || "Friend";
            userData.avatar = data.avatar || "images/andrew.png";
        } else {
            userData.name = currentUser.displayName || "Friend";
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
            input.placeholder = "Say something...";
            document.getElementById("count").textContent = "0";
        }
        currentParentId = null;
        showToast("Submitted！💖");
        loadComments(true);
        setTimeout(() => { isCooldown = false; }, 3000);
    } catch(e) {
        console.error(e);
        showToast("Failed to post.", "danger");
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
            if (reset) commentsEl.innerHTML = '<p class="text-center text-muted my-5">There are no comments yet, be the first one to comment!</p>';
            return;
        }

        lastVisible = snap.docs[snap.docs.length - 1];

        // --- 優化重點：並行抓取 ---
        
        // 1. 先把主留言的資料整理出來，並先渲染到畫面（讓使用者先看到東西）
        const mainComments = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        mainComments.forEach(d => renderSingleComment(d, "comments", false));

        // 2. 準備所有的「抓取回覆」任務，但不立即執行
        const replyPromises = mainComments.map(d => 
            db.collection("comments")
              .where("parentId", "==", d.id)
              .orderBy("timestamp", "asc")
              .get()
              .then(replySnap => ({ parentId: d.id, replySnap }))
        );

        // 3. 使用 Promise.all 同時發送所有請求
        const allRepliesResults = await Promise.all(replyPromises);

        // 4. 當所有回覆都抓回來後，一次性渲染到對應的容器
        allRepliesResults.forEach(({ parentId, replySnap }) => {
            const replyContainer = document.getElementById(`replies-${parentId}`);
            if (replyContainer && !replySnap.empty) {
                replySnap.forEach(rDoc => {
                    const rd = { ...rDoc.data(), id: rDoc.id };
                    renderSingleComment(rd, `replies-${parentId}`, true);
                });
            }
        });

        if (loadMoreBtn) {
            loadMoreBtn.style.display = (snap.docs.length < 10) ? "none" : "block";
        }

    } catch (err) {
        console.error("Error loading：", err);
        showToast("Refresh the page to fix this error.", "danger");
    }
}
function renderSingleComment(d, containerId, isReply = false) {
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
                <strong>${d.name} ${d.uid===ADMIN_UID?'<span class="badge bg-danger badge-red">Owner</span>':''}</strong>
                <small class="text-muted">${d.timestamp ? new Date(d.timestamp.toDate()).toLocaleString() : 'Just now'}</small>
            </div>
            <div class="mt-2 ">${safeHtml}</div>
            <div class="mt-2 small">
                ${!isReply ? `<span role="button" class="text-primary cursor-pointer me-2" onclick="prepareReply('${d.id}', '${d.name}')">Reply</span>` : ''}
                ${canManage ? `
                    <span role="button" class="text-secondary cursor-pointer me-2" onclick="editComment('${d.id}')">Edit</span>
                    <span role="button" class="text-danger cursor-pointer" onclick="deleteComment('${d.id}')">Delete</span>
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
    if(!confirm("Are you sure to delete this comment？")) return;
    try{
        await db.collection("comments").doc(id).delete();
        const el = document.getElementById(`comment-${id}`);
        if(el) el.remove();
        showToast("Deleted 🗑️");
    }catch(e){
        showToast("Error!","danger");
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
    const text = document.getElementById("editInput").value.trim();
    if(!text) return showToast("Message cannot be blank！","danger");
    try {
        await db.collection("comments").doc(currentEditId).update({ text });
        
        // 抓取特定 ID 的留言內容區域
        const commentEl = document.getElementById(`comment-${currentEditId}`);
        // 找到該留言內專門放內容的那個 div (排除掉頭像和 metadata)
        const contentDiv = commentEl.querySelector(".mt-2:not(.small)"); 
        
        if (contentDiv) {
            contentDiv.innerHTML = transformLinks(marked.parse(DOMPurify.sanitize(text)));
        }
        
        bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
        showToast("Updated ✏️");
    } catch(e) {
        showToast("Error","danger");
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
            showToast("Uploading... ☁️");
            const res=await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload",{method:"POST",body:formData});
            const data=await res.json();
            const input=document.getElementById("commentInput");
            input.value+=`\n![Picture](${data.secure_url})\n`;
            showToast("Uploaded！📸");
        }catch(e){
            showToast("Error","danger");
        }
    };
}
// ==========================================
// Cloudinary 大頭貼上傳函式
// ==========================================
async function uploadAvatarToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "guest-upload"); 

    try {
 
        const res = await fetch("https://api.cloudinary.com/v1_1/df0hlwcrd/image/upload", {
            method: "POST",
            body: formData
        });

        if (!res.ok) throw new Error("Error");

        const data = await res.json();

      
        const optimizedUrl = data.secure_url.replace("/upload/", "/upload/w_200,h_200,c_fill,g_face,q_auto,f_auto/");
        
        return optimizedUrl;
    } catch (err) {
        console.error("Cloudinary Upload Error:", err);
        throw err;
    }
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
                name: user.displayName || "Friend",
                avatar: user.photoURL || "images/defult-avatar.png",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        showToast(`Hi，${user.displayName}！✨`);
    } catch (error) {
        showToast("Error", "danger");
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
        document.getElementById("userName").textContent=currentUser.displayName||"Friend";
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
        showToast("Success! 👋");
    }catch(err){
        showToast("Error","danger");
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

const modalFileBtn = document.getElementById("modalFileBtn");
if (modalFileBtn) {
    modalFileBtn.addEventListener("change", function(e) {
        const file = e.target.files[0];
        if (file) {

            if (file.size > 5 * 1024 * 1024) {
                showToast("Picture CANNOT be bigger than 5MB.", "danger");
                this.value = ""; // 清空選取
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                document.getElementById("modalPreviewImg").src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}
    const backBtn = document.getElementById("backToTop");
    if(backBtn) backBtn.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
});
// ==========================================
// 1. 打開個人資料彈窗
// ==========================================
async function openProfileModal() {
    if (!currentUser) return showToast("Login to edit profile！", "danger");
    
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
        showToast("Error", "danger");
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
    
    if (!newName) return showToast("Name cannot be blank！", "danger");

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
        
        showToast("Updated！💖");
        
        // 隱藏 Modal
        const modalEl = document.getElementById("profileModal");
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance.hide();
        
        // 重新載入留言讓名字更新
        loadComments(true);

    } catch (err) {
        console.error(err);
        showToast("Failed to save, please try again.", "danger");
    } finally {
        progress.classList.add("d-none"); // 隱藏進度條
    }
}
/**
 * 切換 Email 登入視窗的顯示模式 (login / signup / reset)
 * @param {string} mode 
 */
/**
 * 切換 Email 登入視窗的顯示模式
 */
/**
 * 切換 Email 登入視窗的顯示模式 
 */
async function openEmailModal(mode = 'login') {
    const modalEl = document.getElementById('emailModal');
    
    // 1. 取得或建立實例 (getInstance 是關鍵)
    let modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (!modalInstance) {
        modalInstance = new bootstrap.Modal(modalEl);
    }

    // 2. 根據模式調整 UI 顯示/隱藏
    const emailModalTitle = document.getElementById("emailModalTitle");
    const nameRow = document.getElementById("nameRow");
    const avatarRow = document.getElementById("avatarRow");
    const passwordRow = document.getElementById("passwordRow");

    // 切換邏輯
    if (mode === 'signup') {
        emailModalTitle.innerText = "Sign Up";
        nameRow.style.display = "block";
        avatarRow.style.display = "block";
        passwordRow.style.display = "block";
    } else if (mode === 'reset') {
        emailModalTitle.innerText = "Reset Password";
        nameRow.style.display = "none";
        avatarRow.style.display = "none";
        passwordRow.style.display = "none";
    } else {
        emailModalTitle.innerText = "Email Login";
        nameRow.style.display = "none";
        avatarRow.style.display = "none";
        passwordRow.style.display = "block";
    }

    // 3. 只有在視窗沒開啟時才執行 show()
    if (!modalEl.classList.contains('show')) {
        modalInstance.show();
    }
}

/**
 * 處理 Email 認證提交 (登入 / 註冊 / 重設密碼)
 */
async function submitEmailAuth() {
    const modeTitle = document.getElementById("emailModalTitle").innerText;
    const email = document.getElementById("emailInput").value.trim();
    const password = document.getElementById("passwordInput").value;
    const name = document.getElementById("nameInput").value.trim();
    const errorEl = document.getElementById("emailError");

    // 簡易前端驗證
    if (!email) return showEmailError("Please enter Email");
    errorEl.classList.add("d-none"); // 清除舊錯誤

    try {
        if (modeTitle === "Sign Up") {
            if (!password || !name) return showEmailError("Password or name cannot be blank!");
            
            // 1. Firebase 註冊
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // 2. 更新使用者名稱與頭像 (如果有實作頭像上傳，這裡要再調整)
            await user.updateProfile({ displayName: name });
            
            showToast("Success!Welcome, " + name, "success");

        } else if (modeTitle === "Reset Password") {
            // Firebase 重設密碼郵件
            await auth.sendPasswordResetEmail(email);
            showToast("Reset Email sended", "info");

        } else {
            // 預設為：Email 登入
            if (!password) return showEmailError("Enter password");
            await auth.signInWithEmailAndPassword(email, password);
            showToast("Welcome back！", "success");
        }

        // 成功後關閉 Modal (使用 Bootstrap 5 實體)
        const modalEl = document.getElementById('emailModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

    } catch (error) {
        console.error("Auth Error:", error);
        showEmailError(getFirebaseErrorMessage(error.code));
    }
}

/**
 * 輔助函數：在 Modal 內顯示錯誤
 */
function showEmailError(msg) {
    const errorEl = document.getElementById("emailError");
    errorEl.innerText = msg;
    errorEl.classList.remove("d-none");
}

/**
 * 將 Firebase 錯誤代碼轉為中文
 */
function getFirebaseErrorMessage(code) {
    switch (code) {
      case 'auth/user-not-found': return 'This account cannot be found, please register first';
      case 'auth/wrong-password': return 'Incorrect password';
      case 'auth/email-already-in-use': return 'This email address has already been registered';
      case 'auth/weak-password': return 'Insufficient password strength (must be at least 6 characters)';
      case 'auth/invalid-email': return 'Incorrect email format';
        default: return '發生錯誤：' + code;
    }
}
