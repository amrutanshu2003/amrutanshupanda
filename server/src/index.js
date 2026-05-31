import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import { timingSafeEqual } from "node:crypto";
import dns from "node:dns";

import Profile from "./models/Profile.js";
import Message from "./models/Message.js";
import defaultProfile from "./seed/defaultProfile.js";
import nodemailer from "nodemailer";
import { v2 as cloudinary } from "cloudinary";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore on older Node runtimes
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms))
  ]);

const smtpSendTimeoutMs = 18000;

const getSmtpConfig = () => {
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const host = String(process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const rawPort = Number(process.env.SMTP_PORT || 465);
  const port = Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 465;
  const secure = String(process.env.SMTP_SECURE || (port === 465 ? "true" : "false")).toLowerCase() === "true";
  return { user, pass, host, port, secure };
};

const getGmailApiConfig = () => {
  const clientId = String(process.env.GMAIL_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.GMAIL_CLIENT_SECRET || "").trim();
  const refreshToken = String(process.env.GMAIL_REFRESH_TOKEN || "").trim();
  const from = String(process.env.GMAIL_FROM || process.env.SMTP_USER || "").trim();
  return {
    ready: Boolean(clientId && clientSecret && refreshToken && from),
    clientId,
    clientSecret,
    refreshToken,
    from
  };
};

const encodeBase64Url = (value) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const buildRawEmail = ({ from, to, replyTo, subject, html }) => {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    replyTo ? `Reply-To: ${replyTo}` : "",
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8"
  ].filter(Boolean);
  return encodeBase64Url(`${headers.join("\r\n")}\r\n\r\n${html}`);
};

const sendViaGmailApi = async (mailOptions, label = "email") => {
  const config = getGmailApiConfig();
  if (!config.ready) {
    const error = new Error("Gmail API is not configured");
    error.code = "GMAIL_API_NOT_CONFIGURED";
    throw error;
  }

  const tokenBody = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: "refresh_token"
  });
  const tokenResponse = await withTimeout(
    fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody
    }),
    12000,
    `${label} Gmail API token`
  );
  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new Error(`Gmail API token failed: ${tokenData.error_description || tokenData.error || tokenResponse.status}`);
  }

  const from = mailOptions.from || config.from;
  const sendResponse = await withTimeout(
    fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        raw: buildRawEmail({
          from,
          to: mailOptions.to,
          replyTo: mailOptions.replyTo,
          subject: mailOptions.subject,
          html: mailOptions.html
        })
      })
    }),
    18000,
    `${label} Gmail API send`
  );
  const sendData = await sendResponse.json().catch(() => ({}));
  if (!sendResponse.ok) {
    throw new Error(`Gmail API send failed: ${sendData.error?.message || sendData.error || sendResponse.status}`);
  }
  return { messageId: sendData.id, provider: "gmail-api" };
};

const sendViaSmtp = async (mailOptions, label = "email") => {
  const { user, pass, host, port, secure } = getSmtpConfig();
  if (!host || !user || !pass) {
    const error = new Error("SMTP is not configured");
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: smtpSendTimeoutMs,
    greetingTimeout: smtpSendTimeoutMs,
    socketTimeout: smtpSendTimeoutMs,
    dnsTimeout: 5000,
    family: 4,
    tls: {
      servername: host,
      rejectUnauthorized: true
    }
  });

  try {
    return await withTimeout(
      transporter.sendMail({
        ...mailOptions,
        from: mailOptions.from || `"Portfolio" <${user}>`
      }),
      smtpSendTimeoutMs + 2000,
      `${label} SMTP send`
    );
  } finally {
    transporter.close();
  }
};

const sendMailReliable = async (mailOptions, label = "email") => {
  const gmailApi = getGmailApiConfig();
  const errors = [];
  if (gmailApi.ready) {
    try {
      return await sendViaGmailApi(mailOptions, label);
    } catch (err) {
      errors.push(`gmail-api=${err?.message || err}`);
    }
  }

  try {
    const smtpResult = await sendViaSmtp(mailOptions, label);
    return { ...smtpResult, provider: "smtp" };
  } catch (err) {
    errors.push(`smtp=${err?.message || err}`);
  }

  throw new Error(errors.join(" || "));
};

