  const avatar = document.getElementById("avatar");

  let count1 = 0;
  let timer = null;

  avatar.addEventListener("click", () => {
    count1++;

    if (count1 === 1) {
      timer = setTimeout(() => {
        count = 0;
      }, 1500);
    }

    if (count1 === 3) {
      clearTimeout(timer);
      window.location.href = "task/tasks.html";
    }
  });
