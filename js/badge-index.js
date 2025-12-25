  const avatar = document.getElementById("avatar");

  let count = 0;
  let timer = null;

  avatar.addEventListener("click", () => {
    count++;

    if (count === 1) {
      timer = setTimeout(() => {
        count = 0;
      }, 1500);
    }

    if (count === 3) {
      clearTimeout(timer);
      window.location.href = "tasks.html";
    }
  });
