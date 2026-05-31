const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const ADMIN_TOKEN_KEY = "portfolio_admin_token";

export const getAdminToken = () => "";
export const setAdminToken = () => {};
export const clearAdminToken = () => localStorage.removeItem(ADMIN_TOKEN_KEY);

export async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
  } catch {
    throw new Error("Cannot connect to server. Please ensure backend is running on port 5000.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

export { API_URL };
