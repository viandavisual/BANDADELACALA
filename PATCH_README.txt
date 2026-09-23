BANDA DE LA CALA — PATCH v0.16 → v0.17

SOBRESCRIBIR EN GITHUB:
- editor.html
- editor.js
- editor-manifest.webmanifest
- version.js
- sw.js

NO TOCAR:
- index.html / app.js / style.css
- data/content-published.js
- assets/
- configuració de Supabase

CAMBIO PRINCIPAL:
El botón INSTAL·LAR EDITOR captura el prompt de instalación desde el primer instante de carga y abre directamente el diálogo nativo de Chrome/Edge cuando el navegador lo ofrece.

Después de subir el patch, abre /BANDADELACALA/editor y haz una recarga completa una vez para activar el nuevo Service Worker/manifest.
