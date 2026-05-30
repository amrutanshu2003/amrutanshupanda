import { NavLink, Route, Routes } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { api } from "./api";
import { addListener, removeListener, launch, stop } from "devtools-detector";

const SecureImage = ({ src, className, alt }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      
      const width = img.naturalWidth || 500;
      const height = img.naturalHeight || 500;
      canvas.width = width;
      canvas.height = height;

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = src;
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label={alt}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        objectFit: "cover",
        borderRadius: "inherit",
        userSelect: "none",
        pointerEvents: "none"
      }}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};

const fallbackProfile = {
  name: "Amrutanshu Panda",
  headline: "Python Developer | Web Enthusiast | Problem Solver",
  about:
    "I build modern web applications using Python and clean UI design. I enjoy creating practical products with great user experience.",
  stats: [
    { value: "2+", label: "Years Learning" },
    { value: "15+", label: "Projects Built" },
    { value: "100%", label: "Dedication" }
  ],
  skills: ["Python", "Flask", "MongoDB", "HTML", "CSS", "JavaScript"],
  projects: [
    {
      title: "Smart Portfolio",
      description: "Modern portfolio with Python + MongoDB.",
      link: "#"
    },
    {
      title: "Task Tracker",
      description: "Task management web app.",
      link: "#"
    },
    {
      title: "Shop Analytics",
      description: "E-commerce analytics dashboard.",
      link: "#"
    }
  ]
};

function ThemeToggle() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const isLight = theme === "light";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
    >
      {isLight ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 14.5A7.6 7.6 0 0 1 9.5 3 9 9 0 1 0 21 14.5Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
      <span className="nav-tooltip">{isLight ? "Dark Mode" : "Light Mode"}</span>
    </button>
  );
}

