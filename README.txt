BANDA DE LA CALA · v0.26
========================

SAVEPOINT PWA / INSTALL: v0.23.
La v0.26 conserva intactos los IDs PWA, scopes, manifests separados, Service Workers independientes y el flujo beforeinstallprompt que quedó estable en v0.23.

Cambios principales:
- FIX definitivo del flujo de invitación de nuevos USERS para evitar otp_expired provocado por asignar el password después de crear el token.
- Recuperación de usuarios pendientes creados durante v0.25.
- EDITOR > HOME en dos filas completas: carga de imagen arriba y preview real debajo.
- HISTÒRIC: eliminación individual y definitiva de fotografías; una entrada sin fotos desaparece.
- APP: animaciones de entrada escalonadas por sección.

SUPABASE
--------
No hay SQL nuevo en v0.26.
Hay que actualizar/desplegar la Edge Function create-band-user con EDGE_FUNCTION_CREATE_USER_v0.26.ts.
Consulta SUPABASE_v0.26_PASOS.txt.

AVATARES
--------
El primer avatar sigue en:
assets/avatar/avatar1.jpg
