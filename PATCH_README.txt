BANDA DE LA CALA · PATCH v0.50 DESDE v0.49

OBJETIVO
Integrar en el PLAYER de la APP el fallback de continuidad que ya fue probado correctamente en PLAYER_TEST_BANDA_v2.html.

SOBRESCRIBIR
- app.js
- version.js
- app/index.html
- app/sw.js
- editor/index.html
- editor.js
- editor/sw.js

AÑADIR
- V0_50_CAMBIOS.txt

NO TOCAR
- manifests / IDs PWA / scopes / start_url
- config.js
- content-store.js
- supabase-client.js
- datos publicados
- Supabase / SQL / SMTP
- assets
- Edge Functions

COMPORTAMIENTO PLAYER v0.50
- Final normal: `ended` -> siguiente pista según el modo de reproducción.
- Fallback validado: `MEDIA_ERR_DECODE (code 3)` -> tratar como final técnico -> misma transición.
- Se evita el doble salto mediante lock.

IMPORTANTE
Tras subir el PATCH, recarga/actualiza la PWA para que entre el nuevo Service Worker v0.50.
No hay que ejecutar SQL ni desplegar ninguna Edge Function.
