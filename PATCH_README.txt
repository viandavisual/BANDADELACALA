BANDA DE LA CALA — PATCH v0.63 desde v0.62

SOBRESCRIBIR:
- app/index.html
- app.js
- supabase-client.js
- style.css
- version.js
- app/sw.js
- PATCH_README.txt

AÑADIR:
- V0_63_CAMBIOS.txt

NO TOCAR:
- editor/
- editor.js
- editor.css
- manifests APP/EDITOR
- config.js
- content-store.js
- datos/contenido
- Edge Functions existentes
- SQL existente
- Auth/SMTP/invitaciones existentes

SQL:
- No requiere SQL nuevo.

EDGE FUNCTIONS:
- No requiere desplegar ninguna Edge Function nueva.

CONFIGURACIÓN EXTERNA PENDIENTE ANTES DE USAR EN PRODUCCIÓN:
1. En Supabase Auth, permitir como Redirect URL la URL de recuperación de la APP.
2. Personalizar el template de email «Reset password / Recovery».
3. Hacer una prueba real con un USER ya registrado y comprobar que conserva su user_id/perfil/puntos.

COMPORTAMIENTO DE SEGURIDAD:
- La APP no revela si un email existe o no.
- Supabase solo envía el email de recuperación si esa dirección pertenece a una cuenta Auth existente.
- Un email no registrado no crea cuenta ni recibe acceso.
