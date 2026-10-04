// Google Sheets content: fetch the sheet's published CSV, cache it, and apply it to HTML pages.
//
// Markers in public/*.html:
//   data-cms="key"              element text (newlines become <br>)
//   data-cms-href="key"         href   (https:, http:, mailto:, tel:, /path, #anchor)
//   data-cms-src="key"          src    (https: or /path); srcset/sizes are dropped when replaced
//   data-cms-content="key"      content attribute (meta tags)
//   data-cms-value="key"        value attribute (submit button)
//   data-cms-placeholder="key"  placeholder attribute
//   data-cms-alt="key"          image alt text (empty = decorative)
//   data-cms-group="key"        data-group attribute (portfolio grouping, applied by portfolios.js)
//   data-cms-attr="a:key;b:key" other text attributes (aria-label, data-*); never on*/href/src/style
//   data-lang-switch            link to the same page in the other language
// Pages under /zh get Chinese values (see resolveContent), lang="zh-Hant-TW" and /zh-prefixed links.
//   data-cms-show="key"         element is removed when the key exists in the sheet with an empty value
//   data-cms-reveal="key"       element starts hidden; the hidden attribute is dropped once the key has a value
// Keys missing from the sheet leave the HTML default in place.

import ZH_DEFAULTS from "../pages/defaults.zh.json";

const FRESH_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3000;
const RETRY_AFTER_FAILURE_MS = 60 * 1000; // keep pages fast while the sheet is unreachable
const CACHE_KEY = "https://cms.unizza.internal/site-content";

// Per-isolate copy; the Cache API below survives isolate restarts on custom domains.
let memo = null; // { url: string, content: Map, fetchedAt: number }
let lastFailure = null; // { url: string, at: number }

// RFC 4180 CSV: quoted fields may contain commas, quotes ("") and newlines.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Sheet layout: header row with "key" and "value" columns, plus an optional "value_zh" (or "zh")
// column for Traditional Chinese; any other columns are ignored.
// Returns Map<key, { value, zh }>.
export function toContent(csv) {
  const rows = parseCsv(csv.replace(/^﻿/, ""));
  const header = (rows.shift() || []).map((h) => h.trim().toLowerCase());
  const keyCol = header.indexOf("key");
  const valueCol = header.indexOf("value");
  const zhCol = header.indexOf("value_zh") >= 0 ? header.indexOf("value_zh") : header.indexOf("zh");
  if (keyCol < 0 || valueCol < 0) throw new Error("sheet needs 'key' and 'value' header columns");
  const clean = (v) => (v || "").replace(/\r\n?/g, "\n").trim();
  const content = new Map();
  for (const row of rows) {
    const key = (row[keyCol] || "").trim();
    if (!key || key.startsWith("#")) continue;
    content.set(key, { value: clean(row[valueCol]), zh: zhCol >= 0 ? clean(row[zhCol]) : "" });
  }
  return content;
}

// The values one language should show, as Map<key, string>. Keys left out keep the HTML default.
// English: the sheet's "value" column. Chinese, per key: value_zh, else empty when the English value
// was cleared (hidden stays hidden), else the built-in translation, else the English value
// (links, images and names need no translation).
export function resolveContent(sheet, lang) {
  const out = new Map();
  if (lang !== "zh") {
    if (sheet) for (const [key, row] of sheet) out.set(key, row.value);
    return out;
  }
  for (const [key, value] of Object.entries(ZH_DEFAULTS)) out.set(key, value);
  if (sheet) {
    for (const [key, row] of sheet) {
      if (row.zh !== "") out.set(key, row.zh);
      else if (row.value === "") out.set(key, "");
      else if (!(key in ZH_DEFAULTS)) out.set(key, row.value);
    }
  }
  return out;
}

async function fetchSheet(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: "follow" });
  if (!res.ok) throw new Error(`sheet fetch ${res.status}`);
  const csv = await res.text();
  // A sheet that is not published returns Google's HTML sign-in page instead of CSV.
  if (/^\s*</.test(csv)) throw new Error("sheet returned HTML, not CSV (is it published to the web?)");
  return csv;
}

// Returns the newest content we can get, or null (pages then show their HTML defaults).
export async function loadContent(env, ctx) {
  const url = env.SHEET_CSV_URL;
  if (!url) return null;
  const now = Date.now();
  if (memo && memo.url === url && now - memo.fetchedAt < FRESH_MS) return memo.content;

  const cache = caches.default;
  const cacheKey = `${CACHE_KEY}?src=${encodeURIComponent(url)}`; // a new sheet URL never reuses the old copy
  const cached = await cache.match(cacheKey);
  if (cached) {
    const fetchedAt = Number(cached.headers.get("x-fetched-at")) || 0;
    if (now - fetchedAt < FRESH_MS) {
      memo = { url, content: toContent(await cached.text()), fetchedAt };
      return memo.content;
    }
  }

  const stale = () => (memo && memo.url === url ? memo.content : null);
  if (lastFailure && lastFailure.url === url && now - lastFailure.at < RETRY_AFTER_FAILURE_MS) {
    return stale() || (cached ? toContent(await cached.text()) : null);
  }

  try {
    const csv = await fetchSheet(url);
    const content = toContent(csv); // validate before caching
    memo = { url, content, fetchedAt: now };
    lastFailure = null;
    const stored = new Response(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "max-age=604800", "x-fetched-at": String(now) },
    });
    ctx.waitUntil(cache.put(cacheKey, stored));
    return content;
  } catch (err) {
    console.error("CMS: using stale content:", err.message);
    lastFailure = { url, at: now };
    if (stale()) return stale();
    if (cached) return toContent(await cached.text());
    return null;
  }
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeLink(v) {
  if (v === "" || v.startsWith("#")) return v || "#";
  if (/^\/(?!\/)/.test(v)) return v;
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  return null;
}

