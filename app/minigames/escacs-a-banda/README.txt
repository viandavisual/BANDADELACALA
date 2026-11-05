ESCACS A BANDA — v19
====================

Novetats respecte de v18:
- Les 4 icones de configuració del menú apareixen en UNA SOLA FILA:
  PLAYER vs CPU · PLAYER vs PLAYER · FÀCIL · NORMAL.
- Es mantenen les dues seleccions independents (tipus de partida i dificultat).
- Menú més compacte per evitar desplaçament vertical.
- Es conserven el mode únic horitzontal, l’avís de girar el dispositiu,
  l’àudio, el tauler, el HUD i el botó de sortida de v18.

PREPARAT PER A GITHUB / BANDA APP
--------------------------------
1. Copiar la carpeta escacs_a_banda_v19 completa a la ubicació
   desitjada del repositori, conservant els directoris assets/.
2. Publicar index.html juntament amb config.js, game.js i style.css.
3. Es pot obrir directament o dins d’un iframe de Banda App.
4. El botó «SURT DEL JOC» envia a la pàgina contenidora:
   { type: 'BANDA_MINIGAME_CLOSE', game: 'escacs-a-banda', action: 'close' }
   Banda App ha de gestionar aquest missatge per tancar l’iframe i tornar a MINIJOCS.
5. En una instal·lació en subcarpeta, enllaçar a index.html de la carpeta.

ESCACS A BANDA — v18
====================

Novetats respecte de v17:
- Menú: logo reduït per evitar scroll i conservar visibles tots els botons.
- HUD horitzontal: icones i text baixats 12 px dins de la caixa blava.
- Botó «SURT DEL JOC» al menú i al final de partida.
- Joc dins de BANDA APP: enviament al pare per postMessage:
  { type: 'BANDA_MINIGAME_CLOSE', game: 'escacs-a-banda', action: 'close' }
  La BANDA APP ha d'escoltar aquest missatge i tancar l'iframe / tornar a MINIJOCS.
- En mode independent, «SURT DEL JOC» mostra instruccions per tancar la pestanya.
- Mantenim el joc sempre horitzontal i el bloqueig de pantalla vertical.

IMPORTANT: el joc no navega mai sobre parent/top; per tancar un iframe cal que
la BANDA APP implementi el receptor indicat. No es modifica la BANDA APP amb
la present entrega.

ESCACS A BANDA — v0.7
====================

Versió jugable mobile-first.

NOVETATS v0.7
-------------
- Integrats els sons de totes les peces.
- El so d'una peça només es reprodueix quan el moviment legal comença realment.
- Durant la intro de muntatge, cada peça reprodueix el seu so en el moment d'entrar.
- El DIRECTOR disposa de tres àudios (king_1, king_2, king_3) seleccionats aleatòriament.
- El sistema evita repetir el mateix àudio del DIRECTOR dues vegades seguides.
- Els dos bàndols comparteixen el mateix so per tipus de peça.
- La promoció conserva el so del CLARINET, perquè és el peó qui realitza el moviment.

AUDIO DE PECES
--------------
assets/audio/pieces/
  bishop.mp3   -> Saxo tenor
  knight.mp3   -> Trombó
  pawn.mp3     -> Clarinet
  queen.mp3    -> Trompeta
  rook.mp3     -> Tuba
  king_1.mp3   -> Director (variant 1)
  king_2.mp3   -> Director (variant 2)
  king_3.mp3   -> Director (variant 3)

ESTRUCTURA PRINCIPAL
--------------------
index.html
style.css
game.js
config.js
assets/
  background/background.png
  video/pueblo.webm
  ui/escacs_logo.png
  ui/game_icon.png
  pieces/
  audio/pieces/

IMPORTANT — ASSETS
------------------
Els assets continuen separats en carpetes perquè es puguin substituir manualment
mantenint exactament els mateixos noms i rutes.

IMPORTANT — LOOP DEL POBLE
--------------------------
El vídeo està col·locat darrere de background.png i alineat amb la part superior del PNG.
El background té transparència a les finestres perquè el vídeo només sigui visible a través d'elles.

MODES
-----
FÀCIL: mostra els moviments legals de la peça seleccionada.
NORMAL: no mostra les caselles possibles.

PARTIDES
--------
1 PLAYER · CPU: jugador BLAU contra CPU ROJA.
2 PLAYERS: dos jugadors al mateix dispositiu.

REGLAMENT IMPLEMENTAT
---------------------
- Moviments legals d'escacs.
- Escac i escac i mat.
- Enroc.
- Captura al pas.
- Promoció de peó.
- Taules per ofegat.

EXECUCIÓ
--------
Es pot obrir index.html directament en un navegador modern.
Per a proves mòbils és preferible servir la carpeta amb HTTP local o publicar-la temporalment.


V0.8
- Los sonidos de pieza ya no se reproducen durante el montaje inicial.
- Musica de fondo en loop: assets/audio/music/music_bg.mp3.
- Boton de musica activa/desactiva el loop.
- ESCAC I MAT usa EQUIP BLAU / EQUIP ROIG y nueva celebracion luminosa.


v0.9: añadido sonido final de ESCAC I MAT, parada de música de fondo al mate y centrado vertical de la barra inferior.


v17: corregido bloqueo al producirse ESCAC I MAT; el audio final queda en ámbito global y la pantalla final vuelve a abrirse correctamente.


v17: añadida adaptación DESKTOP con detección automática, nuevo background horizontal y nuevo vídeo del pueblo para escritorio.


v17: nuevo background desktop definitivo, tablero desktop recalibrado, piezas al doble de tamaño en desktop y orientación izquierda/derecha específica para escritorio.


V0.14 — DESKTOP: graella recalibrada segons les caselles del nou background; peces i ajudes alineades, botons en columna dins la caixa blava, text recol·locat i vídeo complet sense franja negra.