const getMailConfigState = () => {
  const smtpHost = String(process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const smtpPort = String(process.env.SMTP_PORT || "").trim();
  const smtpUser = String(process.env.SMTP_USER || "").trim();
  const smtpPass = String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const gmailApi = getGmailApiConfig();
  return {
    smtpReady: Boolean(smtpHost && smtpUser && smtpPass),
    hasSmtpHost: Boolean(smtpHost),
    hasSmtpPort: Boolean(smtpPort),
    hasSmtpUser: Boolean(smtpUser),
    hasSmtpPass: Boolean(smtpPass),
    gmailApiReady: gmailApi.ready,
    hasGmailClientId: Boolean(gmailApi.clientId),
    hasGmailClientSecret: Boolean(gmailApi.clientSecret),
    hasGmailRefreshToken: Boolean(gmailApi.refreshToken),
    hasGmailFrom: Boolean(gmailApi.from),
    isRender: String(process.env.RENDER || "").toLowerCase() === "true",
    allowRenderSmtp: String(process.env.ALLOW_RENDER_SMTP || "").toLowerCase() === "true"
  };
};

const getEmailSocialIconUrl = (iconName) => {
  const icon = String(iconName || "").toLowerCase();
  switch (icon) {
    case "mail":
    case "email":
      return "https://img.icons8.com/color/48/gmail-new.png";
    case "github":
      return "https://img.icons8.com/material-sharp/48/181717/github.png";
    case "linkedin":
      return "https://img.icons8.com/color/48/linkedin.png";
    case "hashnode":
      return "https://img.icons8.com/color/48/hashnode.png";
    case "youtube":
      return "https://img.icons8.com/color/48/youtube-play.png";
    case "x":
    case "twitter":
      return "https://img.icons8.com/ios-filled/48/181717/x-logo.png";
    case "whatsapp":
      return "https://img.icons8.com/color/48/whatsapp.png";
    case "telegram":
      return "https://img.icons8.com/color/48/telegram-app.png";
    case "instagram":
      return "https://img.icons8.com/color/48/instagram-new.png";
    case "facebook":
      return "https://img.icons8.com/color/48/facebook-new.png";
    default:
      return "https://img.icons8.com/color/48/globe--v1.png";
  }
};

const PORT = Number(process.env.PORT || 5000);
const MONGO_URI = process.env.MONGO_URI || "";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const FRONTEND_ORIGINS = String(process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "";

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const isValidUrl = (value) => {
  const url = String(value || "").trim();
  if (!url) return false;
  if (url.startsWith("#")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:";
  } catch {
    return false;
  }
};

const normalizeUrlLike = (value) => {
  const raw = String(value || "").trim();
  if (!raw || raw === "#") return "#";
  if (raw.startsWith("mailto:")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(raw)) return `https://${raw}`;
  if (/^[^\s]+$/.test(raw) && !raw.startsWith("/") && !raw.startsWith("./") && !raw.startsWith("../")) {
    return `https://${raw}`;
  }
  return raw;
};

const toPublicProfile = (profile, apiBase = "") => {
  if (!profile) return profile;
  const safe = { ...profile };
  safe.socials = Array.isArray(profile.socials)
    ? profile.socials.map((s, i) => {
        const raw = String(s?.url || "");
        const display = raw.replace(/^https?:\/\/(www\.)?/, "").replace(/^mailto:/, "");
        return {
          ...s,
          url: `${apiBase}/api/out/social/${i}`,
          display
        };
      })
    : [];
  safe.projects = Array.isArray(profile.projects)
    ? profile.projects.map((p, i) => ({
        ...p,
        link: p?.link && p.link !== "#" ? `${apiBase}/api/out/project/${i}/link` : "#",
        github: p?.github && p.github !== "#" ? `${apiBase}/api/out/project/${i}/github` : ""
      }))
    : [];
  return safe;
};

const safeEqualString = (a, b) => {
  const aBuf = Buffer.from(String(a || ""), "utf8");
  const bBuf = Buffer.from(String(b || ""), "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
};

const issueAdminToken = () =>
  jwt.sign({ role: "admin" }, ADMIN_JWT_SECRET, {
    expiresIn: "12h",
    issuer: "portfolio-mern-api",
    audience: "portfolio-mern-admin"
  });

const parseCookieValue = (cookieHeader, key) => {
  const header = String(cookieHeader || "");
  const items = header.split(";").map((p) => p.trim());
  for (const item of items) {
    if (!item.startsWith(`${key}=`)) continue;
    return decodeURIComponent(item.slice(key.length + 1));
  }
  return "";
};

const requireAdminAuth = (req, res, next) => {
  if (req.path === "/login" || req.path === "/logout") return next();
  if (!ADMIN_PASSWORD || !ADMIN_JWT_SECRET) {
    return res.status(503).json({ ok: false, error: "Admin auth is not configured on server" });
  }
  const auth = req.header("authorization") || "";
  const bearerToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const cookieToken = parseCookieValue(req.headers.cookie, "admin_token");
  const token = bearerToken || cookieToken;
  if (!token) {
    return res.status(401).json({ ok: false, error: "Unauthorized admin request" });
  }
  try {
    jwt.verify(token, ADMIN_JWT_SECRET, {
      issuer: "portfolio-mern-api",
      audience: "portfolio-mern-admin"
    });
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid or expired admin token" });
  }
};

const validateProfilePayload = (payload, options = {}) => {
  const { validateProjects = true, validateSocials = true } = options;
  const errors = [];
  const out = {};
  const name = String(payload?.name || "").trim();
  const headline = String(payload?.headline || "").trim();
  const email = String(payload?.email || "").trim();
  const about = String(payload?.about || "").trim();

  if (!name || name.length > 80) errors.push("Name is required and must be <= 80 chars");
  if (!headline || headline.length > 140) errors.push("Headline is required and must be <= 140 chars");
  if (!isValidEmail(email)) errors.push("Valid email is required");
  if (!about || about.length > 1200) errors.push("About is required and must be <= 1200 chars");

  out.name = name;
  out.headline = headline;
  out.email = email;
  out.about = about;

  out.skills = Array.isArray(payload?.skills)
    ? payload.skills.map((s) => String(s).trim()).filter(Boolean).slice(0, 40)
    : [];

  out.stats = Array.isArray(payload?.stats)
    ? payload.stats
        .slice(0, 6)
        .map((s) => ({ value: String(s?.value || "").trim(), label: String(s?.label || "").trim() }))
        .filter((s) => s.value && s.label)
    : [];

  out.projects = Array.isArray(payload?.projects)
    ? payload.projects
        .slice(0, 24)
        .map((p) => ({
          title: String(p?.title || "").trim(),
          description: String(p?.description || "").trim(),
          link: normalizeUrlLike(String(p?.link || "").trim()),
          github: normalizeUrlLike(String(p?.github || "").trim())
        }))
        .filter((p) => p.title && p.description)
    : [];

  out.socials = Array.isArray(payload?.socials)
    ? payload.socials
        .slice(0, 20)
        .map((s) => ({
          platform: String(s?.platform || "").trim(),
          url: String(s?.url || "").trim(),
          icon: String(s?.icon || "globe").trim(),
          showInNavbar: s?.showInNavbar !== false,
          showInOrbit: s?.showInOrbit !== false,
          showInContact: s?.showInContact !== false,
          showInEmail: s?.showInEmail !== false
        }))
        .filter((s) => s.platform && s.url)
    : [];

  if (
    validateProjects &&
    out.projects.some(
      (p) =>
        (p.link && p.link !== "#" && !isValidUrl(p.link)) ||
        (p.github && p.github !== "#" && !isValidUrl(p.github))
    )
  ) {
    errors.push("Project links must be valid URLs");
  }
  if (validateSocials && out.socials.some((s) => !isValidUrl(s.url))) {
    errors.push("Social links must be valid URLs");
  }

  const profileImage = String(payload?.profile_image_data || "").trim();
  if (profileImage && !profileImage.startsWith("http") && !profileImage.startsWith("data:image")) {
    errors.push("Profile image must be an URL or image data");
  }
  out.profile_image_data = profileImage;

  return { errors, out };
};

const allowedOrigins = Array.from(
  new Set([
    FRONTEND_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...FRONTEND_ORIGINS
  ])
);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS origin not allowed"));
    }
  })
);
app.use(express.json({ limit: "4mb" }));
app.use(morgan("dev"));

