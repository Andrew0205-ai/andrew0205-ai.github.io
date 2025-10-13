 // Firebase 設定
  const firebaseConfig = {
    apiKey: "AIzaSyClktI5_wSo-u9LuwdsBVzH6buizJPXMAs",
    authDomain: "mycomment-ad1ba.firebaseapp.com",
    projectId: "mycomment-ad1ba",
    storageBucket: "mycomment-ad1ba.appspot.com",
    messagingSenderId: "1076313273646",
    appId: "1:1076313273646:web:2b5aaa8c6bd5824828f6bf",
    measurementId: "G-3NGHCWH7TP"
  };

  // 初始化
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  // 簡單的 XSS 防護：過濾輸入
  function sanitize(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // 新增留言
  function addComment() {
    const name = document.getElementById("name").value.trim();
    const message = document.getElementById("message").value.trim();
    if (!name || !message) { 
      alert("請輸入名字和留言！");
      return;
    }
    db.collection("comment").add({
      name: sanitize(name),
      message: sanitize(message),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById("message").value = "";
  }

 const messagesDiv = document.getElementById("messages");

db.collection("comment").orderBy("timestamp", "desc")
  .onSnapshot(snapshot => {
    messagesDiv.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const time = data.timestamp ? data.timestamp.toDate().toLocaleString() : "（時間未知）";
      messagesDiv.innerHTML += `
        <div class="comment-card">
          <b>${data.name}</b>
          <p>${data.message}</p>
          <small>${time}</small>
        </div>
      `;
    });
  });
