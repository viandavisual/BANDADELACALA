BANDA DE LA CALA · PATCH v0.26 -> v0.27

OBJECTIU ÚNIC: corregir el flux d'alta/confirmació de nous USERS.

PUJAR / SOBREESCRIURE A GITHUB:
- version.js
- app/sw.js
- editor/sw.js

NO CAL TOCAR CAP ALTRE FITXER DE LA PWA.

SUPABASE:
- NO executar SQL.
- Actualitzar la Edge Function create-band-user amb EDGE_FUNCTION_CREATE_USER_v0.27.ts.
- Consultar SUPABASE_v0.27_PASOS.txt.

IMPORTANT:
- La instal·lació PWA v0.23 queda intacta.
- Els IDs, manifests, scopes i lògica beforeinstallprompt NO s'han modificat.
