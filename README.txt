BANDA DE LA CALA · v0.31
========================

VERSIÓ DE CONTROL anterior: v0.29
SAVEPOINT PWA / INSTALL: v0.23

La v0.31 parteix de v0.30 i conserva intacta l’arquitectura d’instal·lació independent de les dues PWA establerta a v0.23:
- APP: manifest id /banda-de-la-cala-app · start_url/scope /app/
- EDITOR: manifest id /banda-de-la-cala-editor · start_url/scope /editor/
- manifests i Service Workers independents.

També conserva el flux d’USERS estable de v0.29:
- ADMIN/GESTOR crea USER STANDARD o GESTOR.
- El nou user rep una invitació per email.
- El user configura personalment la seva contrasenya des de l’APP.
- STANDARD no té accés a l’EDITOR.

NOVETATS v0.31
---------------
- HISTÒRIC: obertura/tancament independent dels períodes, sense reconstruir ni recarregar la resta del timeline.
- CALENDARI: dia d’avui sempre vermell amb número blanc; si té activitat mostra un punt blau o daurat segons el tipus.
- PLAYER: PLAY/PAUSE centrat geomètricament dins del botó circular.
- AVATARS: l’APP detecta dinàmicament els avatarN disponibles a assets/avatar del repositori GitHub.
- HEMEROTECA dins HISTÒRIC amb CARTELLS, NOTÍCIES i ENTREVISTES.
- EDITOR: gestor complet d’HEMEROTECA amb imatges múltiples i/o enllaços segons categoria.

SUPABASE v0.31
--------------
Executa UNA vegada SUPABASE_UPDATE_v0.31.sql al SQL Editor perquè HEMEROTECA també formi part de la còpia pública de HISTÒRIC.
No cal crear cap bucket nou: les imatges reutilitzen historic-media, dins hemeroteca/.
No cal modificar SMTP, Auth, USERS ni la Edge Function create-band-user.

Consulta V0_31_CAMBIOS.txt i SUPABASE_v0.31_PASOS.txt.