function safeImage(v) {
  if (/^\/(?!\/)/.test(v) || /^https:\/\//i.test(v)) return v;
  return null;
}

function attrHandler(content, marker, attr, sanitize = (v) => v) {
  return {
    element(el) {
      const key = el.getAttribute(marker);
      if (!content.has(key)) return;
      const value = sanitize(content.get(key));
      if (value === null) {
        console.warn(`CMS: rejected ${attr} for ${key}`);
        return;
      }
      el.setAttribute(attr, value);
      if (attr === "src") {
        el.removeAttribute("srcset");
        el.removeAttribute("sizes");
      }
    },
  };
}

// Paths that exist in both languages: everything except files and the API.
const isPagePath = (href) => /^\/(?!\/)/.test(href) && !/^\/(assets|api)(\/|$)/.test(href);
const toZhPath = (path) => (path === "/" ? "/zh" : `/zh${path}`);

// page: { lang: "en" | "zh", path: "/about" (path without the /zh prefix), origin: "https://…" }
export function applyContent(response, content, page = { lang: "en", path: "/", origin: "" }) {
  const zh = page.lang === "zh";
  const enUrl = `${page.origin}${page.path}`;
  const zhUrl = `${page.origin}${toZhPath(page.path)}`;
  return new HTMLRewriter()
    .on("html", {
      element(el) {
        el.setAttribute("lang", zh ? "zh-Hant-TW" : "en");
      },
    })
    .on("head", {
      element(el) {
        el.append(
          `<link rel="alternate" hreflang="en" href="${escapeHtml(enUrl)}">` +
            `<link rel="alternate" hreflang="zh-Hant" href="${escapeHtml(zhUrl)}">` +
            `<link rel="alternate" hreflang="x-default" href="${escapeHtml(enUrl)}">`,
          { html: true },
        );
      },
    })
    .on("[data-cms-show]", {
      element(el) {
        const key = el.getAttribute("data-cms-show");
        if (content.has(key) && content.get(key) === "") el.remove();
      },
    })
    .on("[data-cms-reveal]", {
      element(el) {
        const key = el.getAttribute("data-cms-reveal");
        if (!content.has(key) || content.get(key) === "") return;
        // An image revealed by its own src key stays hidden when that value is not a usable image URL,
        // otherwise a broken-image icon would appear (e.g. text typed into site.logo).
        if (el.getAttribute("data-cms-src") === key && safeImage(content.get(key)) === null) return;
        el.removeAttribute("hidden");
      },
    })
    .on("[data-cms]", {
      element(el) {
        const key = el.getAttribute("data-cms");
        if (!content.has(key)) return;
        el.setInnerContent(escapeHtml(content.get(key)).replace(/\n/g, "<br>"), { html: true });
      },
    })
    .on("[data-cms-href]", attrHandler(content, "data-cms-href", "href", safeLink))
    .on("[data-cms-src]", attrHandler(content, "data-cms-src", "src", safeImage))
    .on("[data-cms-content]", attrHandler(content, "data-cms-content", "content"))
    .on("[data-cms-value]", attrHandler(content, "data-cms-value", "value"))
    .on("[data-cms-placeholder]", attrHandler(content, "data-cms-placeholder", "placeholder"))
    .on("[data-cms-alt]", attrHandler(content, "data-cms-alt", "alt"))
    .on("[data-cms-group]", attrHandler(content, "data-cms-group", "data-group", (v) => v.trim()))
    .on("[data-cms-attr]", {
      // data-cms-attr="aria-label:ui.menu;data-wait:ui.form.wait" sets arbitrary text attributes.
      element(el) {
        for (const pair of el.getAttribute("data-cms-attr").split(";")) {
          const [attr, key] = pair.split(":").map((s) => s.trim());
          if (attr && key && content.has(key) && !/^(on|href$|src$|style$)/i.test(attr)) el.setAttribute(attr, content.get(key));
        }
      },
    })
    .on("[data-lang-switch]", {
      element(el) {
        el.setAttribute("href", zh ? page.path : toZhPath(page.path));
        el.setAttribute("hreflang", zh ? "en" : "zh-Hant");
        el.setAttribute("lang", zh ? "en" : "zh-Hant");
      },
    })
    .on("a[href]", {
      // Registered last so it sees hrefs already replaced from the sheet.
      element(el) {
        if (!zh || el.hasAttribute("data-lang-switch")) return;
        const href = el.getAttribute("href");
        if (isPagePath(href) && !/^\/zh(\/|$)/.test(href)) el.setAttribute("href", toZhPath(href));
      },
    })
    .transform(response);
}