// Basic security headers to reduce embedding/sniffing/data leakage
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; object-src 'none'");
  next();
});
app.use("/api/admin", requireAdminAuth);

app.post("/api/admin/login", (req, res) => {
  if (!ADMIN_PASSWORD || !ADMIN_JWT_SECRET) {
    return res.status(503).json({ ok: false, error: "Admin auth is not configured on server" });
  }
  const password = String(req.body?.password || "");
  if (!safeEqualString(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ ok: false, error: "Invalid admin credentials" });
  }
  const token = issueAdminToken();
  const isProd = process.env.NODE_ENV === "production";
  const sameSite = isProd ? "None" : "Lax";
  res.setHeader(
    "Set-Cookie",
    `admin_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=43200${
      isProd ? "; Secure" : ""
    }`
  );
  return res.json({ ok: true });
});

app.post("/api/admin/logout", (_req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  const sameSite = isProd ? "None" : "Lax";
  res.setHeader(
    "Set-Cookie",
    `admin_token=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0${isProd ? "; Secure" : ""}`
  );
  return res.json({ ok: true });
});

const ensureProfile = async () => {
  const existing = await Profile.findOne({ slug: defaultProfile.slug });
  if (!existing) {
    await Profile.create(defaultProfile);
  } else {
    let hasChanges = false;
    if (!existing.socials || existing.socials.length === 0) {
      existing.socials = defaultProfile.socials;
      hasChanges = true;
    }
    // Clean up any projects with missing descriptions to prevent Mongoose validation crashes
    if (existing.projects && existing.projects.length > 0) {
      existing.projects.forEach((proj) => {
        if (!proj.description) {
          proj.description = "No description provided.";
          hasChanges = true;
        }
      });
    }
    if (hasChanges) {
      await existing.save();
      console.log("⚡ Upgraded MongoDB Profile document: populated missing fields!");
    }
  }
};

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "portfolio-mern-api" });
});

