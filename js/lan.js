function go() {
      const btn = document.querySelector("section button");
      if (btn.innerHTML === "English") {
        const answer = confirm("你要切換成英文嗎？ Do you want to switch to English?");
        if (answer) {
          window.location.href = "https://andrew.000.pe/english.html";
        } else {
          btn.innerHTML = "中文";
        }
      } else {
        const answer = confirm("要切回中文嗎？ Switch back to Chinese?");
        if (answer) {
          btn.innerHTML = "English";
        } else {
          alert("你選擇留在中文模式！");
        }
      }
    }
