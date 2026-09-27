BANDA DE LA CALA · v0.64 · PATCH DESDE v0.63

SOBRESCRIBIR:
- app/index.html
- app/sw.js
- editor/index.html
- editor/sw.js
- app.js
- editor.js
- style.css
- editor.css
- content-store.js
- supabase-client.js
- version.js

AÑADIR:
- SUPABASE_UPDATE_v0.64.sql
- SUPABASE_v0.64_PASOS.txt
- V0_64_CAMBIOS.txt

SUPABASE — OBLIGATORIO UNA VEZ:
1. Abrir Supabase > SQL Editor.
2. Ejecutar SUPABASE_UPDATE_v0.64.sql completo.
3. No volver a ejecutar SQL anteriores.

NO TOCAR:
- manifests / manifest IDs
- scopes PWA
- configuración SMTP
- Edge Functions existentes
- secrets
- configuración del backup GitHub

QA mínimo:
- USER STANDARD envía FOTO HISTÒRIC.
- GESTOR/ADMIN la ve en APORTACIONS > PENDENTS.
- Validar y comprobar publicación en HISTÒRIC.
- Comprobar etiqueta ENVIADA PER ... abajo a la izquierda.
- Enviar CARTELL y validar en HEMEROTECA > CARTELLS.
- Rechazar otra imagen y restaurarla desde REBUTJATS.
