from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from bson import ObjectId
from dotenv import load_dotenv, find_dotenv
from datetime import datetime, timezone
import os
import base64
import smtplib
from email.message import EmailMessage

load_dotenv(find_dotenv())

app = Flask(__name__)

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*")
CORS(app, resources={r"/api/*": {"origins": FRONTEND_ORIGIN if FRONTEND_ORIGIN != "*" else "*"}})

MONGO_URI = os.getenv("MONGO_URI", "")
DB_NAME = os.getenv("MONGO_DB", "Portfolio")
COLLECTION_NAME = os.getenv("MONGO_COLLECTION", "profiles")
MESSAGE_COLLECTION_NAME = os.getenv("MONGO_MESSAGE_COLLECTION", "messages")
PORT = int(os.getenv("PORT", "10000"))
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
    "profile_image": "",
    "profile_image_data": "",
    "stats": [
        {"value": "2+", "label": "Years Learning"},
        {"value": "15+", "label": "Projects Built"},
        {"value": "100%", "label": "Dedication"},
    ],
    "skills": ["Python", "Flask", "MongoDB", "HTML", "CSS", "JavaScript"],
    "projects": [
        {"title": "Smart Portfolio", "description": "Modern portfolio with Python + MongoDB.", "link": "#"},
        {"title": "Task Tracker", "description": "Task management web app.", "link": "#"},
        {"title": "Shop Analytics", "description": "E-commerce analytics dashboard.", "link": "#"},
    ],
}


_mongo_client = None
_db = None


def get_db():
    global _mongo_client, _db
    if _db is not None:
        return _db
    _mongo_client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=3000,
        connectTimeoutMS=3000,
        socketTimeoutMS=8000,
        maxPoolSize=20,
        retryWrites=True,
    )
    _db = _mongo_client[DB_NAME]
    return _db


def get_collection():
    return get_db()[COLLECTION_NAME]


def get_messages_collection():
    return get_db()[MESSAGE_COLLECTION_NAME]


def get_profile():
    try:
        collection = get_collection()
        profile = collection.find_one({"slug": DEFAULT_PROFILE["slug"]})
        if not profile:
            collection.insert_one(DEFAULT_PROFILE.copy())
            profile = collection.find_one({"slug": DEFAULT_PROFILE["slug"]})
        return profile or DEFAULT_PROFILE
    except PyMongoError:
        return DEFAULT_PROFILE


def profile_public(profile):
    return {
        "name": profile.get("name", DEFAULT_PROFILE["name"]),
        "headline": profile.get("headline", DEFAULT_PROFILE["headline"]),
        "email": profile.get("email", DEFAULT_PROFILE["email"]),
        "about": profile.get("about", DEFAULT_PROFILE["about"]),
        "profile_image": profile.get("profile_image", ""),
        "profile_image_data": profile.get("profile_image_data", ""),
        "stats": profile.get("stats", DEFAULT_PROFILE["stats"]),
        "skills": profile.get("skills", DEFAULT_PROFILE["skills"]),
        "projects": profile.get("projects", DEFAULT_PROFILE["projects"]),
    }


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
        "profile_image": form_data.get("profile_image", "").strip(),
        "skills": skills or DEFAULT_PROFILE["skills"],
        "stats": stats or DEFAULT_PROFILE["stats"],
        "projects": projects or DEFAULT_PROFILE["projects"],
    }

    upload = request.files.get("profile_image_file")
    remove_image = form_data.get("remove_profile_image") == "on"

    if upload and upload.filename:
        file_bytes = upload.read()
        if len(file_bytes) > MAX_IMAGE_SIZE:
            raise ValueError("Image too large. Max 3MB")
        content_type = upload.content_type or "image/jpeg"
        if not content_type.startswith("image/"):
            raise ValueError("Only image files are allowed")
        payload["profile_image_data"] = f"data:{content_type};base64,{base64.b64encode(file_bytes).decode('utf-8')}"
    elif remove_image:
        payload["profile_image_data"] = ""

    collection = get_collection()
    collection.update_one({"slug": DEFAULT_PROFILE["slug"]}, {"$set": payload}, upsert=True)


def save_contact_message(name, email, subject, message):
    payload = {
        "name": name,
        "email": email,
        "subject": subject,
        "message": message,
        "created_at": datetime.now(timezone.utc),
    }
    get_messages_collection().insert_one(payload)


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


def list_recent_messages(limit=20):
    docs = list(get_messages_collection().find().sort("created_at", -1).limit(limit))
    for item in docs:
        created = item.get("created_at")
        if created:
            item["created_at_str"] = created.astimezone().strftime("%d %b %Y, %I:%M %p")
        else:
            item["created_at_str"] = "-"
    return docs


def delete_message(message_id):
    get_messages_collection().delete_one({"_id": ObjectId(message_id)})


@app.get("/")
def root():
    return jsonify({"service": "portfolio-backend", "ok": True})


@app.get("/api/profile")
def api_profile():
    return jsonify(profile_public(get_profile()))


@app.post("/api/contact")
def api_contact():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    subject = (data.get("subject") or "Project inquiry").strip()
    message = (data.get("message") or "").strip()

    if not name or not email or not message:
        return jsonify({"ok": False, "error": "Please fill name, email and message"}), 400

    try:
        save_contact_message(name, email, subject, message)
    except Exception:
        return jsonify({"ok": False, "error": "Message could not be saved to database"}), 500

    try:
        send_contact_email(name, email, subject, message)
    except Exception as e:
        print(f"SMTP Error: {e}")
        return jsonify({"ok": False, "error": f"Message saved, but email sending failed: {str(e)}"}), 500

    return jsonify({"ok": True})


@app.route("/admin", methods=["GET", "POST"])
def admin():
    if request.method == "POST":
        try:
            save_profile(request.form)
            return redirect(url_for("admin", saved="1"))
        except Exception:
            return redirect(url_for("admin", saved="0"))

    profile = get_profile()
    stats_text = "\n".join([f"{s.get('value','')} | {s.get('label','')}" for s in profile.get("stats", [])])
    projects_text = "\n".join([f"{p.get('title','')} | {p.get('description','')} | {p.get('link','#')}" for p in profile.get("projects", [])])
    skills_text = ", ".join(profile.get("skills", []))
    recent_messages = list_recent_messages()
    return render_template(
        "admin.html",
        profile=profile,
        skills_text=skills_text,
        stats_text=stats_text,
        projects_text=projects_text,
        recent_messages=recent_messages,
        saved=request.args.get("saved"),
    )


@app.post("/admin/messages/delete/<message_id>")
def admin_delete_message(message_id):
    try:
        delete_message(message_id)
    except Exception:
        pass
    return redirect(url_for("admin"))


@app.errorhandler(404)
def not_found(error):
    if request.path.startswith("/api/"):
        return jsonify({"ok": False, "error": "Not found"}), 404
    return render_template("404.html"), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
