// Erzeugt den Vorlesetext pro Nugget (tools/tts/<id>.txt, ein Satz pro Zeile).
// Es wird genau derselbe Text wie beim Vorlesen im Browser genutzt (ttsCollect in index.html).
// Wird von .github/workflows/audio.yml ausgeführt. Lokal: node tools/tts-text.js
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const { JSDOM, VirtualConsole } = require("jsdom");
const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "index.html"), "utf8");
const code = src.match(/<script>\n([\s\S]*?)<\/script>/)[1];
const html = src.replace(/<script>\n[\s\S]*?<\/script>/, "");
const ids = [...src.matchAll(/\n  \{\n    id: "([^"]+)"/g)].map(m => m[1]);
const outDir = path.join(__dirname, "tts"); fs.mkdirSync(outDir, { recursive: true });
const hashes = {};
for (const id of ids) {
  const vc = new VirtualConsole(); vc.on("jsdomError", e => { throw e; });
  const dom = new JSDOM(html, { url: "https://www.pflegepedia.ch/" + id + "/", runScripts: "outside-only", pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window;
  w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = () => {};
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  w.eval(code);
  const items = w.eval("ttsCollect()").map(i => i.text);
  const txt = items.join("\n") + "\n";
  fs.writeFileSync(path.join(outDir, id + ".txt"), txt);
  hashes[id] = crypto.createHash("sha256").update(txt).digest("hex").slice(0, 12);
  w.close();
}
fs.writeFileSync(path.join(outDir, "hashes.json"), JSON.stringify(hashes, null, 1) + "\n");
console.log(ids.length + " Vorlesetexte erzeugt.");
