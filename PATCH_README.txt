BANDA DE LA CALA · PATCH v0.20 -> v0.21
==========================================

SOBRESCRIBIR EN LA RAIZ:
- index.html
- manifest.webmanifest
- sw.js
- app.js
- style.css
- config.js
- version.js
- editor.js
- editor.css

AÑADIR LA CARPETA NUEVA COMPLETA:
- app/
  - index.html
  - manifest.webmanifest
  - sw.js

SOBRESCRIBIR EN editor/:
- editor/index.html
- editor/manifest.webmanifest
- editor/sw.js

NO TOCAR:
- data/content-published.js
- assets/
- Supabase
- SQL / Edge Functions
- content-store.js
- supabase-client.js

CAMBIO IMPORTANTE DE PWA EN v0.21
----------------------------------
A partir de esta versión las dos aplicaciones instalables viven en scopes hermanos y separados:

APP:
https://viandavisual.github.io/BANDADELACALA/app/

EDITOR:
https://viandavisual.github.io/BANDADELACALA/editor/

La URL histórica:
https://viandavisual.github.io/BANDADELACALA/
redirige automáticamente a /app/.

PRIMERA ACTUALIZACION DESDE v0.20
---------------------------------
1. Sube este PATCH.
2. Abre una vez https://viandavisual.github.io/BANDADELACALA/ en una pestaña normal de Chrome.
   La raíz elimina el antiguo Service Worker global y redirige a /app/.
3. /app/ y /editor/ pueden recargarse automáticamente UNA sola vez en la primera visita para quedar controladas por su propio Service Worker.
4. Si conservas instalaciones antiguas de versiones anteriores, desinstálalas una sola vez antes de instalar las dos PWAs nuevas.
5. Instala APP desde /app/ e instala EDITOR desde /editor/. Sus IDs, manifests, scopes, caches y Service Workers son distintos.

No es necesario volver a hacer este saneamiento en futuras versiones.