function Home({ profile }) {
  const [status, setStatus] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [brandImgFailed, setBrandImgFailed] = useState(false);

  useEffect(() => {
    setHeroImgFailed(false);
    setBrandImgFailed(false);
  }, [profile]);

  const handleCopy = (text, id, e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  };

  const submitContact = async (e) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      subject: form.get("subject"),
      message: form.get("message")
    };
    try {
      await api("/contact", { method: "POST", body: JSON.stringify(payload) });
      setStatus("Message sent and saved.");
      formEl.reset();
    } catch (err) {
      setStatus(err.message);
    }
  };

  if (!profile) return <p className="loading">Loading portfolio...</p>;

  return (
    <div className="page">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="Portfolio home">
          <span style={{ position: "relative" }}>
            {profile.profile_image_data && !brandImgFailed ? (
              <>
                <SecureImage
                  src={profile.profile_image_data}
                  className="brand-logo-img"
                  alt={profile.name}
                />
                {/* Transparent Cover to block right-click and inspect target */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    backgroundColor: "transparent",
                    zIndex: 10
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </>
            ) : (
              profile.name?.slice(0, 1) || "A"
            )}
          </span>
          {profile.name}
        </a>
        <nav>
          <a href="#projects" className="nav-item" aria-label="Projects">
            <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span className="nav-tooltip">Projects</span>
          </a>
          <a href="#contact" className="nav-item" aria-label="Contact">
            <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <span className="nav-tooltip">Contact</span>
          </a>
          <NavLink to="/admin" className="nav-item" aria-label="Admin">
            <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="nav-tooltip">Admin</span>
          </NavLink>

          <span className="nav-divider"></span>

          <a href={`mailto:${profile.email || "amrutanshu20003@gmail.com"}`} className="nav-item social-mail" target="_blank" rel="noreferrer" aria-label="Email">
            <svg viewBox="52 42 88 66" className="nav-icon" aria-hidden="true">
              <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
              <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
              <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
              <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92" />
              <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
            </svg>
            <span className="nav-tooltip">Email Me</span>
          </a>

          <a href="https://github.com/amrutanshu2003" className="nav-item social-github" target="_blank" rel="noreferrer" aria-label="GitHub">
            <svg viewBox="0 0 24 24" className="nav-icon" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span className="nav-tooltip">GitHub</span>
          </a>

          <a href="https://www.linkedin.com/in/amrutanshu-panda-" className="nav-item social-linkedin" target="_blank" rel="noreferrer" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" className="nav-icon" fill="currentColor" aria-hidden="true">
              <path d="M22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003zM7.12 20.452H3.555V9h3.565v11.452zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm15.11 13.019h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286z" />
            </svg>
            <span className="nav-tooltip">LinkedIn</span>
          </a>

          <span className="nav-divider"></span>

          <ThemeToggle />
        </nav>
      </header>

      <section className="hero" id="home">
        <div className="hero-copy">
          <p className="eyebrow">Available for modern web builds</p>
          <h1>{profile.name}</h1>
          <h2>{profile.headline}</h2>
          <p>{profile.about}</p>
          <div className="hero-actions">
            <a className="btn primary" href="#contact">
              Start a project
            </a>
            <a className="btn ghost" href="#projects">
              View work
            </a>
          </div>
        </div>
        <div className="hero-visual">
          <div className="profile-image-wrapper">
            <div className="profile-social-orbit">
              <a href={`mailto:${profile.email || "amrutanshu20003@gmail.com"}`} className="orbit-item social-mail" target="_blank" rel="noreferrer" aria-label="Email">
                <svg viewBox="52 42 88 66" aria-hidden="true">
                  <path fill="#4285f4" style={{ fill: "#4285f4" }} d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
                  <path fill="#34a853" style={{ fill: "#34a853" }} d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
                  <path fill="#fbbc04" style={{ fill: "#fbbc04" }} d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
                  <path fill="#ea4335" style={{ fill: "#ea4335" }} d="M72 74V48l24 18 24-18v26L96 92" />
                  <path fill="#c5221f" style={{ fill: "#c5221f" }} d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
                </svg>
              </a>
              <a href="https://github.com/amrutanshu2003" className="orbit-item social-github" target="_blank" rel="noreferrer" aria-label="GitHub">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
              <a href="https://www.linkedin.com/in/amrutanshu-panda-" className="orbit-item social-linkedin" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003zM7.12 20.452H3.555V9h3.565v11.452zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm15.11 13.019h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286z" />
                </svg>
              </a>
            </div>
            <div className="profile-image-glow"></div>
            <div className="profile-image-ring"></div>
            <div className="profile-image-container" aria-label={`${profile.name} profile photo`}>
              {profile.profile_image_data && !heroImgFailed ? (
                <>
                  <SecureImage
                    src={profile.profile_image_data}
                    alt={profile.name}
                  />
                  {/* Transparent Cover to block right-click and inspect target */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      backgroundColor: "transparent",
                      zIndex: 10
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </>
              ) : (
                <svg viewBox="0 0 24 24" className="profile-placeholder-svg" aria-hidden="true">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="8" r="4" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="stats-strip" aria-label="Portfolio highlights">
        {profile.stats?.map((item) => (
          <div key={`${item.value}-${item.label}`}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <main className="content-grid">
        <section className="panel skills-panel">
          <div className="section-heading">
            <span>Toolkit</span>
            <h3>Skills that ship ideas</h3>
          </div>
          <div className="chips">{profile.skills?.map((s) => <span key={s}>{s}</span>)}</div>
        </section>

        <section className="panel projects-panel" id="projects">
          <div className="section-heading">
            <span>Selected Work</span>
            <h3>Projects with practical polish</h3>
          </div>
          <div className="projects">
            {profile.projects?.map((p, i) => (
              <article key={`${p.title}-${i}`}>
                <span className="project-number">0{i + 1}</span>
                <h4>{p.title}</h4>
                <p>{p.description}</p>
                <a href={p.link} target="_blank" rel="noreferrer">
                  Live Demo <span aria-hidden="true">-&gt;</span>
                </a>
              </article>
            ))}
          </div>
        </section>
        
        <section className="panel contact-panel" id="contact">
          <div className="section-heading">
            <span>Get in touch</span>
            <h3>Let's build something</h3>
          </div>
          <form onSubmit={submitContact}>
            <input type="text" name="name" placeholder="Name" required />
            <input type="email" name="email" placeholder="Email" required />
            <input type="text" name="subject" placeholder="Subject" required />
            <textarea name="message" placeholder="Message" required></textarea>
            <button type="submit" className="btn primary">Send Message</button>
          </form>
          {status && <p className="status">{status}</p>}
        </section>
      </main>
    </div>
  );
}

function App() {
  const [profile, setProfile] = useState(null);
  const [isLocked, setIsLocked] = useState(() => {
    return sessionStorage.getItem("portfolio_locked") === "true";
  });

  useEffect(() => {
    // 1. Disable Right Click globally on the page (using Capture Phase for absolute guarantee!)
    const handleContextMenu = (e) => {
      e.preventDefault();
    };
    window.addEventListener("contextmenu", handleContextMenu, true);

    // 2. Disable standard DevTools keyboard shortcuts (using Capture Phase!)
    const handleKeyDown = (e) => {
      if (
        // F12 Key
        e.key === "F12" ||
        // Ctrl + Shift + I (Inspect Element)
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        // Ctrl + Shift + J (Console)
        (e.ctrlKey && e.shiftKey && e.key === "J") ||
        // Ctrl + Shift + C (Element selector)
        (e.ctrlKey && e.shiftKey && e.key === "C") ||
        // Ctrl + U (View Source Code)
        (e.ctrlKey && (e.key === "u" || e.key === "U")) ||
        // Ctrl + S (Save Page)
        (e.ctrlKey && (e.key === "s" || e.key === "S"))
      ) {
        e.preventDefault();
        return false;
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);

    // 3. DevTools Detector using mature devtools-detector package
    const handleDevToolsChange = (isOpen) => {
      if (isOpen) {
        setIsLocked(true);
        sessionStorage.setItem("portfolio_locked", "true");
      } else {
        setIsLocked(false);
        sessionStorage.removeItem("portfolio_locked");
      }
    };

    addListener(handleDevToolsChange);
    launch();

    // 4. Inject global CSS rules to prevent text-dragging & image dragging/selection
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      * {
        user-select: none !important;
        -webkit-user-drag: none !important;
      }
      input, textarea, button {
        user-select: auto !important;
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      removeListener(handleDevToolsChange);
      stop();
      if (document.head.contains(styleEl)) {
        document.head.removeChild(styleEl);
      }
    };
  }, []);

  useEffect(() => {
    api("/profile?t=" + Date.now())
      .then(setProfile)
      .catch((e) => {
        setProfile(fallbackProfile);
      });
  }, []);

  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    if (isLocked) {
      // Secure favicon immediately: replace with anonymous secure lock SVG
      link.href = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%2311110f"/><text x="50" y="68" font-size="55" text-anchor="middle">🔒</text></svg>`;
      // Wip custom page title
      document.title = "🔒 Access Restrained | Portfolio Secured";
    } else if (profile) {
      document.title = profile.name ? `${profile.name} | Portfolio` : "Portfolio";
      const imgData = profile.profile_image_data;
      if (imgData) {
        link.href = imgData;
      } else {
        const letter = profile.name?.slice(0, 1) || "A";
        link.href = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%2359d6b4"/><text x="50" y="65" font-family="Outfit, sans-serif" font-size="50" font-weight="bold" fill="%2312120f" text-anchor="middle">${letter}</text></svg>`;
      }
    }
  }, [isLocked, profile]);

  if (isLocked) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "radial-gradient(circle at center, #181816 0%, #0a0a09 100%)",
          color: "#f6f1e8",
          fontFamily: "Outfit, sans-serif",
          textAlign: "center",
          padding: "20px",
          margin: 0,
          overflow: "hidden",
          position: "relative",
          userSelect: "none"
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes glow-pulse {
            0% { box-shadow: 0 0 20px rgba(234, 67, 53, 0.1), inset 0 0 20px rgba(234, 67, 53, 0.05); }
            50% { box-shadow: 0 0 40px rgba(234, 67, 53, 0.3), inset 0 0 30px rgba(234, 67, 53, 0.1); }
            100% { box-shadow: 0 0 20px rgba(234, 67, 53, 0.1), inset 0 0 20px rgba(234, 67, 53, 0.05); }
          }
          @keyframes floating {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }
          @keyframes border-glow {
            0% { border-color: rgba(234, 67, 53, 0.05); }
            50% { border-color: rgba(234, 67, 53, 0.25); }
            100% { border-color: rgba(234, 67, 53, 0.05); }
          }
        `}} />

        <div
          style={{
            position: "absolute",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(234, 67, 53, 0.05) 0%, rgba(0, 0, 0, 0) 70%)",
            top: "10%",
            left: "25%",
            filter: "blur(40px)",
            pointerEvents: "none",
            zIndex: 1
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(89, 214, 180, 0.03) 0%, rgba(0, 0, 0, 0) 70%)",
            bottom: "10%",
            right: "20%",
            filter: "blur(40px)",
            pointerEvents: "none",
            zIndex: 1
          }}
        />

        <div
          style={{
            padding: "50px 40px",
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 0.01)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.03)",
            boxShadow: "0 50px 100px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            maxWidth: "520px",
            zIndex: 2,
            animation: "floating 6s ease-in-out infinite, border-glow 4s ease-in-out infinite",
            position: "relative"
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "100px",
              background: "rgba(234, 67, 53, 0.08)",
              border: "1px solid rgba(234, 67, 53, 0.15)",
              color: "#ea4335",
              fontSize: "0.75rem",
              fontWeight: "700",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              marginBottom: "24px"
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#ea4335",
                boxShadow: "0 0 10px #ea4335"
              }}
            />
            Shield Active
          </div>

          <div
            style={{
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              backgroundColor: "rgba(18, 18, 15, 0.6)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "0 auto 28px auto",
              fontSize: "2.8rem",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              animation: "glow-pulse 4s ease-in-out infinite"
            }}
          >
            🔒
          </div>

          <h1
            style={{
              color: "#fff",
              fontSize: "2.25rem",
              margin: "0 0 16px 0",
              fontWeight: "900",
              letterSpacing: "-1px",
              lineHeight: "1.2"
            }}
          >
            System Secured
          </h1>
          
          <p
            style={{
              fontSize: "1rem",
              color: "#a69e90",
              lineHeight: "1.6",
              margin: "0 0 28px 0",
              fontWeight: "400"
            }}
          >
            Developer tools are disabled on this portfolio to safeguard copyrighted assets, custom codebase, and intellectual properties.
          </p>

          <div
            style={{
              padding: "16px 20px",
              borderRadius: "12px",
              background: "rgba(234, 67, 53, 0.03)",
              border: "1px solid rgba(234, 67, 53, 0.08)",
              color: "#ea4335",
              fontSize: "0.85rem",
              fontWeight: "600",
              lineHeight: "1.4"
            }}
          >
            ⚠️ To proceed, please close your Developer Tools / Inspector panel and reload the page!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="Portfolio home">
          <span style={{ position: "relative" }}>
            {profile.profile_image_data && !brandImgFailed ? (
              <>
                <SecureImage
                  src={profile.profile_image_data}
                  className="brand-logo-img"
                  alt={profile.name}
                />
                {/* Transparent Cover to block right-click and inspect target */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    backgroundColor: "transparent",
                    zIndex: 10
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </>
            ) : (
              profile.name?.slice(0, 1) || "A"
            )}
          </span>
          {profile.name}
        </a>
        <nav>
          <a href="#projects" className="nav-item" aria-label="Projects">
            <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span className="nav-tooltip">Projects</span>
          </a>
          <a href="#contact" className="nav-item" aria-label="Contact">
            <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <span className="nav-tooltip">Contact</span>
          </a>
          <NavLink to="/admin" className="nav-item" aria-label="Admin">
            <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="nav-tooltip">Admin</span>
          </NavLink>

          <span className="nav-divider"></span>

          <a href={`mailto:${profile.email || "amrutanshu20003@gmail.com"}`} className="nav-item social-mail" target="_blank" rel="noreferrer" aria-label="Email">
            <svg viewBox="52 42 88 66" className="nav-icon" aria-hidden="true">
              <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
              <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
              <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
              <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92" />
              <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
            </svg>
            <span className="nav-tooltip">Email Me</span>
          </a>

          <a href="https://github.com/amrutanshu2003" className="nav-item social-github" target="_blank" rel="noreferrer" aria-label="GitHub">
            <svg viewBox="0 0 24 24" className="nav-icon" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span className="nav-tooltip">GitHub</span>
          </a>

          <a href="https://www.linkedin.com/in/amrutanshu-panda-" className="nav-item social-linkedin" target="_blank" rel="noreferrer" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" className="nav-icon" fill="currentColor" aria-hidden="true">
              <path d="M22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003zM7.12 20.452H3.555V9h3.565v11.452zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm15.11 13.019h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286z" />
            </svg>
            <span className="nav-tooltip">LinkedIn</span>
          </a>

          <span className="nav-divider"></span>

          <ThemeToggle />
        </nav>
      </header>

      <section className="hero" id="home">
        <div className="hero-copy">
          <p className="eyebrow">Available for modern web builds</p>
          <h1>{profile.name}</h1>
          <h2>{profile.headline}</h2>
          <p>{profile.about}</p>
          <div className="hero-actions">
            <a className="btn primary" href="#contact">
              Start a project
            </a>
            <a className="btn ghost" href="#projects">
              View work
            </a>
          </div>
        </div>
        <div className="hero-visual">
          <div className="profile-image-wrapper">
            <div className="profile-social-orbit">
              <a href={`mailto:${profile.email || "amrutanshu20003@gmail.com"}`} className="orbit-item social-mail" target="_blank" rel="noreferrer" aria-label="Email">
                <svg viewBox="52 42 88 66" aria-hidden="true">
                  <path fill="#4285f4" style={{ fill: "#4285f4" }} d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
                  <path fill="#34a853" style={{ fill: "#34a853" }} d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
                  <path fill="#fbbc04" style={{ fill: "#fbbc04" }} d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
                  <path fill="#ea4335" style={{ fill: "#ea4335" }} d="M72 74V48l24 18 24-18v26L96 92" />
                  <path fill="#c5221f" style={{ fill: "#c5221f" }} d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
                </svg>
              </a>
              <a href="https://github.com/amrutanshu2003" className="orbit-item social-github" target="_blank" rel="noreferrer" aria-label="GitHub">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
              <a href="https://www.linkedin.com/in/amrutanshu-panda-" className="orbit-item social-linkedin" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003zM7.12 20.452H3.555V9h3.565v11.452zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm15.11 13.019h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286z" />
                </svg>
              </a>
            </div>
            <div className="profile-image-glow"></div>
            <div className="profile-image-ring"></div>
            <div className="profile-image-container" aria-label={`${profile.name} profile photo`}>
              {profile.profile_image_data && !heroImgFailed ? (
                <>
                  <SecureImage
                    src={profile.profile_image_data}
                    alt={profile.name}
                  />
                  {/* Transparent Cover to block right-click and inspect target */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      backgroundColor: "transparent",
                      zIndex: 10
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </>
              ) : (
                <svg viewBox="0 0 24 24" className="profile-placeholder-svg" aria-hidden="true">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="8" r="4" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="stats-strip" aria-label="Portfolio highlights">
        {profile.stats?.map((item) => (
          <div key={`${item.value}-${item.label}`}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <main className="content-grid">
        <section className="panel skills-panel">
          <div className="section-heading">
            <span>Toolkit</span>
            <h3>Skills that ship ideas</h3>
          </div>
          <div className="chips">{profile.skills?.map((s) => <span key={s}>{s}</span>)}</div>
        </section>

        <section className="panel projects-panel" id="projects">
          <div className="section-heading">
            <span>Selected Work</span>
            <h3>Projects with practical polish</h3>
          </div>
          <div className="projects">
            {profile.projects?.map((p, i) => (
              <article key={`${p.title}-${i}`}>
                <span className="project-number">0{i + 1}</span>
                <h4>{p.title}</h4>
                <p>{p.description}</p>
                <a href={p.link} target="_blank" rel="noreferrer">
                  Live Demo <span aria-hidden="true">-&gt;</span>
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="panel contact-panel" id="contact">
          <div className="contact-layout">
            <div className="contact-info">
              <div className="section-heading">
                <span>Contact</span>
                <h3>Let's build something useful</h3>
              </div>
              <p className="contact-desc">
                Feel free to reach out for collaborations, project inquiries, or just to say hello! I'm always open to discussing new opportunities.
              </p>

              <div className="contact-socials">
                <a href={`mailto:${profile.email || "amrutanshu20003@gmail.com"}`} className="contact-social-item social-mail" target="_blank" rel="noreferrer" aria-label="Email">
                  <div className="social-icon-wrapper">
                    <svg viewBox="52 42 88 66" className="social-icon" aria-hidden="true">
                      <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
                      <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
                      <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
                      <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92" />
                      <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
                    </svg>
                  </div>
                  <div className="social-details">
                    <span>Email Me Directly</span>
                    <strong>{profile.email || "amrutanshu20003@gmail.com"}</strong>
                  </div>
                  <button
                    className="copy-card-btn"
                    onClick={(e) => handleCopy(profile.email || "amrutanshu20003@gmail.com", "email", e)}
                    aria-label="Copy Email"
                  >
                    {copiedId === "email" ? (
                      <svg viewBox="0 0 24 24" className="copy-icon success" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="copy-icon" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                    <span className="copy-tooltip">{copiedId === "email" ? "Copied!" : "Copy"}</span>
                  </button>
                </a>

                <a href="https://github.com/amrutanshu2003" className="contact-social-item social-github" target="_blank" rel="noreferrer" aria-label="GitHub">
                  <div className="social-icon-wrapper">
                    <svg viewBox="0 0 24 24" className="social-icon" fill="currentColor" aria-hidden="true">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                  </div>
                  <div className="social-details">
                    <span>Follow on GitHub</span>
                    <strong>github.com/amrutanshu2003</strong>
                  </div>
                  <button
                    className="copy-card-btn"
                    onClick={(e) => handleCopy("https://github.com/amrutanshu2003", "github", e)}
                    aria-label="Copy GitHub Link"
                  >
                    {copiedId === "github" ? (
                      <svg viewBox="0 0 24 24" className="copy-icon success" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="copy-icon" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                    <span className="copy-tooltip">{copiedId === "github" ? "Copied!" : "Copy"}</span>
                  </button>
                </a>

                <a href="https://www.linkedin.com/in/amrutanshu-panda-" className="contact-social-item social-linkedin" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                  <div className="social-icon-wrapper">
                    <svg viewBox="0 0 24 24" className="social-icon" fill="currentColor" aria-hidden="true">
                      <path d="M22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003zM7.12 20.452H3.555V9h3.565v11.452zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm15.11 13.019h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286z" />
                    </svg>
                  </div>
                  <div className="social-details">
                    <span>Connect on LinkedIn</span>
                    <strong>amrutanshu-panda-</strong>
                  </div>
                  <button
                    className="copy-card-btn"
                    onClick={(e) => handleCopy("https://www.linkedin.com/in/amrutanshu-panda-", "linkedin", e)}
                    aria-label="Copy LinkedIn Link"
                  >
                    {copiedId === "linkedin" ? (
                      <svg viewBox="0 0 24 24" className="copy-icon success" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="copy-icon" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                    <span className="copy-tooltip">{copiedId === "linkedin" ? "Copied!" : "Copy"}</span>
                  </button>
                </a>
              </div>
            </div>

            <div className="contact-form-container">
              <form onSubmit={submitContact} className="form">
                <input name="name" placeholder="Your name" required />
                <input name="email" type="email" placeholder="you@example.com" required />
                <input name="subject" placeholder="Project inquiry" />
                <textarea name="message" rows={5} placeholder="Tell me about your project..." required />
                <button type="submit">
                  Send Message
                  <svg viewBox="0 0 24 24" className="submit-btn-icon" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </form>
              {status && <p className="status">{status}</p>}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Admin({ profile, setProfile }) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("");
  const [brandImgFailed, setBrandImgFailed] = useState(false);
  const [previewImgFailed, setPreviewImgFailed] = useState(false);

  // Premium Custom Cropper States
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ w: 250, h: 250 });

  useEffect(() => {
    setBrandImgFailed(false);
    setPreviewImgFailed(false);
  }, [profile]);

  useEffect(() => {
    if (!rawImageSrc) return;
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      const w = ratio > 1 ? 250 * ratio : 250;
      const h = ratio > 1 ? 250 : 250 / ratio;
      setImgSize({ w, h });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = rawImageSrc;
  }, [rawImageSrc]);

  const load = async () => {
    try {
      const p = await api("/profile?t=" + Date.now());
      setProfile(p);
    } catch (e) {
      setStatus(e.message);
    }
  };

  useEffect(() => {
    api("/admin/messages?t=" + Date.now())
      .then((m) => setMessages(m.messages || []))
      .catch((e) => setStatus(e.message));
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setStatus("Image too large. Max size is 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setRawImageSrc(reader.result);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // Reset input so same file can be cropped again
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    setOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const applyCrop = () => {
    const img = document.getElementById("cropper-source-img");
    if (!img) return;

    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 500;
    const ctx = canvas.getContext("2d");

    // Center of image inside viewport of 250x250 is at:
    const cx = 250 / 2 + offset.x;
    const cy = 250 / 2 + offset.y;

    // Zoomed width and height are:
    const w = imgSize.w * zoom;
    const h = imgSize.h * zoom;

    // Top-left coordinate of zoomed and panned image inside viewport:
    const x = cx - w / 2;
    const y = cy - h / 2;

    // Scale coordinates to canvas of size 500x500
    const scale = 500 / 250;
    const drawX = x * scale;
    const drawY = y * scale;
    const drawW = w * scale;
    const drawH = h * scale;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    const croppedBase64 = canvas.toDataURL("image/jpeg", 0.9);
    setProfile((prev) => ({
      ...prev,
      profile_image_data: croppedBase64
    }));
    setPreviewImgFailed(false); // Reset fail-safe state since image changed
    setCropModalOpen(false);
  };

  const handleRemoveImage = () => {
    setProfile((prev) => ({
      ...prev,
      profile_image_data: ""
    }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: f.get("name"),
      headline: f.get("headline"),
      email: f.get("email"),
      about: f.get("about"),
      skills: String(f.get("skills") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      stats: profile.stats,
      projects: profile.projects,
      profile_image_data: profile.profile_image_data || ""
    };
    try {
      await api("/admin/profile", { method: "PUT", body: JSON.stringify(payload) });
      setStatus("Profile updated.");
      await load();
    } catch (e2) {
      setStatus(e2.message);
    }
  };

  const deleteMessage = async (id) => {
    try {
      await api(`/admin/messages/${id}`, { method: "DELETE" });
      setMessages((prev) => prev.filter((m) => m._id !== id));
    } catch (e) {
      setStatus(e.message);
    }
  };

  if (!profile) return <p className="loading">{status || "Loading admin..."}</p>;

  return (
    <div className="page admin-page">
      <header className="topbar">
        <a className="brand" href="/admin">
          <span>
            {profile.profile_image_data && !brandImgFailed ? (
              <img
                src={profile.profile_image_data}
                alt={profile.name}
                className="brand-logo-img"
                onError={() => setBrandImgFailed(true)}
              />
            ) : (
              profile.name?.slice(0, 1) || "A"
            )}
          </span>
          Admin Panel
        </a>
        <nav>
          <NavLink to="/" className="nav-item" aria-label="Back">
            <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span className="nav-tooltip">Back</span>
          </NavLink>
          <ThemeToggle />
        </nav>
      </header>

      <section className="panel">
        <div className="section-heading">
          <span>Profile</span>
          <h3>Edit Portfolio Content</h3>
        </div>
        <form className="form" onSubmit={saveProfile}>
          <div className="image-uploader-section">
            <label className="uploader-label">Profile Picture</label>
            <div className="uploader-container">
              <div className="uploader-preview">
                {profile.profile_image_data && !previewImgFailed ? (
                  <img
                    src={profile.profile_image_data}
                    alt="Profile Preview"
                    className="preview-img"
                    onError={() => setPreviewImgFailed(true)}
                  />
                ) : (
                  <div className="preview-placeholder">
                    <span>{profile.name?.slice(0, 1) || "A"}</span>
                  </div>
                )}
              </div>
              <div className="uploader-controls">
                <label className="btn-upload" htmlFor="profile-image-upload">
                  <svg viewBox="0 0 24 24" className="icon-upload" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                  Choose Photo
                </label>
                <input
                  id="profile-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
                {profile.profile_image_data && (
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={handleRemoveImage}
                  >
                    Remove Photo
                  </button>
                )}
                <p className="upload-help">PNG, JPG, WebP, or SVG. Max 4MB.</p>
              </div>
            </div>
          </div>
          <input name="name" defaultValue={profile.name} placeholder="Name" required />
          <input name="headline" defaultValue={profile.headline} placeholder="Headline" required />
          <input name="email" type="email" defaultValue={profile.email} placeholder="Email" required />
          <textarea name="about" rows={4} defaultValue={profile.about} placeholder="About Me" required />
          <input name="skills" defaultValue={(profile.skills || []).join(", ")} placeholder="Skills (comma-separated)" />
          <button type="submit">Save Changes</button>
        </form>
        {status && <p className="status">{status}</p>}
      </section>

      <section className="panel">
        <div className="section-heading">
          <span>Inbox</span>
          <h3>Messages</h3>
        </div>
        <div className="messages">
          {messages.map((m) => (
            <article key={m._id}>
              <button className="icon-btn" onClick={() => deleteMessage(m._id)} aria-label="Delete">
                x
              </button>
              <p>
                <strong>{m.name}</strong> ({m.email})
              </p>
              <p>{m.subject}</p>
              <p>{m.message}</p>
            </article>
          ))}
          {messages.length === 0 && <p>No messages yet.</p>}
        </div>
      </section>

      {cropModalOpen && (
        <div className="cropper-overlay">
          <div className="cropper-modal">
            <div className="cropper-header">
              <h4>Crop Profile Photo</h4>
              <button type="button" className="btn-close" onClick={() => setCropModalOpen(false)}>×</button>
            </div>
            <div className="cropper-body">
              <div
                className="crop-viewport-wrapper"
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
              >
                <img
                  id="cropper-source-img"
                  src={rawImageSrc}
                  alt="Source to Crop"
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: `${imgSize.w}px`,
                    height: `${imgSize.h}px`,
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    transformOrigin: "center center",
                    maxWidth: "none",
                    maxHeight: "none",
                    userSelect: "none",
                    pointerEvents: "none"
                  }}
                />
                <div className="crop-mask"></div>
              </div>

              <div className="cropper-controls">
                <div className="zoom-control">
                  <span className="zoom-label">Zoom</span>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="zoom-slider"
                  />
                  <span className="zoom-value">{Math.round(zoom * 100)}%</span>
                </div>
                <p className="cropper-instructions">Drag image to position. Use slider to zoom.</p>
              </div>
            </div>
            <div className="cropper-footer">
              <button type="button" className="btn-cancel" onClick={() => setCropModalOpen(false)}>Cancel</button>
              <button type="button" className="btn-apply" onClick={applyCrop}>Crop & Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("");
  const [lockReason, setLockReason] = useState(() => {
    return sessionStorage.getItem("portfolio_locked") === "true" ? "session_storage" : "";
  });
  const [isLocked, setIsLocked] = useState(() => {
    return sessionStorage.getItem("portfolio_locked") === "true";
  });

  // 1. Load Profile at parent level on load (speeds up transitions & centralizes state)
  useEffect(() => {
    api("/profile?t=" + Date.now())
      .then(setProfile)
      .catch((e) => {
        setProfile(fallbackProfile);
        setStatus(`Demo content loaded. API says: ${e.message}`);
      });
  }, []);

  // 2. Tab Security Shield (title & favicon override)
  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    if (isLocked) {
      // Secure favicon immediately: replace with anonymous secure lock SVG
      link.href = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%2311110f"/><text x="50" y="68" font-size="55" text-anchor="middle">🔒</text></svg>`;
      // Wipe custom page title
      document.title = "🔒 Access Restrained | Portfolio Secured";
    } else if (profile) {
      document.title = profile.name ? `${profile.name} | Portfolio` : "Portfolio";
      const imgData = profile.profile_image_data;
      if (imgData) {
        link.href = imgData;
      } else {
        const letter = profile.name?.slice(0, 1) || "A";
        link.href = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%2359d6b4"/><text x="50" y="65" font-family="Outfit, sans-serif" font-size="50" font-weight="bold" fill="%2312120f" text-anchor="middle">${letter}</text></svg>`;
      }
    }
  }, [isLocked, profile]);

  // 3. Global Capturing Context Blockers & DevTools Detector
  useEffect(() => {
    // A. Context Menu Block (capture phase!)
    const handleContextMenu = (e) => {
      e.preventDefault();
    };
    window.addEventListener("contextmenu", handleContextMenu, true);

    // B. Hotkeys Block (capture phase!)
    const handleKeyDown = (e) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.shiftKey && e.key === "J") ||
        (e.ctrlKey && e.shiftKey && e.key === "C") ||
        (e.ctrlKey && (e.key === "u" || e.key === "U")) ||
        (e.ctrlKey && (e.key === "s" || e.key === "S"))
      ) {
        e.preventDefault();
        return false;
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);

    // C. DevTools Detector using mature devtools-detector package
    const handleDevToolsChange = (isOpen) => {
      if (isOpen) {
        setIsLocked(true);
        setLockReason("devtools_detected");
        sessionStorage.setItem("portfolio_locked", "true");
      } else {
        setIsLocked(false);
        setLockReason("");
        sessionStorage.removeItem("portfolio_locked");
      }
    };

    addListener(handleDevToolsChange);
    launch();

    // D. Global select/drag CSS injection
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      * {
        user-select: none !important;
        -webkit-user-drag: none !important;
      }
      input, textarea, button {
        user-select: auto !important;
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      removeListener(handleDevToolsChange);
      stop();
      if (document.head.contains(styleEl)) {
        document.head.removeChild(styleEl);
      }
    };
  }, []);

  if (isLocked) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "radial-gradient(circle at center, #181816 0%, #0a0a09 100%)",
          color: "#f6f1e8",
          fontFamily: "Outfit, sans-serif",
          textAlign: "center",
          padding: "20px",
          margin: 0,
          overflow: "hidden",
          position: "relative",
          userSelect: "none"
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes glow-pulse {
            0% { box-shadow: 0 0 20px rgba(234, 67, 53, 0.1), inset 0 0 20px rgba(234, 67, 53, 0.05); }
            50% { box-shadow: 0 0 40px rgba(234, 67, 53, 0.3), inset 0 0 30px rgba(234, 67, 53, 0.1); }
            100% { box-shadow: 0 0 20px rgba(234, 67, 53, 0.1), inset 0 0 20px rgba(234, 67, 53, 0.05); }
          }
          @keyframes floating {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }
          @keyframes border-glow {
            0% { border-color: rgba(234, 67, 53, 0.05); }
            50% { border-color: rgba(234, 67, 53, 0.25); }
            100% { border-color: rgba(234, 67, 53, 0.05); }
          }
        `}} />

        <div
          style={{
            position: "absolute",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(234, 67, 53, 0.05) 0%, rgba(0, 0, 0, 0) 70%)",
            top: "10%",
            left: "25%",
            filter: "blur(40px)",
            pointerEvents: "none",
            zIndex: 1
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(89, 214, 180, 0.03) 0%, rgba(0, 0, 0, 0) 70%)",
            bottom: "10%",
            right: "20%",
            filter: "blur(40px)",
            pointerEvents: "none",
            zIndex: 1
          }}
        />

        <div
          style={{
            padding: "50px 40px",
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 0.01)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.03)",
            boxShadow: "0 50px 100px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            maxWidth: "520px",
            zIndex: 2,
            animation: "floating 6s ease-in-out infinite, border-glow 4s ease-in-out infinite",
            position: "relative"
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "100px",
              background: "rgba(234, 67, 53, 0.08)",
              border: "1px solid rgba(234, 67, 53, 0.15)",
              color: "#ea4335",
              fontSize: "0.75rem",
              fontWeight: "700",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              marginBottom: "24px"
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#ea4335",
                boxShadow: "0 0 10px #ea4335"
              }}
            />
            Shield Active
          </div>

          <div
            style={{
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              backgroundColor: "rgba(18, 18, 15, 0.6)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "0 auto 28px auto",
              fontSize: "2.8rem",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              animation: "glow-pulse 4s ease-in-out infinite"
            }}
          >
            🔒
          </div>

          <h1
            style={{
              color: "#fff",
              fontSize: "2.25rem",
              margin: "0 0 16px 0",
              fontWeight: "900",
              letterSpacing: "-1px",
              lineHeight: "1.2"
            }}
          >
            System Secured
          </h1>
          
          <p
            style={{
              fontSize: "1rem",
              color: "#a69e90",
              lineHeight: "1.6",
              margin: "0 0 28px 0",
              fontWeight: "400"
            }}
          >
            Developer tools are disabled on this portfolio to safeguard copyrighted assets, custom codebase, and intellectual properties.
          </p>

          <div
            style={{
              padding: "16px 20px",
              borderRadius: "12px",
              background: "rgba(234, 67, 53, 0.03)",
              border: "1px solid rgba(234, 67, 53, 0.08)",
              color: "#ea4335",
              fontSize: "0.85rem",
              fontWeight: "600",
              lineHeight: "1.4"
            }}
          >
            ⚠️ To proceed, please close your Developer Tools / Inspector panel and reload the page!
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return <p className="loading">{status || "Loading portfolio..."}</p>;

  return (
    <Routes>
      <Route path="/" element={<Home profile={profile} />} />
      <Route path="/admin" element={<Admin profile={profile} setProfile={setProfile} />} />
    </Routes>
  );
}
