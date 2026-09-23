BANDA DE LA CALA · PATCH v0.33 → v0.34

APLICACIÓN
Este PATCH se aplica sobre una instalación completa v0.33.

SOBRESCRIBIR
- app.js
- style.css
- version.js
- config.js
- README.txt
- PATCH_README.txt
- app/index.html
- app/sw.js
- editor/index.html
- editor/sw.js
- editor.js

AÑADIR
- V0_34_CAMBIOS.txt

NO TOCAR
- app/manifest.webmanifest
- editor/manifest.webmanifest
- assets/
- data/content-published.js
- content-store.js
- supabase-client.js
- archivos SQL y Edge Functions existentes

CAMBIOS v0.34
1. USER: el avatar activo sustituye al icono USER genérico cuando existe sesión válida, en navegación, HOME y cabecera.
2. USER: textos de PARTITURES, AVATAR, NOM y CONTRASENYA centrados.
3. PLAYER: todos los equalizers/barras del icono PLAYER están quietos sin reproducción y se animan sincronizados solo mientras una pista de la playlist suena realmente. Pausa, fin, buffering o MUTE detienen las barras.
4. PLAYER MOBILE: tarjeta del reproductor reorganizada verticalmente para mejorar jerarquía, centrado y espacio de controles.
5. PWA: version.js, cache-busting y caches actualizados a v0.34 sin modificar manifest IDs, scopes ni start_url.

SUPABASE
- No hay SQL nuevo que ejecutar en v0.34.
- No hay cambios de SMTP, AUTH, roles ni Edge Functions.
