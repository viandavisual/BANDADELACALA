BANDA DE LA CALA · PATCH v0.15 -> v0.16
=======================================

ANTES DE SUBIR EL PATCH A GITHUB:
1) Ejecuta SUPABASE_UPDATE_v0.16.sql en Supabase > SQL Editor.

DESPUÉS, EN GITHUB SOBRESCRIBE:
- editor.html
- editor.js
- editor.css
- supabase-client.js
- version.js
- sw.js
- SUPABASE_PRIMEROS_PASOS.txt

NO HACE FALTA SUBIR SUPABASE_UPDATE_v0.16.sql A GITHUB.
NO TOCAR:
- index.html
- app.js
- style.css
- config.js
- assets/
- data/content-published.js

NOVEDADES:
- ENTRAR / REGISTRE NOU en EDITOR.
- Acceso como USUARI NO REGISTRAT en modo consulta.
- Nuevos registros = PENDING hasta autorización.
- RLS de Supabase reforzado: solo ADMIN/GESTOR puede publicar.
