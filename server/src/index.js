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
          ...payload,
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

    // 2. Fetch recipient details dynamically from Profile Document
    let receiverEmail = "amrutanshu20003@gmail.com";
    let receiverName = "Amrutanshu Panda";
    let receiverImage = "";
    try {
      const profile = await Profile.findOne({ slug: defaultProfile.slug }).lean();
      if (profile) {
        if (profile.email) receiverEmail = profile.email;
        if (profile.name) receiverName = profile.name;
        if (profile.profile_image_data) receiverImage = profile.profile_image_data;
      }
    } catch (dbErr) {
      console.error("Error loading profile email for receiver:", dbErr.message);
    }

    // 3. Send email notification asynchronously via Nodemailer (if configured)
    const transporter = createTransporter();
    if (transporter) {
      const attachments = [];
      let profilePicHtml = "";

      if (receiverImage && receiverImage.startsWith("http")) {
        profilePicHtml = `<img src="${receiverImage}" width="50" height="50" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #087f6c; display: block;" alt="${receiverName}" />`;
      } else if (receiverImage && receiverImage.includes("base64,")) {
        try {
          const parts = receiverImage.split("base64,");
          const mimeType = parts[0].split(":")[1].split(";")[0] || "image/png";
          const base64Data = parts[1];
          attachments.push({
            content: Buffer.from(base64Data, 'base64'),
            cid: 'profile_pic',
            contentType: mimeType,
            contentDisposition: 'inline'
          });
          profilePicHtml = `<img src="cid:profile_pic" width="50" height="50" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #087f6c; display: block;" alt="${receiverName}" />`;
        } catch (imgErr) {
          console.error("Error preparing profile image attachment:", imgErr);
        }
      }

      if (!profilePicHtml) {
        const letter = receiverName.slice(0, 1).toUpperCase();
        profilePicHtml = `<div style="width: 50px; height: 50px; border-radius: 50%; background: #087f6c; color: #ffffff; text-align: center; line-height: 50px; font-size: 22px; font-weight: bold; font-family: sans-serif; display: block;">${letter}</div>`;
      }

      const mailOptions = {
        from: `"${receiverName} Portfolio" <${process.env.SMTP_USER}>`,
        to: receiverEmail,
        replyTo: String(email).trim(),
        subject: `📩 New Portfolio Message from ${name}: ${String(subject || "Project inquiry").trim()}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f9fc; padding: 40px 20px; color: #333333; margin: 0;">
            <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #eef2f6;">
              <!-- Header Brand Strip with Gradient Accent -->
              <div style="background: linear-gradient(135deg, #087f6c 0%, #066657 100%); padding: 6px;"></div>
              
              <!-- Header Section -->
              <div style="padding: 30px 35px 20px 35px; border-bottom: 1px solid #f0f4f8;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="width: 60px; vertical-align: middle;">
                      ${profilePicHtml}
                    </td>
                    <td style="padding-left: 15px; vertical-align: middle;">
                      <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #087f6c; display: block; margin-bottom: 4px;">Portfolio Notification</span>
                      <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px;">New Message Received</h2>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Body Content -->
              <div style="padding: 30px 35px 35px 35px;">
                <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 25px 0;">
                  Hi ${receiverName.split(" ")[0]}, you have received a new inquiry from your online portfolio contact form:
                </p>

                <!-- Sender Info Card -->
                <div style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 25px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #edf2f7;">
                      <td style="padding: 10px 0; font-size: 12px; font-weight: 600; color: #64748b; width: 90px; text-transform: uppercase; letter-spacing: 0.5px;">From</td>
                      <td style="padding: 10px 0 10px 10px; font-size: 14px; font-weight: 700; color: #0f172a;">${name}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                      <td style="padding: 10px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Email</td>
                      <td style="padding: 10px 0 10px 10px; font-size: 14px; font-weight: 600; color: #087f6c;"><a href="mailto:${email}" style="color: #087f6c; text-decoration: none; font-weight: 700;">${email}</a></td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0 0 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Subject</td>
                      <td style="padding: 10px 0 0 10px; font-size: 14px; font-style: italic; color: #334155;">${subject || "Project inquiry"}</td>
                    </tr>
                  </table>
                </div>

                <!-- Message Body -->
                <div style="margin-bottom: 30px;">
                  <h4 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 1px;">Message Content</h4>
                  <div style="background-color: #ffffff; border-left: 4px solid #087f6c; padding: 16px 20px; border-radius: 0 12px 12px 0; border-top: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; box-shadow: 0 2px 8px rgba(0,0,0,0.01);">
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${message}</p>
                  </div>
                </div>

                <!-- Quick Action Buttons -->
                <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
                  <tr>
                    <td style="text-align: center;">
                      <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject || 'Project inquiry')}" style="background-color: #087f6c; color: #ffffff; padding: 12px 30px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(8, 127, 108, 0.2);">
                        ✉️ Quick Reply to ${name.split(" ")[0]}
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Footer -->
              <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f0f4f8;">
                <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 600; color: #64748b;">
                  This is an automated message sent from your online portfolio.
                </p>
                <p style="margin: 0; font-size: 10px; color: #94a3b8;">
                  Powered by MERN Portfolio Engine • &copy; ${new Date().getFullYear()} ${receiverName}. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        `,
        attachments: attachments
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

