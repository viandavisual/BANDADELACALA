BANDA DE LA CALA · v0.66 · PATCH DESDE v0.65

SOBRESCRIBIR:
- app.js
- editor.js
- style.css
- editor.css
- supabase-client.js
- version.js
- editor/index.html
- app/sw.js
- editor/sw.js

AÑADIR:
- SUPABASE_UPDATE_v0.66.sql
- SUPABASE_v0.66_PASOS.txt
- V0_66_CAMBIOS.txt

SUPABASE:
- Ejecutar SUPABASE_UPDATE_v0.66.sql UNA SOLA VEZ antes de usar ELIMINAR DEFINITIVAMENT.
- No hace falta crear buckets nuevos ni desplegar Edge Functions.

NO TOCAR:
- manifests / IDs / scopes PWA
- auth / SMTP / invitaciones / recuperación de contraseña
- PLAYER y technical-end MP3
- backup-band-media
- lógica pública/privada de contenido
- minijuego diario
