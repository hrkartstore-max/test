const API_URL = "";

export async function api(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("hepra_token") : null;
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const r = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });

  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || `Request failed (${r.status})`);
  return d;
}
