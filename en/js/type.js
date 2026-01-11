 const text = `Hello, I'm Andrew!
I am a curious elementary school student who is passionate about exploring many things in daily life. I enjoy observing how cities change and studying how transportation systems operate, especially MRT systems, trains, and light rail. Whether it’s route planning, station design, announcements, or carriage layouts, I carefully observe and analyze them.
Besides transportation, I also enjoy building websites on my own. By using HTML, CSS, and a little JavaScript, I gradually create my own small projects. Every time a feature works successfully, it gives me a great sense of achievement. I also love drawing and playing the piano — music helps me relax, improve my focus, and develop a sense of rhythm.
This website is a space that I personally designed and maintain. It records my learning journey, creative ideas, and daily experiences. I also hope to connect and share with friends who are interested in transportation, music, or website creation.
If you are interested in my content, feel free to leave a message with encouragement or suggestions so we can grow and improve together. You can also visit 
[My Dairy](https://andrew0205blogs.blogspot.com/)
 to learn more about my daily life and learning stories.`;

const output = document.getElementById("typing-text");
const cursor = document.getElementById("cursor");

let i = 0;
const totalTypingTime = 17000; // 17秒
const interval = totalTypingTime / text.length;

function typeEffect() {
  if (i >= text.length) return;

  if (text[i] === '[') {
    const endBracket = text.indexOf(']', i);
    const startParen = text.indexOf('(', endBracket);
    const endParen = text.indexOf(')', startParen);

    if (endBracket !== -1 && startParen !== -1 && endParen !== -1) {
      const linkText = text.slice(i + 1, endBracket);
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
          linkEl.textContent += linkText[j];
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
  }

  if (text[i] === '\n') {
    output.innerHTML += "<br>";
  } else {
    output.innerHTML += text[i];
  }

  i++;
  setTimeout(typeEffect, interval);
}

document.addEventListener("DOMContentLoaded", () => {
  typeEffect();

  // 游標閃爍
  setInterval(() => {
    cursor.style.visibility = cursor.style.visibility === 'hidden' ? 'visible' : 'hidden';
  }, 500);
});
