import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import morgan from "morgan";

import Profile from "./models/Profile.js";
import Message from "./models/Message.js";
import defaultProfile from "./seed/defaultProfile.js";
import nodemailer from "nodemailer";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();

// Transporter setup for email notifications with connection pooling
let cachedTransporter = null;

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.log("⚠️ SMTP_USER or SMTP_PASS is missing in .env. Email notifications are disabled.");
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
    auth: { user, pass }
  });

  // Verify the connection configuration on creation
  cachedTransporter.verify((error) => {
    if (error) {
      console.error("❌ SMTP Transporter warm pooling verification failed:", error.message);
    } else {
      console.log("🚀 SMTP Connection Pool is warm and ready to dispatch emails instantly!");
    }
  });

  return cachedTransporter;
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
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";

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

const requireAdminAuth = (req, res, next) => {
  if (!ADMIN_API_KEY) {
    return res.status(503).json({ ok: false, error: "Admin auth is not configured on server" });
  }
  const key = req.header("x-admin-key");
  if (!key || key !== ADMIN_API_KEY) {
    return res.status(401).json({ ok: false, error: "Unauthorized admin request" });
  }
  return next();
};

const validateProfilePayload = (payload) => {
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
          link: String(p?.link || "#").trim(),
          github: String(p?.github || "").trim()
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

  if (out.projects.some((p) => !isValidUrl(p.link) || (p.github && !isValidUrl(p.github)))) {
    errors.push("Project links must be valid URLs");
  }
  if (out.socials.some((s) => !isValidUrl(s.url))) {
    errors.push("Social links must be valid URLs");
  }

  const profileImage = String(payload?.profile_image_data || "").trim();
  if (profileImage && !profileImage.startsWith("http") && !profileImage.startsWith("data:image")) {
    errors.push("Profile image must be an URL or image data");
  }
  out.profile_image_data = profileImage;

  return { errors, out };
};

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: "4mb" }));
app.use(morgan("dev"));
app.use("/api/admin", requireAdminAuth);

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

app.get("/api/profile", async (_req, res) => {
  try {
    await ensureProfile();
    const profile = await Profile.findOne({ slug: defaultProfile.slug }).lean();
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.json(profile);
  } catch (err) {
    console.error("Error in /api/profile:", err);
    res.status(500).json({ ok: false, error: "Could not load profile: " + err.message });
  }
});

app.put("/api/admin/profile", async (req, res) => {
  try {
    const payload = req.body || {};
    const { errors, out } = validateProfilePayload(payload);
    if (errors.length > 0) {
      return res.status(400).json({ ok: false, error: errors[0] });
    }
    let newImageUrl = payload.profile_image_data || "";
    let newPublicId = "";

    // 1. Fetch current profile to check if there is an existing image to delete
    const currentProfile = await Profile.findOne({ slug: defaultProfile.slug }).lean();
    if (currentProfile && currentProfile.profile_image_public_id) {
      newPublicId = currentProfile.profile_image_public_id;
    }

    if (newImageUrl && newImageUrl.startsWith("data:image")) {
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
    } else if (newImageUrl === "") {
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
    let receiverEmail = "amrutanshu20003@gmail.com";
    let receiverName = "Amrutanshu Panda";
    let receiverImage = "";
    let emailSocials = [];
    try {
      const profile = await Profile.findOne({ slug: defaultProfile.slug }).lean();
      if (profile) {
        if (profile.email) receiverEmail = profile.email;
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

    // 3. Send email notification asynchronously via Nodemailer (if configured)
    const transporter = getTransporter();
    if (transporter) {
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

      // A. Mail options for Amrutanshu Panda (Owner notification)
      const notificationMailOptions = {
        from: `"${receiverName} Portfolio" <${process.env.SMTP_USER}>`,
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

      // B. Mail options for the Sender (Visitor auto-reply)
      const autoReplyMailOptions = {
        from: `"${receiverName}" <${process.env.SMTP_USER}>`,
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

      // Send owner notification
      transporter.sendMail(notificationMailOptions)
        .then((info) => console.log("✉️ Owner Email notification sent successfully:", info.messageId))
        .catch((err) => console.error("❌ Failed to send owner email notification:", err.message));

      // Send auto-reply acknowledgement to the visitor
      transporter.sendMail(autoReplyMailOptions)
        .then((info) => console.log("✉️ Visitor Auto-Reply sent successfully:", info.messageId))
        .catch((err) => console.error("❌ Failed to send visitor auto-reply:", err.message));
    }

    return res.json({ ok: true });
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


