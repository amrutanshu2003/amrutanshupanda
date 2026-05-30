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
    const transporter = getTransporter();
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

      // A. Mail options for Amrutanshu Panda (Owner notification)
      const notificationMailOptions = {
        from: `"${receiverName} Portfolio" <${process.env.SMTP_USER}>`,
        to: receiverEmail,
        replyTo: String(email).trim(),
        subject: `📩 New Message from ${name}: ${String(subject || "Project inquiry").trim()}`,
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
                          <strong style="font-size: 15px; color: #0f172a;">${name}</strong>
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
                          <a href="mailto:${email}" style="font-size: 15px; font-weight: 700; color: #0ea5e9; text-decoration: none;">${email}</a>
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
                          <span style="font-size: 15px; font-weight: 600; color: #0f172a;">${subject || "Project inquiry"}</span>
                        </td>
                      </tr>
                    </table>
                  </div>
                </div>

                <!-- Message Box Container -->
                <div style="margin-bottom: 35px;">
                  <h4 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Message Content</h4>
                  <div style="background-color: #ffffff; border-left: 4px solid #10b981; padding: 22px 24px; border-radius: 4px 16px 16px 4px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.015);">
                    <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #334155; white-space: pre-wrap; font-style: normal;">${message}</p>
                  </div>
                </div>

                <!-- Call to Action -->
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                  <tr>
                    <td style="text-align: center;">
                      <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject || 'Project inquiry')}" style="background: linear-gradient(90deg, #0ea5e9 0%, #10b981 100%); color: #ffffff; padding: 14px 36px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 12px; display: inline-block; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.2); letter-spacing: 0.2px;">
                        ✉️ Quick Reply to ${name.split(" ")[0]}
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
        attachments: attachments
      };

      // B. Mail options for the Sender (Visitor auto-reply)
      const autoReplyMailOptions = {
        from: `"${receiverName}" <${process.env.SMTP_USER}>`,
        to: String(email).trim(),
        subject: `✨ Thanks for reaching out, ${name.split(" ")[0]}!`,
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
                <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">Hi ${name.split(" ")[0]},</h3>
                
                <p style="font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 20px 0;">
                  Thank you so much for visiting my online portfolio and reaching out! I'm thrilled that you got in touch.
                </p>
                <p style="font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 28px 0;">
                  I have successfully received your inquiry regarding "<strong>${subject || "Project inquiry"}</strong>". I review my inbox daily and will get back to you personally within the next **24 hours** to discuss this further.
                </p>

                <!-- Received Copy Highlight -->
                <div style="margin-bottom: 35px;">
                  <h4 style="margin: 0 0 10px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Copy of Your Message</h4>
                  <div style="background-color: #f8fafc; border-left: 4px solid #0ea5e9; padding: 18px 20px; border-radius: 4px 16px 16px 4px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #475569; white-space: pre-wrap; font-style: italic;">"${message}"</p>
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

                <!-- Social Engagement CTA Pills -->
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                  <tr>
                    <td style="text-align: center;">
                      <a href="https://github.com/amrutanshu2003" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block; margin-right: 8px; box-shadow: 0 4px 10px rgba(15, 23, 42, 0.15);">
                        💻 View my GitHub
                      </a>
                      <a href="https://www.linkedin.com/in/amrutanshu-panda-" style="background-color: #0077b5; color: #ffffff; padding: 12px 24px; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 4px 10px rgba(0, 119, 181, 0.15);">
                        🔗 Connect on LinkedIn
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
                  This is an automated auto-acknowledgement. You do not need to reply to this message.
                  <br />
                  &copy; ${new Date().getFullYear()} ${receiverName}. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        `,
        attachments: attachments
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