app.get("/api", (_req, res) => {
  res.json({
    ok: true,
    service: "portfolio-mern-api",
    endpoints: ["/api/health", "/api/profile"]
  });
});

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "portfolio-mern-api",
    message: "API is running. Use /api/health or /api/profile"
  });
});

app.get("/contact", (_req, res) => {
  const target = FRONTEND_ORIGIN ? `${FRONTEND_ORIGIN.replace(/\/$/, "")}/#contact` : "/api";
  return res.redirect(302, target);
});

app.get("/api/contact", (_req, res) => {
  return res.json({
    ok: true,
    message: "Use POST /api/contact to send messages from the contact form."
  });
});

app.get("/api/favicon", async (_req, res) => {
  try {
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    res.set("Access-Control-Allow-Origin", "*");
    await ensureProfile();
    const profile = await Profile.findOne({ slug: defaultProfile.slug }).lean();
    const raw = String(profile?.profile_image_data || "").trim();

    if (raw.startsWith("data:image/")) {
      const m = raw.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (m) {
        const mime = m[1];
        const bytes = Buffer.from(m[2], "base64");
        res.set("Content-Type", mime);
        res.set("Cache-Control", "no-store");
        return res.send(bytes);
      }
    }

    if (/^https?:\/\//i.test(raw)) {
      try {
        const r = await fetch(raw);
        if (r.ok) {
          const arr = await r.arrayBuffer();
          const contentType = r.headers.get("content-type") || "image/png";
          res.set("Content-Type", contentType);
          res.set("Cache-Control", "no-store");
          return res.send(Buffer.from(arr));
        }
      } catch {
        // fallback to generated icon
      }
    }

    const letter = String(profile?.name || "A").slice(0, 1).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#59d6b4"/><text x="50" y="65" font-family="Outfit, sans-serif" font-size="50" font-weight="bold" fill="#12120f" text-anchor="middle">${escapeHtml(
      letter
    )}</text></svg>`;
    res.set("Content-Type", "image/svg+xml");
    res.set("Cache-Control", "no-store");
    return res.send(svg);
  } catch {
    return res.status(500).end();
  }
});

app.get("/api/profile", async (req, res) => {
  try {
    await ensureProfile();
    const profile = await Profile.findOne({ slug: defaultProfile.slug }).lean();
    const apiBase = `${req.protocol}://${req.get("host")}`;
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.json(toPublicProfile(profile, apiBase));
  } catch (err) {
    console.error("Error in /api/profile:", err);
    res.status(500).json({ ok: false, error: "Could not load profile: " + err.message });
  }
});

app.get("/api/out/social/:index", async (req, res) => {
  try {
    await ensureProfile();
    const profile = await Profile.findOne({ slug: defaultProfile.slug }).lean();
    const idx = Number(req.params.index);
    const target = String(profile?.socials?.[idx]?.url || "").trim();
    if (!target || !isValidUrl(target)) return res.status(404).send("Invalid link");
    return res.redirect(302, target);
  } catch {
    return res.status(500).send("Could not open link");
  }
});

app.get("/api/out/project/:index/:kind", async (req, res) => {
  try {
    await ensureProfile();
    const profile = await Profile.findOne({ slug: defaultProfile.slug }).lean();
    const idx = Number(req.params.index);
    const kind = req.params.kind === "github" ? "github" : "link";
    const target = String(profile?.projects?.[idx]?.[kind] || "").trim();
    if (!target || target === "#" || !isValidUrl(target)) return res.status(404).send("Invalid link");
    return res.redirect(302, target);
  } catch {
    return res.status(500).send("Could not open link");
  }
});

app.get("/api/admin/profile", async (_req, res) => {
  try {
    await ensureProfile();
    const profile = await Profile.findOne({ slug: defaultProfile.slug }).lean();
    return res.json(profile);
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Could not load admin profile: " + err.message });
  }
});

