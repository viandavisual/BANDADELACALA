BANDA DE LA CALA v0.54 — PATCH DES DE v0.53

Sobreescriure:
- editor.js
- supabase-client.js
- version.js
- app/sw.js
- editor/sw.js
- PATCH_README.txt

Afegir:
- V0_54_CAMBIOS.txt
- SUPABASE_v0.54_PASOS.txt
- SUPABASE_UPDATE_v0.54.sql
- EDGE_FUNCTION_BACKUP_MEDIA_v0.54.ts
- supabase/functions/backup-band-media/index.ts

No tocar:
- manifests PWA
- Auth / SMTP
- create-band-user
- dades/publicacions existents

Infraestructura:
- La configuració Supabase/GitHub del backup ja s'ha realitzat manualment.
- NO cal tornar a executar SQL ni recrear secrets/bucket/funció si continuen presents.
