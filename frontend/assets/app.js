const body = document.body;
const themeToggle = document.getElementById("themeToggle");
const year = document.getElementById("year");
const navLinks = document.querySelectorAll(".nav a");
const backToTop = document.getElementById("backToTop");
const revealItems = document.querySelectorAll(".reveal");
const projectSearch = document.getElementById("projectSearch");
const projectChips = document.getElementById("projectChips");
const projectsWrap = document.getElementById("projectsWrap");
const copyEmailBtn = document.getElementById("copyEmailBtn");
const mailLink = document.getElementById("mailLink");
const contactForm = document.getElementById("contactForm");
const mailStatus = document.getElementById("mailStatus");
const API_BASE = "/api";

let activeCategory = "all";

const setThemeLabel = () => {
  themeToggle.textContent = body.classList.contains("dark") ? "🌙" : "☀";
};

const applyStoredTheme = () => {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") body.classList.add("dark");
  setThemeLabel();
};

const toggleTheme = () => {
  body.classList.toggle("dark");
  localStorage.setItem("theme", body.classList.contains("dark") ? "dark" : "light");
  setThemeLabel();
};

const setActiveNav = () => {
  const sections = [...document.querySelectorAll("section[id]")];
  let current = "";
  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= 120 && rect.bottom >= 120) current = `#${section.id}`;
  });
  navLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === current));
};

const handleBackToTop = () => {
  backToTop.classList.toggle("show", window.scrollY > 320);
};

const revealOnScroll = () => {
  revealItems.forEach((item) => {
    const top = item.getBoundingClientRect().top;
    if (top < window.innerHeight - 80) {
      item.classList.add("show");
    }
  });
};

const projectCategory = (i) => ["web", "app", "data"][i % 3];

const renderProjects = (projects) => {
  projectsWrap.innerHTML = "";
  projects.forEach((project, i) => {
    const card = document.createElement("article");
    const text = `${project.title} ${project.description}`.toLowerCase();
    card.className = "project-card";
    card.dataset.project = text;
    card.dataset.category = projectCategory(i);
    card.innerHTML = `
      <h3>${project.title}</h3>
      <p>${project.description}</p>
      <a href="${project.link || "#"}" target="_blank" rel="noreferrer">Live Demo -></a>
    `;
    projectsWrap.appendChild(card);
  });
};

const applyProjectFilters = () => {
  const cards = document.querySelectorAll(".project-card");
  const q = (projectSearch?.value || "").trim().toLowerCase();
  cards.forEach((card) => {
    const text = card.dataset.project || "";
    const cat = card.dataset.category || "web";
    const matchSearch = text.includes(q);
    const matchCat = activeCategory === "all" || cat === activeCategory;
    card.style.display = matchSearch && matchCat ? "" : "none";
  });
};

const bindProjectFilters = () => {
  projectSearch?.addEventListener("input", applyProjectFilters);
  projectChips?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.classList.contains("chip")) return;
    activeCategory = target.dataset.chip || "all";
    projectChips.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("active"));
    target.classList.add("active");
    applyProjectFilters();
  });
};

const bindCopyEmail = (email) => {
  copyEmailBtn.dataset.email = email;
  copyEmailBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(email);
      copyEmailBtn.textContent = "Copied";
    } catch {
      copyEmailBtn.textContent = "Failed";
    }
    setTimeout(() => (copyEmailBtn.textContent = "Copy email"), 1000);
  });
};

const showStatus = (message, ok = false) => {
  mailStatus.textContent = message;
  mailStatus.className = `mail-status ${ok ? "ok" : "err"}`;
};

const bindContactSubmit = () => {
  contactForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(contactForm);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      subject: form.get("subject"),
      message: form.get("message"),
    };

    if (!API_BASE) {
      showStatus("Backend URL is not configured.", false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to send");
      showStatus("Message sent successfully.", true);
      contactForm.reset();
    } catch (err) {
      showStatus(err.message || "Message failed.", false);
    }
  });
};

const bootstrap = async () => {
  if (!API_BASE) {
    showStatus("Backend URL is not configured.", false);
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/profile`);
    const profile = await res.json();

    document.getElementById("brandName").innerHTML = `${profile.name.split(" ")[0].toUpperCase()}<span>.</span>`;
    document.getElementById("headline").textContent = profile.headline;
    document.getElementById("heroName").textContent = `Hi, I am ${profile.name}.`;
    document.getElementById("aboutText").textContent = profile.about;
    document.getElementById("footerName").textContent = profile.name;
    const profileImage = document.getElementById("profileImage");
    profileImage.src = profile.profile_image_data || profile.profile_image || profileImage.src;

    const statsWrap = document.getElementById("statsWrap");
    statsWrap.innerHTML = "";
    (profile.stats || []).forEach((s) => {
      statsWrap.innerHTML += `<article><h3>${s.value}</h3><p>${s.label}</p></article>`;
    });

    const skillsWrap = document.getElementById("skillsWrap");
    skillsWrap.innerHTML = "";
    (profile.skills || []).forEach((s) => {
      skillsWrap.innerHTML += `<span>${s}</span>`;
    });

    renderProjects(profile.projects || []);
    applyProjectFilters();

    const email = profile.email || "amrutanshu20003@gmail.com";
    mailLink.href = `mailto:${email}`;
    mailLink.textContent = email;
    bindCopyEmail(email);
  } catch {
    showStatus("Could not load profile from backend.", false);
  }
};

year.textContent = new Date().getFullYear();
applyStoredTheme();
themeToggle.addEventListener("click", toggleTheme);
window.addEventListener("scroll", () => {
  revealOnScroll();
  setActiveNav();
  handleBackToTop();
});
backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
bindProjectFilters();
bindContactSubmit();
revealOnScroll();
setActiveNav();
handleBackToTop();
bootstrap();

