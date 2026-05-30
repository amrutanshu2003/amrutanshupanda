import { NavLink, Route, Routes } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { api } from "./api";

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

function HeroScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.35, 6.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const geometry = new THREE.IcosahedronGeometry(1.7, 2);
    const material = new THREE.MeshStandardMaterial({
      color: "#59d6b4",
      roughness: 0.28,
      metalness: 0.42,
      emissive: "#0d2b24",
      emissiveIntensity: 0.28
    });
    const core = new THREE.Mesh(geometry, material);
    group.add(core);

    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.82, 1),
      new THREE.MeshBasicMaterial({ color: "#fff0c2", wireframe: true, transparent: true, opacity: 0.28 })
    );
    group.add(wire);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: "#ff7a59",
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide
    });
    const ringOne = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.012, 12, 110), ringMaterial);
    const ringTwo = ringOne.clone();
    ringOne.rotation.x = Math.PI / 2.6;
    ringTwo.rotation.y = Math.PI / 2.5;
    group.add(ringOne, ringTwo);

    const particlePositions = Array.from({ length: 210 }, () => (Math.random() - 0.5) * 8);
    const particles = new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3)),
      new THREE.PointsMaterial({ color: "#f7c873", size: 0.025, transparent: true, opacity: 0.62 })
    );
    scene.add(particles);

    scene.add(new THREE.AmbientLight("#fff6de", 1.5));
    const keyLight = new THREE.PointLight("#d9fff3", 4.5, 18);
    keyLight.position.set(3.5, 4, 5);
    scene.add(keyLight);
    const warmLight = new THREE.PointLight("#ff8a5c", 2.8, 14);
    warmLight.position.set(-3, -2, 4);
    scene.add(warmLight);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      const nextWidth = Math.max(width, 1);
      const nextHeight = Math.max(height, 1);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight, false);
    };

    let frameId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const time = clock.getElapsedTime();
      group.rotation.y = time * 0.32;
      group.rotation.x = Math.sin(time * 0.55) * 0.16;
      wire.rotation.z = -time * 0.22;
      particles.rotation.y = -time * 0.045;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      mount.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      wire.geometry.dispose();
      wire.material.dispose();
      ringOne.geometry.dispose();
      ringMaterial.dispose();
      particles.geometry.dispose();
      particles.material.dispose();
      renderer.dispose();
    };
  }, []);

  return <div className="hero-scene" ref={mountRef} aria-hidden="true" />;
}

function Home() {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api("/profile")
      .then(setProfile)
      .catch((e) => {
        setProfile(fallbackProfile);
        setStatus(`Demo content loaded. API says: ${e.message}`);
      });
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
        <a className="brand" href="#home" aria-label="Portfolio home">
          <span>{profile.name?.slice(0, 1) || "A"}</span>
          {profile.name}
        </a>
        <nav>
          <a href="#projects">Projects</a>
          <a href="#contact">Contact</a>
          <NavLink to="/admin">Admin</NavLink>
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
          <HeroScene />
          <div className="orbit-card card-top">
            <span>Stack</span>
            <strong>MERN + Python</strong>
          </div>
          <div className="orbit-card card-bottom">
            <span>Focus</span>
            <strong>Clean UX</strong>
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
            <span>Contact</span>
            <h3>Let's build something useful</h3>
          </div>
          <form onSubmit={submitContact} className="form">
            <input name="name" placeholder="Your name" required />
            <input name="email" type="email" placeholder="you@example.com" required />
            <input name="subject" placeholder="Project inquiry" />
            <textarea name="message" rows={5} placeholder="Tell me about your project..." required />
            <button type="submit">Send Message</button>
          </form>
          {status && <p className="status">{status}</p>}
        </section>
      </main>
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
    <div className="page admin-page">
      <header className="topbar">
        <a className="brand" href="/admin">
          <span>A</span>
          Admin Panel
        </a>
        <nav>
          <NavLink to="/">Back</NavLink>
        </nav>
      </header>

      <section className="panel">
        <div className="section-heading">
          <span>Profile</span>
          <h3>Edit Portfolio Content</h3>
        </div>
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
