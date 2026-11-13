// Erzeugt eigene Seiten pro Nugget (/<id>/index.html), 404.html und sitemap.xml aus index.html.
// Wird automatisch von .github/workflows/pages.yml ausgeführt. Lokal: node tools/build-pages.js
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "index.html"), "utf8");
const SITE = "https://www.pflegepedia.ch/";
const esc = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const nuggets = [];
const re = /\{\s*id: "([^"]+)", topic: "[^"]+", levels: \[[^\]]*\][^\n]*\n\s*title: "((?:[^"\\]|\\.)*)",\n\s*teaser: "((?:[^"\\]|\\.)*)"/g;
let m; while ((m = re.exec(src))) nuggets.push({ id: m[1], title: JSON.parse('"' + m[2] + '"'), desc: JSON.parse('"' + m[3] + '"') });
const declared = (src.match(/\n  \{\n    id: "/g) || []).length;
if (nuggets.length < declared) { console.error(`Nur ${nuggets.length} von ${declared} Nuggets erkannt. Abbruch.`); process.exit(1); }

const pages = [
  { id: "ueber", title: "Über Pflegepedia", desc: "Was Pflegepedia ist und für wen: Lernnuggets für AGS, FaGe und Pflege HF." },
  { id: "quellen", title: "Quellen und Qualität", desc: "Auf welchen Quellen die Lernnuggets von Pflegepedia beruhen und wie die Inhalte entstehen." },
  { id: "impressum", title: "Impressum", desc: "Impressum von Pflegepedia." },
  { id: "datenschutz", title: "Datenschutz", desc: "Datenschutzerklärung von Pflegepedia." }
];

function page(p, extraHead = "") {
  const url = SITE + p.id + "/", t = esc(p.title + " · Pflegepedia"), d = esc(p.desc);
  let h = src.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="/">' + extraHead);
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${d}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${t}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${d}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
  return h;
}

const keep = new Set([...nuggets, ...pages].map(p => p.id));
// alte generierte Ordner entfernen (nur solche mit Marker-Datei)
for (const d of fs.readdirSync(root)) {
  const f = path.join(root, d, ".generated");
  if (fs.existsSync(f) && !keep.has(d)) fs.rmSync(path.join(root, d), { recursive: true });
}
for (const p of [...nuggets, ...pages]) {
  const dir = path.join(root, p.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), page(p));
  fs.writeFileSync(path.join(dir, ".generated"), "Automatisch erzeugt aus index.html durch tools/build-pages.js. Nicht von Hand bearbeiten.\n");
}
fs.writeFileSync(path.join(root, "404.html"), page({ id: "", title: "Seite nicht gefunden", desc: "Diese Seite gibt es nicht." }, '\n<meta name="robots" content="noindex">'));

const today = new Date().toISOString().slice(0, 10);
const urls = [SITE, ...nuggets.map(n => SITE + n.id + "/"), ...pages.map(p => SITE + p.id + "/")];
fs.writeFileSync(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
console.log(`${nuggets.length} Nuggets, ${pages.length} Seiten, sitemap mit ${urls.length} URLs.`);
