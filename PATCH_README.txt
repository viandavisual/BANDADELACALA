BANDA DE LA CALA — PATCH v0.44 desde v0.43

SOBRESCRIBIR:
- app/index.html
- app.js
- style.css
- version.js
- app/sw.js
- editor/index.html
- editor.js
- editor/sw.js

AÑADIR:
- V0_44_CAMBIOS.txt

NO TOCAR:
- app/manifest.webmanifest
- editor/manifest.webmanifest
- manifest.webmanifest
- config.js
- content-store.js
- supabase-client.js
- data/content-published.js
- assets/
- Supabase / Edge Functions / SMTP

NO HAY SQL NUEVO.

Tras subir el PATCH, recargar APP y EDITOR. Los Service Workers usarán caches v0.44.
