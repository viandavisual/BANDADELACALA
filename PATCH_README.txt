BANDA DE LA CALA · v0.19
PATCH DES DE v0.18
======================

IMPORTANT: abans de pujar els fitxers runtime a GitHub, configura Supabase.

A) SUPABASE · UNA SOLA VEGADA
-----------------------------
1. SQL Editor > New query
   Executa TOT el contingut de:
   SUPABASE_UPDATE_v0.19.sql

2. Authentication > General configuration
   Allow new users to sign up = OFF

3. Authentication > Providers > Email
   Email provider = ON

4. Edge Functions
   Crea/desplega una funció amb nom EXACTE:
   create-band-user

   Utilitza el codi de:
   EDGE_FUNCTION_CREATE_USER_v0.19.ts

   (També s'inclou create-band-user-edge-function.zip com a còpia del codi.)

Consulta SUPABASE_v0.19_PASOS.txt per al pas a pas.

B) GITHUB · SOBRESCRIURE
------------------------
Sobreescriu aquests fitxers mantenint exactament les rutes:

/index.html
/app.js
/style.css
/supabase-client.js
/editor/index.html
/editor.js
/editor.css
/editor/sw.js
/version.js
/sw.js

NO CAL TOCAR:
- assets/
- data/content-published.js
- config.js
- manifest.webmanifest
- editor/manifest.webmanifest
- iconografia ni àudios/fotos existents

NO CAL PUJAR A GITHUB:
- SUPABASE_UPDATE_v0.19.sql
- SUPABASE_v0.19_PASOS.txt
- EDGE_FUNCTION_CREATE_USER_v0.19.ts
- create-band-user-edge-function.zip

C) PROVA RÀPIDA
---------------
1. Entra a /BANDADELACALA/editor/ amb USER ADMIN.
2. Ha d'aparèixer la nova secció USUARIS.
3. Crea un USER STANDARD de prova.
4. El selector només ha d'oferir STANDARD o GESTOR, mai ADMIN.
5. Copia la contrasenya temporal que es mostra una sola vegada.
6. Confirma l'usuari des del mail d'invitació.
7. Entra a APP > USER amb el nou usuari.
8. El STANDARD ha de poder canviar la contrasenya.
9. Si aquest STANDARD intenta entrar a /editor/, ha de veure ACCÉS DENEGAT i no el contingut de l'EDITOR.
10. Sense sessió, la APP només ha de donar accés a HISTÒRIC, PLAYER i USER/login (a més de la HOME com a porta d'entrada).
