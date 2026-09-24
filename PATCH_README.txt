BANDA DE LA CALA · PATCH v0.38 DESDE v0.37
Fecha: 24/09/2026

APLICACIÓN
1. Parte de una instalación v0.37 correcta.
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
   - editor.css
3. Añade:
   - V0_38_CAMBIOS.txt
4. Conserva assets/bandalogo.jpg en su ubicación actual del repositorio.

EDITOR — LISTAS DE MATERIAL
- 1 a 4 tarjetas: se muestran enteras, sin scroll interno.
- 5 o más tarjetas: el viewport termina tras la cuarta tarjeta REAL y el resto se consulta mediante scroll interno.
- Se suman las alturas reales de las tarjetas y el espacio estructural necesario hasta el final de la cuarta; no se usa una altura fija estimada.
- En HISTÒRIC las cabeceras de periodo NO cuentan como una de las cuatro tarjetas.
- La medida se recalcula cuando cargan imágenes o cambia la geometría de las primeras tarjetas.

APP — LOGO
- bandalogo.jpg mantiene 35% en DESKTOP y 75% en MOBILE.
- Añadida animación suave, continua y loopeable tipo bandera ondeando.

NO TOCAR
- manifest.webmanifest de APP ni EDITOR.
- IDs PWA, scopes ni start_url.
- Supabase / SMTP / Edge Functions.
- tablas, buckets, auth ni roles.

VERSIÓN
- v0.38
