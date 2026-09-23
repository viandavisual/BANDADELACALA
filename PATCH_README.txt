BANDA DE LA CALA · PATCH v0.29 -> v0.30
=========================================

OBJETIVO
--------
Aplicar a la APP los ajustes de TYPO / UI exportados desde el laboratorio
BANDA DE LA CALA · TYPO / UI LAB v0.1.

ARCHIVOS A SOBRESCRIBIR EN GITHUB
---------------------------------
version.js
style.css
app/index.html
app/sw.js
editor/index.html
editor/sw.js

ARCHIVOS NUEVOS OPCIONALES / DOCUMENTACION
-------------------------------------------
BANDA_DE_LA_CALA_TYPO_UI_v0.29.json
V0_30_CAMBIOS.txt

NO TOCAR
--------
app/manifest.webmanifest
editor/manifest.webmanifest
assets/
data/
config.js
content-store.js
supabase-client.js
app.js
editor.js
Supabase / SQL / Edge Functions

IMPORTANTE - INSTALL
--------------------
Se mantiene intacta la arquitectura PWA estable de v0.23:
APP id: /banda-de-la-cala-app
EDITOR id: /banda-de-la-cala-editor
Scopes separados /app/ y /editor/.
Los manifests NO han cambiado.

Solo se incrementa la cache de ambos Service Workers a v0.30 para que
las instalaciones existentes reciban los nuevos estilos.
