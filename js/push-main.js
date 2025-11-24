import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging.js";

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// 取得 Token
async function getTokenAndSave() {
  try {
    const token = await getToken(messaging, {
      vapidKey: "BIxpboEPTOs_bprCcVv9YcWcoqeQ6W_1R_4TAj-4hncrdPsCL4s8AiLKUrP45WtVuhfgwHNC2rrXEJUSnZFqhR8"  
    });
    console.log("FCM Token:", token);

    // 這裡可以把 token 存到 Firebase Database / Firestore
    // 例如 fetch('/save-token', {method:'POST', body:token})
  } catch (error) {
    console.error("取得 token 失敗：", error);
  }
}

// 測試按鈕呼叫
window.requestNotifyPermission = async function() {
  let permission = await Notification.requestPermission();
  if (permission === "granted") {
    alert("通知已允許");
    getTokenAndSave();
  } else {
    alert("你拒絕通知權限");
  }
};

// 前景通知（網頁開啟時）
onMessage(messaging, payload => {
  alert("收到通知：" + payload.notification.title);
});
