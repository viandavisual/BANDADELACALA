BANDA DE LA CALA · PATCH v0.37 DESDE v0.36
Fecha: 24/09/2026

APLICACIÓN
1. Parte de una instalación v0.36 correcta.
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
   - V0_37_CAMBIOS.txt
4. Conserva assets/bandalogo.jpg en su ubicación actual del repositorio.

APP
- bandalogo.jpg: 35% en DESKTOP; MOBILE conserva 75%.
- Avatar de USER: trazo azul marino circular real también en la cabecera del perfil.
- HOME: se ocultan únicamente los indicadores ACTIU; PROPERAMENT y ACCÉS se conservan.
- TANCAR SESSIÓ: rojo con texto blanco.
- DRESSCODE: sustituye el círculo blanco por un icono animado de ropa en azul/dorado.

EDITOR
- Sidebar DESKTOP: nombres de secciones al doble de tamaño.
- RESUM: títulos y cifras de las 4 cajas al doble de tamaño.
- Las 4 cifras entran mediante animación de contador desde 0.
- Listas de material gestionado (eventos, dresscodes, pistas, histórico, hemeroteca y usuarios): se muestran 4 elementos completos; a partir del 5º aparece scroll interno.
- CALENDARI: texto del campo dd/mm/aaaa al 50% de su escala anterior.
- MINIJOCS: solo icono de mando + PROPERAMENT.

NO TOCAR
- manifest.webmanifest de APP ni EDITOR.
- IDs PWA, scopes ni start_url.
- Supabase / SMTP / Edge Functions.
- tablas, buckets, auth ni roles.

VERSIÓN
- v0.37
