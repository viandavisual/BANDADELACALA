BANDA DE LA CALA · v0.21 · PWA APP/EDITOR INDEPENDENTS
======================================================

PWA
- APP: https://viandavisual.github.io/BANDADELACALA/
- EDITOR: https://viandavisual.github.io/BANDADELACALA/editor/
- Cada PWA té manifest, ID/scope lògic, icona, Service Worker i caché independents.
- El Service Worker de l'APP ja no intercepta ni cacheja cap ruta de /editor/.
- El Service Worker de l'APP només neteja cachés de l'APP; el de l'EDITOR només les de l'EDITOR.
- HOME de l'APP incorpora una caixa visible d'instal·lació.
- RESUM de l'EDITOR incorpora una caixa visible d'instal·lació.

HOME APP
- Mobile: imatge a la meitat superior i textos a la meitat inferior sobre blanc.
- Gradient vertical només entre la foto i la zona blanca inferior.
- Crèdits sota les xarxes socials: App development: Vianda Visual / © 2026 · versió actual.

HISTÒRIC
- Ordre invers: primer els períodes i fotografies més recents.
- Cada període és col·lapsable tocant la franja de color.
- Fotografies més compactes en desktop i mobile.
- Tocant una foto s'obre un visor amb fons fosc, X, zoom +/− i AJUSTAR.
- El zoom màxim es limita segons la resolució natural de la imatge i un màxim de 250%.

DRESSCODE
- X de tancament reforçada com a cercle 1:1 en mobile.

USERS / SUPABASE
- Es manté l'arquitectura v0.19: ADMIN / GESTOR / STANDARD.
- Aquesta versió no requereix executar cap SQL nou.

ACTUALITZACIÓ DES DE v0.19
Utilitza el PATCH. No sobreescriguis dades ni assets si no estan al PATCH.


v0.21: APP instal·lable canònica a /app/ i EDITOR a /editor/, amb manifests i Service Workers independents. La URL arrel redirigeix a /app/.
