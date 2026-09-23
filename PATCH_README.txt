BANDA DE LA CALA · v0.35
PATCH DESDE v0.34

SOBRESCRIBIR:
- app.js
- style.css
- editor.css
- version.js
- app/index.html
- app/sw.js
- editor/index.html
- editor/sw.js

AÑADIR:
- V0_35_CAMBIOS.txt

ASSET YA EXISTENTE EN EL PROYECTO:
- assets/bandalogo.jpg
  La v0.35 lo referencia en HOME y USER. Este archivo no venía dentro del FULL v0.34 recibido, por lo que no se incluye en este PATCH. Debe conservarse en esa ruta del repositorio.

NO TOCAR:
- app/manifest.webmanifest
- editor/manifest.webmanifest
- manifest.webmanifest
- editor-manifest.webmanifest
- Supabase / Edge Functions / SQL
- configuración SMTP
- assets de audio existentes

CAMBIOS PRINCIPALES:
1) PLAYER: las barras de TODOS los iconos PLAYER se animan solo cuando el audio real de la playlist está reproduciéndose y es audible; quedan quietas en pausa, espera, fin o MUTE.
2) EDITOR / DRESSCODE: eliminado el texto auxiliar indicado y desplegables de prendas compactados aproximadamente al 50%.
3) CALENDARI MOBILE: calendario y detalle compactados para reducir scroll; DESKTOP no cambia.
4) HOME + USER: añadido assets/bandalogo.jpg en las posiciones solicitadas.
5) USER: borde azul marino corporativo en avatares circulares activos.
6) PWA: versión/cache actualizada a v0.35 sin cambiar IDs, scopes ni start_url.
