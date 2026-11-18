// Erzeugt eigene Seiten pro Nugget (/<id>/index.html), 404.html, sitemap.xml und app.<hash>.js aus index.html.
// Der Inhalt jeder Seite wird vorab gerendert (jsdom), damit Suchmaschinen den Text ohne JavaScript sehen.
// Wird automatisch von .github/workflows/pages.yml ausgeführt. Lokal: npm install && node tools/build-pages.js
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const { JSDOM, VirtualConsole } = require("jsdom");
const root = path.join(__dirname, "..");
const SITE = "https://www.pflegepedia.ch/";
const esc = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const hash = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 10);
const LABEL = { AGS: "AGS", FaGe: "FaGe", HF: "Pflege HF" };
const LEVEL_NAME = { AGS: "Assistentin / Assistent Gesundheit und Soziales EBA", FaGe: "Fachfrau / Fachmann Gesundheit EFZ", HF: "Pflegefachfrau / Pflegefachmann HF" };
const list = a => a.length === 1 ? a[0] : a.slice(0, -1).join(", ") + " und " + a[a.length - 1];

let src = fs.readFileSync(path.join(root, "index.html"), "utf8");

// Nuggets aus index.html lesen
const nuggets = [];
const re = /\{\s*id: "([^"]+)", topic: "([^"]+)", levels: \[([^\]]*)\][^\n]*\n\s*title: "((?:[^"\\]|\\.)*)",\n\s*teaser: "((?:[^"\\]|\\.)*)"/g;
let m; while ((m = re.exec(src))) nuggets.push({ id: m[1], topic: m[2], levels: JSON.parse("[" + m[3] + "]"), title: JSON.parse('"' + m[4] + '"'), teaser: JSON.parse('"' + m[5] + '"') });
const declared = (src.match(/\n  \{\n    id: "/g) || []).length;
if (nuggets.length < declared) { console.error(`Nur ${nuggets.length} von ${declared} Nuggets erkannt. Abbruch.`); process.exit(1); }

// Meta-Beschreibung: Teaser plus Zielgruppe, so lang wie möglich bis 160 Zeichen
function metaDesc(n) {
  const lv = "für " + list(n.levels.map(l => LABEL[l]));
  const opts = [` Lernnugget ${lv}: Theorie, Quiz und Praxistransfer.`, ` Lernnugget ${lv} mit Quiz und Praxistransfer.`, ` Lernnugget ${lv} mit Quiz.`, ` Mit Quiz ${lv}.`, ""];
  for (const o of opts) if ((n.teaser + o).length <= 160) return n.teaser + o;
  return n.teaser;
}
nuggets.forEach(n => n.desc = metaDesc(n));

const pages = [
  { id: "ueber", title: "Über Pflegepedia", desc: "Was Pflegepedia ist und für wen: kostenlose Lernnuggets für AGS, FaGe und Pflege HF in der Schweiz, mit Theorie, Quiz pro Stufe und Praxistransfer." },
  { id: "quellen", title: "Quellen und Qualität", desc: "Auf welchen Quellen die Lernnuggets von Pflegepedia beruhen, wie die Inhalte mit KI Unterstützung entstehen und wie sie fachlich geprüft werden." },
  { id: "impressum", title: "Impressum", desc: "Impressum von Pflegepedia, der Lernplattform mit kurzen Lernnuggets für AGS, FaGe und Pflege HF in der Schweiz. Kontakt: info@pflegepedia.ch." },
  { id: "datenschutzerklaerung", title: "Datenschutz", desc: "Datenschutzerklärung von Pflegepedia: keine Anmeldung, keine Cookies, kein Tracking. Was lokal auf deinem Gerät gespeichert wird und wie du es löschst." }
];
const clash = pages.find(p => nuggets.some(n => n.id === p.id));
if (clash) { console.error(`Seite und Nugget haben dieselbe Adresse: /${clash.id}/. Abbruch.`); process.exit(1); }

// Gemeinsames Script als eigene Datei, damit der Browser es zwischen den Seiten im Cache behält
const scripts = [...src.matchAll(/<script>\n([\s\S]*?)<\/script>/g)];
if (scripts.length !== 1) { console.error("Hauptscript in index.html nicht eindeutig gefunden. Abbruch."); process.exit(1); }
const appCode = scripts[0][1];
const appFile = `app.${hash(appCode)}.js`;
for (const f of fs.readdirSync(root)) if (/^app\.[0-9a-f]+\.js$/.test(f) && f !== appFile) fs.rmSync(path.join(root, f));
fs.writeFileSync(path.join(root, appFile), appCode);

// Vorab rendern mit jsdom
function prerender(route) {
  const vc = new VirtualConsole();
  vc.on("jsdomError", e => { throw e; });
  const html = src.replace(/<script>\n[\s\S]*?<\/script>/, ""); // Script separat ausführen
  const dom = new JSDOM(html, {
    url: SITE + (route ? route + "/" : ""), runScripts: "outside-only", pretendToBeVisual: true, virtualConsole: vc
  });
  const w = dom.window;
  let seed = 42; w.Math.random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = () => {};
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  w.eval(appCode);
  const app = w.document.getElementById("app").innerHTML;
  const title = w.document.title;
  w.close();
  return { app, title };
}
const NOSCRIPT = '<noscript><p class="wrap">Pflegepedia braucht JavaScript für Quiz und Navigation. Bitte aktiviere JavaScript in deinem Browser.</p></noscript>';
const putApp = (h, app) => h.replace(/<!--prerender-->[\s\S]*?<!--\/prerender-->/, () => `<!--prerender-->${app}${NOSCRIPT}<!--/prerender-->`);

const publisher = { "@type": "Organization", name: "Pflegepedia", url: SITE, email: "info@pflegepedia.ch", logo: SITE + "icons/icon-512.png" };
function jsonLd(n, url) {
  const data = {
    "@context": "https://schema.org", "@type": "LearningResource", name: n.title, description: n.desc, url,
    inLanguage: "de-CH", learningResourceType: "Lernnugget", isAccessibleForFree: true, about: n.topic,
    educationalLevel: n.levels.map(l => LEVEL_NAME[l]),
    audience: { "@type": "EducationalAudience", educationalRole: "student" },
    isPartOf: { "@type": "WebSite", name: "Pflegepedia", url: SITE }, publisher
  };
  return `\n<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

function page(p, extraHead, app) {
  const url = SITE + (p.id ? p.id + "/" : ""), t = esc(p.title + " · Pflegepedia"), d = esc(p.desc);
  let h = src.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/, "")
    .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="/">' + extraHead);
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${d}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${t}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${d}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`)
    .replace(/<script>\n[\s\S]*?<\/script>/, () => `<script src="/${appFile}"></script>`);
  if (app !== undefined) h = putApp(h, app);
  return h;
}

// Stand pro Seite: lastmod bleibt, solange sich der Inhalt nicht ändert
const stateFile = path.join(__dirname, "seiten-stand.json");
let state = {}; try { state = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch (e) {}
const today = new Date().toISOString().slice(0, 10);
const newState = {};
const stamp = (key, content) => { const hs = hash(content); newState[key] = { hash: hs, lastmod: state[key] && state[key].hash === hs ? state[key].lastmod : today }; return newState[key].lastmod; };

// Startseite: vorgerenderten Inhalt direkt in index.html schreiben
const home = prerender("");
const newSrc = putApp(src, home.app);
if (newSrc !== src) { fs.writeFileSync(path.join(root, "index.html"), newSrc); src = newSrc; }
const lastmod = { "": stamp("", home.app) };

const keep = new Set([...nuggets, ...pages].map(p => p.id));
for (const d of fs.readdirSync(root)) {
  const f = path.join(root, d, ".generated");
  if (fs.existsSync(f) && !keep.has(d)) fs.rmSync(path.join(root, d), { recursive: true });
}
for (const p of [...nuggets, ...pages]) {
  const r = prerender(p.id);
  const isNugget = nuggets.includes(p);
  const extra = isNugget ? jsonLd(p, SITE + p.id + "/") : "";
  fs.mkdirSync(path.join(root, p.id), { recursive: true });
  fs.writeFileSync(path.join(root, p.id, "index.html"), page(p, extra, r.app));
  fs.writeFileSync(path.join(root, p.id, ".generated"), "Automatisch erzeugt aus index.html durch tools/build-pages.js. Nicht von Hand bearbeiten.\n");
  lastmod[p.id] = stamp(p.id, r.app + p.desc);
}
fs.writeFileSync(path.join(root, "404.html"), page({ id: "", title: "Seite nicht gefunden", desc: "Diese Seite gibt es nicht." }, '\n<meta name="robots" content="noindex">'));
fs.writeFileSync(stateFile, JSON.stringify(newState, null, 1) + "\n");

const urls = ["", ...nuggets.map(n => n.id), ...pages.map(p => p.id)];
fs.writeFileSync(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${SITE}${u ? u + "/" : ""}</loc><lastmod>${lastmod[u]}</lastmod></url>`).join("\n")}\n</urlset>\n`);
console.log(`${nuggets.length} Nuggets, ${pages.length} Seiten, sitemap mit ${urls.length} URLs, ${appFile}.`);
