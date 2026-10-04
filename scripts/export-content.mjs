// Builds content/site-content.csv from the data-cms* markers in public/*.html.
// The CSV holds the text currently in the HTML; import it into the Google Sheet to start editing.
// Usage: node scripts/export-content.mjs
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const PAGES = ["index.html", "portfolios.html", "about.html", "contact.html", "404.html"]; // index first: shared keys (nav, footer) take its defaults
const ATTRS = { href: "href", src: "src", content: "content", value: "value", placeholder: "placeholder", alt: "alt", group: "data-group" };

const NOTES = {
  label: "按鈕或連結文字（留空＝隱藏）",
  link: "連結網址：https://…、mailto:…、/contact 或 #",
  icon: "圖示網址：https://… 或 /assets/…",
  image: "圖片網址：https://… 或 /assets/…",
  tab: "分頁名稱（留空＝隱藏整個作品）",
  alt: "圖片說明（給看不到圖片的人；純裝飾圖可留空）",
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
  if (key.startsWith("contact.form.") && last === "label") return "表單欄位名稱（請勿留空）";
  if (/^portfolio\.\d+\.tab$/.test(key)) return "作品短名稱；填了才會顯示這個作品（留空＝隱藏）";
  if (/^portfolio\.\d+\.group$/.test(key)) return "分組編號：1 Licensing、2 Localization、3 Distribution、4 Video Game Adaptation、5 Companion Apps & Demos";
  if (/^portfolios\.group\.\d\.title$/.test(key)) return "分組標題（留空＝隱藏整組與其中的作品）";
  if (/^portfolio\.\d+\.category$/.test(key)) return "分類標籤，例如 Localization（留空＝不顯示）";
  if (/^portfolio\.\d+\.link\.label$/.test(key)) return "作品連結文字，例如 View on BoardGameGeek（留空＝不顯示）";
  if (/^about\.team\.\d\.name$/.test(key)) return "成員姓名；填了才會顯示這位成員（第 1 位有填才顯示整個團隊區塊）";
  if (/^about\.team\.\d\.photo$/.test(key)) return "成員照片網址：https://… 或 /assets/…";
  if (/^contact\.topic\.\d\.title$/.test(key)) return "聯絡頁分類標題（留空＝隱藏這一段）";
  if (/\.image$/.test(key) && key.startsWith("contact.hero")) return "聯絡頁橫幅照片網址（留空＝使用紅色圖樣）";
  if (key === "site.logo") return "Logo 圖片網址（留空＝只顯示文字品牌名）";
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
    const multi = /\bdata-cms-attr="([^"]+)"/.exec(attrs);
    if (multi) {
      for (const pair of multi[1].split(";")) {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (!attr || !key || rows.has(key)) continue;
        const val = new RegExp(`(?:^|\\s)${attr}="([^"]*)"`).exec(attrs);
        rows.set(key, decode(val ? val[1] : ""));
      }
    }
    for (const [suffix, attr] of Object.entries(ATTRS)) {
      const key = new RegExp(`\\bdata-cms-${suffix}="([^"]+)"`).exec(attrs);
      if (!key || rows.has(key[1])) continue;
      const val = new RegExp(`(?:^|\\s)${attr}="([^"]*)"`).exec(attrs);
      rows.set(key[1], decode(val ? val[1] : ""));
    }
  }
}

// Keys used only as show/hide switches (data-cms-show / data-cms-reveal) have no text on the page;
// take their starting value from pages/defaults.json so editors still get a row for them.
const defaultsPath = path.join(root, "pages", "defaults.json");
const defaults = fs.existsSync(defaultsPath) ? JSON.parse(fs.readFileSync(defaultsPath, "utf8")) : {};
for (const page of PAGES) {
  const html = fs.readFileSync(path.join(root, "public", page), "utf8");
  for (const [, key] of html.matchAll(/\bdata-cms-(?:show|reveal)="([^"]+)"/g)) {
    if (!rows.has(key)) rows.set(key, defaults[key] ?? "");
  }
}

const csvCell = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
// value_zh: the built-in Traditional Chinese text (pages/defaults.zh.json); empty = English is used.
const zhPath = path.join(root, "pages", "defaults.zh.json");
const zh = fs.existsSync(zhPath) ? JSON.parse(fs.readFileSync(zhPath, "utf8")) : {};
const lines = ["key,value,value_zh,note", ...[...rows].map(([k, v]) => [k, v, zh[k] ?? "", note(k)].map(csvCell).join(","))];
fs.mkdirSync(path.join(root, "content"), { recursive: true });
fs.writeFileSync(path.join(root, "content", "site-content.csv"), "﻿" + lines.join("\n") + "\n");
console.log(`wrote ${rows.size} keys to content/site-content.csv`);
