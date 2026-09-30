// Generates public/{index,portfolios,about,contact,404}.html from pages/_layout.html.
// Default text lives in pages/defaults.json; the Google Sheet overrides it at request time
// through the data-cms* markers (see docs/content-editing.md).
// Usage: npm run build:pages   (then: node scripts/export-content.mjs)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const layout = fs.readFileSync(path.join(root, "pages", "_layout.html"), "utf8");
const D = JSON.parse(fs.readFileSync(path.join(root, "pages", "defaults.json"), "utf8"));

const PORTFOLIO_SLOTS = 9;
const TEAM_SLOTS = 4;
const SOCIALS = [
  ["6895a3ab0bb39c64942ae19a_social-18.svg"],
  ["6895a3ab0bb39c64942ae17b_social-03.svg"],
  ["6895a3ab0bb39c64942ae162_social-11.svg"],
  ["6895a3ab0bb39c64942ae18c_social-06.svg"],
  ["6895a3ab0bb39c64942ae16f_social-12.svg"],
];
const ICONS = "/assets/cdn.prod.website-files.com/6895a3ab0bb39c64942ae0d2/";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const d = (key) => {
  if (!(key in D)) throw new Error(`pages/defaults.json has no default for "${key}"`);
  return D[key];
};
const t = (key) => esc(d(key)).replace(/\n/g, "<br>");   // element text
const a = (key) => esc(d(key));                          // attribute value
const filled = (key) => d(key).trim() !== "";
// Slots with no default start hidden; the Worker reveals them once the sheet fills the key.
const reveal = (key) => (filled(key) ? "" : ` hidden data-cms-reveal="${key}"`);

const text = (tag, key, attrs = "") => `<${tag}${attrs} data-cms="${key}">${t(key)}</${tag}>`;
const linkKeys = (cls, labelKey, hrefKey) =>
  `<a class="${cls}" href="${a(hrefKey)}" data-cms="${labelKey}" data-cms-href="${hrefKey}" data-cms-show="${labelKey}"${reveal(labelKey)}>${t(labelKey)}</a>`;
const link = (cls, base) => linkKeys(cls, `${base}.label`, `${base}.link`);
const img = (srcKey, altKey, extra = "", loading = "lazy") => {
  const src = filled(srcKey) ? ` src="${a(srcKey)}"` : "";
  const alt = altKey ? ` alt="${a(altKey)}" data-cms-alt="${altKey}"` : ` alt=""`;
  return `<img${extra}${src}${alt} data-cms-src="${srcKey}"${reveal(srcKey)} loading="${loading}" decoding="async">`;
};

// ---------- Shared blocks ----------
const footerLinks = [1, 2, 3, 4]
  .map((i) => `        <li data-cms-show="footer.links.${i}.label"${reveal(`footer.links.${i}.label`)}><a href="${a(`footer.links.${i}.link`)}" data-cms="footer.links.${i}.label" data-cms-href="footer.links.${i}.link">${t(`footer.links.${i}.label`)}</a></li>`)
  .join("\n");
const socialLinks = SOCIALS.map(([icon], n) => {
  const i = n + 1;
  return `        <li data-cms-show="footer.social.${i}.label"${reveal(`footer.social.${i}.label`)}><a class="social-link" href="${a(`footer.social.${i}.link`)}" data-cms-href="footer.social.${i}.link"><img src="${ICONS}${icon}" alt="" width="18" height="18"><span data-cms="footer.social.${i}.label">${t(`footer.social.${i}.label`)}</span></a></li>`;
}).join("\n");

const portfolioCard = (i, heading = "h3") => `      <article class="portfolio-card" data-cms-show="portfolio.${i}.tab"${reveal(`portfolio.${i}.tab`)}>
        ${img(`portfolio.${i}.image`, `portfolio.${i}.alt`)}
        <div class="portfolio-body">
          <span class="chip" data-cms="portfolio.${i}.category" data-cms-show="portfolio.${i}.category"${reveal(`portfolio.${i}.category`)}>${t(`portfolio.${i}.category`)}</span>
          ${text(heading, `portfolio.${i}.title`)}
          ${text("p", `portfolio.${i}.text`)}
          ${linkKeys("more", `portfolio.${i}.link.label`, `portfolio.${i}.link`)}
        </div>
      </article>`;
const portfolioGrid = (from, to, cls = "", heading = "h3") =>
  `    <div class="grid grid-3 ${cls}">\n${Array.from({ length: to - from + 1 }, (_, n) => portfolioCard(from + n, heading)).join("\n")}\n    </div>`;

