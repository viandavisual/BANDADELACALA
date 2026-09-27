BANDA DE LA CALA v0.58 — PATCH DES DE v0.57

SOBRESCRIBIR:
- app.js
- style.css
- version.js
- app/index.html
- app/sw.js
- app/minigames/quina-nota-es/app.html
- editor/index.html
- editor/sw.js
- editor.js
- PATCH_README.txt

AÑADIR:
- V0_58_CAMBIOS.txt

NO TOCAR:
- manifests de APP/EDITOR
- IDs, scopes ni start_url de las PWAs
- configuración de Supabase
- secrets
- Edge Function backup-band-media
- bucket media-backup-staging
- sistema de usuarios/auth/invitaciones
- SMTP
- datos de HISTÒRIC

NO HAY SQL NUEVO.

CAMBIOS PRINCIPALES:
- Carrusel fotográfico del PLAYER al 50% de opacidad.
- Duraciones de las pistas contenidas dentro de sus cards en MOBILE.
- Cabecera MOBILE de QUINA NOTA ÉS? redistribuida para que el logo no quede tapado.
- Descripción del minijuego a todo el ancho de la caja en MOBILE.
