BANDA DE LA CALA · v0.15 · SUPABASE
====================================

Aquesta versió introdueix sincronització central mitjançant Supabase.

APP (index.html)
- Continua sent pública.
- Llegeix el contingut oficial de Supabase.
- Manté una còpia local de l'últim contingut rebut com a fallback.
- Rep actualitzacions en temps real de la fila principal de contingut.

EDITOR (editor.html)
- Requereix login Supabase per editar.
- Els canvis desats s'envien a Supabase i passen a ser compartits.
- HOME: les imatges noves es pugen a Storage / app-images.
- HISTÒRIC: les fotografies noves es pugen a Storage / historic-media.
- PLAYER: els àudios nous es pugen a Storage / player-audio.
- Manté compatibilitat amb les pistes antigues allotjades a assets/AUDIO.
- SISTEMA inclou una migració única de les dades locals de versions anteriors.

PRIMERA INSTAL·LACIÓ
1. Executar SUPABASE_SETUP.sql al SQL Editor del projecte.
2. Crear/invitar un usuari a Authentication > Users.
3. Publicar la v0.15 a GitHub Pages.
4. Obrir editor.html, iniciar sessió i, si existeixen dades locals prèvies,
   executar MIGRAR DADES LOCALS A SUPABASE des de SISTEMA.

A partir d'aquest moment, els canvis de contingut NO requereixen GitHub.
GitHub només cal quan canvia el software (nova versió de la APP/EDITOR).
