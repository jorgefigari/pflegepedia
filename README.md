# Pflegepedia

Lernnuggets für AGS, FaGe und Pflege HF. www.pflegepedia.ch

## Aufbau
- `index.html` ist die einzige Quelle: Inhalte, Design und Logik.
- Die Ordner pro Nugget (z. B. `dekubitus/index.html`), `404.html` und `sitemap.xml` werden automatisch aus `index.html` erzeugt (`tools/build-pages.js`, GitHub Action `.github/workflows/pages.yml`). Nicht von Hand bearbeiten.
- Neue Nuggets brauchen keine weiteren Schritte: Nach dem Push erzeugt die Action die Seite.