const ribbon = (tag, key) => `    <div class="ribbon">${text(tag, key)}</div>`;
const lead = (key) => `    ${text("p", key, ' class="lead"')}`;

const ctaBand = `  <section class="cta-band">
    <div class="container">
      ${text("h2", "cta.title")}
      ${text("p", "cta.text")}
      ${link("btn", "cta.button")}
    </div>
  </section>`;

// ---------- Pages ----------
const pages = {
  index: {
    metaKey: "home", current: "home",
    body: `  <section class="hero">
    ${img("hero.image", null, ' class="hero-bg"', "eager")}
    <div class="container">
      ${text("h1", "hero.title")}
      ${text("p", "hero.subtitle", ' class="hero-sub"')}
      <div class="btn-row">
        ${link("btn", "hero.button1")}
        ${link("btn btn-outline", "hero.button2")}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
${ribbon("h2", "services.title")}
${lead("services.text")}
    <div class="grid grid-3">
${[1, 2, 3, 4, 5, 6].map((i) => `      <div class="card" data-cms-show="services.${i}.title">
        <div class="service-icon">${img(`services.${i}.icon`, null)}</div>
        ${text("h3", `services.${i}.title`)}
        ${text("p", `services.${i}.text`)}
      </div>`).join("\n")}
    </div>
    </div>
  </section>

  <section class="section tint">
    <div class="container">
${ribbon("h2", "featured.title")}
${lead("featured.subtitle")}
${[1, 2].map((i) => `    <div class="feature${i % 2 === 0 ? " reverse" : ""}" data-cms-show="featured.${i}.title">
      <div class="feature-media">${img(`featured.${i}.image`, `featured.${i}.alt`)}</div>
      <div>
        ${text("h3", `featured.${i}.title`)}
        ${text("p", `featured.${i}.text`)}
        ${link("btn", `featured.${i}.button`)}
      </div>
    </div>`).join("\n")}
    </div>
  </section>

  <section class="section">
    <div class="container">
${ribbon("h2", "portfolio.title")}
${lead("portfolio.subtitle")}
${portfolioGrid(1, 3)}
    <div class="center-cta">${link("btn", "home.portfolio.button")}</div>
    </div>
  </section>

${ctaBand}`,
  },

  portfolios: {
    metaKey: "portfolios", current: "portfolios",
    body: `  <section class="page-hero compact">
    <div class="container">
      ${text("h1", "portfolios.title")}
      ${text("p", "portfolios.intro")}
    </div>
  </section>

  <section class="section">
    <div class="container">
${portfolioGrid(1, PORTFOLIO_SLOTS, "full", "h2")}
    </div>
  </section>

${ctaBand}`,
  },

  about: {
    metaKey: "about", current: "about",
    body: `  <section class="page-hero compact">
    <div class="container">
      ${text("h1", "about.title")}
      ${text("p", "about.subtitle")}
    </div>
  </section>

  <section class="section">
    <div class="container">
${ribbon("h2", "about.story.title")}
      <div class="prose">${text("p", "about.story.text")}</div>
    </div>
  </section>

  <section class="section" data-cms-show="about.team.1.name"${reveal("about.team.1.name")}>
    <div class="container">
${ribbon("h2", "about.team.title")}
      <div class="team">
${Array.from({ length: TEAM_SLOTS }, (_, n) => n + 1).map((i) => `        <div class="team-member" data-cms-show="about.team.${i}.name"${reveal(`about.team.${i}.name`)}>
          ${img(`about.team.${i}.photo`, `about.team.${i}.name`)}
          ${text("h3", `about.team.${i}.name`)}
          ${text("p", `about.team.${i}.role`, ' class="team-role"')}
          ${text("p", `about.team.${i}.bio`)}
        </div>`).join("\n")}
      </div>
    </div>
  </section>

  <section class="section tint">
    <div class="container">
${ribbon("h2", "about.mission.title")}
      <div class="prose">${text("p", "about.mission.text")}</div>
    </div>
  </section>

  <section class="section">
    <div class="container">
${ribbon("h2", "about.name.title")}
      <div class="prose">${text("p", "about.name.text")}</div>
      <div class="btn-stack">
        ${[1, 2, 3].map((i) => link("btn btn-block", `about.cta.${i}`)).join("\n        ")}
      </div>
    </div>
  </section>`,
  },

  contact: {
    metaKey: "contact", current: "contact",
    scripts: `<script src="/assets/contact.js" defer></script>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&amp;onload=unizzaTurnstileReady" async defer></script>`,
    body: `  <section class="page-hero">
    ${img("contact.hero.image", null, ' class="hero-bg"', "eager")}
    <div class="container">
      ${text("h1", "contact.title")}
      ${text("p", "contact.subtitle")}
    </div>
  </section>

  <div class="container">
    <div class="float-card">
${[1, 2, 3].map((i) => `      <div class="topic" data-cms-show="contact.topic.${i}.title">
        ${text("h2", `contact.topic.${i}.title`)}
        ${text("p", `contact.topic.${i}.text`)}
      </div>`).join("\n")}
      ${text("h2", "contact.form.title")}
      ${text("p", "contact.form.intro", ' class="contact-info"')}
      ${text("p", "contact.info", ' class="contact-info"')}
      <div class="contact-form-wrapper">
        <form id="email-form" method="post" action="/api/contact" novalidate>
          <div class="form-grid">
            <div>
              <label class="form-label" for="name" data-cms="contact.form.name.label">${t("contact.form.name.label")}</label>
              <input class="form-field" id="name" name="name" type="text" maxlength="256" required placeholder="${a("contact.form.name")}" data-cms-placeholder="contact.form.name" autocomplete="name">
              <p class="field-error" data-for="name" hidden>Please check this field.</p>
            </div>
            <div>
              <label class="form-label" for="email" data-cms="contact.form.email.label">${t("contact.form.email.label")}</label>
              <input class="form-field" id="email" name="email" type="email" maxlength="256" required placeholder="${a("contact.form.email")}" data-cms-placeholder="contact.form.email" autocomplete="email">
              <p class="field-error" data-for="email" hidden>Please check this field.</p>
            </div>
            <div class="full">
              <label class="form-label" for="message" data-cms="contact.form.message.label">${t("contact.form.message.label")}</label>
              <textarea class="form-field" id="message" name="message" maxlength="5000" required placeholder="${a("contact.form.message")}" data-cms-placeholder="contact.form.message"></textarea>
              <p class="field-error" data-for="message" hidden>Please check this field.</p>
            </div>
          </div>
          <div id="turnstile"></div>
          <p class="form-status" id="form-status" role="status" hidden></p>
          <input class="btn btn-block" type="submit" value="${a("contact.form.button")}" data-cms-value="contact.form.button" data-wait="Please wait..." disabled>
        </form>
        <div class="w-form-done" role="status">${text("p", "contact.form.success")}</div>
        <div class="w-form-fail" role="alert"><p>Something went wrong. Please email us directly at <a href="mailto:info@unizzagames.com">info@unizzagames.com</a>.</p></div>
      </div>
    </div>
  </div>`,
  },

  404: {
    metaKey: "notfound", current: "", title: "Page not found | Unizza Games", description: "This page does not exist.",
    body: `  <section class="page-hero compact">
    <div class="container">
      <h1>Page not found</h1>
      <p>The page you are looking for doesn't exist.</p>
    </div>
  </section>
  <section class="section">
    <div class="container center-cta"><a class="btn" href="/">Back to home</a></div>
  </section>`,
  },
};

