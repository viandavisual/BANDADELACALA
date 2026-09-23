BANDA DE LA CALA · PATCH v0.25 -> v0.26
=======================================

OBJETIVO DE ESTA VERSION
------------------------
1) Corregir el error otp_expired al confirmar un nuevo USER.
2) EDITOR > HOME: imagen de bienvenida en fila 1 y preview real en fila 2.
3) HISTÒRIC: eliminar fotos individualmente y borrar el archivo real de Supabase Storage.
4) Si una entrada HISTÒRIC se queda sin fotos, eliminar automáticamente el evento.
5) APP: animaciones de entrada para las piezas de todas las secciones.

ARCHIVOS A SOBRESCRIBIR EN GITHUB
---------------------------------
app.js
config.js
editor.css
editor.js
style.css
supabase-client.js
version.js
app/index.html
app/sw.js
editor/index.html
editor/sw.js

ARCHIVOS NUEVOS / DE APOYO
--------------------------
EDGE_FUNCTION_CREATE_USER_v0.26.ts
create-band-user-edge-function.zip
SUPABASE_v0.26_PASOS.txt
V0_26_CAMBIOS.txt
README.txt

SUPABASE
--------
NO hay SQL nuevo en v0.26.
Sí debes actualizar y desplegar la Edge Function "create-band-user" usando
EDGE_FUNCTION_CREATE_USER_v0.26.ts (o el ZIP incluido).

IMPORTANTE SOBRE EL USER DE PRUEBA DE v0.25
-------------------------------------------
Puedes volver a usar el mismo email que quedó pendiente/no confirmado.
La función v0.26 lo detecta, le asigna una nueva contraseña temporal y envía una
NUEVA invitación. Usa el último email recibido; el enlace antiguo seguirá inválido.

PWA / INSTALL
-------------
NO se han cambiado los IDs ni los scopes de las PWAs.
Se conserva el SAVEPOINT v0.23:
APP    id /banda-de-la-cala-app    scope /app/
EDITOR id /banda-de-la-cala-editor scope /editor/

Los Service Workers de /app/ y /editor/ únicamente suben su versión de caché para
recoger los JS/CSS nuevos.
