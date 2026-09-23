BANDA DE LA CALA · v0.33
========================

BASE DIRECTA: v0.32
VERSIÓ DE CONTROL estable anterior: v0.29
SAVEPOINT PWA / INSTALL: v0.23

La v0.33 conserva intacta l’arquitectura d’instal·lació independent de les dues PWA:
- APP: manifest id /banda-de-la-cala-app · start_url/scope /app/
- EDITOR: manifest id /banda-de-la-cala-editor · start_url/scope /editor/
- manifests i Service Workers independents.

També conserva el flux estable d’USERS de v0.29, Auth, SMTP i la Edge Function create-band-user.

NOVETATS v0.33
---------------
- HEMEROTECA: CARTELLS, NOTÍCIES i ENTREVISTES passen a una graella fixa de 8 elements per fila en DESKTOP i 4 per fila en MOBILE.
- HEMEROTECA: targetes compactades per mantenir llegibilitat dins de la nova densitat de graella, conservant colors, visor, dates, imatges i enllaços.
- PLAYER: icones PREV i NEXT reconstruïdes geomètricament i centrades dins dels seus botons, evitant desplaçaments propis del glif Unicode del sistema.
- TYPO / UI: aplicada la nova configuració JSON a APP i EDITOR. Canvis respecte v0.32: eventDetail, dresscodeButton, actionButton i dressBody.
- version.js, cache-busting i Service Workers actualitzats a v0.33.

SUPABASE v0.33
--------------
No cal executar SQL nou.
No es modifica SMTP, Auth, USERS, Storage ni la Edge Function create-band-user.
