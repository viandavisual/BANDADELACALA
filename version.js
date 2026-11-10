/* BANDA DE LA CALA · v0.148 · fons de les dues cards de MINIJOCS */
window.BANDA_VERSION = 'v0.148';
(function () {
  'use strict';
  const css = `
  /* Fons específic del menú de selecció; no afecta les pantalles dels jocs. */
  #gamesGrid .game-launch-card[data-open-minigame="QUINA_NOTA_ES"] {
    background: url('/assets/game-backgrounds/quina-nota-es.webp') center center / cover no-repeat !important;
  }
  #gamesGrid .game-launch-card[data-open-minigame="ESCACS_A_BANDA"] {
    background: url('/assets/game-backgrounds/escacs-a-banda.webp') center center / cover no-repeat !important;
  }
  /* Pastilles negres ajustades a les línies reals, sense enfosquir tota la card. */
  #gamesGrid .game-launch-card .game-launch-copy > strong,
  #gamesGrid .game-launch-card .game-launch-copy > small {
    background: rgba(0, 0, 0, .84) !important;
    color: #fff !important;
    border-radius: 7px;
    padding: 5px 9px;
    width: fit-content;
    max-width: 100%;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
    text-shadow: 0 1px 1px rgba(0,0,0,.5);
  }
  #gamesGrid .game-launch-card .game-launch-copy > small {
    line-height: 1.45 !important;
    margin-inline: auto;
    overflow-wrap: break-word;
  }
  #gamesGrid .game-launch-card .game-launch-copy > strong {
    line-height: 1.2 !important;
    margin-inline: auto;
  }
  @media(max-width:780px) {
    #gamesGrid .game-launch-card .game-launch-copy > strong,
    #gamesGrid .game-launch-card .game-launch-copy > small {
      padding: 4px 6px;
      border-radius: 5px;
    }
  }
  `;
  const inject = () => {
    if (document.getElementById('banda-games-backgrounds-v0148')) return;
    const sheet=document.createElement('style');
    sheet.id='banda-games-backgrounds-v0148';
    sheet.textContent=css;
    document.head.appendChild(sheet);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',inject,{once:true});
  else inject();
})();
