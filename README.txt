BANDA DE LA CALA · v0.24
========================

Base estable: v0.23 SAVEPOINT.

IMPORTANT
---------
La v0.23 va resoldre definitivament la instal·lació independent de les dues PWA.
La v0.24 PRESERVA aquesta arquitectura: IDs, scopes, manifests, Service Workers i flux beforeinstallprompt continuen separats entre APP i EDITOR.

CANVIS v0.24
------------
- PLAYER: restaurada l'animació de les barres només mentre reprodueix l'àudio de la playlist.
- Nom instal·lat a mobile: APP = "Banda de la Cala"; EDITOR = "EDITOR".
- HOME APP i RESUM inicial de l'EDITOR: contingut de les caixes centrat horitzontalment.
- HISTÒRIC: una entrada pot contenir diverses fotografies.
- APP HISTÒRIC: les miniatures comparteixen el mateix espai visual d'una fotografia i totes es poden ampliar.
- EDITOR HISTÒRIC: càrrega múltiple de fotos i botó de descàrrega individual per fotografia (ADMIN/GESTOR).
- USER: selector d'avatar, canvi de nom i canvi de contrasenya col·lapsat.
- El nom del USER substitueix "USER" al menú i a la caixa de HOME quan hi ha sessió iniciada.

AVATAR 1
--------
Guardar la imatge quadrada amb aquest nom exacte:
assets/avatar/avatar1.jpg

SUPABASE
--------
Els projectes que ja venien de v0.23 han d'executar una sola vegada:
SUPABASE_UPDATE_v0.24.sql
