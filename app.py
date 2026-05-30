from flask import Flask, render_template, request, redirect, url_for, flash
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from dotenv import load_dotenv
from email.message import EmailMessage
import os
import base64
import smtplib

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "change-this-secret-key")

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://Portfolio:Portfolio@portfolio.o6nfh3w.mongodb.net/Portfolio?retryWrites=true&w=majority&appName=Portfolio")
DB_NAME = os.getenv("MONGO_DB", "Portfolio")
COLLECTION_NAME = os.getenv("MONGO_COLLECTION", "profiles")
PORT = int(os.getenv("PORT", "5000"))
CLIENT_URL = os.getenv("CLIENT_URL", f"http://localhost:{PORT}")
MAX_IMAGE_SIZE = 3 * 1024 * 1024

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
MAIL_FROM = os.getenv("MAIL_FROM", SMTP_USER)
MAIL_TO = os.getenv("MAIL_TO", "amrutanshu20003@gmail.com")

DEFAULT_PROFILE = {
    "slug": "amrutanshu-panda",
    "name": "Amrutanshu Panda",
    "headline": "Python Developer | Web Enthusiast | Problem Solver",
    "email": "amrutanshu20003@gmail.com",
    "phone": "9337606293",
    "about": "I build modern web applications using Python and clean UI design. I enjoy creating practical products with great user experience.",
    "profile_image": "images/profile.jpg",
    "profile_image_data": "",
    "stats": [
        {"value": "2+", "label": "Years Learning"},
        {"value": "15+", "label": "Projects Built"},
        {"value": "100%", "label": "Dedication"},
    ],
    "skills": [
        "Python",
        "Flask",
        "MongoDB",
        "HTML5",
        "CSS3",
        "JavaScript",
        "Git & GitHub",
        "REST APIs",
    ],
    "projects": [
        {
            "title": "Smart Portfolio",
            "description": "A modern personal portfolio with Python backend and MongoDB integration.",
            "link": "#",
        },
        {
            "title": "Task Tracker",
            "description": "Task management web app with login, dashboards, and status workflow.",
            "link": "#",
        },
        {
            "title": "Shop Analytics",
            "description": "Analytics dashboard for e-commerce insights with charts and reporting.",
            "link": "#",
        },
    ],
}


def get_collection():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client[DB_NAME]
    return client, db[COLLECTION_NAME]


def get_profile():
    try:
        client, collection = get_collection()
        profile = collection.find_one({"slug": DEFAULT_PROFILE["slug"]})

        if not profile:
            collection.insert_one(DEFAULT_PROFILE.copy())
            profile = collection.find_one({"slug": DEFAULT_PROFILE["slug"]})

        client.close()
        return profile or DEFAULT_PROFILE
    except PyMongoError:
        return DEFAULT_PROFILE


def save_profile(form_data):
    skills = [item.strip() for item in form_data.get("skills", "").split(",") if item.strip()]

    stats = []
    for line in form_data.get("stats", "").splitlines():
        parts = [part.strip() for part in line.split("|")]
        if len(parts) >= 2 and parts[0] and parts[1]:
            stats.append({"value": parts[0], "label": parts[1]})

    projects = []
    for line in form_data.get("projects", "").splitlines():
        parts = [part.strip() for part in line.split("|")]
        if len(parts) >= 3 and parts[0] and parts[1]:
            projects.append({"title": parts[0], "description": parts[1], "link": parts[2] or "#"})

    payload = {
        "slug": DEFAULT_PROFILE["slug"],
        "name": form_data.get("name", DEFAULT_PROFILE["name"]).strip() or DEFAULT_PROFILE["name"],
        "headline": form_data.get("headline", DEFAULT_PROFILE["headline"]).strip() or DEFAULT_PROFILE["headline"],
        "email": form_data.get("email", DEFAULT_PROFILE["email"]).strip() or DEFAULT_PROFILE["email"],
        "phone": form_data.get("phone", DEFAULT_PROFILE["phone"]).strip() or DEFAULT_PROFILE["phone"],
        "about": form_data.get("about", DEFAULT_PROFILE["about"]).strip() or DEFAULT_PROFILE["about"],
        "profile_image": form_data.get("profile_image", DEFAULT_PROFILE["profile_image"]).strip() or DEFAULT_PROFILE["profile_image"],
        "skills": skills or DEFAULT_PROFILE["skills"],
        "stats": stats or DEFAULT_PROFILE["stats"],
        "projects": projects or DEFAULT_PROFILE["projects"],
    }

    upload = request.files.get("profile_image_file")
    remove_image = form_data.get("remove_profile_image") == "on"

    if upload and upload.filename:
        file_bytes = upload.read()
        if len(file_bytes) > MAX_IMAGE_SIZE:
            raise ValueError("Image too large. Max 3MB.")
        content_type = upload.content_type or "image/jpeg"
        if not content_type.startswith("image/"):
            raise ValueError("Only image files are allowed.")
        payload["profile_image_data"] = f"data:{content_type};base64,{base64.b64encode(file_bytes).decode('utf-8')}"
    elif remove_image:
        payload["profile_image_data"] = ""

    client, collection = get_collection()
    collection.update_one(
        {"slug": DEFAULT_PROFILE["slug"]},
        {"$set": payload},
        upsert=True,
    )
    client.close()


def send_contact_email(name, email, subject, message):
    if not (SMTP_HOST and SMTP_USER and SMTP_PASS and MAIL_FROM and MAIL_TO):
        raise ValueError("SMTP is not configured.")

    msg = EmailMessage()
    msg["Subject"] = f"[Portfolio] {subject}"
    msg["From"] = MAIL_FROM
    msg["To"] = MAIL_TO
    msg["Reply-To"] = email
    msg.set_content(
        f"New message from portfolio contact form\n\n"
        f"Name: {name}\n"
        f"Email: {email}\n"
        f"Subject: {subject}\n\n"
        f"Message:\n{message}\n"
    )

    if SMTP_PORT == 465:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=12) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
    else:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=12) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)


@app.route("/")
def home():
    profile = get_profile()
    return render_template(
        "index.html",
        profile=profile,
        client_url=CLIENT_URL,
    )


@app.route("/contact/send", methods=["POST"])
def contact_send():
    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip()
    subject = request.form.get("subject", "").strip() or "Project inquiry"
    message = request.form.get("message", "").strip()

    if not name or not email or not message:
        flash("Please fill Name, Email and Message.", "err")
        return redirect(url_for("home") + "#contact")

    flash("Message submitted successfully.", "ok")
    return redirect(url_for("home") + "#contact")


@app.route("/admin", methods=["GET", "POST"])
def admin():
    if request.method == "POST":
        try:
            save_profile(request.form)
            return redirect(url_for("admin", saved="1"))
        except (PyMongoError, ValueError):
            return redirect(url_for("admin", saved="0"))

    profile = get_profile()
    stats_text = "\n".join([f"{s.get('value', '')} | {s.get('label', '')}" for s in profile.get("stats", [])])
    projects_text = "\n".join(
        [
            f"{p.get('title', '')} | {p.get('description', '')} | {p.get('link', '#')}"
            for p in profile.get("projects", [])
        ]
    )
    skills_text = ", ".join(profile.get("skills", []))

    return render_template(
        "admin.html",
        profile=profile,
        skills_text=skills_text,
        stats_text=stats_text,
        projects_text=projects_text,
        saved=request.args.get("saved"),
        client_url=CLIENT_URL,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
