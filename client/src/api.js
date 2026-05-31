const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || "";

export async function api(path, options = {}) {
  const authHeaders = path.startsWith("/admin") && ADMIN_API_KEY ? { "x-admin-key": ADMIN_API_KEY } : {};
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...authHeaders, ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export { API_URL };
