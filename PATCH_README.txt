BANDA DE LA CALA · PATCH v0.42 DESDE v0.41

SOBRESCRIBIR:
- app/index.html
- editor/index.html
- app.js
- editor.js
- style.css
- editor.css
- config.js
- version.js
- app/sw.js
- editor/sw.js
- PATCH_README.txt

AÑADIR:
- V0_42_CAMBIOS.txt

NO TOCAR:
- manifests de APP/EDITOR
- IDs PWA, scopes ni start_url
- Supabase SQL / Edge Function / SMTP
- data/content-published.js
- assets existentes

IMPORTANTE:
- Los DRESSCODES pasan a ser reutilizables e independientes.
- La vinculación se realiza desde CALENDARI al crear/editar CONCERT o ACTUACIÓ.
- Los datos existentes siguen siendo compatibles: los eventos que ya tenían dresscodeId continúan enlazados.

No requiere ejecutar SQL ni modificar Supabase manualmente.
