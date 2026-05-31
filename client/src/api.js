const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const normalizedApiBase = String(rawApiUrl).replace(/\/+$/, "");
const API_URL = /\/api$/i.test(normalizedApiBase) ? normalizedApiBase : `${normalizedApiBase}/api`;
const ADMIN_TOKEN_KEY = "portfolio_admin_token";

export const getAdminToken = () => "";
export const setAdminToken = () => {};
export const clearAdminToken = () => localStorage.removeItem(ADMIN_TOKEN_KEY);

export async function api(path, options = {}) {
  const startedAt = Date.now();
  const requestUrl = `${API_URL}${path}`;
  const { timeoutMs: timeoutRaw, ...fetchOptions } = options || {};
  const timeoutMs = Number(timeoutRaw || 12000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(requestUrl, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(fetchOptions.headers || {}) },
      signal: controller.signal,
      ...fetchOptions
    });
  } catch {
    const took = Date.now() - startedAt;
    throw new Error(`Cannot connect to API server (${API_URL}). url=${requestUrl} took=${took}ms`);
  } finally {
    clearTimeout(timeoutId);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const extra = data?.detail ? ` (${data.detail})` : "";
    const took = Date.now() - startedAt;
    const err = new Error((data.error || "Request failed") + extra + ` [status=${res.status} url=${requestUrl} took=${took}ms]`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export { API_URL };
