BANDA DE LA CALA · PATCH v0.23 -> v0.24
========================================

SAVEPOINT DE BASE
-----------------
Aquest PATCH parteix de la v0.23, que és el SAVEPOINT estable del sistema INSTALL.
NO canvia els IDs ni els scopes PWA.

COM ACTUALITZAR
---------------
1. Sobreescriu al repositori els fitxers inclosos en aquest PATCH mantenint les mateixes rutes.
2. Executa UNA SOLA VEGADA `SUPABASE_UPDATE_v0.24.sql` a Supabase → SQL Editor.
3. Afegeix el teu avatar quadrat amb el nom EXACTE:
   assets/avatar/avatar1.jpg
4. Publica GitHub Pages normalment.

IMPORTANT · INSTALL
-------------------
Es preserva el sistema funcional de v0.23:
- APP id: /banda-de-la-cala-app
- EDITOR id: /banda-de-la-cala-editor
- scopes separats /app/ i /editor/
- beforeinstallprompt estable

No canviïs aquests IDs.

NOM A MOBILE
------------
APP: Banda de la Cala
EDITOR: EDITOR

ARXIUS DEL PATCH
----------------
README.txt
SUPABASE_SETUP.sql
SUPABASE_UPDATE_v0.24.sql
SUPABASE_v0.24_PASOS.txt
V0_24_CAMBIOS.txt
app.js
config.js
content-store.js
editor-manifest.webmanifest
editor.css
editor.js
manifest.webmanifest
style.css
supabase-client.js
sw.js
version.js
app/index.html
app/manifest.webmanifest
app/sw.js
editor/index.html
editor/manifest.webmanifest
editor/sw.js
assets/avatar/README.txt

NO CAL TOCAR
------------
- `data/content-published.js`
- àudios
- fotos actuals
- icones PWA
- Edge Function `create-band-user`
- rols ADMIN / GESTOR / STANDARD
