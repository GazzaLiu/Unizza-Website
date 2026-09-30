// Sample portfolio cover art (800x600 SVG) for slots 4-12. Usage: node scripts/make-sample-covers.mjs .
import fs from "node:fs";
import path from "node:path";

const out = path.join(process.argv[2], "public", "assets", "portfolio");
fs.mkdirSync(out, { recursive: true });

const FONT = "'Barlow Condensed','Arial Narrow','Impact','Arial Black',sans-serif";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const frame = {
  // Video game: a monitor showing a hex board.
  screen: (c) => `
  <g transform="translate(400 300)">
    <rect x="-250" y="-170" width="500" height="300" rx="18" fill="#15171a"/>
    <rect x="-232" y="-152" width="464" height="264" rx="8" fill="${c.bg2}"/>
    ${hexes(c)}
    <rect x="-40" y="130" width="80" height="26" fill="#15171a"/>
    <rect x="-110" y="154" width="220" height="14" rx="7" fill="#15171a"/>
    <g transform="translate(170 72)"><rect x="-48" y="-22" width="96" height="44" rx="22" fill="${c.accent}"/><path d="M-26 0h16M-18 -8v16" stroke="#15171a" stroke-width="5" stroke-linecap="round"/><circle cx="18" cy="-5" r="5" fill="#15171a"/><circle cx="30" cy="6" r="5" fill="#15171a"/></g>
  </g>`,
  // Companion app / demo: a phone with an app UI.
  phone: (c) => `
  <g transform="translate(400 300) rotate(-6)">
    <rect x="-120" y="-230" width="240" height="440" rx="34" fill="#15171a"/>
    <rect x="-104" y="-206" width="208" height="392" rx="20" fill="${c.bg2}"/>
    <rect x="-30" y="-222" width="60" height="8" rx="4" fill="#2c2f33"/>
    ${c.demo ? `
    <circle cx="0" cy="-40" r="62" fill="${c.accent}"/><path d="M-18 -72v64l52-32z" fill="#15171a"/>
    <rect x="-70" y="54" width="140" height="40" rx="20" fill="#fff"/><text x="0" y="82" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="26" fill="#15171a">PLAY DEMO</text>
    <rect x="-70" y="110" width="140" height="14" rx="7" fill="#ffffff55"/><rect x="-70" y="110" width="92" height="14" rx="7" fill="${c.accent}"/>`
      : `
    <circle cx="0" cy="-70" r="66" fill="none" stroke="#ffffff33" stroke-width="16"/>
    <circle cx="0" cy="-70" r="66" fill="none" stroke="${c.accent}" stroke-width="16" stroke-dasharray="290 415" transform="rotate(-90 0 -70)" stroke-linecap="round"/>
    <text x="0" y="-58" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="44" fill="#fff">1:45</text>
    ${[0, 1, 2].map((r) => `<rect x="-80" y="${30 + r * 48}" width="160" height="36" rx="8" fill="#ffffff22"/><circle cx="-58" cy="${48 + r * 48}" r="9" fill="${[c.accent, "#fff", c.bg1][r]}"/><rect x="-40" y="${43 + r * 48}" width="${[90, 70, 100][r]}" height="10" rx="5" fill="#ffffffaa"/>`).join("")}`}
  </g>`,
  // Board game: a box in 3/4 view with dice.
  box: (c) => `
  <g transform="translate(400 300)">
    <path d="M-190 -120 L130 -150 L200 -100 L-120 -70 Z" fill="${c.bg2}"/>
    <path d="M-120 -70 L200 -100 L200 150 L-120 190 Z" fill="${c.accent}"/>
    <path d="M-190 -120 L-120 -70 L-120 190 L-190 140 Z" fill="${c.dark}"/>
    <text x="40" y="60" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="52" fill="${c.boxText}" transform="skewY(-5)">${esc(c.short)}</text>
    ${c.badge ? `<g transform="translate(150 150) rotate(-8)"><circle r="46" fill="#fff"/><text y="12" text-anchor="middle" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif" font-weight="700" font-size="30" fill="${c.dark}">${c.badge}</text></g>` : ""}
    <g transform="translate(-260 150) rotate(-14)"><rect x="-34" y="-34" width="68" height="68" rx="12" fill="#fff"/><circle cx="-14" cy="-14" r="7" fill="${c.dark}"/><circle cx="14" cy="14" r="7" fill="${c.dark}"/><circle r="7" fill="${c.dark}"/></g>
    <g transform="translate(270 -170) rotate(18)"><rect x="-26" y="-26" width="52" height="52" rx="10" fill="#fff"/><circle cx="-10" cy="-10" r="6" fill="${c.dark}"/><circle cx="10" cy="10" r="6" fill="${c.dark}"/></g>
  </g>`,
};

function hexes(c) {
  const cells = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 7; col++) {
      const x = -195 + col * 62 + (row % 2) * 31, y = -115 + row * 54;
      const fill = (row * 7 + col) % 5 === 0 ? c.accent : (row + col) % 3 === 0 ? "#ffffff30" : "#ffffff14";
      cells.push(`<polygon points="${[0, 60, 120, 180, 240, 300].map((a) => `${(x + 30 * Math.cos((a * Math.PI) / 180)).toFixed(1)},${(y + 30 * Math.sin((a * Math.PI) / 180)).toFixed(1)}`).join(" ")}" fill="${fill}" stroke="${c.bg2}" stroke-width="3"/>`);
    }
  }
  return cells.join("");
}

const COVERS = [
  { slot: 4, kind: "screen", title: "Pizza Tower Defense", bg1: "#c8372d", bg2: "#7a1f18", accent: "#f2b33d" },
  { slot: 5, kind: "screen", title: "Dragon Market Online", bg1: "#4b2a7a", bg2: "#1f1238", accent: "#3ec7b3" },
  { slot: 6, kind: "screen", title: "Tiny Kingdoms Digital", bg1: "#2f7d4f", bg2: "#123824", accent: "#f7d154" },
  { slot: 7, kind: "phone", title: "Night Train Companion", bg1: "#1d2b4f", bg2: "#0e1630", accent: "#f2a33d" },
  { slot: 8, kind: "phone", demo: true, title: "Harbor Masters Demo", bg1: "#0f766e", bg2: "#0a3f3b", accent: "#fb923c" },
  { slot: 9, kind: "phone", title: "Lantern Quest Companion", bg1: "#9d174d", bg2: "#4a0b25", accent: "#fcd34d" },
  { slot: 10, kind: "box", title: "Mochi Mayhem", short: "MOCHI MAYHEM", bg1: "#f9a8d4", bg2: "#fdf2f8", accent: "#ec4899", dark: "#9d174d", boxText: "#fff" },
  { slot: 11, kind: "box", title: "Rune Garden", short: "RUNE GARDEN", badge: "中文版", bg1: "#86efac", bg2: "#dcfce7", accent: "#15803d", dark: "#14532d", boxText: "#fff" },
  { slot: 12, kind: "box", title: "Starfall Couriers", short: "STARFALL", bg1: "#1e3a8a", bg2: "#dbeafe", accent: "#f2b33d", dark: "#172554", boxText: "#172554" },
];

for (const c of COVERS) {
  const dark = c.kind === "box" ? c.dark : "#15171a";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" role="img" aria-label="${esc(c.title)} (sample cover)">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.bg1}"/><stop offset="1" stop-color="${c.kind === "box" ? c.bg1 : c.bg2}"/></linearGradient></defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <g opacity="0.12" fill="#fff">${Array.from({ length: 14 }, (_, i) => `<circle cx="${(i * 137) % 800}" cy="${(i * 211) % 600}" r="${18 + (i % 4) * 14}"/>`).join("")}</g>
  ${frame[c.kind](c)}
  <rect x="0" y="512" width="800" height="88" fill="${dark}" opacity="0.88"/>
  <text x="400" y="572" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="46" letter-spacing="2" fill="#fff">${esc(c.title.toUpperCase())}</text>
  <g transform="translate(24 24)"><rect width="118" height="38" rx="19" fill="#fff"/><text x="59" y="26" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="20" letter-spacing="3" fill="${dark}">SAMPLE</text></g>
</svg>
`;
  fs.writeFileSync(path.join(out, `sample-${c.slot}.svg`), svg);
  console.log(`sample-${c.slot}.svg ${c.title}`);
}
