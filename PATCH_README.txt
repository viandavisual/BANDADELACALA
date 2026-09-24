BANDA DE LA CALA · PATCH v0.36 DESDE v0.35
Fecha: 24/09/2026

APLICACIÓN
1. Parte de una instalación v0.35 correcta.
2. Sobrescribe exactamente estos archivos:
   - app.js
   - style.css
   - config.js
   - version.js
   - app/index.html
   - app/sw.js
   - editor/index.html
   - editor/sw.js
   - editor.js
3. Añade:
   - V0_36_CAMBIOS.txt
4. Conserva assets/bandalogo.jpg en su ubicación actual del repositorio.

NO TOCAR
- manifest.webmanifest de APP ni EDITOR.
- IDs PWA, scopes ni start_url.
- Supabase / SMTP / Edge Functions.
- tablas, buckets, auth ni roles.

CAMBIO CRÍTICO DEL PLAYER
- v0.34/v0.35 sí activaban is-playing, pero transform:scaleY(1)!important impedía que los keyframes modificaran visualmente las barras.
- v0.36 deja de usar transform/keyframes para este icono.
- app.js modifica directamente y/height de cada rectángulo SVG mediante requestAnimationFrame mientras audioPlayer está reproduciendo una pista audible.
- Al pausar, terminar, entrar en buffering o silenciar, las barras vuelven a su geometría original y quedan quietas.

BANDALOGO
- Escala visual aumentada a 75% en HOME y USER.

VERSIÓN
- v0.36
