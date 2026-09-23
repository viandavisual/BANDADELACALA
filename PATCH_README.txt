BANDA DE LA CALA · PATCH v0.22 -> v0.23
========================================

OBJECTIU ÚNIC
-------------
Corregir la instal·lació PWA de l'APP i de l'EDITOR replicant el patró estable de Disturbing Stories App.

SOBREESCRIURE / AFEGIR
----------------------
app.js
editor.js
version.js
config.js

app/index.html
app/manifest.webmanifest
app/sw.js
app/icons/icon-180.png
app/icons/icon-192.png
app/icons/icon-512.png

editor/index.html
editor/manifest.webmanifest
editor/sw.js
editor/icons/icon-180.png
editor/icons/icon-192.png
editor/icons/icon-512.png

NO TOCAR
--------
assets/
data/content-published.js
Supabase / SQL / Edge Functions
style.css
editor.css
content-store.js
supabase-client.js

IMPORTANT
---------
Les icones PWA tornen a incloure's expressament en aquest PATCH per assegurar que APP i EDITOR disposen realment dels fitxers 180/192/512 al GitHub publicat.

URLS DE PROVA
-------------
APP:    https://viandavisual.github.io/BANDADELACALA/app/
EDITOR: https://viandavisual.github.io/BANDADELACALA/editor/

La v0.23 elimina la verificació bloquejant de la v0.22. El flux és ara:
beforeinstallprompt -> guardar event -> clic INSTAL·LAR -> prompt() -> userChoice.

APP i EDITOR conserven manifest, Service Worker, cache, scope i ID independents.
