<!--  主題切換邏輯 -->
const savedTheme = localStorage.getItem('theme');
const userPrefDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const theme = savedTheme || (userPrefDark ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', theme);
updateIcon(theme);

document.getElementById('themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateIcon(next);
});

function updateIcon(theme) {
  const btn = document.getElementById('themeToggle');
  btn.textContent = theme === 'light' ? '🌞' : '🌙';
}
