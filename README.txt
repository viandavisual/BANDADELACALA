BANDA DE LA CALA · PWA v0.9 · DEMO READY
==========================================

Aquesta versió està revisada específicament per mostrar-la des de GitHub Pages en MOBILE i DESKTOP.

ENTRADES
- index.html   -> APP pública
- editor.html  -> EDITOR local de continguts

ASSETS QUE HAS D'AFEGIR A LA CÒPIA REAL
- assets/intro.webm
- assets/AUDIO/introhimne.mp3
- Els MP3 reals del PLAYER dins assets/AUDIO/

IMPORTANT SOBRE GITHUB
- Puja EL CONTINGUT de la carpeta v0.9 a l'arrel del repositori.
- Mantén exactament les majúscules/minúscules de les rutes. La carpeta és assets/AUDIO (AUDIO en majúscules).
- GitHub Pages ha de servir index.html per HTTPS.
- No cal modificar start_url ni scope: són relatius i funcionen també si la web queda a https://usuari.github.io/repositori/.

EDITOR EN AQUESTA ETAPA
- L'Editor continua sent local: els canvis del navegador no publiquen automàticament a GitHub.
- Per publicar canvis globals, genera data/content-published.js des de SISTEMA i substitueix-lo al repositori.
- La connexió multiusuari/Supabase queda per a la fase posterior a l'aprovació de la demo.

MILLores TÈCNIQUES v0.9
- Cache PWA v0.9 independent de versions anteriors.
- Service Worker preparat per actualitzar JS/CSS/manifest des de xarxa quan hi ha connexió i usar caché offline com a fallback.
- Les peticions Range d'àudio/vídeo no passen per Cache Storage, evitant problemes de reproducció/seek del PLAYER.
- El Service Worker no depèn de intro.webm ni introhimne.mp3 per instal·lar-se: si falten, la PWA no queda bloquejada.
- Registre del Service Worker amb updateViaCache:none per detectar noves versions més ràpid.
- Intro robusta: error/rechazo del vídeo no bloqueja l'entrada a HOME.
- Calendari inicia sempre al mes actual.
- Icona Apple Touch de 180x180 afegida.
- Rutes comprovades com a relatives i compatibles amb subcarpeta de GitHub Pages.
- editor.html marcat noindex/nofollow (no és una mesura de seguretat; només evita indexació normal).

NOTA
editor.html continua sent accessible si algú coneix l'URL. Encara no hi ha autenticació; per a aquesta demo no pot modificar el contingut global del servidor. L'accés real per GESTORS arribarà amb Supabase/USERS.
