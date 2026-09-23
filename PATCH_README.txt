BANDA DE LA CALA · PATCH v0.21 → v0.22
========================================

OBJECTIU
--------
Corregir definitivament el bootstrap d'instal·lació PWA de l'APP i de l'EDITOR,
mantenint-les com dues aplicacions independents.

SOBREESCRIURE
-------------
app.js
config.js
editor.js
sw.js
version.js
app/index.html
app/manifest.webmanifest
app/sw.js
editor/index.html
editor/manifest.webmanifest
editor/sw.js

AFEGIR
------
app/icons/icon-180.png
app/icons/icon-192.png
app/icons/icon-512.png
editor/icons/icon-180.png
editor/icons/icon-192.png
editor/icons/icon-512.png

NO CAL TOCAR
------------
assets/
data/
Supabase
SQL
Edge Functions
style.css
editor.css
content-store.js
supabase-client.js

DESPRÉS DE PUJAR EL PATCH
--------------------------
1. Obre una vegada https://viandavisual.github.io/BANDADELACALA/
   perquè es retiri qualsevol Service Worker legacy de l'arrel i et redirigeixi a /app/.
2. Prova INSTAL·LAR APP des de /app/.
3. Obre /editor/ i prova INSTAL·LAR EDITOR.

A v0.22 NO hi ha reload automàtic del bootstrap PWA.
Els dos manifests tenen identitats estables i diferents:
- APP: /banda-de-la-cala-app
- EDITOR: /banda-de-la-cala-editor
