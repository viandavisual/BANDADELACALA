BANDA DE LA CALA · PATCH v0.49 DESDE v0.48
==========================================

SOBRESCRIBIR:
- app.js
- app/index.html
- app/sw.js
- editor.js
- editor/index.html
- editor/sw.js
- version.js

AÑADIR:
- V0_49_CAMBIOS.txt

NO TOCAR:
- manifests / IDs PWA / scopes / start_url
- Supabase / SMTP / Auth / Edge Function
- bases de datos / SQL
- assets

OBJETIVO PRINCIPAL:
El PLAYER usa ahora el mismo patrón de continuidad que Disturbing Player:
motor Audio persistente fuera del DOM + evento ended único + cambio directo de src + play().
