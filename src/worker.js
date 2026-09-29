// Serves /api/* only; every other path is handled by static assets (see wrangler.jsonc).

const LIMITS = { name: 256, email: 256, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRODUCTION_HOSTS = ["unizzagames.com", "www.unizzagames.com"];

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function invalid(field) {
  return json(400, { error: "invalid", field });
}

// Returns the first failing field name, or null when the payload is valid.
function firstInvalidField(data) {
  for (const field of ["name", "email", "message"]) {
    const value = data[field];
    if (typeof value !== "string") return field;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > LIMITS[field]) return field;
  }
  // name and email end up in mail headers: refuse CR/LF outright.
  if (/[\r\n]/.test(data.name)) return "name";
  if (/[\r\n]/.test(data.email) || !EMAIL_RE.test(data.email.trim())) return "email";
  return null;
}

async function verifyTurnstile(token, ip, env) {
  if (typeof token !== "string" || !token) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const outcome = await res.json();
  if (!outcome.success) return false;
  const allowed = (env.ALLOWED_HOSTNAMES || "").split(",").map((h) => h.trim()).filter(Boolean);
  return allowed.length === 0 || allowed.includes(outcome.hostname);
}

async function sendMail(data, env, host) {
  const text = [
    `Name: ${data.name.trim()}`,
    `Email: ${data.email.trim()}`,
    "",
    data.message.trim(),
  ].join("\n");
  const message = {
    from: env.CONTACT_FROM,
    to: [env.CONTACT_TO],
    reply_to: data.email.trim(),
    subject: `官網詢問：${data.name.trim()}`,
    text,
  };

  // DRY_RUN is for local development only and is never honoured on production hosts.
  if (env.DRY_RUN === "1" && !PRODUCTION_HOSTS.includes(host)) {
    console.log("DRY_RUN email", JSON.stringify(message));
    return true;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
  return res.ok;
}

async function handleContact(request, env) {
  let data;
  try {
    data = await request.json();
  } catch {
    return invalid(null);
  }
  if (!data || typeof data !== "object") return invalid(null);

  const field = firstInvalidField(data);
  if (field) return invalid(field);

  const ip = request.headers.get("CF-Connecting-IP");
  if (!(await verifyTurnstile(data.turnstileToken, ip, env))) {
    return json(403, { error: "verification_failed" });
  }

  const host = new URL(request.url).hostname;
  if (!(await sendMail(data, env, host))) return json(502, { error: "send_failed" });
  return json(200, { ok: true });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/contact") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
      }
      return handleContact(request, env);
    }
    return json(404, { error: "not_found" });
  },
};
