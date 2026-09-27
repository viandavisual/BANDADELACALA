BANDA DE LA CALA v0.68 · PATCH DES DE v0.67

SOBRESCRIBIR:
- app/index.html
- app/sw.js
- editor/index.html
- editor/sw.js
- app.js
- editor.js
- style.css
- editor.css
- supabase-client.js
- version.js
- supabase/functions/create-band-user/index.ts
- EDGE_FUNCTION_CREATE_USER_v0.48.ts

AFEGIR:
- SUPABASE_UPDATE_v0.68.sql
- SUPABASE_v0.68_PASOS.txt
- V0_68_CAMBIOS.txt

SUPABASE:
- Executar SUPABASE_UPDATE_v0.68.sql una sola vegada.
- NO cal desplegar cap Edge Function per a aquesta versió.

NO TOCAR:
- manifests / IDs PWA / scopes.
- Auth, SMTP, backup multimèdia i lògica dels minijocs.
