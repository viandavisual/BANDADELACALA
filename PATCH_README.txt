BANDA DE LA CALA · PATCH v0.30 → v0.31
======================================

SOBREESCRIBIR estos archivos del repositorio con los del PATCH:
- README.txt
- SUPABASE_SETUP.sql
- version.js
- config.js
- content-store.js
- app.js
- style.css
- editor.js
- editor.css
- data/content-published.js
- app/index.html
- app/sw.js
- editor/index.html
- editor/sw.js

AÑADIR estos archivos nuevos:
- SUPABASE_UPDATE_v0.31.sql
- SUPABASE_v0.31_PASOS.txt
- V0_31_CAMBIOS.txt

NO TOCAR / NO BORRAR:
- assets/ (incluido assets/avatar y todos los avatares que hayas añadido)
- manifests de APP y EDITOR
- Edge Function create-band-user
- archivos SQL históricos
- resto de recursos del repositorio

PASO SUPABASE OBLIGATORIO PARA HEMEROTECA PÚBLICA:
1. Supabase > SQL Editor.
2. Ejecutar una sola vez TODO SUPABASE_UPDATE_v0.31.sql.
3. No crear buckets nuevos. HEMEROTECA reutiliza historic-media.

CAMBIOS PRINCIPALES:
- HISTÒRIC abre/cierra cada período sin reconstruir ni recargar los demás.
- AVUI rojo con número blanco + punto azul/dorado si hay actividad.
- PAUSE/PLAY centrados geométricamente.
- AVATARS detectados dinámicamente desde assets/avatar del repo GitHub.
- Nueva HEMEROTECA: CARTELLS / NOTÍCIES / ENTREVISTES, gestionable desde EDITOR.

La arquitectura INSTALL estable de v0.23 y el flujo USERS estable de v0.29 se conservan.
