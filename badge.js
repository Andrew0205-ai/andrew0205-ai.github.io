
  // 彈跳徽章動畫
  function showBadges() {
    let badges = JSON.parse(localStorage.getItem("badges") || "[]");
    let container = document.getElementById("badgeList");
    container.innerHTML = "";
    if (badges.length === 0) {
      container.innerHTML = "<p>你還沒有徽章，快去完成任務吧！</p>";
    } else {
      badges.forEach((b,i)=>{
        let div = document.createElement("div");
        div.className="badge"; div.innerText=b;
        div.style.animationDelay = `${i*0.2}s`;
        container.appendChild(div);
        div.animate([{transform:'translateY(0px)'},{transform:'translateY(-10px)'},{transform:'translateY(0px)'}],
          {duration:800,iterations:Infinity,delay:i*200});
      });
    }
  }
  showBadges();

  // 隱藏入口：點三下開任務區
  let avatar = document.getElementById("avatar");
  let clickCount = 0;
  let timer = null;
  avatar.addEventListener("click", ()=>{
    clickCount++;
    if(timer) clearTimeout(timer);
    timer = setTimeout(()=>{clickCount=0;},800); // 0.8秒內三下
    if(clickCount===3){
      document.getElementById("task-section").style.display="block";
      clickCount=0;
    }
  });

  // 點「開始任務」生成臨時驗證碼
  function goTask(){
    let token = Math.random().toString(36).substring(2,10);
    sessionStorage.setItem("taskToken", token);
    location.href = "task.html?key="+token;
  }
