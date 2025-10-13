 const text = `大家好，我是星宏，也可以叫我小宏，是一位充滿好奇心的小學生！
我對生活中很多事物都感到興趣，尤其是跟交通有關的，例如捷運、火車和輕軌系統，這些都是我最喜歡研究的主題。
除了對交通有熱情，我也喜歡自己動手做網站、畫畫，還會彈鋼琴。
有時候我會用電腦寫一些簡單的網頁程式，把我的興趣做成小作品分享在網路上。
這個網站是我親手建立的，裡面記錄了我對各種主題的想法和創意。
如果你也是喜歡交通、音樂、或做網站的人，歡迎來和我交流！
也可以看看[ 我的日記](https://andrew0205blog.blogspot.com/)，了解我的日常生活。
我會繼續努力學習，讓自己的作品越來越豐富，說不定有一天，我真的能設計出一條屬於自己的捷運線喔！`;

    const output = document.getElementById("typing-text");
    const cursor = document.getElementById("cursor");

    let i = 0;
    const totalTypingTime = 17000; // 17秒
    const interval = totalTypingTime / text.length;

    function typeEffect() {
      if (i >= text.length) return;

      if (text[i] === '[') {
        const endBracket = text.indexOf(']', i);
        const linkText = text.slice(i + 1, endBracket);
        const startParen = text.indexOf('(', endBracket);
        const endParen = text.indexOf(')', startParen);
        const url = text.slice(startParen + 1, endParen);

        const linkEl = document.createElement("a");
        linkEl.href = url;
        linkEl.target = "_blank";
        linkEl.style.color = "#4CAF50";
        linkEl.style.textDecoration = "underline";
        output.appendChild(linkEl);

        let j = 0;
        function typeLink() {
          if (j < linkText.length) {
            linkEl.innerHTML += linkText[j];
            j++;
            setTimeout(typeLink, interval);
          } else {
            i = endParen + 1;
            setTimeout(typeEffect, interval);
          }
        }
        typeLink();
        return;
      }

      if (text[i] === '\n') {
        output.innerHTML += "<br>";
      } else {
        output.innerHTML += text[i];
      }

      i++;
      setTimeout(typeEffect, interval);
    }

    // 啟動打字機效果
    typeEffect();

    // 游標閃爍
    setInterval(() => {
      cursor.style.visibility = cursor.style.visibility === 'hidden' ? 'visible' : 'hidden';
    }, 500);
