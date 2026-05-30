import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import morgan from "morgan";

import Profile from "./models/Profile.js";
import Message from "./models/Message.js";
import defaultProfile from "./seed/defaultProfile.js";
import nodemailer from "nodemailer";

const app = express();

// Transporter setup for email notifications
const createTransporter = () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.log("⚠️ SMTP_USER or SMTP_PASS is missing in .env. Email notifications are disabled.");
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass }
  });
};

const PORT = Number(process.env.PORT || 5000);
const MONGO_URI = process.env.MONGO_URI || "";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: "4mb" }));
app.use(morgan("dev"));

const ensureProfile = async () => {
  const existing = await Profile.findOne({ slug: defaultProfile.slug }).lean();
  if (!existing) await Profile.create(defaultProfile);
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
    const updated = await Profile.findOneAndUpdate(
      { slug: defaultProfile.slug },
      { $set: { ...payload, slug: defaultProfile.slug } },
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
  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: "Please fill name, email and message" });
  }

  try {
    // 1. Save message to MongoDB Atlas database
    await Message.create({
      name: String(name).trim(),
      email: String(email).trim(),
      subject: String(subject || "Project inquiry").trim(),
      message: String(message).trim()
    });

    // 2. Fetch recipient email dynamically from Profile Document
    let receiverEmail = "amrutanshu20003@gmail.com";
    try {
      const profile = await Profile.findOne({ slug: defaultProfile.slug }).lean();
      if (profile && profile.email) {
        receiverEmail = profile.email;
      }
    } catch (dbErr) {
      console.error("Error loading profile email for receiver:", dbErr.message);
    }

    // 3. Send email notification asynchronously via Nodemailer (if configured)
    const transporter = createTransporter();
    if (transporter) {
      const mailOptions = {
        from: `"Portfolio Contact Form" <${process.env.SMTP_USER}>`,
        to: receiverEmail,
        replyTo: String(email).trim(),
        subject: `📬 New Message: ${String(subject || "Project inquiry").trim()}`,
        text: `You have received a new contact form submission on your portfolio:\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject || "Project inquiry"}\n\nMessage:\n------------------------------------------\n${message}\n------------------------------------------\n\nReply directly to this email to respond to ${name}.`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fafafa; padding: 30px; border-radius: 12px; border: 1px solid #eee; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #087f6c; margin-top: 0; border-bottom: 2px solid #eee; padding-bottom: 12px; font-weight: 800;">📬 New Portfolio Message</h2>
            <p style="font-size: 16px; line-height: 1.6;">You received a new inquiry from your portfolio contact form:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #fff; border-radius: 8px; border: 1px solid #ddd; overflow: hidden;">
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px 16px; font-weight: bold; background: #fdfdfd; width: 120px;">Name:</td>
                <td style="padding: 12px 16px;">${name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px 16px; font-weight: bold; background: #fdfdfd;">Email:</td>
                <td style="padding: 12px 16px;"><a href="mailto:${email}" style="color: #087f6c; text-decoration: none; font-weight: bold;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; font-weight: bold; background: #fdfdfd;">Subject:</td>
                <td style="padding: 12px 16px;">${subject || "Project inquiry"}</td>
              </tr>
            </table>

            <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #555; font-weight: bold;">Message Content:</h4>
              <p style="margin: 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap; color: #444;">${message}</p>
            </div>

            <p style="font-size: 13px; color: #666; margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
              Reply directly to this email to respond to the sender.
            </p>
          </div>
        `
      };

      transporter.sendMail(mailOptions)
        .then((info) => console.log("✉️ Email notification sent successfully:", info.messageId))
        .catch((err) => console.error("❌ Failed to send email notification:", err.message));
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

