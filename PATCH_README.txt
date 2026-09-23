BANDA DE LA CALA · PATCH v0.17 → v0.18

SOBRESCRIURE A L'ARREL:
- editor.html
- editor.js
- version.js
- sw.js

AFEGIR CARPETA NOVA:
- editor/
  - index.html
  - manifest.webmanifest
  - sw.js

NO TOCAR:
- data/content-published.js
- assets/
- Supabase
- config.js
- app.js / style.css / index.html

URL CANÒNICA NOVA DEL EDITOR:
https://viandavisual.github.io/BANDADELACALA/editor/

IMPORTANT:
Després de pujar el PATCH, obre directament /editor/ (amb la barra final).
El botó d'instal·lació només s'activa quan Chrome confirma que la PWA és instal·lable; quan s'activa, un clic obre el diàleg natiu.
