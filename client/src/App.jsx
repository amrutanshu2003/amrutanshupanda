import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { addListener, removeListener, launch, stop } from "devtools-detector";
import { api, API_URL, clearAdminToken } from "./api";

const SecureImage = ({ src, className, alt, watermark = "" }) => {
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

      if (watermark) {
        ctx.save();
        const mark = `© ${watermark}`;
        const fontSize = Math.max(14, Math.floor(width / 26));
        ctx.font = `700 ${fontSize}px Outfit, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.strokeStyle = "rgba(0,0,0,0.28)";
        ctx.lineWidth = 2;
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.strokeText(mark, width - 18, height - 16);
        ctx.fillText(mark, width - 18, height - 16);
        ctx.restore();
      }
    };
    img.src = src;
  }, [src, watermark]);

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

const defaultSocials = [
  { platform: "Email", icon: "mail", url: "mailto:amrutanshu20003@gmail.com" },
  { platform: "GitHub", icon: "github", url: "https://github.com/amrutanshu2003" },
  { platform: "LinkedIn", icon: "linkedin", url: "https://www.linkedin.com/in/amrutanshu-panda-" },
  { platform: "Hashnode", icon: "hashnode", url: "https://hashnode.com/@AmrutanshuPanda" },
  { platform: "YouTube", icon: "youtube", url: "https://www.youtube.com/@amrutanshupandadeveloper" }
];

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
  ],
  socials: defaultSocials
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

function StatusPopup({ toast, onClose }) {
  if (!toast?.show || !toast?.message) return null;
  const isError = toast.type === "error";
  const isInfo = toast.type === "info";
  return (
    <div className="status-popup-overlay" role="dialog" aria-modal="true" aria-live="polite">
      <div className={`status-popup ${isError ? "error" : isInfo ? "info" : "success"}`}>
        <span className="status-popup-icon" aria-hidden="true">
          {isInfo ? (
            <svg viewBox="0 0 24 24" className="status-popup-spinner" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a9 9 0 0 1 9 9" />
            </svg>
          ) : isError ? "!" : "✓"}
        </span>
        <p className="status-popup-text">{toast.message}</p>
        {isInfo && (
          <>
            <span className="status-popup-subtext">Please wait...</span>
            <span className="status-popup-subtext">Do not close</span>
            <span className="status-popup-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </>
        )}
        {!isInfo && (
          <button type="button" className="status-popup-ok" onClick={onClose}>
            OK
          </button>
        )}
      </div>
    </div>
  );
}

function OfflinePage() {
  const [opening, setOpening] = useState(false);

  const openNetworkSettings = () => {
    setOpening(true);
    try {
      window.location.href = "ms-settings:network-status";
    } catch {
      // ignore
    }
    setTimeout(() => {
      try {
        window.open("ms-settings:network", "_self");
      } catch {
        // ignore
      }
      setOpening(false);
    }, 700);
  };

  return (
    <div className="offline-wrap">
      <div className="offline-card">
        <div className="offline-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M2 8.5A17.5 17.5 0 0 1 12 5c3.9 0 7.5 1.2 10 3.5" />
            <path d="M5 12a12.6 12.6 0 0 1 14 0" />
            <path d="M8.5 15.2a7.4 7.4 0 0 1 7 0" />
            <circle cx="12" cy="19" r="1.5" />
            <line x1="3" y1="3" x2="21" y2="21" />
          </svg>
        </div>
        <div className="offline-badge">Connection Lost</div>
        <h1>You Are Not Connected</h1>
        <p>
          Your internet connection is currently offline. Please reconnect and come back, we will keep your experience ready.
        </p>
        <div className="offline-actions">
          <button type="button" className="offline-btn-primary" onClick={openNetworkSettings}>
            {opening ? "Opening Settings..." : "Open Internet Settings"}
          </button>
          <button type="button" className="offline-btn-ghost" onClick={() => window.location.reload()}>
            Retry Connection
          </button>
        </div>
      </div>
    </div>
  );
}

const getSocialIcon = (iconName, className = "") => {
  const icon = String(iconName || "").toLowerCase();
  switch (icon) {
    case "mail":
    case "email":
      return (
        <svg viewBox="52 42 88 66" className={className} aria-hidden="true" style={{ width: "100%", height: "100%" }}>
          <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
          <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
          <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
          <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92" />
          <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
        </svg>
      );
    case "github":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ width: "100%", height: "100%" }}>
          <circle cx="12" cy="12" r="12" fill="#181717" />
          <path fill="#ffffff" d="M12 2.2C6.6 2.2 2.2 6.6 2.2 12c0 4.3 2.8 8 6.7 9.3.5.1.7-.2.7-.5 0-.2 0-.9 0-1.7-2.7.6-3.3-1.3-3.3-1.3-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.4-1.1.6-1.3-2.2-.3-4.5-1.1-4.5-4.9 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1 .8-.2 1.6-.3 2.5-.3.9 0 1.7.1 2.5.3 1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.8-2.3 4.6-4.6 4.9.4.3.7.9.7 1.9 0 1.3 0 2.4 0 2.7 0 .3.2.6.7.5 4-1.3 6.8-5 6.8-9.3 0-5.4-4.4-9.8-9.8-9.8z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ width: "100%", height: "100%" }}>
          <path fill="#0077b5" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      );
    case "hashnode":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ width: "100%", height: "100%" }}>
          <path fill="#2962FF" d="M22.351 8.019 15.981 1.65a5.635 5.635 0 0 0-7.962 0l-6.37 6.37a5.635 5.635 0 0 0 0 7.962l6.37 6.37a5.635 5.635 0 0 0 7.962 0l6.37-6.37a5.635 5.635 0 0 0 0-7.962z" />
          <circle fill="#ffffff" cx="12" cy="12" r="4.2" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ width: "100%", height: "100%" }}>
          <path fill="#FF0000" d="M21.593 7.203a2.506 2.506 0 0 0-1.762-1.766C18.265 5.007 12 5 12 5s-6.264-.007-7.831.404a2.56 2.56 0 0 0-1.766 1.778c-.413 1.566-.417 4.814-.417 4.814s-.004 3.264.406 4.814c.23.857.905 1.534 1.763 1.765 1.582.43 7.83.437 7.83.437s6.265.007 7.831-.403a2.515 2.515 0 0 0 1.767-1.763c.414-1.565.417-4.812.417-4.812s.02-3.265-.407-4.831z" />
          <path fill="#FFF" d="M9.996 15.005l.005-6 5.207 3.005-5.212 2.995z" />
        </svg>
      );
    case "x":
    case "twitter":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ width: "100%", height: "100%" }}>
          <rect width="24" height="24" rx="4" fill="#000000" />
          <path fill="#ffffff" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" transform="scale(0.8) translate(3, 3)" />
        </svg>
      );
      case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ width: "100%", height: "100%" }}>
          <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
      );
    case "telegram":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ width: "100%", height: "100%" }}>
          <circle cx="12" cy="12" r="12" fill="#24A1DE" />
          <path fill="#ffffff" d="M9.78 18.65c-.56 0-.46-.2-.65-.7l-1.37-4.52 10.1-6.3c.47-.28.9-.13.55.18l-8.17 7.37-.32 4.47c.45 0 .65-.2.9-.45l2.15-2.07 4.47 3.3c.82.45 1.4.22 1.6-.77L21.2 4.9c.3-.1.1-.3-.2-.2L2.73 11.83c-.96.38-.95.92-.17 1.16l4.75 1.48z" transform="scale(0.8) translate(3, 3)" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="ig-grad" cx="30%" cy="107%" r="130%">
              <stop offset="0%" stopColor="#fdf497" />
              <stop offset="5%" stopColor="#fdf497" />
              <stop offset="45%" stopColor="#fd5949" />
              <stop offset="60%" stopColor="#d6249f" />
              <stop offset="90%" stopColor="#285AEB" />
            </radialGradient>
          </defs>
          <rect width="24" height="24" rx="5" fill="url(#ig-grad)" />
          <path fill="#ffffff" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" transform="scale(0.7) translate(5, 5)" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ width: "100%", height: "100%" }}>
          <rect width="24" height="24" rx="4" fill="#1877F2" />
          <path fill="#ffffff" d="M14.73 21v-8.08h2.71l.41-3.15h-3.12V7.76c0-.91.25-1.53 1.56-1.53h1.67V3.41c-.29-.04-1.28-.12-2.43-.12-2.41 0-4.06 1.47-4.06 4.17v2.33H8.76v3.15h2.71V21h3.26z" transform="scale(0.85) translate(2, 2)" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
  }
};

const getSkillIcon = (skillName, className = "") => {
  const skill = String(skillName || "").toLowerCase().trim();
  
  if (skill.includes("python")) {
    return (
      <svg viewBox="0 0 128 128" className={className} aria-hidden="true" style={{ width: "16px", height: "16px", marginRight: "8px", verticalAlign: "middle", display: "inline-block" }}>
        <path fill="#3776ab" d="M63.996 1.996c-4.223.02-8.254.379-11.803 1.008-10.45 1.846-12.346 5.71-12.346 12.837v9.411H64.54v3.137H30.579c-7.176 0-13.46 4.313-15.426 12.521-2.268 9.405-2.368 15.275 0 25.096 1.755 7.311 5.947 12.519 13.124 12.519h8.491v-9.52c0-8.151 7.051-15.34 15.426-15.34H76.86c6.866 0 12.346-5.654 12.346-12.548V15.841c0-6.693-5.646-11.72-12.346-12.837-4.244-.706-8.645-1.027-12.866-1.008zM50.64 9.565c2.55 0 4.634 2.117 4.634 4.721 0 2.593-2.083 4.69-4.634 4.69-2.56 0-4.633-2.097-4.633-4.69-.001-2.604 2.073-4.721 4.633-4.721z"/>
        <path fill="#ffd343" d="M64.004 126.004c4.223-.02 8.254-.379 11.803-1.008 10.45-1.846 12.346-5.71 12.346-12.837v-9.411H53.46v-3.137h33.961c7.176 0 13.46-4.313 15.426-12.521 2.268-9.405 2.368-15.275 0-25.096-1.755-7.311-5.947-12.519-13.124-12.519h-8.491v9.52c0 8.151-7.051 15.34-15.426 15.34H51.14c-6.866 0-12.346 5.654-12.346 12.548v23.515c0 6.693 5.646 11.72 12.346 12.837 4.244.706 8.645 1.027 12.866 1.008zm13.356-7.569c-2.55 0-4.634-2.117-4.634-4.721 0-2.593 2.083-4.69 4.634-4.69 2.56 0 4.633 2.097 4.633 4.69.001 2.604-2.073 4.721-4.633 4.721z"/>
        <circle cx="50.64" cy="14.28" r="4.5" fill="#ffffff" />
        <circle cx="77.36" cy="113.72" r="4.5" fill="#ffffff" />
      </svg>
    );
  }
  
  if (skill.includes("javascript") || skill === "js") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ width: "16px", height: "16px", marginRight: "8px", verticalAlign: "middle", display: "inline-block" }}>
        <rect width="24" height="24" rx="3" fill="#F7DF1E"/>
        <path fill="#000000" d="M22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z"/>
      </svg>
    );
  }
  
  if (skill.includes("typescript") || skill === "ts") {
    return (
      <svg viewBox="0 0 128 128" className={className} aria-hidden="true" style={{ width: "16px", height: "16px", marginRight: "8px", verticalAlign: "middle", display: "inline-block" }}>
        <path fill="#3178C6" d="M1.408 1.408h125.184v125.185H1.408z" />
        <path fill="#FFF" d="M116.647 101.442h-18.06v-34.407H83.82v-11.89h32.827v46.297zM69.043 55.145H42.756v46.297H30.866V55.145H4.582V43.255h64.461v11.89z" transform="scale(0.85) translate(10, 10)" />
      </svg>
    );
  }
  
  if (skill.includes("html")) {
    return (
      <svg viewBox="0 0 128 128" className={className} aria-hidden="true" style={{ width: "16px", height: "16px", marginRight: "8px", verticalAlign: "middle", display: "inline-block" }}>
        <path fill="#E44D26" d="M19.037 113.876L9.032 1.661h109.936l-10.016 112.198-45.019 12.48z"/>
        <path fill="#F16529" d="M64 116.8l36.378-10.086 8.559-95.878H64z"/>
        <path fill="#EBEBEB" d="M64 52.455H45.788L44.53 38.361H64V24.599H29.489l.33 3.692 3.382 37.927H64zm0 35.743l-.061.017-15.327-4.14-.979-10.99H33.092l1.96 21.974L64 104.227zm0-35.743v13.762H64z"/>
        <path fill="#FFF" d="M64 52.455V66.22h17.202l-1.626 18.232L64 88.583v15.644l28.918-8.026 3.821-42.746H64zM64 24.599v13.762h33.682l.333-3.711 1.017-10.051H64z"/>
      </svg>
    );
  }
  
  if (skill.includes("css")) {
    return (
      <svg viewBox="0 0 128 128" className={className} aria-hidden="true" style={{ width: "16px", height: "16px", marginRight: "8px", verticalAlign: "middle", display: "inline-block" }}>
        <path fill="#1572B6" d="M18.814 114.123L8.76 1.352h110.48l-10.064 112.754-45.243 12.543-45.119-12.526z"/><path fill="#33A9DC" d="M64.001 117.062l36.559-10.136 8.601-96.354h-45.16v106.49z"/><path fill="#fff" d="M64.001 51.429h18.302l1.264-14.163H64.001V23.435h34.682l-.332 3.711-3.4 38.114h-30.95V51.429z"/><path fill="#EBEBEB" d="M64.083 87.349l-.061.018-15.403-4.159-.985-11.031H33.752l1.937 21.717 28.331 7.863.063-.018v-14.39z"/><path fill="#fff" d="M81.127 64.675l-1.666 18.522-15.426 4.164v14.39l28.354-7.858.208-2.337 2.406-26.881H81.127z"/><path fill="#EBEBEB" d="M64.048 23.435v13.831H30.64l-.277-3.108-.63-7.012-.33-3.711h34.646zm-.047 27.996v13.831H48.792l-.277-3.108-.631-7.012-.33-3.711h16.447z"/>
      </svg>
    );
  }
  
  if (skill.includes("mongo")) {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ width: "16px", height: "16px", marginRight: "8px", verticalAlign: "middle", display: "inline-block" }}>
        <path fill="#13AA52" d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.115-.28-.394-.53-.954-.735-1.44-.036.495-.055.685-.523 1.184-.723.566-4.438 3.682-4.74 10.02-.282 5.912 4.27 9.435 4.888 9.884l.07.05A73.49 73.49 0 0111.91 24h.481c.114-1.032.284-2.056.51-3.07.417-.296.604-.463.85-.693a11.342 11.342 0 003.639-8.464c.01-.814-.103-1.662-.197-2.218zm-5.336 8.195s0-8.291.275-8.29c.213 0 .49 10.695.49 10.695-.381-.045-.765-1.76-.765-2.405z" />
      </svg>
    );
  }
  
  if (skill.includes("flask")) {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ width: "16px", height: "16px", marginRight: "8px", verticalAlign: "middle", display: "inline-block" }}>
        <path fill="currentColor" d="M10.773 2.878c-.013 1.434.322 4.624.445 5.734l-8.558 3.83c-.56-.959-.98-2.304-1.237-3.38l-.06.027c-.205.09-.406.053-.494-.088l-.011-.018-.82-1.506c-.058-.105-.05-.252.024-.392a.78.78 0 0 1 .358-.331l9.824-4.207c.146-.064.299-.063.4.004.106.062.127.128.13.327Zm.68 7c.523 1.97.675 2.412.832 2.818l-7.263 3.7a19.35 19.35 0 0 1-1.81-2.83l8.24-3.689Zm12.432 8.786h.003c.283.402-.047.657-.153.698l-.947.37c.037.125.035.319-.217.414l-.736.287c-.229.09-.398-.059-.42-.2l-.025-.125c-4.427 1.784-7.94 1.685-10.696.647-1.981-.745-3.576-1.983-4.846-3.379l6.948-3.54c.721 1.431 1.586 2.454 2.509 3.178 2.086 1.638 4.415 1.712 5.793 1.563l-.047-.233c-.015-.077.007-.135.086-.165l.734-.288a.302.302 0 0 1 .342.086l.748-.288a.306.306 0 0 1 .341.086l.583.89Z"/>
      </svg>
    );
  }
  
  if (skill.includes("react")) {
    return (
      <svg viewBox="-11.5 -10.23174 23 20.46348" className={className} aria-hidden="true" style={{ width: "16px", height: "16px", marginRight: "8px", verticalAlign: "middle", display: "inline-block" }}>
        <circle cx="0" cy="0" r="2.05" fill="#61DAFB"/>
        <g stroke="#61DAFB" strokeWidth="1" fill="none">
          <ellipse rx="11" ry="4.2"/>
          <ellipse rx="11" ry="4.2" transform="rotate(60)"/>
          <ellipse rx="11" ry="4.2" transform="rotate(120)"/>
        </g>
      </svg>
    );
  }
  
  if (skill.includes("node")) {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ width: "16px", height: "16px", marginRight: "8px", verticalAlign: "middle", display: "inline-block" }}>
        <path fill="#339933" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5v-3h3v3zm0-4.5h-3v-3h3v3z" />
      </svg>
    );
  }
  
  if (skill.includes("docker")) {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ width: "16px", height: "16px", marginRight: "8px", verticalAlign: "middle", display: "inline-block" }}>
        <path fill="#2496ED" d="M13.983 8.871h-1.993a.258.258 0 0 0-.258.258v1.993c0 .143.115.258.258.258h1.993a.258.258 0 0 0 .258-.258V9.13a.258.258 0 0 0-.258-.258M11.477 8.871H9.484a.258.258 0 0 0-.258.258v1.993c0 .143.115.258.258.258h1.993a.258.258 0 0 0 .258-.258V9.13a.258.258 0 0 0-.258-.258M11.477 6.365H9.484a.258.258 0 0 0-.258.258v1.993c0 .143.115.258.258.258h1.993a.258.258 0 0 0 .258-.258V6.623a.258.258 0 0 0-.258-.258M8.97 8.871H6.978a.258.258 0 0 0-.258.258v1.993c0 .143.115.258.258.258h1.993a.258.258 0 0 0 .258-.258V9.13a.258.258 0 0 0-.258-.258M8.97 6.365H6.978a.258.258 0 0 0-.258.258v1.993c0 .143.115.258.258.258h1.993a.258.258 0 0 0 .258-.258V6.623a.258.258 0 0 0-.258-.258M6.464 8.871H4.471a.258.258 0 0 0-.258.258v1.993c0 .143.115.258.258.258h1.993a.258.258 0 0 0 .258-.258V9.13a.258.258 0 0 0-.258-.258M13.983 6.365h-1.993a.258.258 0 0 0-.258.258v1.993c0 .143.115.258.258.258h1.993a.258.258 0 0 0 .258-.258V6.623a.258.258 0 0 0-.258-.258M16.49 8.871h-1.993a.258.258 0 0 0-.258.258v1.993c0 .143.115.258.258.258h1.993a.258.258 0 0 0 .258-.258V9.13a.258.258 0 0 0-.258-.258M23.774 9.54c-.61-.95-1.636-1.503-2.766-1.503H20.01V5.772a.258.258 0 0 0-.258-.258h-1.993a.258.258 0 0 0-.258.258v2.265h-1.012v1.993h6.516c.866 0 1.558.647 1.558 1.44 0 .793-.692 1.44-1.558 1.44h-9.52v1.44h6.5c1.4 0 2.535-1.127 2.535-2.52 0-.275-.045-.544-.13-.8M1.98 12.012h17.525c.346 0 .627.28.627.627 0 2.274-1.85 4.124-4.124 4.124H6.104A4.124 4.124 0 0 1 1.98 12.64c0-.347.28-.628.627-.628M3.235 17.5c1.233.053 2.235 1.055 2.235 2.288 0 1.265-1.026 2.29-2.29 2.29A2.29 2.29 0 0 1 .89 19.788c0-1.233 1.002-2.235 2.235-2.288" />
      </svg>
    );
  }
  
  if (skill.includes("java") && !skill.includes("javascript")) {
    return (
      <svg viewBox="0 0 128 128" className={className} aria-hidden="true" style={{ width: "16px", height: "16px", marginRight: "8px", verticalAlign: "middle", display: "inline-block" }}>
        <path fill="#0074BD" d="M47.617 98.12s-4.767 2.774 3.397 3.71c9.892 1.13 14.947.968 25.845-1.092 0 0 2.871 1.795 6.873 3.351-24.439 10.47-55.308-.607-36.115-5.969zm-2.988-13.665s-5.348 3.959 2.823 4.805c10.567 1.091 18.91 1.18 33.354-1.6 0 0 1.993 2.025 5.132 3.131-29.542 8.64-62.446.68-41.309-6.336z"/>
        <path fill="#EA2D2E" d="M69.802 61.271c6.025 6.935-1.58 13.17-1.58 13.17s15.289-7.891 8.269-17.777c-6.559-9.215-11.587-13.792 15.635-29.58 0 .001-42.731 10.67-22.324 34.187z"/>
        <path fill="#0074BD" d="M102.123 108.229s3.529 2.91-3.888 5.159c-14.102 4.272-58.706 5.56-71.094.171-4.451-1.938 3.899-4.625 6.526-5.192 2.739-.593 4.303-.485 4.303-.485-4.953-3.487-32.013 6.85-13.743 9.815 49.821 8.076 90.817-3.637 77.896-9.468zM49.912 70.294s-22.686 5.389-8.033 7.348c6.188.828 18.518.638 30.011-.326 9.39-.789 18.813-2.474 18.813-2.474s-3.308 1.419-5.704 3.053c-23.042 6.061-67.544 3.238-54.731-2.958 10.832-5.239 19.644-4.643 19.644-4.643zm40.697 22.747c23.421-12.167 12.591-23.86 5.032-22.285-1.848.385-2.677.72-2.677.72s.688-1.079 2-1.543c14.953-5.255 26.451 15.503-4.823 23.725 0-.002.359-.327.468-.617z"/>
        <path fill="#EA2D2E" d="M76.491 1.587S89.459 14.563 64.188 34.51c-20.266 16.006-4.621 25.13-.007 35.559-11.831-10.673-20.509-20.07-14.688-28.815C58.041 28.42 81.722 22.195 76.491 1.587z"/>
        <path fill="#0074BD" d="M52.214 126.021c22.476 1.437 57-.8 57.817-11.436 0 0-1.571 4.032-18.577 7.231-19.186 3.612-42.854 3.191-56.887.874 0 .001 2.875 2.381 17.647 3.331z"/>
      </svg>
    );
  }
  
  if (skill.includes("github") && !skill.includes("git &")) {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ width: "16px", height: "16px", marginRight: "8px", verticalAlign: "middle", display: "inline-block" }}>
        <path fill="var(--heading)" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    );
  }
  
  if (skill.includes("git")) {
    return (
      <svg viewBox="0 0 128 128" className={className} aria-hidden="true" style={{ width: "16px", height: "16px", marginRight: "8px", verticalAlign: "middle", display: "inline-block" }}>
        <path fill="#ffffff" d="M124.737 58.378L69.621 3.264c-3.172-3.174-8.32-3.174-11.497 0L3.263 69.622c-3.174 3.171-3.174 8.324 0 11.497l55.116 55.116c3.177 3.174 8.325 3.174 11.497 0l54.861-54.861c3.178-3.172 3.178-8.32-.001-11.497z" />
        <path fill="#F05032" d="M124.737 58.378L69.621 3.264c-3.172-3.174-8.32-3.174-11.497 0L46.68 14.71l14.518 14.518c3.375-1.139 7.243-.375 9.932 2.314 2.703 2.706 3.461 6.607 2.294 9.993l13.992 13.993c3.385-1.167 7.292-.413 9.994 2.295 3.78 3.777 3.78 9.9 0 13.679a9.673 9.673 0 01-13.683 0 9.677 9.677 0 01-2.105-10.521L68.574 47.933l-.002 34.341a9.708 9.708 0 01-1.399 5.097 9.686 9.686 0 01-13.679 0c-3.779-3.78-3.779-9.902 0-13.682a9.658 9.658 0 014.789-2.527V44.208a9.697 9.697 0 01-4.789-2.531 9.68 9.68 0 01-.01-13.676l-14.498-14.498L3.263 69.622c-3.174 3.171-3.174 8.324 0 11.497l55.116 55.116c3.177 3.174 8.325 3.174 11.497 0l54.861-54.861c3.178-3.172 3.178-8.32-.001-11.497" />
      </svg>
    );
  }
  
  if (skill.includes("api") || skill.includes("rest") || skill.includes("service")) {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ width: "16px", height: "16px", marginRight: "8px", verticalAlign: "middle", display: "inline-block" }}>
        <path fill="#59D6B4" d="M21.039 0a2.959 2.959 0 00-2.65 4.274l-6.447 6.447a2.96 2.96 0 101.335 1.336l6.447-6.447A2.959 2.959 0 1021.04 0zM10.628 2.745c-.072 0-.143.003-.214.004-.072.002-.143.002-.215.005-.447.018-.893.064-1.335.138l-.03.005-.185.033-.105.02a7.718 7.718 0 00-.289.062l-.032.008a10.69 10.69 0 00-2.55.95l-.155.089c-.063.034-.125.07-.187.105-.046.027-.093.051-.14.079H5.19l-.01.005-.036.02v.002l.111.184 3.15 5.23a4.168 4.168 0 01.38-.202 4.294 4.294 0 011.628-.413c.071-.004.143-.008.214-.008zm.428.01v6.333c.325.034.647.103.96.209l4.66-4.66c-.173-.12-.348-.237-.528-.347l-.026-.015c-.056-.035-.112-.067-.168-.1l-.098-.056-.099-.055a12.735 12.735 0 00-.171-.092l-.027-.014a10.628 10.628 0 00-1.425-.617c-.69-.241-1.403-.41-2.128-.505l-.089-.012-.09-.01a6.56 6.56 0 00-.17-.019l-.049-.004-.204-.017a6.44 6.44 0 00-.255-.015c-.031-.003-.062-.003-.093-.004zM4.782 4.498a9.92 9.92 0 00-1.36 1.062l4.461 4.461.018.018c.049-.04.098-.078.149-.116l-.011-.018zm-1.67 1.36c-.05.05-.098.103-.147.154l-.149.155c-.33.357-.63.73-.902 1.118l-.039.056a10.588 10.588 0 00-.216.326 10.6 10.6 0 00-1.65 5.276l-.006.215-.003.214h6.317c0-.072.007-.143.01-.214.005-.072.006-.144.013-.215.081-.822.399-1.625.952-2.3.045-.055.096-.106.144-.16.048-.052.093-.107.144-.158zm16.255 1.464l-4.663 4.663c.106.312.175.634.21.959h6.332l-.004-.094a11.579 11.579 0 00-.032-.456l-.005-.052a13.044 13.044 0 00-.026-.241v-.009l-.033-.24v-.009a10.618 10.618 0 00-.327-1.493l-.003-.01a15.839 15.839 0 00-.07-.228l-.01-.03a14.111 14.111 0 00-.069-.204l-.02-.055a5.65 5.65 0 00-.153-.405 7.84 7.84 0 00-.093-.227 16.67 16.67 0 00-.063-.144l-.037-.081a13.776 13.776 0 00-.08-.171l-.024-.052-.096-.194-.014-.027a11.2 11.2 0 00-.112-.212l-.004-.008a10.615 10.615 0 00-.604-.98zm-4.43 6.05c0 .071-.006.142-.01.214-.003.072-.005.143-.012.214a4.29 4.29 0 01-.952 2.301c-.045.055-.096.107-.144.16-.048.053-.093.108-.144.159l4.467 4.467c.051-.051.099-.104.148-.155.05-.052.1-.103.148-.155.331-.358.633-.733.905-1.122l.032-.046.098-.144.085-.13.04-.063a10.597 10.597 0 001.647-5.272c.003-.071.004-.143.006-.214.001-.071.004-.143.004-.214zM.01 13.8l.004.093.01.179.005.076.017.206.005.046c.007.076.015.153.024.228l.003.022a9.605 9.605 0 00.033.248c.072.505.182 1.005.327 1.497l.002.006c.022.077.047.154.071.23l.004.014.005.014a15.737 15.737 0 00.153.439l.03.08.059.148a7.702 7.702 0 00.093.228l.062.14.038.084.078.169.027.054a10.677 10.677 0 00.225.441l.025.043 5.408-3.258.02-.012a4.314 4.314 0 01-.395-1.414h-.025zm.505 2.846l-.206.058.002.005zm6.425-1.052l-5.415 3.262c.083.139.17.273.259.406l.008.014.004.005.008.014h.001c.007.012.014.022.022.032l.001.002v.001a10.634 10.634 0 00.298.417l.006.008a9.963 9.963 0 00.29.368l.033.04c.043.052.086.103.13.153l.057.065.112.127.064.069.029.031.083.09.035.035c.049.051.098.103.149.153L7.58 16.42a3.86 3.86 0 01-.285-.321 4.422 4.422 0 01-.356-.505zm6.416 1.111c-.05.04-.1.079-.15.116l.011.018 3.257 5.407c.151-.099.3-.2.446-.307.315-.232.62-.484.914-.756l-4.46-4.46zm-5.457.003l-.015.015-4.46 4.46a8.966 8.966 0 00.195.176c.022.02.043.04.065.058l.152.13a10.622 10.622 0 00.215.174l.023.017.191.148.008.005c.268.2.547.389.834.564l.03.018.164.097.101.057a5.458 5.458 0 00.27.148c.008.004.016.01.025.013.162.085.327.164.493.24l.158-.385 2.243-5.448.009-.02a4.328 4.328 0 01-.701-.467zm4.951.353c-.061.037-.124.07-.187.104a4.318 4.318 0 01-3.271.336c-.069-.02-.135-.047-.203-.071-.067-.024-.136-.044-.202-.072l-2.242 5.444-.088.213-.075.183v.001l.017.007a.137.137 0 00.019.007l.005.003c.052.021.106.04.159.06.067.027.133.053.2.077l.102.04c.702.247 1.43.42 2.168.518l.087.012.09.01.172.019a7.173 7.173 0 00.252.022c.023.001.048.001.071.003l.184.011.112.005a7.06 7.06 0 00.358.007h.05a10.667 10.667 0 001.793-.15l.185-.034.105-.02.109-.023.18-.04.032-.008a10.684 10.684 0 002.55-.95c.052-.028.104-.06.156-.089.063-.034.125-.07.187-.105.043-.024.087-.047.13-.073h.001l.002-.002.002-.001.002-.001.007-.004.042-.025-.11-.183-.11-.184zm3.262 5.414l-.042.025.042-.024zm-.05.029zm-.005.004h-.002z"/>
    </svg>
  );
}

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ width: "16px", height: "16px", marginRight: "8px", verticalAlign: "middle", display: "inline-block" }}>
      <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M8 5l-5 7 5 7M16 5l5 7-5 7M10 19l4-14" />
    </svg>
  );
}


const getOrbitPosition = (idx, total) => {
  if (total === 1) return { left: "50%", top: "92%" };
  
  // Dynamically shrink the spacing (step) as the number of icons increases
  // to keep all icons compactly clustered at the bottom curve instead of spreading up the sides.
  let step = 34; // standard spacing for 2 icons
  if (total === 3) step = 28;
  else if (total === 4) step = 23;
  else if (total >= 5) {
    step = Math.max(15, 20 - (total - 5) * 1.5);
  }
  
  const span = (total - 1) * step;
  const startAngle = 90 + span / 2;
  const endAngle = 90 - span / 2;
  
  const angle = startAngle - idx * ((startAngle - endAngle) / (total - 1));
  const rad = (angle * Math.PI) / 180;
  
  // Scale the radius to follow the dashed ring perfectly
  const R = total <= 5 ? 42 : Math.min(48, 42 + (total - 5) * 1.2);
  
  const left = 50 + R * Math.cos(rad);
  const top = 50 + R * Math.sin(rad);
  return {
    left: `${left.toFixed(2)}%`,
    top: `${top.toFixed(2)}%`
  };
};



function Home({ profile }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [copiedId, setCopiedId] = useState("");
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [brandImgFailed, setBrandImgFailed] = useState(false);
  const [visibleProjectsCount, setVisibleProjectsCount] = useState(3);



  useEffect(() => {
    setHeroImgFailed(false);
    setBrandImgFailed(false);
  }, [profile]);

  const socials = profile.socials && profile.socials.length > 0 ? profile.socials : defaultSocials;
  const navbarSocials = socials.filter((s) => s.showInNavbar !== false);
  const orbitSocials = socials.filter((s) => s.showInOrbit !== false);
  const contactSocials = socials.filter((s) => s.showInContact !== false);
  const visibleProjects = (profile.projects || []).slice(0, visibleProjectsCount);

  const isValidOutboundUrl = (value) => {
    const raw = String(value || "").trim();
    if (!raw || raw === "#") return false;
    try {
      const parsed = new URL(raw);
      return parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:";
    } catch {
      return false;
    }
  };

  const guardExternalLink = (url, e) => {
    if (isValidOutboundUrl(url)) return;
    e.preventDefault();
    navigate("/error");
  };

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
    setToast({ show: true, message: "Sending message...", type: "info" });
    try {
      const out = await api("/contact", { method: "POST", body: JSON.stringify(payload) });
      if (out.warning) {
        setStatus(out.detail ? `${out.warning} (${out.detail})` : out.warning);
      } else if (out.mailDelivered === false) {
        setStatus("Message saved, but email delivery is not configured.");
      } else {
        setStatus("Message sent and saved.");
      }
      formEl.reset();
    } catch (err) {
      setStatus(err.message);
    }
  };

  useEffect(() => {
    if (!status) return;
    const type = /invalid|error|required|failed|unauthorized/i.test(status) ? "error" : "success";
    setToast({ show: true, message: status, type });
  }, [status]);

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
                  watermark={profile.name}
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

          {navbarSocials && navbarSocials.length > 0 && <span className="nav-divider"></span>}
          {navbarSocials?.map((social, idx) => (
            <a
              key={`${social.platform}-${idx}`}
              href={social.url}
              className={`nav-item social-${social.icon}`}
              target="_blank"
              rel="noreferrer"
              aria-label={social.platform}
              onClick={(e) => guardExternalLink(social.url, e)}
            >
              {getSocialIcon(social.icon, "nav-icon")}
              <span className="nav-tooltip">{social.platform}</span>
            </a>
          ))}
          {navbarSocials && navbarSocials.length > 0 && <span className="nav-divider"></span>}

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
              {orbitSocials?.map((social, idx) => (
                <a
                  key={`${social.platform}-${idx}`}
                  href={social.url}
                  className={`orbit-item social-${social.icon}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.platform}
                  style={getOrbitPosition(idx, orbitSocials.length)}
                  onClick={(e) => guardExternalLink(social.url, e)}
                >
                  {getSocialIcon(social.icon)}
                </a>
              ))}
            </div>
            <div className="profile-image-glow"></div>
            <div className="profile-image-ring"></div>
            <div className="profile-image-container" aria-label={`${profile.name} profile photo`}>
              {profile.profile_image_data && !heroImgFailed ? (
                <>
                  <SecureImage
                    src={profile.profile_image_data}
                    alt={profile.name}
                    watermark={profile.name}
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
          <div className="chips">
            {profile.skills?.map((s) => (
              <span key={s} style={{ display: "inline-flex", alignItems: "center" }}>
                {getSkillIcon(s, "skill-chip-icon")}
                {s}
              </span>
            ))}
          </div>

        </section>

        <section className="panel projects-panel" id="projects">
          <div className="section-heading">
            <span>Selected Work</span>
            <h3>Projects with practical polish</h3>
          </div>
          <div className="projects">
            {visibleProjects?.map((p, i) => (
              <article key={`${p.title}-${i}`} className="project-card">
                {/* Ambient glow blob */}
                <div className="project-card-glow" />

                {/* Header row */}
                <div className="project-card-top">
                  <span className="project-number">0{i + 1}</span>
                  <div className="project-link-icons">
                    {/* Live Demo icon */}
                    {p.link && p.link !== "#" && (
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noreferrer"
                        className="project-icon-btn demo-btn"
                        aria-label="Live Demo"
                        onClick={(e) => guardExternalLink(p.link, e)}
                      >
                        {/* Globe / External link icon */}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="2" y1="12" x2="22" y2="12" />
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                        <span className="proj-icon-tooltip">Live Demo</span>
                      </a>
                    )}
                    {/* GitHub icon */}
                    {p.github && (
                      <a
                        href={p.github}
                        target="_blank"
                        rel="noreferrer"
                        className="project-icon-btn github-btn"
                        aria-label="GitHub"
                        onClick={(e) => guardExternalLink(p.github, e)}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        <span className="proj-icon-tooltip">GitHub</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Content */}
                <h4 className="project-title">{p.title}</h4>
                <p className="project-desc">{p.description}</p>

                {/* Bottom divider line */}
                <div className="project-card-footer">
                  <span className="project-index-label">Project</span>
                  <span className="project-index-num">#{String(i + 1).padStart(2, "0")}</span>
                </div>
              </article>
            ))}
          </div>

          {profile.projects && profile.projects.length > 3 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", marginTop: "40px", flexWrap: "wrap" }}>
              {visibleProjectsCount < profile.projects.length && (
                <button
                  onClick={() => setVisibleProjectsCount((prev) => Math.min(profile.projects.length, prev + 3))}
                  className="btn-load-more"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 28px",
                    borderRadius: "99px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "var(--heading)",
                    fontWeight: "800",
                    fontSize: "0.9rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    cursor: "pointer",
                    backdropFilter: "blur(12px)",
                    transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px) scale(1.03)";
                    e.currentTarget.style.background = "rgba(89, 214, 180, 0.08)";
                    e.currentTarget.style.borderColor = "rgba(89, 214, 180, 0.3)";
                    e.currentTarget.style.color = "var(--accent)";
                    e.currentTarget.style.boxShadow = "0 10px 25px rgba(89, 214, 180, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.color = "var(--heading)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.2)";
                  }}
                >
                  <span>Load More Projects</span>
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              )}
              {visibleProjectsCount > 3 && (
                <button
                  onClick={() => setVisibleProjectsCount(3)}
                  className="btn-show-less"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 28px",
                    borderRadius: "99px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "var(--heading)",
                    fontWeight: "800",
                    fontSize: "0.9rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    cursor: "pointer",
                    backdropFilter: "blur(12px)",
                    transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px) scale(1.03)";
                    e.currentTarget.style.background = "rgba(255, 122, 89, 0.08)";
                    e.currentTarget.style.borderColor = "rgba(255, 122, 89, 0.3)";
                    e.currentTarget.style.color = "#ff7a59";
                    e.currentTarget.style.boxShadow = "0 10px 25px rgba(255, 122, 89, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.color = "var(--heading)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.2)";
                  }}
                >
                  <span>Show Less</span>
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
              )}
            </div>
          )}
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
                {contactSocials?.map((social, idx) => (
                  <a
                    key={`${social.platform}-${idx}`}
                    href={social.url}
                    className={`contact-social-item social-${social.icon}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.platform}
                    onClick={(e) => guardExternalLink(social.url, e)}
                  >
                    <div className="social-icon-wrapper">
                      {getSocialIcon(social.icon, "social-icon")}
                    </div>
                    <div className="social-details">
                      <span>{social.icon === "mail" || social.icon === "email" ? "Email Me Directly" : `Connect on ${social.platform}`}</span>
                      <strong>{social.display || social.url.replace(/^https?:\/\/(www\.)?/, "").replace(/^mailto:/, "")}</strong>
                    </div>
                    <button
                      className="copy-card-btn"
                      onClick={(e) => handleCopy(social.url, `${social.icon}-${idx}`, e)}
                      aria-label={`Copy ${social.platform} Link`}
                    >
                      {copiedId === `${social.icon}-${idx}` ? (
                        <svg viewBox="0 0 24 24" className="copy-icon success" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="copy-icon" aria-hidden="true">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                      <span className="copy-tooltip">{copiedId === `${social.icon}-${idx}` ? "Copied!" : "Copy"}</span>
                    </button>
                  </a>
                ))}
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
            </div>
          </div>
        </section>
      </main>
      <StatusPopup toast={toast} onClose={() => setToast((prev) => ({ ...prev, show: false }))} />
    </div>
  );
}

function Admin({ profile, setProfile }) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [needsAuth, setNeedsAuth] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [brandImgFailed, setBrandImgFailed] = useState(false);
  const [previewImgFailed, setPreviewImgFailed] = useState(false);

  // Local projects state for full CRUD management
  const [localProjects, setLocalProjects] = useState(profile?.projects || []);
  const [visibleAdminProjectsCount, setVisibleAdminProjectsCount] = useState(1);

  // Local skills state for full CRUD management
  const [localSkills, setLocalSkills] = useState(profile?.skills || []);

  // Sync localSkills when profile loads/changes
  useEffect(() => {
    setLocalSkills(profile?.skills || []);
  }, [profile]);

  // Local socials state for full CRUD management
  const [localSocials, setLocalSocials] = useState(profile?.socials && profile.socials.length > 0 ? profile.socials : defaultSocials);
  const [visibleAdminSocialsCount, setVisibleAdminSocialsCount] = useState(1);

  // Sync localSocials when profile loads/changes
  useEffect(() => {
    if (profile?.socials && profile.socials.length > 0) {
      setLocalSocials(profile.socials);
    } else {
      setLocalSocials(defaultSocials);
    }
  }, [profile]);


  const addSocial = () => {
    setLocalSocials((prev) => [
      ...prev,
      { platform: "", icon: "globe", url: "" }
    ]);
  };

  const updateSocial = (index, field, value) => {
    setLocalSocials((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const deleteSocial = (index) => {
    setLocalSocials((prev) => prev.filter((_, i) => i !== index));
  };

  const moveSocial = (index, dir) => {
    setLocalSocials((prev) => {
      const arr = [...prev];
      const target = index + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  };

  const addSkill = (skillName) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;
    if (localSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setStatus(`Skill "${trimmed}" already exists!`);
      return;
    }
    setLocalSkills((prev) => [...prev, trimmed]);
    setStatus("");
  };

  const removeSkill = (skillName) => {
    setLocalSkills((prev) => prev.filter((s) => s !== skillName));
  };

  const handleAddSkillClick = () => {
    const input = document.getElementById("new-skill-input");
    if (input) {
      addSkill(input.value);
      input.value = "";
      input.focus();
    }
  };

  const addProject = () => {
    setLocalProjects((prev) => [
      ...prev,
      { title: "", description: "", link: "" }
    ]);
    setVisibleAdminProjectsCount((prev) => Math.max(prev + 1, localProjects.length + 1));
  };

  const updateProject = (index, field, value) => {
    setLocalProjects((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const deleteProject = (index) => {
    setLocalProjects((prev) => prev.filter((_, i) => i !== index));
  };

  const moveProject = (index, dir) => {
    setLocalProjects((prev) => {
      const arr = [...prev];
      const target = index + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  };

  // Premium Custom Cropper States
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ w: 250, h: 250 });

  const pushStatus = (message) => {
    const msg = String(message || "");
    setStatus(`${msg} ${Date.now()}`);
    const type = /invalid|error|required|failed|unauthorized|too large/i.test(msg) ? "error" : "success";
    setToast({ show: true, message: msg, type });
  };
  const pushSaving = (message = "Saving changes...") => {
    setToast({ show: true, message, type: "info" });
  };

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
      const p = await api("/admin/profile?t=" + Date.now());
      setProfile(p);
      const m = await api("/admin/messages?t=" + Date.now());
      setMessages(m.messages || []);
      setNeedsAuth(false);
      setStatus("");
    } catch (e) {
      if (e.status === 401) {
        setNeedsAuth(true);
        pushStatus("Admin login required.");
        return;
      }
      pushStatus(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const password = adminPassword.trim();
    if (!password) {
      pushStatus("Enter admin password.");
      return;
    }
    setIsSigningIn(true);
    try {
      await api("/admin/login", {
        method: "POST",
        body: JSON.stringify({ password })
      });
      setAdminPassword("");
      await load();
      pushStatus("Admin login successful.");
    } catch (err) {
      pushStatus(err.message || "Admin login failed.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAdminLogout = () => {
    api("/admin/logout", { method: "POST" })
      .catch(() => null)
      .finally(() => {
        clearAdminToken();
        setNeedsAuth(true);
        setMessages([]);
        pushStatus("Logged out from admin.");
      });
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      pushStatus("Image too large. Max size is 10MB.");
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
      skills: localSkills,
      stats: profile.stats,
      profile_image_data: profile.profile_image_data || ""
    };
    try {
      pushSaving("Saving profile...");
      await api("/admin/profile", { method: "PUT", body: JSON.stringify(payload) });
      pushStatus("Profile updated.");
      await load();
    } catch (e2) {
      pushStatus(e2.message);
    }
  };

  const deleteMessage = async (id) => {
    try {
      await api(`/admin/messages/${id}`, { method: "DELETE" });
      setMessages((prev) => prev.filter((m) => m._id !== id));
    } catch (e) {
      pushStatus(e.message);
    }
  };

  if (!profile) return <p className="loading">Loading admin...</p>;
  if (needsAuth) {
    return (
      <div className="page admin-page">
        <header className="topbar">
          <a className="brand" href="/admin">
            <span>{profile.name?.slice(0, 1) || "A"}</span>
            Admin Access
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
            <span>Secure Login</span>
            <h3>Admin Sign In</h3>
          </div>
          <form className="form" onSubmit={handleAdminLogin}>
            <input
              type="password"
              placeholder="Enter admin password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button type="submit" disabled={isSigningIn}>
              {isSigningIn ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <StatusPopup toast={toast} onClose={() => setToast((prev) => ({ ...prev, show: false }))} />
        </section>
      </div>
    );
  }

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
          <button className="nav-item" type="button" onClick={handleAdminLogout} aria-label="Logout">
            <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="nav-tooltip">Logout</span>
          </button>
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
          
          <div className="admin-field-group toolkit-manager" style={{ marginTop: "24px", marginBottom: "24px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "700", color: "var(--heading)", fontSize: "0.95rem" }}>
              Toolkit (Skills)
            </label>
            <p className="admin-help-text" style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "12px", marginTop: "4px" }}>
              Manage the list of tools and technologies displayed in your Toolkit section.
            </p>
            
            <div className="admin-skills-chips-wrapper" style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              padding: "16px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "16px",
              minHeight: "80px",
              marginBottom: "16px",
              backdropFilter: "blur(12px)"
            }}>
              {localSkills.map((skill, index) => (
                <span
                  key={`${skill}-${index}`}
                  className="admin-skill-chip"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 14px",
                    background: "rgba(89, 214, 180, 0.06)",
                    border: "1px solid rgba(89, 214, 180, 0.25)",
                    color: "var(--accent)",
                    borderRadius: "100px",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    cursor: "default"
                  }}
                >
                  {getSkillIcon(skill, "skill-chip-icon")}
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255, 255, 255, 0.5)",
                      cursor: "pointer",
                      fontSize: "1.1rem",
                      fontWeight: "400",
                      padding: "0 2px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "color 0.2s ease, transform 0.2s ease",
                      lineHeight: "1",
                      height: "auto",
                      minHeight: "unset"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#ff5252";
                      e.currentTarget.style.transform = "scale(1.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                    aria-label={`Remove ${skill}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {localSkills.length === 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", color: "var(--muted)", fontSize: "0.9rem", fontStyle: "italic" }}>
                  No tools added yet. Use the input below to add your first skill!
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                id="new-skill-input"
                type="text"
                placeholder="e.g. Docker, TypeScript, AWS..."
                style={{ flex: 1, margin: 0 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkillClick();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddSkillClick}
                style={{
                  background: "linear-gradient(135deg, #59d6b4, #f7c873)",
                  color: "#12120f",
                  fontWeight: "900",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  height: "46px",
                  minHeight: "46px",
                  boxShadow: "0 8px 20px rgba(89, 214, 180, 0.15)",
                  transition: "transform 180ms ease, box-shadow 180ms ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 12px 24px rgba(89, 214, 180, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(89, 214, 180, 0.15)";
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "2px" }}>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add
              </button>
            </div>
          </div>

          <button type="submit">Save Changes</button>
        </form>
      </section>

      {/* ===== Projects Manager Section ===== */}
      <section className="panel admin-projects-panel">
        <div className="section-heading">
          <span>Projects</span>
          <h3>Manage Your Projects</h3>
        </div>
        <div className="admin-projects-list">
          {localProjects.slice(0, visibleAdminProjectsCount).map((proj, i) => (
            <div key={i} className="admin-project-card">
              <div className="admin-project-card-header">
                <span className="admin-project-number">#{i + 1}</span>
                <div className="admin-project-actions">
                  <button
                    type="button"
                    className="admin-proj-btn move-btn"
                    onClick={() => moveProject(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                  </button>
                  <button
                    type="button"
                    className="admin-proj-btn move-btn"
                    onClick={() => moveProject(i, 1)}
                    disabled={i === localProjects.length - 1}
                    aria-label="Move down"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                  <button
                    type="button"
                    className="admin-proj-btn delete-btn"
                    onClick={() => deleteProject(i)}
                    aria-label="Delete project"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                  </button>
                </div>
              </div>
              <div className="admin-project-fields">
                <div className="admin-field-group">
                  <label>Project Name</label>
                  <input
                    type="text"
                    value={proj.title}
                    placeholder="e.g. Smart Portfolio"
                    onChange={(e) => updateProject(i, "title", e.target.value)}
                    required
                  />
                </div>
                <div className="admin-field-group">
                  <label>Description</label>
                  <textarea
                    rows={2}
                    value={proj.description}
                    placeholder="Short project description..."
                    onChange={(e) => updateProject(i, "description", e.target.value)}
                  />
                </div>
                <div className="admin-field-group">
                  <label>Live Demo Link</label>
                  <input
                    type="url"
                    value={proj.link}
                    placeholder="https://your-project.com"
                    onChange={(e) => updateProject(i, "link", e.target.value)}
                  />
                </div>
                <div className="admin-field-group">
                  <label>GitHub Repo Link</label>
                  <input
                    type="url"
                    value={proj.github || ""}
                    placeholder="https://github.com/username/repo"
                    onChange={(e) => updateProject(i, "github", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
          {localProjects.length > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", marginTop: "24px", marginBottom: "8px", flexWrap: "wrap" }}>
              {visibleAdminProjectsCount < localProjects.length && (
                <button
                  type="button"
                  onClick={() => setVisibleAdminProjectsCount((prev) => Math.min(localProjects.length, prev + 3))}
                  className="btn-load-more"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 24px",
                    borderRadius: "99px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "var(--heading)",
                    fontWeight: "800",
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    cursor: "pointer",
                    backdropFilter: "blur(12px)",
                    transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px) scale(1.03)";
                    e.currentTarget.style.background = "rgba(89, 214, 180, 0.08)";
                    e.currentTarget.style.borderColor = "rgba(89, 214, 180, 0.3)";
                    e.currentTarget.style.color = "var(--accent)";
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(89, 214, 180, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.color = "var(--heading)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.2)";
                  }}
                >
                  <span>Load More Projects</span>
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              )}
              {visibleAdminProjectsCount > 1 && (
                <button
                  type="button"
                  onClick={() => setVisibleAdminProjectsCount(1)}
                  className="btn-show-less"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 24px",
                    borderRadius: "99px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "var(--heading)",
                    fontWeight: "800",
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    cursor: "pointer",
                    backdropFilter: "blur(12px)",
                    transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px) scale(1.03)";
                    e.currentTarget.style.background = "rgba(255, 122, 89, 0.08)";
                    e.currentTarget.style.borderColor = "rgba(255, 122, 89, 0.3)";
                    e.currentTarget.style.color = "#ff7a59";
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(255, 122, 89, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.color = "var(--heading)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.2)";
                  }}
                >
                  <span>Show Less</span>
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
              )}
            </div>
          )}
          {localProjects.length === 0 && (
            <p className="admin-no-projects">No projects yet. Click "Add Project" to get started.</p>
          )}
        </div>
        <div className="admin-projects-footer">
          <button type="button" className="btn-add-project" onClick={addProject}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Project
          </button>
          <button
            type="button"
            className="btn-save-projects"
            onClick={async () => {
              try {
                pushSaving("Saving projects...");
                const payload = {
                  projects: localProjects.filter((p) => p.title.trim())
                };
                await api("/admin/profile", { method: "PUT", body: JSON.stringify(payload) });
                pushStatus("Projects saved!");
                await load();
              } catch (err) {
                pushStatus(err.message);
              }
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
            Save Projects
          </button>
        </div>
      </section>

      {/* ===== Social Links Manager Section ===== */}
      <section className="panel admin-socials-panel">
        <div className="section-heading">
          <span>Social Media</span>
          <h3>Manage Your Social Links</h3>
        </div>
        <p className="admin-help-text" style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "20px", marginTop: "4px" }}>
          Configure your social media handles. They will be distributed dynamically along your profile's orbit ring, top bar, and contact section.
        </p>
        <div className="admin-projects-list">
          {localSocials.slice(0, visibleAdminSocialsCount).map((soc, i) => (
            <div key={i} className="admin-project-card" style={{ padding: "20px" }}>
              <div className="admin-project-card-header" style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="admin-project-number" style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontWeight: "700" }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "var(--accent)",
                    flexShrink: 0
                  }}>
                    {getSocialIcon(soc.icon, "admin-social-preview-icon")}
                  </span>
                  <span>#{i + 1} - {soc.platform || "New Link"}</span>
                </span>
                <div className="admin-project-actions">
                  <button
                    type="button"
                    className="admin-proj-btn move-btn"
                    onClick={() => moveSocial(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                  </button>
                  <button
                    type="button"
                    className="admin-proj-btn move-btn"
                    onClick={() => moveSocial(i, 1)}
                    disabled={i === localSocials.length - 1}
                    aria-label="Move down"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                  <button
                    type="button"
                    className="admin-proj-btn delete-btn"
                    onClick={() => deleteSocial(i)}
                    aria-label="Delete social link"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                  </button>
                </div>
              </div>
              
              <div className="admin-project-fields" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="admin-field-group" style={{ margin: 0 }}>
                  <label>Platform Name</label>
                  <input
                    type="text"
                    value={soc.platform}
                    placeholder="e.g. GitHub, LinkedIn, Email..."
                    onChange={(e) => updateSocial(i, "platform", e.target.value)}
                    required
                  />
                </div>
                <div className="admin-field-group" style={{ margin: 0 }}>
                  <label>Icon Choice</label>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "46px",
                      height: "46px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "var(--accent)",
                      flexShrink: 0
                    }}>
                      {getSocialIcon(soc.icon, "admin-social-select-preview")}
                    </div>
                    <select
                      value={soc.icon}
                      onChange={(e) => updateSocial(i, "icon", e.target.value)}
                      style={{
                        flex: 1,
                        padding: "12px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                        color: "var(--heading)",
                        font: "inherit",
                        outline: "none",
                        height: "46px"
                      }}
                    >
                      <option value="mail" style={{ background: "#181816" }}>Email (mail)</option>
                      <option value="github" style={{ background: "#181816" }}>GitHub (github)</option>
                      <option value="linkedin" style={{ background: "#181816" }}>LinkedIn (linkedin)</option>
                      <option value="hashnode" style={{ background: "#181816" }}>Hashnode (hashnode)</option>
                      <option value="youtube" style={{ background: "#181816" }}>YouTube (youtube)</option>
                      <option value="x" style={{ background: "#181816" }}>X / Twitter (x)</option>
                      <option value="whatsapp" style={{ background: "#181816" }}>WhatsApp (whatsapp)</option>
                      <option value="telegram" style={{ background: "#181816" }}>Telegram (telegram)</option>
                      <option value="instagram" style={{ background: "#181816" }}>Instagram (instagram)</option>
                      <option value="facebook" style={{ background: "#181816" }}>Facebook (facebook)</option>
                      <option value="globe" style={{ background: "#181816" }}>Globe (globe / general link)</option>
                    </select>
                  </div>
                </div>
                <div className="admin-field-group" style={{ gridColumn: "span 2", margin: 0 }}>
                  <label>Social Link URL</label>
                  <input
                    type="text"
                    value={soc.url}
                    placeholder="https://..."
                    onChange={(e) => updateSocial(i, "url", e.target.value)}
                    required
                  />
                </div>
                
                {/* Granular Visibility toggles */}
                <div className="admin-field-group" style={{ gridColumn: "span 2", margin: 0 }}>
                  <label>Visibility Customization</label>
                  <div className="social-visibility-toggles" style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px 24px",
                    marginTop: "4px",
                    padding: "12px 16px",
                    background: "rgba(255, 255, 255, 0.01)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "10px",
                    backdropFilter: "blur(12px)"
                  }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.82rem", color: "var(--soft)", fontWeight: "600", userSelect: "none" }}>
                      <input
                        type="checkbox"
                        checked={soc.showInNavbar !== false}
                        onChange={(e) => updateSocial(i, "showInNavbar", e.target.checked)}
                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--accent)" }}
                      />
                      Navbar List
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.82rem", color: "var(--soft)", fontWeight: "600", userSelect: "none" }}>
                      <input
                        type="checkbox"
                        checked={soc.showInOrbit !== false}
                        onChange={(e) => updateSocial(i, "showInOrbit", e.target.checked)}
                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--accent)" }}
                      />
                      Profile Orbit Ring
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.82rem", color: "var(--soft)", fontWeight: "600", userSelect: "none" }}>
                      <input
                        type="checkbox"
                        checked={soc.showInContact !== false}
                        onChange={(e) => updateSocial(i, "showInContact", e.target.checked)}
                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--accent)" }}
                      />
                      Contact Page Cards
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.82rem", color: "var(--soft)", fontWeight: "600", userSelect: "none" }}>
                      <input
                        type="checkbox"
                        checked={soc.showInEmail !== false}
                        onChange={(e) => updateSocial(i, "showInEmail", e.target.checked)}
                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--accent)" }}
                      />
                      Auto-Reply Emails
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {localSocials.length > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", marginTop: "24px", marginBottom: "16px", flexWrap: "wrap" }}>
              {visibleAdminSocialsCount < localSocials.length && (
                <button
                  type="button"
                  onClick={() => setVisibleAdminSocialsCount((prev) => Math.min(localSocials.length, prev + 3))}
                  className="btn-load-more"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 24px",
                    borderRadius: "99px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "var(--heading)",
                    fontWeight: "800",
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    cursor: "pointer",
                    backdropFilter: "blur(12px)",
                    transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px) scale(1.03)";
                    e.currentTarget.style.background = "rgba(89, 214, 180, 0.08)";
                    e.currentTarget.style.borderColor = "rgba(89, 214, 180, 0.3)";
                    e.currentTarget.style.color = "var(--accent)";
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(89, 214, 180, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.color = "var(--heading)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.2)";
                  }}
                >
                  <span>Load More Social Links</span>
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              )}
              {visibleAdminSocialsCount > 1 && (
                <button
                  type="button"
                  onClick={() => setVisibleAdminSocialsCount(1)}
                  className="btn-show-less"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 24px",
                    borderRadius: "99px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "var(--heading)",
                    fontWeight: "800",
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    cursor: "pointer",
                    backdropFilter: "blur(12px)",
                    transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px) scale(1.03)";
                    e.currentTarget.style.background = "rgba(255, 122, 89, 0.08)";
                    e.currentTarget.style.borderColor = "rgba(255, 122, 89, 0.3)";
                    e.currentTarget.style.color = "#ff7a59";
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(255, 122, 89, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.color = "var(--heading)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.2)";
                  }}
                >
                  <span>Show Less</span>
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
              )}
            </div>
          )}
          {localSocials.length === 0 && (
            <p className="admin-no-projects">No social links configured yet. Click "Add Social Link" to get started.</p>
          )}
        </div>

        <div className="admin-projects-footer">
          <button type="button" className="btn-add-project" onClick={addSocial}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Social Link
          </button>
          <button
            type="button"
            className="btn-save-projects"
            onClick={async () => {
              try {
                pushSaving("Saving social links...");
                const payload = {
                  socials: localSocials.filter((s) => s.platform.trim() && s.url.trim())
                };
                await api("/admin/profile", { method: "PUT", body: JSON.stringify(payload) });
                pushStatus("Social links saved!");
                await load();
              } catch (err) {
                pushStatus(err.message);
              }
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
            Save Social Links
          </button>
        </div>
      </section>

      <StatusPopup toast={toast} onClose={() => setToast((prev) => ({ ...prev, show: false }))} />

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

function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
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
        @keyframes float-card {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes spark-crackle-1 {
          0%, 100% { opacity: 0.9; transform: scaleY(1) translateY(0); }
          50% { opacity: 0.1; transform: scaleY(-1) translateY(-2px); }
        }
        @keyframes spark-crackle-2 {
          0%, 100% { opacity: 0.1; transform: scaleY(-1) translateY(2px); }
          50% { opacity: 0.9; transform: scaleY(1) translateY(0); }
        }
        
        /* Unified Dynamic Color State Animations */
        .state-text {
          animation: text-color-state 4.5s ease-in-out infinite;
        }
        .state-stroke {
          animation: stroke-color-state 4.5s ease-in-out infinite;
        }
        .state-fill {
          animation: fill-color-state 4.5s ease-in-out infinite;
        }
        .state-border-bg-glow {
          animation: border-bg-glow-state 4.5s ease-in-out infinite;
        }
        .state-glow-soft {
          animation: glow-soft-state 4.5s ease-in-out infinite;
        }
        .btn-back-home {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 32px;
          border-radius: 99px;
          font-size: 0.9rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease, border-color 0.3s ease, color 0.3s ease;
          position: relative;
          z-index: 5;
          margin-top: 8px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          overflow: hidden;
          border: 1px solid transparent;
        }

        .btn-back-home::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.15) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: skewX(-25deg);
          transition: 0.75s;
          opacity: 0;
          pointer-events: none;
        }

        .btn-back-home:hover::after {
          left: 125%;
          opacity: 1;
        }

        .state-btn {
          animation: btn-state-normal 4.5s ease-in-out infinite;
        }

        .state-btn:hover {
          transform: translateY(-4px) scale(1.04);
          animation: btn-state-hover 4.5s ease-in-out infinite;
          color: #12120f !important;
        }

        .state-btn svg {
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .state-btn:hover svg {
          transform: translateX(-4px);
        }

        .state-blob-left {
          animation: blob-left-state 4.5s ease-in-out infinite;
          position: absolute;
          width: 450px;
          height: 450px;
          border-radius: 50%;
          top: 5%;
          left: 15%;
          filter: blur(60px);
          pointer-events: none;
          z-index: 1;
        }
        .state-blob-right {
          animation: blob-right-state 4.5s ease-in-out infinite;
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          bottom: 5%;
          right: 15%;
          filter: blur(60px);
          pointer-events: none;
          z-index: 1;
        }

        @keyframes text-color-state {
          0%, 25%, 90%, 100% { color: #34d399; } /* Connected - Green */
          35%, 80% { color: #ff5252; }           /* Disconnected - Red */
        }
        @keyframes stroke-color-state {
          0%, 25%, 90%, 100% { stroke: #34d399; } /* Connected - Green */
          35%, 80% { stroke: #ff5252; }           /* Disconnected - Red */
        }
        @keyframes fill-color-state {
          0%, 25%, 90%, 100% { fill: #34d399; } /* Connected - Green */
          35%, 80% { fill: #ff5252; }           /* Disconnected - Red */
        }
        @keyframes border-bg-glow-state {
          0%, 25%, 90%, 100% {
            border-color: rgba(52, 211, 153, 0.25);
            background-color: rgba(52, 211, 153, 0.08);
            box-shadow: 0 0 20px rgba(52, 211, 153, 0.15);
          }
          35%, 80% {
            border-color: rgba(255, 82, 82, 0.25);
            background-color: rgba(255, 82, 82, 0.08);
            box-shadow: 0 0 20px rgba(255, 82, 82, 0.15);
          }
        }
        @keyframes glow-soft-state {
          0%, 25%, 90%, 100% { filter: drop-shadow(0 0 10px rgba(52, 211, 153, 0.25)); }
          35%, 80% { filter: drop-shadow(0 0 10px rgba(255, 82, 82, 0.25)); }
        }
        @keyframes btn-state-normal {
          0%, 25%, 90%, 100% {
            background: rgba(89, 214, 180, 0.05);
            border-color: rgba(89, 214, 180, 0.3);
            color: #59d6b4 !important;
            box-shadow: 0 4px 20px rgba(89, 214, 180, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.03);
          }
          35%, 80% {
            background: rgba(247, 200, 115, 0.05);
            border-color: rgba(247, 200, 115, 0.3);
            color: #f7c873 !important;
            box-shadow: 0 4px 20px rgba(247, 200, 115, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.03);
          }
        }
        @keyframes btn-state-hover {
          0%, 25%, 90%, 100% {
            background: #59d6b4;
            border-color: #59d6b4;
            box-shadow: 0 12px 32px rgba(89, 214, 180, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }
          35%, 80% {
            background: #f7c873;
            border-color: #f7c873;
            box-shadow: 0 12px 32px rgba(247, 200, 115, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }
        }
        @keyframes blob-left-state {
          0%, 25%, 90%, 100% { background: radial-gradient(circle, rgba(52, 211, 153, 0.035) 0%, rgba(0, 0, 0, 0) 70%); }
          35%, 80% { background: radial-gradient(circle, rgba(255, 82, 82, 0.035) 0%, rgba(0, 0, 0, 0) 70%); }
        }
        @keyframes blob-right-state {
          0%, 25%, 90%, 100% { background: radial-gradient(circle, rgba(52, 211, 153, 0.035) 0%, rgba(0, 0, 0, 0) 70%); }
          35%, 80% { background: radial-gradient(circle, rgba(255, 82, 82, 0.035) 0%, rgba(0, 0, 0, 0) 70%); }
        }

        /* Interactive Pull-Apart Looping Animations */
        .plug-left-group {
          animation: disconnect-left 4.5s cubic-bezier(0.77, 0, 0.175, 1) infinite;
        }
        .plug-right-group {
          animation: disconnect-right 4.5s cubic-bezier(0.77, 0, 0.175, 1) infinite;
        }
        .sparks-group {
          animation: sparks-fade 4.5s ease-in-out infinite;
        }

        @keyframes disconnect-left {
          0%, 25% { transform: translateX(25px); } /* Connected */
          35%, 80% { transform: translateX(0px); }  /* Disconnected / Pull Apart */
          90%, 100% { transform: translateX(25px); } /* Snap Back Together */
        }
        @keyframes disconnect-right {
          0%, 25% { transform: translateX(-25px); } /* Connected */
          35%, 80% { transform: translateX(0px); }  /* Disconnected / Pull Apart */
          90%, 100% { transform: translateX(-25px); } /* Snap Back Together */
        }
        @keyframes sparks-fade {
          0%, 26% { opacity: 0; transform: scale(0.4); pointer-events: none; } /* Hidden when connected */
          35%, 79% { opacity: 1; transform: scale(1); } /* Flying when pulled apart */
          88%, 100% { opacity: 0; transform: scale(0.4); pointer-events: none; } /* Fading as they reconnect */
        }

        /* Dynamic Badge Text Toggling */
        .badge-text-container {
          display: inline-grid;
          place-items: center;
          position: relative;
        }
        .text-connected, .text-disconnected {
          grid-area: 1 / 1;
          white-space: nowrap;
        }
        .text-connected {
          animation: opacity-connected 4.5s ease-in-out infinite;
        }
        .text-disconnected {
          animation: opacity-disconnected 4.5s ease-in-out infinite;
        }
        @keyframes opacity-connected {
          0%, 25%, 90%, 100% { opacity: 1; visibility: visible; }
          30%, 85% { opacity: 0; visibility: hidden; }
        }
        @keyframes opacity-disconnected {
          0%, 25%, 90%, 100% { opacity: 0; visibility: hidden; }
          30%, 85% { opacity: 1; visibility: visible; }
        }
      `}} />

      {/* Decorative Blur Blobs with Dynamic State Animations */}
      <div className="state-blob-left" />
      <div className="state-blob-right" />

      {/* Main Glassmorphic Card */}
      <div
        style={{
          padding: "60px 40px",
          borderRadius: "28px",
          background: "rgba(255, 255, 255, 0.015)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.04)",
          boxShadow: "0 50px 100px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
          maxWidth: "540px",
          zIndex: 2,
          animation: "float-card 6s ease-in-out infinite",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}
      >
        {/* Modern high-tech badge with Dynamic State Colors and Text Toggling */}
        <div
          className="state-border-bg-glow state-text"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            borderRadius: "100px",
            fontSize: "0.72rem",
            fontWeight: "800",
            letterSpacing: "1.8px",
            textTransform: "uppercase",
            marginBottom: "28px",
            border: "1px solid transparent"
          }}
        >
          <span
            className="state-fill state-glow-soft"
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
            }}
          />
          <span className="badge-text-container">
            <span className="text-connected">🌌 Connection Restored</span>
            <span className="text-disconnected">🌌 Connection Severed</span>
          </span>
        </div>

        {/* High-Tech Animated Disconnected Plug SVG Icon with Dynamic Colors */}
        <svg
          viewBox="0 0 260 140"
          width="250"
          height="135"
          className="state-glow-soft"
          style={{
            marginBottom: "32px",
            overflow: "visible"
          }}
        >
          {/* Left Plug and Wire Group */}
          <g className="plug-left-group">
            {/* Left Curved Wire - Thicker and Bolder */}
            <path
              d="M -15,10 Q 15,95 50,70"
              fill="none"
              className="state-stroke"
              strokeWidth="6"
              strokeOpacity="0.5"
              strokeLinecap="round"
            />
            
            {/* Left Female Plug Body - Larger Scale */}
            <path
              d="M 50,46 L 85,46 C 91,46 95,51 95,54 L 95,86 C 95,89 91,94 85,94 L 50,94 Z"
              fill="rgba(18, 18, 15, 0.65)"
              className="state-stroke"
              strokeWidth="3"
            />
            
            {/* Left interior contacts (sockets) */}
            <rect x="80" y="55" width="4" height="8" rx="1.5" fill="#12120f" className="state-stroke" strokeWidth="1.5" />
            <rect x="80" y="77" width="4" height="8" rx="1.5" fill="#12120f" className="state-stroke" strokeWidth="1.5" />

            {/* Left Plug Grip ridges */}
            <line x1="60" y1="52" x2="60" y2="88" className="state-stroke" strokeWidth="2" strokeOpacity="0.5" />
            <line x1="68" y1="52" x2="68" y2="88" className="state-stroke" strokeWidth="2" strokeOpacity="0.5" />
          </g>

          {/* Electric Sparks Group (Active ONLY during disconnected frames - Zig-Zag lightning crackles) */}
          <g className="sparks-group" style={{ transformOrigin: "120px 70px" }}>
            {/* Flickering lightning bolt 1 */}
            <path
              d="M 98,65 L 110,54 L 118,78 L 128,58 L 140,65"
              fill="none"
              stroke="#ff5252"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="spark-bolt-1"
              style={{ transformOrigin: "center", animation: "spark-crackle-1 0.25s linear infinite" }}
            />
            {/* Flickering lightning bolt 2 */}
            <path
              d="M 98,75 L 108,84 L 116,60 L 126,82 L 140,75"
              fill="none"
              stroke="#ff5252"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="spark-bolt-2"
              style={{ transformOrigin: "center", animation: "spark-crackle-2 0.3s linear infinite" }}
            />
          </g>

          {/* Right Plug and Wire Group */}
          <g className="plug-right-group">
            {/* Right Plug Body - Larger Scale */}
            <path
              d="M 190,46 L 155,46 C 149,46 145,51 145,54 L 145,86 C 145,89 149,94 155,94 L 190,94 Z"
              fill="rgba(18, 18, 15, 0.65)"
              className="state-stroke"
              strokeWidth="3"
            />
            
            {/* Right Prongs pointing left - Bolder and wider */}
            <rect x="127" y="56" width="18" height="6" rx="1.5" className="state-fill state-glow-soft" />
            <rect x="127" y="78" width="18" height="6" rx="1.5" className="state-fill state-glow-soft" />

            {/* Right Plug Grip ridges */}
            <line x1="180" y1="52" x2="180" y2="88" className="state-stroke" strokeWidth="2" strokeOpacity="0.5" />
            <line x1="172" y1="52" x2="172" y2="88" className="state-stroke" strokeWidth="2" strokeOpacity="0.5" />

            {/* Right Curved Wire - Thicker and Bolder */}
            <path
              d="M 190,70 Q 235,95 275,10"
              fill="none"
              className="state-stroke"
              strokeWidth="6"
              strokeOpacity="0.5"
              strokeLinecap="round"
            />
          </g>
        </svg>

        <h1
          style={{
            fontSize: "2.8rem",
            fontWeight: "900",
            letterSpacing: "-1.5px",
            lineHeight: "1.1",
            marginBottom: "16px",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            justifyContent: "center"
          }}
        >
          Oops!{" "}
          <span
            className="state-border-bg-glow state-text"
            style={{
              padding: "4px 16px",
              borderRadius: "14px",
              fontSize: "2.2rem",
              border: "1px solid transparent",
              textShadow: "none"
            }}
          >
            404
          </span>
        </h1>
        
        <p
          style={{
            fontSize: "0.98rem",
            color: "#a69e90",
            lineHeight: "1.75",
            margin: "0 0 32px 0",
            fontWeight: "400"
          }}
        >
          It seems we've suffered a power outage. The connection to this page was unplugged, or the line has been severed. Let's guide you back to the main grid to restore your connection.
        </p>

        {/* Back to Safety Action Button with Dynamic State Colors */}
        <NavLink to="/" className="btn-back-home state-btn">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Safety
        </NavLink>
      </div>
    </div>
  );
}

function DevtoolsWarning() {
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

export default function App() {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isLocked, setIsLocked] = useState(() => {
    return sessionStorage.getItem("portfolio_locked") === "true";
  });
  const location = useLocation();
  const navigate = useNavigate();
  const is404 = location.pathname !== "/" && location.pathname !== "/admin";

  // 1. Load Profile at parent level on load (speeds up transitions & centralizes state)
  useEffect(() => {
    api("/profile?t=" + Date.now())
      .then(setProfile)
      .catch((e) => {
        setProfile(fallbackProfile);
        setStatus(`Demo content loaded. API says: ${e.message}`);
      });
  }, []);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
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
      link.href =
        "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23110f10'/><text x='50' y='66' font-size='52' text-anchor='middle'>🔒</text></svg>";
      document.title = "🔒 Access Restrained | Portfolio Secured";
    } else if (is404) {
      // Set 404 warning favicon and page title
      link.href = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%2311110f"/><text x="50" y="68" font-size="55" text-anchor="middle">⚠️</text></svg>`;
      document.title = "⚠️ 404 | Page Not Found";
    } else if (profile) {
      document.title = profile.name ? `${profile.name} | Portfolio` : "Portfolio";
      const apiBase = API_URL.replace(/\/api$/, "");
      link.href = `${apiBase}/api/favicon?t=${Date.now()}`;
    }
  }, [profile, is404, isLocked]);

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
        sessionStorage.setItem("portfolio_locked", "true");
      } else {
        setIsLocked(false);
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

  if (isOffline) return <OfflinePage />;
  if (isLocked) return <DevtoolsWarning />;
  if (!profile) return <p className="loading">{status || "Loading portfolio..."}</p>;

  return (
    <Routes>
      <Route path="/" element={<Home profile={profile} />} />
      <Route path="/admin" element={<Admin profile={profile} setProfile={setProfile} />} />
      <Route path="/error" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}


