BANDA DE LA CALA — PATCH v0.46 desde v0.45

SOBRESCRIBIR:
- app.js
- style.css
- version.js
- config.js
- editor.js
- app/index.html
- app/sw.js
- editor/index.html
- editor/sw.js
- PATCH_README.txt

AÑADIR:
- V0_46_CAMBIOS.txt

NO TOCAR:
- manifests (APP / EDITOR / root)
- IDs PWA, scopes y start_url
- Supabase / SMTP / Edge Functions
- data/content-published.js
- assets existentes

CAMBIOS PRINCIPALES:
1) HISTÒRIC vuelve siempre a su raíz al pulsar HISTÒRIC, incluso desde HEMEROTECA.
2) Botón dorado de PARTITURES: “PARTITURES ENTRA AQUÍ”.
3) HISTÒRIC: años x2, fotos con proporción natural y nodo blanco en Pere Bono / resto de períodos.
4) PLAYER: al terminar una canción, reproduce inmediatamente la siguiente pista si existe.
5) Versión, cache-busting y Service Workers actualizados a v0.46.
