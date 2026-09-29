// Builds content/site-content.csv from the data-cms* markers in public/*.html.
// The CSV holds the text currently in the HTML; import it into the Google Sheet to start editing.
// Usage: node scripts/export-content.mjs
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const PAGES = ["index.html", "contact.html"]; // index first: shared keys (nav, footer) take its defaults
const ATTRS = { href: "href", src: "src", content: "content", value: "value", placeholder: "placeholder" };

const NOTES = {
  label: "按鈕或連結文字（留空＝隱藏）",
  link: "連結網址：https://…、mailto:…、/contact 或 #",
  icon: "圖示網址：https://… 或 /assets/…",
  image: "圖片網址：https://… 或 /assets/…",
  tab: "分頁名稱（留空＝隱藏整個作品）",
};

function decode(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");
}

function textOf(inner) {
  return decode(inner.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/‍/g, ""))
    .split("\n").map((l) => l.trim()).join("\n").trim();
}

function note(key) {
  const last = key.split(".").pop();
  if (NOTES[last]) return NOTES[last];
  if (key.endsWith(".title") && /^(services|featured)\.\d/.test(key)) return "標題（留空＝隱藏這一格）";
  if (key.startsWith("footer.") && key.endsWith(".label")) return "連結文字（留空＝隱藏）";
  return "";
}

const rows = new Map();
for (const page of PAGES) {
  const html = fs.readFileSync(path.join(root, "public", page), "utf8");
  const tagRe = /<([a-z0-9]+)\b([^>]*\bdata-cms[^>]*)>/gi;
  let m;
  while ((m = tagRe.exec(html))) {
    const [open, tag, attrs] = m;
    const text = /\bdata-cms="([^"]+)"/.exec(attrs);
    if (text && !rows.has(text[1])) {
      const start = m.index + open.length;
      const end = html.indexOf(`</${tag}>`, start);
      rows.set(text[1], textOf(html.slice(start, end)));
    }
    for (const [suffix, attr] of Object.entries(ATTRS)) {
      const key = new RegExp(`\\bdata-cms-${suffix}="([^"]+)"`).exec(attrs);
      if (!key || rows.has(key[1])) continue;
      const val = new RegExp(`(?:^|\\s)${attr}="([^"]*)"`).exec(attrs);
      rows.set(key[1], decode(val ? val[1] : ""));
    }
  }
}

const csvCell = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const lines = ["key,value,note", ...[...rows].map(([k, v]) => [k, v, note(k)].map(csvCell).join(","))];
fs.mkdirSync(path.join(root, "content"), { recursive: true });
fs.writeFileSync(path.join(root, "content", "site-content.csv"), "﻿" + lines.join("\n") + "\n");
console.log(`wrote ${rows.size} keys to content/site-content.csv`);