app.put("/api/admin/profile", async (req, res) => {
  try {
    const payload = req.body || {};
    const currentProfile = await Profile.findOne({ slug: defaultProfile.slug }).lean();
    const mergedPayload = {
      ...(currentProfile || defaultProfile),
      ...payload
    };
    const { errors, out } = validateProfilePayload(mergedPayload, {
      validateProjects: Object.prototype.hasOwnProperty.call(payload, "projects"),
      validateSocials: Object.prototype.hasOwnProperty.call(payload, "socials")
    });
    if (errors.length > 0) {
      return res.status(400).json({ ok: false, error: errors[0] });
    }
    const hasImageUpdate = Object.prototype.hasOwnProperty.call(payload, "profile_image_data");
    let newImageUrl = out.profile_image_data || "";
    let newPublicId = currentProfile?.profile_image_public_id || "";

    if (hasImageUpdate && newImageUrl && newImageUrl.startsWith("data:image")) {
      // User uploaded a new base64 photo!
      // A. Upload new photo to Cloudinary
      const uploadRes = await cloudinary.uploader.upload(newImageUrl, {
        folder: "mern_portfolio",
        transformation: [{ width: 500, height: 500, crop: "fill" }]
      });
      newImageUrl = uploadRes.secure_url;
      newPublicId = uploadRes.public_id;

      // B. Delete the old photo from Cloudinary if it exists
      if (currentProfile && currentProfile.profile_image_public_id) {
        try {
          await cloudinary.uploader.destroy(currentProfile.profile_image_public_id);
        } catch (destroyErr) {
          console.error("Failed to delete old image from Cloudinary:", destroyErr);
        }
      }
    } else if (hasImageUpdate && newImageUrl === "") {
      // User removed the photo!
      // Delete the old photo from Cloudinary if it exists
      if (currentProfile && currentProfile.profile_image_public_id) {
        try {
          await cloudinary.uploader.destroy(currentProfile.profile_image_public_id);
        } catch (destroyErr) {
          console.error("Failed to delete old image from Cloudinary:", destroyErr);
        }
      }
      newPublicId = "";
    }

    const updated = await Profile.findOneAndUpdate(
      { slug: defaultProfile.slug },
      {
        $set: {
          ...out,
          profile_image_data: newImageUrl,
          profile_image_public_id: newPublicId,
          slug: defaultProfile.slug
        }
      },
      { new: true, upsert: true }
    ).lean();

    res.json({ ok: true, profile: updated });
  } catch (err) {
    console.error("Error updating profile in MongoDB:", err);
    res.status(500).json({ ok: false, error: "Could not update profile: " + err.message });
  }
});

app.get("/api/admin/mail-debug", async (_req, res) => {
  const smtp = getSmtpConfig();
  const gmailApi = getGmailApiConfig();
  let smtpIpv4 = [];
  let smtpDnsError = "";
  try {
    smtpIpv4 = await dns.promises.resolve4(smtp.host);
  } catch (err) {
    smtpDnsError = err?.message || String(err);
  }

  res.json({
    ok: true,
    providerOrder: gmailApi.ready ? ["gmail-api", "smtp"] : ["smtp"],
    config: getMailConfigState(),
    smtp: {
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      ipv4Count: smtpIpv4.length,
      sampleIpv4: smtpIpv4.slice(0, 3),
      dnsError: smtpDnsError || null
    },
    note:
      "Mail uses the same Gmail SMTP pattern as Pinqoza. GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are for Google login, not SMTP mail."
  });
});

app.post("/api/admin/mail-test", async (_req, res) => {
  const to = process.env.CONTACT_TO || process.env.SMTP_USER;
  if (!to) {
    return res.status(500).json({ ok: false, error: "CONTACT_TO or SMTP_USER is missing" });
  }

  try {
    const info = await sendMailReliable(
      {
        to,
        subject: "Portfolio mail test",
        html: `
          <div style="font-family:Arial,sans-serif;padding:20px;color:#111827;">
            <h2 style="margin:0 0 10px;">Portfolio mail test passed</h2>
            <p style="margin:0;">Your Render backend can send email with the current mail configuration.</p>
          </div>
        `
      },
      "admin test email"
    );
    return res.json({
      ok: true,
      provider: info?.provider || "smtp",
      accepted: info?.accepted || [],
      messageId: info?.messageId || ""
    });
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: "Mail test failed",
      detail: String(err?.message || err)
    });
  }
});

