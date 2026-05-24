const body = document.body;
const themeToggle = document.getElementById("themeToggle");
const year = document.getElementById("year");
const revealItems = document.querySelectorAll(".reveal");

const setThemeLabel = () => {
  themeToggle.textContent = body.classList.contains("dark") ? "DARK" : "LIGHT";
};

const applyStoredTheme = () => {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") {
    body.classList.add("dark");
  }
  setThemeLabel();
};

const toggleTheme = () => {
  body.classList.toggle("dark");
  const isDark = body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  setThemeLabel();
};

const revealOnScroll = () => {
  revealItems.forEach((item) => {
    const top = item.getBoundingClientRect().top;
    if (top < window.innerHeight - 80) {
      item.classList.add("show");
    }
  });
};

year.textContent = new Date().getFullYear();
applyStoredTheme();
themeToggle.addEventListener("click", toggleTheme);
window.addEventListener("scroll", revealOnScroll);
revealOnScroll();
