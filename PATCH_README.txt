BANDA DE LA CALA · v0.65 · PATCH DESDE v0.64

SOBRESCRIBIR:
- app.js
- version.js
- app/sw.js
- editor/sw.js

AÑADIR:
- V0_65_CAMBIOS.txt

SQL / SUPABASE:
- NO hay SQL nuevo.
- Mantener la infraestructura creada en v0.64 (archive_submissions + archive-submissions).

NO TOCAR:
- manifests / manifest IDs
- scopes PWA
- configuración SMTP
- Edge Functions existentes
- secrets
- configuración del backup GitHub

QA mínimo:
1. USER STANDARD abre ENVIAR MULTIMEDIA PER L'ARXIU.
2. Envía una imagen con ANY obligatorio.
3. La APP muestra confirmación correcta y limpia el formulario.
4. ADMIN/GESTOR comprueba que la imagen aparece en APORTACIONS > PENDENTS.
5. Revisar PENDENTS por si intentos anteriores de v0.64 ya hubieran quedado guardados.
