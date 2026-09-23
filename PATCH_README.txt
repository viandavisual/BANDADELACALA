BANDA DE LA CALA · PATCH v0.24 -> v0.25

1) GITHUB
Sobreescriu/afegeix els fitxers i carpetes d'aquest PATCH mantenint exactament les rutes.
NO eliminis assets, àudios, fotos ni data/content-published.js.

2) SUPABASE SQL
Executa SUPABASE_UPDATE_v0.25.sql una sola vegada.
Això arregla NOM + AVATAR del propi USER amb permisos restringits només a aquestes columnes.

3) EDGE FUNCTION
Actualitza la funció Supabase "create-band-user" amb EDGE_FUNCTION_CREATE_USER_v0.25.ts i DEPLOY.
També tens create-band-user-edge-function.zip amb index.ts.

4) AVATAR
El primer avatar real s'ha de guardar a:
assets/avatar/avatar1.jpg

5) SAVEPOINT PWA
La v0.23 continua sent el savepoint del sistema INSTALL.
La v0.25 preserva els IDs PWA estables:
APP: /banda-de-la-cala-app
EDITOR: /banda-de-la-cala-editor
No canviïs aquests IDs, scopes ni les rutes /app/ i /editor/.
