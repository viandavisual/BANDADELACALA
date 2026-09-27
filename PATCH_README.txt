BANDA DE LA CALA v0.56 — PATCH DES DE v0.55

SOBRESCRIBIR:
- app.js
- style.css
- content-store.js
- editor.js
- editor.css
- version.js
- app/index.html
- app/sw.js
- app/minigames/quina-nota-es/app.html
- editor/index.html
- editor/sw.js
- PATCH_README.txt

AÑADIR:
- V0_56_CAMBIOS.txt

NO TOCAR:
- manifests de APP/EDITOR
- IDs, scopes ni start_url de las PWAs
- configuración de Supabase
- secrets
- Edge Function backup-band-media
- bucket media-backup-staging
- sistema de usuarios/auth/invitaciones
- SMTP

NO HAY SQL NUEVO.

CAMBIOS PRINCIPALES:
- CALENDARI anima progresivamente todas las 42 casillas.
- QUINA NOTA ÉS? usa dentro del juego el icono configurado en EDITOR.
- PUNT/PUNTS se adapta al total.
- HISTÒRIC y años de HEMEROTECA se colapsan/descolapsan con un toque de forma robusta.
- HISTÒRIC muestra el total de fotografías de cada período junto a la flecha.
- SISTEMA incorpora configuración manual de títulos/textos de las cajas de HOME.
