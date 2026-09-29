BANDA DE LA CALA · v0.71 · PATCH DES DE v0.70

SOBRESCRIBIR:
- app/index.html
- app.js
- app/sw.js
- editor/sw.js
- version.js
- PATCH_README.txt

AÑADIR:
- tuner.js
- tuner.css
- V0_71_CAMBIOS.txt

NO TOCAR:
- manifests APP/EDITOR
- Supabase / Auth / SMTP
- Edge Functions
- SQL
- buckets / policies

NO REQUIERE:
- SQL nuevo
- Edge Functions nuevas

QA RECOMENDADO:
1. Entrar con USER registrado.
2. Verificar AFINADOR entre PARTITURES y PUJAR FATO MULTIMEDIA.
3. Activar micro y aceptar permiso.
4. Probar varias notas sostenidas de instrumento/voz.
5. Comprobar nota, cents, Hz y GREU/AFINAT/AGUT.
6. Cerrar AFINADOR y verificar que el navegador deja de indicar uso del micrófono.
7. Probar permiso denegado.
8. Comprobar mobile + desktop.
