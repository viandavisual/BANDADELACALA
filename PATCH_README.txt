BANDA DE LA CALA · PATCH v0.48 des de v0.47

SOBREESCRIURE:
- app/index.html
- app/sw.js
- app.js
- style.css
- version.js
- editor/index.html
- editor/sw.js
- editor.js
- create-band-user-edge-function.zip
- PATCH_README.txt

AFEGIR:
- EDGE_FUNCTION_CREATE_USER_v0.48.ts
- V0_48_CAMBIOS.txt
- SUPABASE_v0.48_PASOS.txt

SUPABASE · PAS NECESSARI:
- Tornar a desplegar l'Edge Function "create-band-user" amb la versió inclosa a create-band-user-edge-function.zip
  (o amb EDGE_FUNCTION_CREATE_USER_v0.48.ts com a index.ts).
- No cal executar cap SQL nou.

NO TOCAR:
- manifests APP / EDITOR
- config.js
- content-store.js
- supabase-client.js
- dades publicades
- SMTP
- assets existents
