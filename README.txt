BANDA DE LA CALA · PWA v0.11
=============================

ENTRADES
- index.html   -> APP pública
- editor.html  -> EDITOR de continguts

NOVETAT v0.11 · HISTÒRIC
- HISTÒRIC ja és funcional a l'APP i a l'EDITOR.
- Períodes configurats:
  1980 - 1982 · Joaquim Arqués
  1982 - 1986 · Adolfo Cloquell
  1986 - 1990 · José Ramis
  1990 - 1999 · Àlex Castells (I)
  2000 - 2000 · Pere Bono
  2001 - 2004 · Àlex Castells (II)
  2005 - 2011 · Rubén Chordá
  2012 - Actualitat · Emilio Cabello
- Cada fotografia necessita ANY + PERÍODE.
- NOM/TÍTOL i DESCRIPCIÓ són opcionals.
- Els anys de canvi de director (1982, 1986, 1990) obliguen a triar manualment el període correcte.
- L'APP mostra una timeline vertical cronològica, adaptada a MOBILE i DESKTOP.
- Les imatges utilitzen lazy loading a l'APP.

IMPORTANT · FASE ABANS DE SUPABASE
- En aquesta v0.11 les fotos carregades des de l'EDITOR es comprimeixen i es guarden dins del contingut local del navegador.
- Per veure aquestes fotos en altres dispositius abans de Supabase, cal generar data/content-published.js des de SISTEMA i substituir aquest únic fitxer a GitHub.
- Quan connectem Supabase, el mateix selector de fotografia passarà a pujar els fitxers al Storage central i desapareixerà aquest pas manual.

ASSETS QUE HAS D'AFEGIR A LA CÒPIA REAL
- assets/intro.webm
- assets/AUDIO/introhimne.mp3
- Els àudios reals del PLAYER dins assets/AUDIO/

ACTUALITZACIONS
- El número de versió viu a version.js.
- Les entregues inclouen FULL + PATCH.
- Per canvis de software, puja només els fitxers indicats al PATCH.
- Per canvis de contingut abans de Supabase, normalment només cal actualitzar data/content-published.js.
