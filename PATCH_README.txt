BANDA DE LA CALA — PATCH v0.45 desde v0.44

SOBRESCRIBIR:
- app/index.html
- app.js
- style.css
- config.js
- version.js
- app/sw.js
- editor/index.html
- editor.js
- editor.css
- editor/sw.js

AÑADIR:
- V0_45_CAMBIOS.txt

NO TOCAR:
- app/manifest.webmanifest
- editor/manifest.webmanifest
- manifest.webmanifest
- content-store.js
- supabase-client.js
- data/content-published.js
- assets/
- Supabase / Edge Functions / SMTP

NO HAY SQL NUEVO.

Tras subir el PATCH, recargar APP y EDITOR. Los Service Workers usarán caches v0.45.
