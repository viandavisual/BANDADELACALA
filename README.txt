BANDA DE LA CALA · v0.32
========================

BASE DIRECTA: v0.31
VERSIÓ DE CONTROL estable anterior: v0.29
SAVEPOINT PWA / INSTALL: v0.23

La v0.32 conserva intacta l’arquitectura d’instal·lació independent de les dues PWA:
- APP: manifest id /banda-de-la-cala-app · start_url/scope /app/
- EDITOR: manifest id /banda-de-la-cala-editor · start_url/scope /editor/
- manifests i Service Workers independents.

També conserva el flux estable d’USERS de v0.29:
- ADMIN/GESTOR crea USER STANDARD o GESTOR.
- El nou user rep una invitació per email.
- El user configura personalment la seva contrasenya des de l’APP.
- STANDARD no té accés a l’EDITOR.

NOVETATS v0.32
---------------
- HOME personalitzada amb “BENVINGUT/DA <NOM>” quan hi ha sessió iniciada.
- Nova configuració TYPO / UI aplicada a APP i EDITOR.
- HEMEROTECA amb colors propis: CARTELLS groc, NOTÍCIES blau, ENTREVISTES gris.
- HEMEROTECA amb composició masonry adaptable a formats verticals, horitzontals i quadrats.
- Data documental: any obligatori, mes i dia opcionals.
- Miniatura automàtica per a enllaços sense imatge i suport d’imatge pròpia carregada des de l’EDITOR.
- Visor HISTÒRIC/HEMEROTECA amb navegació lateral i tecles ←/→.
- USER: accés DRIVE PARTITURES per a comptes correctament configurats.
- HEMEROTECA: botó de retorn en fila superior independent.
- CALENDARI: llegenda AVUI / ASSAIG / EVENT.
- HISTÒRIC: eliminat el petit espai superior entre franges de períodes en desplegar.

SUPABASE v0.32
--------------
No cal executar SQL nou.
La HEMEROTECA continua dins de app_content i SUPABASE_UPDATE_v0.31.sql ja publica hemerotecaItems de manera completa.
No cal modificar SMTP, Auth, USERS ni la Edge Function create-band-user.
