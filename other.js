   document.getElementById("lastUpdate").textContent =
      new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" });

 // 回到頂部按鈕控制
const backToTopButton = document.getElementById("backToTop");

window.onscroll = function() {
  if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
    backToTopButton.style.display = "block";
  } else {
    backToTopButton.style.display = "none";
  }
};

backToTopButton.addEventListener("click", function() {
  window.scrollTo({ top: 0, behavior: "smooth" });
});   
