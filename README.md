# Pflegepedia

Lernnuggets für AGS, FaGe und Pflege HF. www.pflegepedia.ch

## Aufbau
- `index.html` ist die einzige Quelle: Inhalte, Design und Logik.
- Die Ordner pro Nugget (z. B. `dekubitus/index.html`), `404.html`, `sitemap.xml`, `app.<hash>.js` und `tools/seiten-stand.json` werden automatisch aus `index.html` erzeugt (`tools/build-pages.js`, GitHub Action `.github/workflows/pages.yml`). Nicht von Hand bearbeiten.
- Der Build rendert jede Seite vorab (jsdom), damit der Text auch ohne JavaScript im HTML steht. In `index.html` steht der vorgerenderte Inhalt der Startseite zwischen `<!--prerender-->` und `<!--/prerender-->`. Diesen Bereich nicht von Hand bearbeiten.
- Lokal bauen: `npm install` und dann `node tools/build-pages.js`.
- Neue Nuggets brauchen keine weiteren Schritte: Nach dem Push erzeugt die Action die Seite.
