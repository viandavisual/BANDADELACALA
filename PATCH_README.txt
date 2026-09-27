BANDA DE LA CALA v0.57 — PATCH DES DE v0.56

SOBRESCRIBIR:
- app.js
- style.css
- version.js
- app/index.html
- app/sw.js
- editor/index.html
- editor/sw.js
- PATCH_README.txt

AÑADIR:
- V0_57_CAMBIOS.txt

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
- PLAYER usa como fondo todas las fotos de HISTÒRIC en orden random.
- Movimiento Ken Burns 100% → 130%, desplazamiento suave y crossfade, opacidad 25%.
- Precarga de la siguiente imagen para evitar flashes.
- Nuevo botón PANTALLA COMPLETA con fullscreen nativo + fallback visual.
- El audio y el carrusel continúan sin reiniciarse al entrar/salir de fullscreen.
