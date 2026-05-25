const body = document.body;
const themeToggle = document.getElementById("themeToggle");
const year = document.getElementById("year");
const revealItems = document.querySelectorAll(".reveal");
const navLinks = document.querySelectorAll(".nav a");
const backToTop = document.getElementById("backToTop");
const projectSearch = document.getElementById("projectSearch");
const projectCards = document.querySelectorAll(".project-card");
const copyEmailBtn = document.getElementById("copyEmailBtn");
const projectChips = document.getElementById("projectChips");
const pageLoader = document.getElementById("pageLoader");
let activeCategory = "all";

const setThemeLabel = () => {
  themeToggle.textContent = body.classList.contains("dark") ? "🌙" : "☀";
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

const setActiveNav = () => {
  const sections = [...document.querySelectorAll("section[id]")];
  let current = "";
  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= 120 && rect.bottom >= 120) {
      current = `#${section.id}`;
    }
  });
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === current);
  });
};

const handleBackToTop = () => {
  if (!backToTop) return;
  backToTop.classList.toggle("show", window.scrollY > 320);
};

const bindProjectSearch = () => {
  const applyFilters = () => {
    const q = (projectSearch?.value || "").trim().toLowerCase();
    projectCards.forEach((card) => {
      const text = card.dataset.project || "";
      const cat = card.dataset.category || "web";
      const matchSearch = text.includes(q);
      const matchCat = activeCategory === "all" || cat === activeCategory;
      card.style.display = matchSearch && matchCat ? "" : "none";
    });
  };

  if (projectSearch) {
    projectSearch.addEventListener("input", applyFilters);
  }

  if (projectChips) {
    projectChips.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains("chip")) return;
      activeCategory = target.dataset.chip || "all";
      projectChips.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("active"));
      target.classList.add("active");
      applyFilters();
    });
  }
};

const bindCopyEmail = () => {
  if (!copyEmailBtn) return;
  copyEmailBtn.addEventListener("click", async () => {
    const email = copyEmailBtn.dataset.email || "";
    try {
      await navigator.clipboard.writeText(email);
      copyEmailBtn.textContent = "Copied";
      setTimeout(() => {
        copyEmailBtn.textContent = "Copy email";
      }, 1200);
    } catch {
      copyEmailBtn.textContent = "Failed";
      setTimeout(() => {
        copyEmailBtn.textContent = "Copy email";
      }, 1200);
    }
  });
};

year.textContent = new Date().getFullYear();
applyStoredTheme();
themeToggle.addEventListener("click", toggleTheme);
window.addEventListener("scroll", () => {
  revealOnScroll();
  setActiveNav();
  handleBackToTop();
});
if (backToTop) {
  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
bindProjectSearch();
bindCopyEmail();
revealOnScroll();
setActiveNav();
handleBackToTop();

window.addEventListener("load", () => {
  document.body.classList.add("page-ready");
  if (pageLoader) {
    pageLoader.classList.add("hide");
    setTimeout(() => pageLoader.remove(), 420);
  }
});
