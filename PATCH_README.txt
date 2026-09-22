BANDA DE LA CALA · PATCH v0.14 -> v0.15
=========================================

ANTES DE PUBLICAR
1) Abre Supabase > SQL Editor.
2) Ejecuta TODO el contenido de SUPABASE_SETUP.sql.
3) Supabase > Authentication > Users > Add user y crea tu usuario del EDITOR.

EN GITHUB
SOBRESCRIBIR:
- index.html
- editor.html
- app.js
- editor.js
- style.css
- editor.css
- config.js
- content-store.js
- sw.js
- version.js
- README.txt
- GITHUB_PAGES_CHECKLIST.txt

AÑADIR:
- supabase-client.js

ARCHIVOS DE CONFIGURACIÓN (no es obligatorio publicarlos):
- SUPABASE_SETUP.sql
- SUPABASE_PRIMEROS_PASOS.txt

NO TOCAR:
- data/content-published.js
- assets/AUDIO/
- tus fotografías / assets existentes
- iconos y logos existentes

PRIMER ARRANQUE
- Abre editor.html.
- Inicia sesión.
- Ve a SISTEMA.
- Pulsa MIGRAR DADES LOCALS A SUPABASE.
- Cuando termine, Supabase será la fuente oficial.
- Desde ese momento NO hay que tocar GitHub para cambiar calendario, PLAYER,
  HISTÒRIC, DRESSCODE o imagen HOME.

NOTA
La Publishable Key de Supabase está en config.js y puede estar en código cliente.
Nunca añadas una sb_secret_... ni una service_role key al repositorio.
