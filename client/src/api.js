const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const normalizedApiBase = String(rawApiUrl).replace(/\/+$/, "");
const API_URL = /\/api$/i.test(normalizedApiBase) ? normalizedApiBase : `${normalizedApiBase}/api`;
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
    throw new Error(`Cannot connect to API server (${API_URL}). Please check deployment and API URL.`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const extra = data?.detail ? ` (${data.detail})` : "";
    const err = new Error((data.error || "Request failed") + extra);
    err.status = res.status;
    throw err;
  }
  return data;
}

export { API_URL };
