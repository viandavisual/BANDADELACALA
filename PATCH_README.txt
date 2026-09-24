BANDA DE LA CALA · PATCH v0.39 DESDE v0.38
Fecha: 24/09/2026

APLICACIÓN
1. Parte de una instalación v0.38 correcta.
2. Sobrescribe exactamente estos archivos:
   - app.js
   - style.css
   - editor.js
   - editor.css
   - content-store.js
   - config.js
   - version.js
   - app/index.html
   - app/sw.js
   - editor/index.html
   - editor/sw.js
3. Añade:
   - V0_39_CAMBIOS.txt
4. Conserva assets/bandalogo.jpg en su ubicación actual del repositorio.

APP
- FLAG del logo con mucha más ondulación y frecuencia.
- Créditos también en la columna izquierda DESKTOP.
- Cards HOME más compactas entre icono y título.
- El modal DRESSCODE muestra ALTRES si existe.

EDITOR · DRESSCODE
- CAMISA: Màniga llarga/curta + blanca/negra.
- PANTALÓ/FALDILLA: opciones diferenciadas NOIS / NOIES.
- MITJA/MITJÓ: Negres / Altres (especifica).
- AMERICANA: Sí / No.
- CALÇAT: calçat negre (no esportiu ni Converse).
- CORBATA + PINZA: Sí / No.
- ALTRES: caja de texto opcional general.
- Compatibilidad conservada con dresscodes ya existentes.

NO TOCAR
- manifest.webmanifest de APP ni EDITOR.
- IDs PWA, scopes ni start_url.
- Supabase / SMTP / Edge Functions.
- tablas, buckets, auth ni roles.

VERSIÓN
- v0.39
