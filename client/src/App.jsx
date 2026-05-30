import { NavLink, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "./api";

function Home() {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api("/profile")
      .then(setProfile)
      .catch((e) => setStatus(e.message));
  }, []);

  const submitContact = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      subject: form.get("subject"),
      message: form.get("message")
    };
    try {
      await api("/contact", { method: "POST", body: JSON.stringify(payload) });
      setStatus("Message sent and saved.");
      e.currentTarget.reset();
    } catch (err) {
      setStatus(err.message);
    }
  };

  if (!profile) return <p className="loading">{status || "Loading portfolio..."}</p>;

  return (
    <div className="page">
      <header className="topbar">
        <h1>{profile.name}</h1>
        <NavLink to="/admin">Admin</NavLink>
      </header>

      <section className="card">
        <h2>{profile.headline}</h2>
        <p>{profile.about}</p>
      </section>

      <section className="card">
        <h3>Skills</h3>
        <div className="chips">{profile.skills?.map((s) => <span key={s}>{s}</span>)}</div>
      </section>

      <section className="card">
        <h3>Projects</h3>
        <div className="projects">
          {profile.projects?.map((p, i) => (
            <article key={`${p.title}-${i}`}>
              <h4>{p.title}</h4>
              <p>{p.description}</p>
              <a href={p.link} target="_blank" rel="noreferrer">
                Live Demo
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>Let's work together</h3>
        <form onSubmit={submitContact} className="form">
          <input name="name" placeholder="Your name" required />
          <input name="email" type="email" placeholder="you@example.com" required />
          <input name="subject" placeholder="Project inquiry" />
          <textarea name="message" rows={5} placeholder="Tell me about your project..." required />
          <button type="submit">Send Message</button>
        </form>
        {status && <p className="status">{status}</p>}
      </section>
    </div>
  );
}

function Admin() {
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("");

  const load = async () => {
    try {
      const [p, m] = await Promise.all([api("/profile"), api("/admin/messages")]);
      setProfile(p);
      setMessages(m.messages || []);
    } catch (e) {
      setStatus(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
    <div className="page">
      <header className="topbar">
        <h1>Admin Panel</h1>
        <NavLink to="/">Back</NavLink>
      </header>

      <section className="card">
        <h3>Edit Profile</h3>
        <form className="form" onSubmit={saveProfile}>
          <input name="name" defaultValue={profile.name} required />
          <input name="headline" defaultValue={profile.headline} required />
          <input name="email" type="email" defaultValue={profile.email} required />
          <textarea name="about" rows={4} defaultValue={profile.about} required />
          <input name="skills" defaultValue={(profile.skills || []).join(", ")} />
          <button type="submit">Save</button>
        </form>
        {status && <p className="status">{status}</p>}
      </section>

      <section className="card">
        <h3>Messages</h3>
        <div className="messages">
          {messages.map((m) => (
            <article key={m._id}>
              <button className="icon-btn" onClick={() => deleteMessage(m._id)} aria-label="Delete">
                🗑
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
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}
