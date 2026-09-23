BANDA DE LA CALA · PATCH v0.27 → v0.28
======================================

OBJECTIU
- EDITOR > USUARIS: permetre eliminar comptes de manera segura.
- APP > HISTÒRIC: períodes col·lapsats més alts i sense espais entre franges.
- Preservar intacte el sistema INSTALL estable de v0.23.

SOBREESCRIURE / AFEGIR A GITHUB
- version.js
- style.css
- editor.css
- supabase-client.js
- editor.js
- app/index.html
- app/sw.js
- editor/index.html
- editor/sw.js
- EDGE_FUNCTION_CREATE_USER_v0.28.ts
- create-band-user-edge-function.zip
- SUPABASE_v0.28_PASOS.txt
- V0_28_CAMBIOS.txt

SUPABASE
NO cal executar SQL.
Sí cal tornar a desplegar la Edge Function existent `create-band-user` amb EDGE_FUNCTION_CREATE_USER_v0.28.ts.

PERMISOS D'ELIMINACIÓ
- ADMIN pot eliminar GESTOR i STANDARD.
- GESTOR només pot eliminar STANDARD.
- ADMIN no es pot eliminar des de l'EDITOR.
- Ningú pot eliminar el seu propi compte mentre està connectat.

PWA / INSTALL
No s'han modificat els manifests ni els IDs PWA.
Es mantenen:
- APP: /banda-de-la-cala-app · scope /app/
- EDITOR: /banda-de-la-cala-editor · scope /editor/
Només es renova la versió de cache dels Service Workers a v0.28.