for (const [name, page] of Object.entries(pages)) {
  const title = page.title ?? d(`${page.metaKey}.meta.title`);
  const description = page.description ?? d(`${page.metaKey}.meta.description`);
  let html = layout
    .replace(/\{\{current:(\w+)\}\}/g, (_m, id) => (id === page.current ? ' aria-current="page"' : ""))
    .replace("{{body}}", page.body)
    .replace("{{footerLinks}}", footerLinks)
    .replace("{{socialLinks}}", socialLinks)
    .replace("{{scripts}}", page.scripts ?? "")
    .replace(/\{\{t:([\w.]+)\}\}/g, (_m, key) => t(key))
    .replaceAll("{{title}}", esc(title))
    .replaceAll("{{description}}", esc(description));
  html = html.replaceAll("{{metaKey}}", page.metaKey);
  if (name === "404") {
    // Not sheet-editable: drop the meta markers that would point at missing keys.
    html = html.replace(' data-cms="notfound.meta.title"', "").replace(' data-cms-content="notfound.meta.description"', "");
  }
  const leftover = html.match(/\{\{[^}]+\}\}/);
  if (leftover) throw new Error(`${name}: unreplaced placeholder ${leftover[0]}`);
  fs.writeFileSync(path.join(root, "public", `${name}.html`), html);
  console.log(`wrote public/${name}.html`);
}
