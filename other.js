   document.getElementById("update-date").textContent =
      new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" });

    // 留言防呆與清空
    function addComment() {
      const name = document.getElementById('name').value.trim();
      const message = document.getElementById('message').value.trim();
      const messagesDiv = document.getElementById('messages');

      if (!name || !message) {
        alert('請輸入名字與留言內容！');
        return;
      }

      const comment = document.createElement('p');
      const time = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      comment.textContent = `🗣️ ${name}：${message}（${time}）`;
      messagesDiv.appendChild(comment);

      // 清空欄位
      document.getElementById('name').value = '';
      document.getElementById('message').value = '';
    }