app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  const cleanName = String(name || "").trim();
  const cleanEmail = String(email || "").trim();
  const cleanSubject = String(subject || "Project inquiry").trim();
  const cleanMessage = String(message || "").trim();
  if (!cleanName || !cleanEmail || !cleanMessage) {
    return res.status(400).json({ ok: false, error: "Please fill name, email and message" });
  }
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ ok: false, error: "Please enter a valid email" });
  }
  if (cleanName.length > 80 || cleanSubject.length > 160 || cleanMessage.length > 3000) {
    return res.status(400).json({ ok: false, error: "Input is too long" });
  }
  const safeName = escapeHtml(cleanName);
  const safeEmail = escapeHtml(cleanEmail);
  const safeSubject = escapeHtml(cleanSubject);
  const safeMessage = escapeHtml(cleanMessage);
  const safeFirstName = escapeHtml(cleanName.split(" ")[0] || "there");

  try {
    // 1. Save message to MongoDB Atlas database
    await Message.create({
      name: cleanName,
      email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage
    });

    // 2. Fetch recipient details dynamically from Profile Document
    let receiverEmail = process.env.CONTACT_TO || process.env.SMTP_USER || "amrutanshu20003@gmail.com";
    let receiverName = "Amrutanshu Panda";
    let receiverImage = "";
    let emailSocials = [];
    try {
      const profile = await Profile.findOne({ slug: defaultProfile.slug }).lean();
      if (profile) {
        if (!process.env.CONTACT_TO && profile.email) receiverEmail = profile.email;
        if (profile.name) receiverName = profile.name;
        if (profile.profile_image_data) receiverImage = profile.profile_image_data;
        if (profile.socials && profile.socials.length > 0) {
          emailSocials = profile.socials.filter((s) => s.showInEmail !== false && s.url && s.platform);
        } else {
          emailSocials = defaultProfile.socials.filter((s) => s.showInEmail !== false && s.url && s.platform);
        }
      } else {
        emailSocials = defaultProfile.socials.filter((s) => s.showInEmail !== false && s.url && s.platform);
      }
    } catch (dbErr) {
      console.error("Error loading profile email for receiver:", dbErr.message);
      emailSocials = defaultProfile.socials.filter((s) => s.showInEmail !== false && s.url && s.platform);
    }

    // 3. Send email notification via Gmail SMTP.
    const mailState = getMailConfigState();
    const mailSender = process.env.MAIL_FROM || process.env.SMTP_USER || "";
    if (mailState.smtpReady) {
      let profilePicHtml = "";
      const emailSocialsHtml = emailSocials.map((s) => `
        <td style="padding: 0 8px;">
          <a href="${s.url}" target="_blank" style="display: block; text-decoration: none;">
            <img src="${getEmailSocialIconUrl(s.icon)}" width="32" height="32" style="width: 32px; height: 32px; display: block; border: 0;" alt="${s.platform}" />
          </a>
        </td>
      `).join("");

      if (receiverImage && receiverImage.startsWith("http")) {
        profilePicHtml = `<img src="${receiverImage}" width="50" height="50" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #087f6c; display: block;" alt="${receiverName}" />`;
      }

      if (!profilePicHtml) {
        const letter = receiverName.slice(0, 1).toUpperCase();
        profilePicHtml = `<div style="width: 50px; height: 50px; border-radius: 50%; background: #087f6c; color: #ffffff; text-align: center; line-height: 50px; font-size: 22px; font-weight: bold; font-family: sans-serif; display: block;">${letter}</div>`;
      }

      profilePicHtml = `<a href="${FRONTEND_ORIGIN}" target="_blank" style="text-decoration: none; display: inline-block; border-radius: 50%;">${profilePicHtml}</a>`;

      // A. Owner notification email
      const notificationMailOptions = {
        from: `"${receiverName} Portfolio" <${mailSender}>`,
        to: receiverEmail,
        replyTo: cleanEmail,
        subject: `New Message from ${cleanName}: ${cleanSubject}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 50px 20px; color: #0f172a; margin: 0;">

            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02); border: 1px solid #e2e8f0;">
              
              <!-- Glowing Top Gradient Bar -->
              <div style="background: linear-gradient(90deg, #0ea5e9 0%, #10b981 100%); height: 6px;"></div>
              
              <!-- Header Section -->
              <div style="padding: 35px 40px 25px 40px; border-bottom: 1px solid #f1f5f9;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="width: 54px; vertical-align: middle;">
                      ${profilePicHtml}
                    </td>
                    <td style="padding-left: 16px; vertical-align: middle;">
                      <div style="display: inline-block; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 9999px; padding: 4px 12px; margin-bottom: 6px;">
                        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #15803d; vertical-align: middle;">✨ Active Inquiry</span>
                      </div>
                      <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; line-height: 1.2;">Incoming Message</h2>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Body Content -->
              <div style="padding: 35px 40px 40px 40px;">
                <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 30px 0;">
                  Hi ${receiverName.split(" ")[0]}, you've received a fresh inquiry from your digital portfolio's contact gateway:
                </p>

                <!-- Modern Detail Cards -->
                <div style="margin-bottom: 30px;">
                  <!-- Sender Card -->
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px 20px; margin-bottom: 12px; display: block;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="width: 24px; vertical-align: middle; font-size: 16px;">👤</td>
                        <td style="padding-left: 10px; vertical-align: middle;">
                          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; display: block; margin-bottom: 2px;">Sender Name</span>
                          <strong style="font-size: 15px; color: #0f172a;">${safeName}</strong>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Email Card -->
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px 20px; margin-bottom: 12px; display: block;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="width: 24px; vertical-align: middle; font-size: 16px;">✉️</td>
                        <td style="padding-left: 10px; vertical-align: middle;">
                          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; display: block; margin-bottom: 2px;">Email Address</span>
                          <a href="mailto:${safeEmail}" style="font-size: 15px; font-weight: 700; color: #0ea5e9; text-decoration: none;">${safeEmail}</a>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Subject Card -->
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px 20px; display: block;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="width: 24px; vertical-align: middle; font-size: 16px;">🏷️</td>
                        <td style="padding-left: 10px; vertical-align: middle;">
                          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; display: block; margin-bottom: 2px;">Subject</span>
                          <span style="font-size: 15px; font-weight: 600; color: #0f172a;">${safeSubject}</span>
                        </td>
                      </tr>
                    </table>
                  </div>
                </div>

                <!-- Message Box Container -->
                <div style="margin-bottom: 35px;">
                  <h4 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Message Content</h4>
                  <div style="background-color: #ffffff; border-left: 4px solid #10b981; padding: 22px 24px; border-radius: 4px 16px 16px 4px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.015);">
                    <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #334155; white-space: pre-wrap; font-style: normal;">${safeMessage}</p>
                  </div>
                </div>

                <!-- Call to Action -->
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                  <tr>
                    <td style="text-align: center;">
                      <a href="mailto:${safeEmail}?subject=Re: ${encodeURIComponent(cleanSubject)}" style="background: linear-gradient(90deg, #0ea5e9 0%, #10b981 100%); color: #ffffff; padding: 14px 36px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 12px; display: inline-block; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.2); letter-spacing: 0.2px;">
                        ✉️ Quick Reply to ${safeFirstName}
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Footer Section -->
              <div style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #f1f5f9;">
                <div style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%); border-radius: 9999px; padding: 6px 18px; margin-bottom: 12px; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.1);">
                  <span style="font-size: 11px; font-weight: 700; color: #ffffff; letter-spacing: 0.8px; text-transform: uppercase;">🔒 Secured & Delivered by ${receiverName}</span>
                </div>
                <p style="margin: 0; font-size: 10px; color: #94a3b8; line-height: 1.6; font-weight: 500;">
                  This secure transmission was validated & processed through your portfolio server.
                  <br />
                  &copy; ${new Date().getFullYear()} ${receiverName}. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        `,
        
      };

      // B. Auto-reply email for visitor
      const autoReplyMailOptions = {
        from: `"${receiverName}" <${mailSender}>`,
        to: cleanEmail,
        subject: `Thanks for reaching out, ${cleanName.split(" ")[0]}!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 50px 20px; color: #0f172a; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02); border: 1px solid #e2e8f0;">
              
              <!-- Glowing Top Gradient Bar -->
              <div style="background: linear-gradient(90deg, #0ea5e9 0%, #10b981 100%); height: 6px;"></div>
              
              <!-- Header Section -->
              <div style="padding: 35px 40px 25px 40px; border-bottom: 1px solid #f1f5f9;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="width: 54px; vertical-align: middle;">
                      ${profilePicHtml}
                    </td>
                    <td style="padding-left: 16px; vertical-align: middle;">
                      <div style="display: inline-block; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 9999px; padding: 4px 12px; margin-bottom: 6px;">
                        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #15803d; vertical-align: middle;">👋 HELLO THERE</span>
                      </div>
                      <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; line-height: 1.2;">Connection Established</h2>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Body Content -->
              <div style="padding: 35px 40px 40px 40px;">
                <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">Hi ${safeFirstName},</h3>
                
                <p style="font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 20px 0;">
                  Thank you so much for visiting my online portfolio and reaching out! I'm thrilled that you got in touch.
                </p>
                <p style="font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 28px 0;">
                  I have successfully received your inquiry regarding "<strong>${safeSubject}</strong>". I review my inbox daily and will get back to you personally within the next **24 hours** to discuss this further.
                </p>

                <!-- Received Copy Highlight -->
                <div style="margin-bottom: 35px;">
                  <h4 style="margin: 0 0 10px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Copy of Your Message</h4>
                  <div style="background-color: #f8fafc; border-left: 4px solid #0ea5e9; padding: 18px 20px; border-radius: 4px 16px 16px 4px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #475569; white-space: pre-wrap; font-style: italic;">"${safeMessage}"</p>
                  </div>
                </div>

                <!-- Professional Sign-off -->
                <div style="margin-bottom: 35px; border-top: 1px solid #f1f5f9; padding-top: 25px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="vertical-align: top;">
                        <p style="margin: 0 0 4px 0; font-size: 14px; color: #64748b;">Best Regards,</p>
                        <strong style="font-size: 16px; color: #0f172a; display: block; margin-bottom: 2px;">${receiverName}</strong>
                        <span style="font-size: 13px; color: #10b981; font-weight: 600;">Python Developer & Web Builder</span>
                      </td>
                    </tr>
                  </table>
                </div>

                ${emailSocialsHtml ? `
                <!-- Social Engagement CTA Icons Only -->
                <div style="text-align: center; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 25px;">
                  <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 18px;">Connect with Me</span>
                  <table style="margin: 0 auto; border-collapse: collapse;">
                    <tr>
                      ${emailSocialsHtml}
                    </tr>
                  </table>
                </div>
                ` : ""}
              </div>

              <!-- Footer Section -->
              <div style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #f1f5f9;">
                <div style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%); border-radius: 9999px; padding: 6px 18px; margin-bottom: 12px; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.1);">
                  <span style="font-size: 11px; font-weight: 700; color: #ffffff; letter-spacing: 0.8px; text-transform: uppercase;">🔒 Secured & Delivered by ${receiverName}</span>
                </div>
                <p style="margin: 0; font-size: 10px; color: #94a3b8; line-height: 1.6; font-weight: 500;">
                  This is an automated auto-acknowledgement. You do not need to reply to this message.
                  <br />
                  &copy; ${new Date().getFullYear()} ${receiverName}. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        `,
        
      };

      const ownerResult = await sendMailReliable(notificationMailOptions, "owner email").then(
        (value) => ({ status: "fulfilled", value }),
        (reason) => ({ status: "rejected", reason })
      );

      const visitorResult = ownerResult.status === "fulfilled"
        ? await sendMailReliable(autoReplyMailOptions, "visitor email").then(
            (value) => ({ status: "fulfilled", value }),
            (reason) => ({ status: "rejected", reason })
          )
        : { status: "skipped", reason: new Error("Skipped because owner email failed") };

      const ownerOk = ownerResult.status === "fulfilled";
      const visitorOk = visitorResult.status === "fulfilled";

      if (ownerOk) {
        console.log("✅ Owner email sent:", ownerResult.value.messageId);
      } else {
        console.error("❌ Owner email failed:", ownerResult.reason?.message || ownerResult.reason);
      }

      if (visitorOk) {
        console.log("✅ Visitor auto-reply sent:", visitorResult.value.messageId);
      } else {
        console.error("❌ Visitor auto-reply failed:", visitorResult.reason?.message || visitorResult.reason);
      }

      if (!ownerOk) {
        const ownerErr = String(ownerResult.reason?.message || ownerResult.reason || "unknown");
        const visitorErr = String(visitorResult.reason?.message || visitorResult.reason || "unknown");
        return res.status(502).json({
          ok: false,
          error: "Message saved but owner email could not be delivered.",
          detail: `owner=${ownerErr} | visitor=${visitorErr}`
        });
      }

      return res.json({
        ok: true,
        mailDelivered: ownerOk || visitorOk,
        ownerDelivered: ownerOk,
        visitorDelivered: visitorOk
      });
    }

    return res.status(202).json({
      ok: true,
      mailDelivered: false,
      warning: `Message saved, but email delivery is not configured. ${JSON.stringify(mailState)}`,
      detail: JSON.stringify(mailState)
    });
  } catch (err) {
    console.error("Error processing contact form:", err);
    return res.status(500).json({ ok: false, error: "Could not process contact form message" });
  }
});

app.get("/api/admin/messages", async (_req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 }).lean();
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.json({ ok: true, messages });
  } catch {
    res.status(500).json({ ok: false, error: "Could not load messages" });
  }
});

app.delete("/api/admin/messages/:id", async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false, error: "Could not delete message" });
  }
});

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

const start = async () => {
  if (!MONGO_URI) {
    console.error("MONGO_URI is missing");
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI);
  await ensureProfile();
  app.listen(PORT, () => {
    console.log(`MERN API running on http://localhost:${PORT}`);
  });
};

start().catch((err) => {
  console.error("Server failed to start:", err.message);
  process.exit(1);
});

// Force nodemon restart



