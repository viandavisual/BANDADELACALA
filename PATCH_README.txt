BANDA DE LA CALA · PATCH v0.40 DESDE v0.39
Fecha: 24/09/2026

APLICACIÓN
1. Parte de una instalación v0.39 correcta.
2. Sobrescribe exactamente estos archivos:
   - style.css
   - version.js
   - config.js
   - app/index.html
   - app/sw.js
   - editor/index.html
   - editor/sw.js
3. Añade:
   - V0_40_CAMBIOS.txt
4. Conserva assets/bandalogo.jpg en su ubicación actual.

APP · BANDALOGO FLAG
- Eliminada visualmente la ondulación rígida rotateY/skew de v0.39.
- Nuevo FLAG tipo tela con filtro SVG turbulence + displacement, siguiendo el mockup aportado.
- Sway secundario muy leve; la deformación principal ocurre dentro de la imagen.
- Mantiene escala existente: 35% DESKTOP / 75% MOBILE.

NO TOCAR
- manifest.webmanifest de APP ni EDITOR.
- IDs PWA, scopes ni start_url.
- Supabase / SMTP / Edge Functions.
- tablas, buckets, auth ni roles.

VERSIÓN
- v0.40
