 const text = `大家好，我是星宏，也可以叫我小宏！
我是一位充滿好奇心的小學生，對生活中的許多事物都充滿興趣。
尤其是交通相關的主題──像是捷運、火車和輕軌系統，都是我最愛研究的東西！

除了對交通充滿熱情，我也喜歡自己動手做網站、畫畫，還會彈鋼琴。
偶爾我會寫一些簡單的網頁程式，把我的小作品分享在網路上。

這個網站是我親手建立的，裡面記錄了我的想法和創意。
如果你也喜歡交通、音樂，或對做網站有興趣，歡迎一起來交流！
你也可以去看看[我的日記](https://andrew0205blogs.blogspot.com/)，了解我的生活喔！`;

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
