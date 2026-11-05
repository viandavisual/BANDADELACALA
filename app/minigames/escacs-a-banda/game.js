(() => {
'use strict';

const CONFIGS = window.EAB_CONFIG.layouts;
const IS_DESKTOP = true;
const LAYOUT = 'desktop';
const C = CONFIGS[LAYOUT];
const W = C.canvas.width, H = C.canvas.height;
document.body.classList.add('desktop');
document.body.classList.remove('mobile');
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const svg = $('#boardHit');
const layer = $('#piecesLayer');
const townVideo = $('#townVideo');
const backgroundImg = $('#background');
const statusText = $('#statusText');
const menu = $('#menu');
const promotionModal = $('#promotion');
const gameOverModal = $('#gameOver');
const toastEl = $('#toast');
const stage = $('#stage');
const stageWrap = $('#stageWrap');
const introFlash = $('#introFlash');
const introGlow = $('#introGlow');
const mateBurst = $('#mateBurst');
const musicBtn = $('#musicBtn');
const rotateOverlay = $('#rotateOverlay');
const bootSplash = $('#bootSplash');
let bootClosed=false;
function closeBootSplash(){
  if(bootClosed) return;
  bootClosed=true;
  bootSplash?.classList.add('closing');
  setTimeout(()=>bootSplash?.remove(),260);
}
setTimeout(closeBootSplash,1760);
bootSplash?.addEventListener('pointerup',closeBootSplash,{once:true});

document.title = 'ESCACS A BANDA · v19';
stage.setAttribute('data-layout', LAYOUT);
stage.style.width = '100%';
stage.style.height = '100%';
svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
backgroundImg.src = C.background;

function fitStageWrap(){
  const pad = 20;
  const maxW = window.innerWidth - pad*2;
  const maxH = window.innerHeight - pad*2;
  const ratio = W / H;
  let width = maxW;
  let height = width / ratio;
  if(height > maxH){
    height = maxH;
    width = height * ratio;
  }
  stageWrap.style.width = `${Math.floor(width)}px`;
  stageWrap.style.height = `${Math.floor(height)}px`;
}
fitStageWrap();
window.addEventListener('resize', fitStageWrap);

townVideo.src = C.video.src;
townVideo.style.left = `${C.video.left / W * 100}%`;
townVideo.style.top = `${C.video.top / H * 100}%`;
townVideo.style.width = `${C.video.width / W * 100}%`;
townVideo.style.height = `${C.video.height / H * 100}%`;
townVideo.style.objectFit = C.video.objectFit || 'cover';
townVideo.style.objectPosition = C.video.objectPosition || 'center center';
townVideo.play().catch(()=>{});

typeCheckConfig();
function typeCheckConfig(){
  if(!C || !C.grid) throw new Error('Falta EAB_CONFIG.grid');
}

function updateRotateOverlay(){
  const needsRotate = window.innerHeight > window.innerWidth;
  rotateOverlay?.classList.toggle('open', needsRotate);
  stage.classList.toggle('blocked-rotate', needsRotate);
}
updateRotateOverlay();
window.addEventListener('resize', updateRotateOverlay);
window.addEventListener('orientationchange', updateRotateOverlay);

let settings = { opponent:'cpu', difficulty:'easy' };
let game = null;
let selected = null;
let selectedMoves = [];
let pendingPromotion = null;
let cpuThinking = false;
let toastTimer = null;
let gameStarted = false;
let introRunning = false;
const INTRO_STAGGER_MS = 300;
const INTRO_PIECE_MS = 640;

const PIECE_NAME = {k:'DIRECTOR',q:'TROMPETA',r:'TUBA',b:'SAXO TENOR',n:'TROMBÓ',p:'CLARINET'};
const VALUE = {p:100,n:320,b:330,r:500,q:900,k:20000};


const PIECE_AUDIO = {
  q: ['assets/audio/pieces/queen.mp3'],
  r: ['assets/audio/pieces/rook.mp3'],
  b: ['assets/audio/pieces/bishop.mp3'],
  n: ['assets/audio/pieces/knight.mp3'],
  p: ['assets/audio/pieces/pawn.mp3'],
  k: [
    'assets/audio/pieces/king_1.mp3',
    'assets/audio/pieces/king_2.mp3',
    'assets/audio/pieces/king_3.mp3'
  ]
};
let lastKingSoundIndex = -1;
let pieceAudioPrimed = false;

const MUSIC_SRC='assets/audio/music/music_bg.mp3';
const bgMusic=new Audio(MUSIC_SRC);
bgMusic.loop=true;
bgMusic.preload='auto';
bgMusic.volume=0.30;
let musicEnabled=true;

function syncMusicButton(){
  musicBtn.textContent=musicEnabled?'♪':'×';
  musicBtn.setAttribute('aria-label',musicEnabled?'Desactivar música':'Activar música');
  musicBtn.classList.toggle('muted',!musicEnabled);
}
function restartMusic(){
  // Cada nova partida comença amb la música des del primer segon.
  bgMusic.pause();
  try { bgMusic.currentTime = 0; } catch (_) {}
  startMusic();
}
function startMusic(){
  if(!musicEnabled) return;
  if(bgMusic.ended) bgMusic.currentTime=0;
  bgMusic.play().catch(()=>{});
}
function toggleMusic(){
  musicEnabled=!musicEnabled;
  if(musicEnabled) startMusic(); else bgMusic.pause();
  syncMusicButton();
}

const CHECKMATE_SRC='assets/audio/sfx/checkmate.mp3';
const checkmateAudio=new Audio(CHECKMATE_SRC);
checkmateAudio.preload='auto';
checkmateAudio.volume=0.92;

function playCheckmateSound(){
  try{
    checkmateAudio.pause();
    checkmateAudio.currentTime=0;
    checkmateAudio.play().catch(()=>{});
  }catch(e){}
}

syncMusicButton();

function choosePieceSound(type){
  const list=PIECE_AUDIO[type];
  if(!list?.length) return null;
  if(type!=='k' || list.length===1) return list[0];
  const choices=list.map((src,i)=>({src,i})).filter(x=>x.i!==lastKingSoundIndex);
  const pick=choices[Math.floor(Math.random()*choices.length)] || {src:list[0],i:0};
  lastKingSoundIndex=pick.i;
  return pick.src;
}

function playPieceSound(type,volume=0.92){
  const src=choosePieceSound(type);
  if(!src) return;
  const audio=new Audio(src);
  audio.preload='auto';
  audio.volume=volume;
  audio.play().catch(()=>{});
}

function primePieceAudio(){
  if(pieceAudioPrimed) return;
  pieceAudioPrimed=true;
  const unique=[...new Set(Object.values(PIECE_AUDIO).flat())];
  unique.forEach(src=>{
    const a=new Audio(src);
    a.preload='auto';
    a.muted=true;
    const play=a.play();
    if(play?.then){
      play.then(()=>{a.pause();a.currentTime=0;a.muted=false;}).catch(()=>{});
    }
  });
}

function initialGame(){
  let id=0;
  const board=Array.from({length:8},()=>Array(8).fill(null));
  const back=['r','n','b','q','k','b','n','r'];
  for(let c=0;c<8;c++){
    board[0][c]={id:`p${++id}`,color:'b',type:back[c]};
    board[1][c]={id:`p${++id}`,color:'b',type:'p'};
    board[6][c]={id:`p${++id}`,color:'w',type:'p'};
    board[7][c]={id:`p${++id}`,color:'w',type:back[c]};
  }
  return {
    board, turn:'w', castling:{K:true,Q:true,k:true,q:true}, ep:null,
    lastMove:null, gameOver:false, result:null, ply:0
  };
}

function cloneGame(g){
  return {
    board:g.board.map(row=>row.map(p=>p?{...p}:null)),
    turn:g.turn,
    castling:{...g.castling}, ep:g.ep?{...g.ep}:null,
    lastMove:g.lastMove?{from:{...g.lastMove.from},to:{...g.lastMove.to}}:null,
    gameOver:g.gameOver, result:g.result, ply:g.ply
  };
}

function other(color){ return color==='w'?'b':'w'; }
function inside(r,c){ return r>=0&&r<8&&c>=0&&c<8; }
function key(r,c){ return `${r},${c}`; }

function boardDisplayCoords(r,c){
  return {r,c};
}
function boardLogicalCoords(displayR,displayC){
  return {r:displayR,c:displayC};
}

function gridX(lineIndex, y){
  const G=C.grid;
  const y0=G.y[0], y1=G.y[G.y.length-1];
  const t=(y-y0)/(y1-y0);
  return G.xTop[lineIndex] + (G.xBottom[lineIndex]-G.xTop[lineIndex])*t;
}

function squareCorners(r,c){
  const G=C.grid;
  const d=boardDisplayCoords(r,c);
  const y0=G.y[d.r], y1=G.y[d.r+1];
  return [
    {x:gridX(d.c,y0),   y:y0},
    {x:gridX(d.c+1,y0), y:y0},
    {x:gridX(d.c+1,y1), y:y1},
    {x:gridX(d.c,y1),   y:y1}
  ];
}
function squareAnchor(r,c){
  const pts=squareCorners(r,c);
  // bottom-center of the square; sprites anchor to this line.
  return {x:(pts[2].x+pts[3].x)/2,y:(pts[2].y+pts[3].y)/2 + C.pieces.anchorBottomOffset};
}
function squareCenter(r,c){
  const pts=squareCorners(r,c);
  return {x:pts.reduce((s,p)=>s+p.x,0)/4,y:pts.reduce((s,p)=>s+p.y,0)/4};
}
function pieceWidthForRow(r,c){
  const d=boardDisplayCoords(r,c);
  const t=d.r/7;
  return C.pieces.baseWidth*(C.pieces.farScale+(C.pieces.nearScale-C.pieces.farScale)*t);
}

function makeBoardSVG(){
  svg.innerHTML='';
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const pts=squareCorners(r,c);
    const poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');
    poly.setAttribute('points',pts.map(p=>`${p.x},${p.y}`).join(' '));
    poly.setAttribute('class','board-cell');
    poly.dataset.r=r; poly.dataset.c=c;
    poly.addEventListener('pointerup',()=>onSquareTap(r,c));
    svg.appendChild(poly);
  }
}

function assetFor(p){
  const color=p.color==='w'?'blue':'red';
  const map={k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
  return `assets/pieces/${color}_${map[p.type]}.png`;
}

function ensurePieceElement(p){
  let el=document.getElementById(`piece-${p.id}`);
  if(!el){
    el=document.createElement('img');
    el.id=`piece-${p.id}`;
    el.className='piece';
    el.alt=''; el.draggable=false;
    layer.appendChild(el);
  }
  const src=assetFor(p);
  if(!el.src.endsWith(src)) el.src=src;
  return el;
}

function syncPieces(movedId=null,capturedId=null){
  const live=new Set();
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=game.board[r][c]; if(!p) continue;
    live.add(p.id);
    const el=ensurePieceElement(p);
    const a=squareAnchor(r,c);
    el.style.left=`${a.x/W*100}%`;
    el.style.top=`${a.y/H*100}%`;
    el.style.width=`${pieceWidthForRow(r,c)/W*100}%`;
    const d=boardDisplayCoords(r,c);
    el.style.zIndex=String(100+d.r*10+d.c);
    el.classList.toggle('selected',!!selected&&selected.r===r&&selected.c===c);
    if(p.id===movedId){el.classList.add('moving');setTimeout(()=>el.classList.remove('moving'),C.movement.durationMs+40);}
  }
  [...layer.querySelectorAll('.piece')].forEach(el=>{
    const id=el.id.replace('piece-','');
    if(!live.has(id)){
      if(id===capturedId){el.classList.add('captured');setTimeout(()=>el.remove(),220);} else el.remove();
    }
  });
}

function clearHints(){
  $$('.board-cell').forEach(el=>el.classList.remove('legal','capture','last','check'));
}
function updateHighlights(){
  clearHints();
  if(game.lastMove){
    cellEl(game.lastMove.from.r,game.lastMove.from.c)?.classList.add('last');
    cellEl(game.lastMove.to.r,game.lastMove.to.c)?.classList.add('last');
  }
  const k=findKing(game,game.turn);
  if(k && isSquareAttacked(game,k.r,k.c,other(game.turn))) cellEl(k.r,k.c)?.classList.add('check');
  if(settings.difficulty==='easy' && selected){
    selectedMoves.forEach(m=>cellEl(m.to.r,m.to.c)?.classList.add(m.capture?'capture':'legal'));
  }
}
function cellEl(r,c){ return svg.querySelector(`[data-r="${r}"][data-c="${c}"]`); }

function updateStatus(extra=''){
  if(!gameStarted){statusText.textContent='ESCACS A BANDA';return;}
  if(game.gameOver){statusText.textContent=game.result||'FINAL';return;}
  const side=game.turn==='w'?'BLAU':'ROIG';
  const mode=settings.difficulty==='easy'?'FÀCIL':'NORMAL';
  const thinking=cpuThinking?' · CPU...':'';
  statusText.textContent=`TORN ${side} · ${mode}${thinking}${extra}`;
}

function onSquareTap(r,c){
  if(!gameStarted || game.gameOver || cpuThinking || introRunning || promotionModal.classList.contains('open')) return;
  if(settings.opponent==='cpu' && game.turn==='b') return;
  const p=game.board[r][c];
  if(selected){
    const move=selectedMoves.find(m=>m.to.r===r&&m.to.c===c);
    if(move){requestMove(move);return;}
    if(p && p.color===game.turn){selectSquare(r,c);return;}
    selected=null;selectedMoves=[];syncPieces();updateHighlights();
    if(settings.difficulty==='normal') flash('MOVIMENT NO VÀLID');
    return;
  }
  if(p && p.color===game.turn) selectSquare(r,c);
}

function selectSquare(r,c){
  selected={r,c};
  selectedMoves=legalMovesFrom(game,r,c);
  syncPieces(); updateHighlights();
  const p=game.board[r][c];
  updateStatus(` · ${PIECE_NAME[p.type]}`);
}

function requestMove(move){
  if(move.promotion && game.board[move.from.r][move.from.c].color==='w' && settings.opponent!=='cpu'){
    pendingPromotion=move; promotionModal.classList.add('open'); return;
  }
  if(move.promotion && game.board[move.from.r][move.from.c].color==='w' && settings.opponent==='cpu'){
    pendingPromotion=move; promotionModal.classList.add('open'); return;
  }
  executeHumanMove(move);
}

function executeHumanMove(move,promo='q'){
  const movingPiece=game.board[move.from.r][move.from.c];
  const cap = move.enPassant ? game.board[move.from.r][move.to.c] : game.board[move.to.r][move.to.c];
  playPieceSound(movingPiece.type);
  applyMove(game,{...move,promo});
  selected=null; selectedMoves=[];
  syncPieces(movingPiece.id,cap?.id||null);
  updateHighlights(); checkEnd(); updateStatus();
  if(!game.gameOver && settings.opponent==='cpu' && game.turn==='b') setTimeout(cpuMove,520);
}

$$('[data-promo]').forEach(btn=>btn.addEventListener('click',()=>{
  if(!pendingPromotion) return;
  const m=pendingPromotion; pendingPromotion=null; promotionModal.classList.remove('open');
  executeHumanMove(m,btn.dataset.promo);
}));

function pseudoMovesFrom(g,r,c,attacksOnly=false){
  const p=g.board[r][c]; if(!p) return [];
  const out=[];
  const push=(rr,cc,extra={})=>{
    if(!inside(rr,cc))return false;
    const target=g.board[rr][cc];
    if(target&&target.color===p.color)return false;
    out.push({from:{r,c},to:{r:rr,c:cc},capture:!!target,...extra});
    return !target;
  };
  if(p.type==='p'){
    const d=p.color==='w'?-1:1, start=p.color==='w'?6:1, promote=p.color==='w'?0:7;
    if(attacksOnly){
      for(const dc of [-1,1]) if(inside(r+d,c+dc)) out.push({from:{r,c},to:{r:r+d,c:c+dc},capture:!!g.board[r+d][c+dc]});
      return out;
    }
    if(inside(r+d,c)&&!g.board[r+d][c]){
      out.push({from:{r,c},to:{r:r+d,c},promotion:r+d===promote});
      if(r===start&&!g.board[r+2*d][c]) out.push({from:{r,c},to:{r:r+2*d,c},doublePawn:true});
    }
    for(const dc of [-1,1]){
      const rr=r+d,cc=c+dc;if(!inside(rr,cc))continue;
      const t=g.board[rr][cc];
      if(t&&t.color!==p.color) out.push({from:{r,c},to:{r:rr,c:cc},capture:true,promotion:rr===promote});
      else if(g.ep&&g.ep.r===rr&&g.ep.c===cc) out.push({from:{r,c},to:{r:rr,c:cc},capture:true,enPassant:true,promotion:rr===promote});
    }
  } else if(p.type==='n'){
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>push(r+dr,c+dc));
  } else if(p.type==='b'||p.type==='r'||p.type==='q'){
    const dirs=[];
    if(p.type==='b'||p.type==='q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
    if(p.type==='r'||p.type==='q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
    dirs.forEach(([dr,dc])=>{let rr=r+dr,cc=c+dc;while(inside(rr,cc)){if(!push(rr,cc))break;rr+=dr;cc+=dc;}});
  } else if(p.type==='k'){
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc)push(r+dr,c+dc);
    if(!attacksOnly){
      const enemy=other(p.color), home=p.color==='w'?7:0;
      if(r===home&&c===4&&!isSquareAttacked(g,r,c,enemy)){
        const K=p.color==='w'?'K':'k', Q=p.color==='w'?'Q':'q';
        if(g.castling[K]&&!g.board[home][5]&&!g.board[home][6]&&g.board[home][7]?.type==='r'&&g.board[home][7]?.color===p.color&&
           !isSquareAttacked(g,home,5,enemy)&&!isSquareAttacked(g,home,6,enemy)) out.push({from:{r,c},to:{r:home,c:6},castle:'K'});
        if(g.castling[Q]&&!g.board[home][1]&&!g.board[home][2]&&!g.board[home][3]&&g.board[home][0]?.type==='r'&&g.board[home][0]?.color===p.color&&
           !isSquareAttacked(g,home,3,enemy)&&!isSquareAttacked(g,home,2,enemy)) out.push({from:{r,c},to:{r:home,c:2},castle:'Q'});
      }
    }
  }
  return out;
}

function findKing(g,color){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(g.board[r][c]?.color===color&&g.board[r][c].type==='k')return {r,c};
  return null;
}
function isSquareAttacked(g,r,c,byColor){
  for(let rr=0;rr<8;rr++)for(let cc=0;cc<8;cc++){
    const p=g.board[rr][cc]; if(!p||p.color!==byColor)continue;
    const ms=pseudoMovesFrom(g,rr,cc,true);
    if(ms.some(m=>m.to.r===r&&m.to.c===c))return true;
  }
  return false;
}
function legalMovesFrom(g,r,c){
  const p=g.board[r][c]; if(!p||p.color!==g.turn)return [];
  return pseudoMovesFrom(g,r,c,false).filter(m=>{
    const x=cloneGame(g); applyMove(x,{...m,promo:'q'},false);
    const k=findKing(x,p.color); return k && !isSquareAttacked(x,k.r,k.c,other(p.color));
  });
}
function allLegalMoves(g,color=g.turn){
  const old=g.turn; g.turn=color;
  const out=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(g.board[r][c]?.color===color)out.push(...legalMovesFrom(g,r,c));
  g.turn=old; return out;
}

function applyMove(g,m,advance=true){
  const p=g.board[m.from.r][m.from.c]; if(!p)return;
  const target=g.board[m.to.r][m.to.c];
  // Update castling rights on rook capture.
  if(target?.type==='r') revokeRookRight(g,target.color,m.to.r,m.to.c);
  g.board[m.from.r][m.from.c]=null;
  if(m.enPassant) g.board[m.from.r][m.to.c]=null;
  g.board[m.to.r][m.to.c]=p;
  if(m.castle){
    const row=m.to.r;
    if(m.to.c===6){g.board[row][5]=g.board[row][7];g.board[row][7]=null;}
    else {g.board[row][3]=g.board[row][0];g.board[row][0]=null;}
  }
  if(p.type==='k'){
    if(p.color==='w'){g.castling.K=false;g.castling.Q=false;}else{g.castling.k=false;g.castling.q=false;}
  }
  if(p.type==='r') revokeRookRight(g,p.color,m.from.r,m.from.c);
  if(m.promotion) p.type=m.promo||'q';
  g.ep=m.doublePawn?{r:(m.from.r+m.to.r)/2,c:m.from.c}:null;
  g.lastMove={from:{...m.from},to:{...m.to}};
  if(advance){g.turn=other(g.turn);g.ply++;}
}
function revokeRookRight(g,color,r,c){
  if(color==='w'&&r===7&&c===0)g.castling.Q=false;
  if(color==='w'&&r===7&&c===7)g.castling.K=false;
  if(color==='b'&&r===0&&c===0)g.castling.q=false;
  if(color==='b'&&r===0&&c===7)g.castling.k=false;
}

function checkEnd(){
  const moves=allLegalMoves(game,game.turn);
  if(moves.length)return false;
  const k=findKing(game,game.turn);
  const checked=k&&isSquareAttacked(game,k.r,k.c,other(game.turn));
  game.gameOver=true;
  if(checked){
    const winner=other(game.turn)==='w'?'EQUIP BLAU':'EQUIP ROIG';
    game.result=`ESCAC I MAT · ${winner}`;
    $('#gameOverTitle').textContent='ESCAC I MAT';
    $('#gameOverText').textContent=`Guanya ${winner}.`;
    bgMusic.pause();
    playCheckmateSound();
    setTimeout(()=>showCheckmateCelebration(),360);
  } else {
    game.result='TAULES'; $('#gameOverTitle').textContent='TAULES'; $('#gameOverText').textContent='No hi ha cap moviment legal.';
    gameOverModal.classList.remove('checkmate');
  }
  setTimeout(()=>gameOverModal.classList.add('open'),430);
  return true;
}

function showCheckmateCelebration(){
  gameOverModal.classList.add('checkmate');
  mateBurst?.classList.remove('active');
  void mateBurst?.offsetWidth;
  mateBurst?.classList.add('active');
  setTimeout(()=>mateBurst?.classList.remove('active'),2600);
}

function cpuMove(){
  if(game.gameOver||game.turn!=='b')return;
  cpuThinking=true;updateStatus();
  setTimeout(()=>{
    const moves=allLegalMoves(game,'b');
    if(!moves.length){cpuThinking=false;checkEnd();updateStatus();return;}
    // Depth 2: responsive on mobile, with slight randomness among near-equal moves.
    let best=-Infinity, choices=[];
    for(const m of moves){
      const x=cloneGame(game);applyMove(x,{...m,promo:'q'});
      const s=minimax(x,1,-Infinity,Infinity,false);
      if(s>best+3){best=s;choices=[m];} else if(Math.abs(s-best)<=3) choices.push(m);
    }
    const move=choices[Math.floor(Math.random()*choices.length)]||moves[0];
    const moving=game.board[move.from.r][move.from.c];
    const cap=move.enPassant?game.board[move.from.r][move.to.c]:game.board[move.to.r][move.to.c];
    playPieceSound(moving.type);
    applyMove(game,{...move,promo:'q'});
    cpuThinking=false;syncPieces(moving.id,cap?.id||null);updateHighlights();checkEnd();updateStatus();
  },80);
}
function minimax(g,depth,alpha,beta,maximizing){
  if(depth===0)return evaluate(g);
  const moves=allLegalMoves(g,g.turn);
  if(!moves.length){
    const k=findKing(g,g.turn); const chk=k&&isSquareAttacked(g,k.r,k.c,other(g.turn));
    if(chk)return g.turn==='b'?-999999:999999;
    return 0;
  }
  if(maximizing){
    let v=-Infinity;for(const m of moves){const x=cloneGame(g);applyMove(x,{...m,promo:'q'});v=Math.max(v,minimax(x,depth-1,alpha,beta,false));alpha=Math.max(alpha,v);if(beta<=alpha)break;}return v;
  } else {
    let v=Infinity;for(const m of moves){const x=cloneGame(g);applyMove(x,{...m,promo:'q'});v=Math.min(v,minimax(x,depth-1,alpha,beta,true));beta=Math.min(beta,v);if(beta<=alpha)break;}return v;
  }
}
function evaluate(g){
  let score=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=g.board[r][c];if(!p)continue;
    let v=VALUE[p.type];
    // Tiny positional preference toward centre, enough to avoid purely random play.
    const center=3.5-(Math.abs(3.5-r)+Math.abs(3.5-c))/2;
    v+=center*3;
    score+=(p.color==='b'?1:-1)*v;
  }
  return score;
}

function startGame(){
  game=initialGame(); gameStarted=true; selected=null;selectedMoves=[];pendingPromotion=null;cpuThinking=false;
  gameOverModal.classList.remove('open','checkmate');mateBurst?.classList.remove('active');promotionModal.classList.remove('open');menu.classList.remove('open');
  makeBoardSVG(); syncPieces(); updateHighlights(); updateStatus();
  runNewGameIntro();
}

function runNewGameIntro(){
  introRunning=true;
  stage.classList.add('intro-running');
  const ordered=[];
  // Red band enters first from the back of the stage, then blue band from the foreground.
  for(const r of [0,1,6,7]){
    for(let c=0;c<8;c++){
      const p=game.board[r][c];
      if(p) ordered.push({el:document.getElementById(`piece-${p.id}`),color:p.color,type:p.type});
    }
  }
  ordered.forEach(({el,color})=>{
    if(!el) return;
    el.classList.remove('selected','moving','intro-enter');
    el.classList.add('intro-wait');
    if(IS_DESKTOP){
      el.style.setProperty('--intro-from-y', '0px');
      el.style.setProperty('--intro-from-x', color==='b' ? '125px' : '-125px');
    }else{
      el.style.setProperty('--intro-from-x', '0px');
      el.style.setProperty('--intro-from-y', color==='b' ? '-105px' : '105px');
    }
  });

  introFlash.classList.remove('active');
  introGlow.classList.remove('active');
  void introFlash.offsetWidth;
  introFlash.classList.add('active');

  ordered.forEach(({el,type},i)=>{
    if(!el) return;
    setTimeout(()=>{
      el.classList.remove('intro-wait');
      el.classList.add('intro-enter');
      setTimeout(()=>el.classList.remove('intro-enter'),INTRO_PIECE_MS+30);
    },i*INTRO_STAGGER_MS);
  });

  const finishAt=Math.max(0,(ordered.length-1)*INTRO_STAGGER_MS)+INTRO_PIECE_MS;
  setTimeout(()=>{
    introGlow.classList.remove('active');
    void introGlow.offsetWidth;
    introGlow.classList.add('active');
    flash('PARTIDA PREPARADA');
    introRunning=false;
    stage.classList.remove('intro-running');
    updateHighlights();updateStatus();
  },finishAt+70);
  setTimeout(()=>introFlash.classList.remove('active'),3050);
  setTimeout(()=>introGlow.classList.remove('active'),finishAt+1350);
}

function flash(msg){
  clearTimeout(toastTimer);toastEl.textContent=msg;toastEl.classList.add('show');
  toastTimer=setTimeout(()=>toastEl.classList.remove('show'),900);
}

function wireSegmented(id,keyName){
  const wrap=$(id);wrap.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
    wrap.querySelectorAll('button').forEach(x=>{x.classList.remove('selected');x.setAttribute('aria-pressed','false')});btn.classList.add('selected');btn.setAttribute('aria-pressed','true');settings[keyName]=btn.dataset.value;
  }));
}
wireSegmented('#playersChoice','opponent');wireSegmented('#difficultyChoice','difficulty');
$('#playBtn').addEventListener('click',()=>{primePieceAudio();restartMusic();startGame();});
$('#againBtn').addEventListener('click',()=>{primePieceAudio();restartMusic();gameOverModal.classList.remove('open','checkmate');startGame();});
$('#menuBtn').addEventListener('click',()=>{
  if(!gameStarted)return menu.classList.add('open');
  $('#playBtn').classList.add('hidden');$('#resumeBtn').classList.remove('hidden');$('#restartBtn').classList.remove('hidden');menu.classList.add('open');
});
$('#resumeBtn').addEventListener('click',()=>menu.classList.remove('open'));
$('#restartBtn').addEventListener('click',()=>{primePieceAudio();restartMusic();startGame();});

// Integració amb BANDA APP: la pàgina embeguda demana al contenidor que la tanqui.
// El contenidor gestiona el retorn a MINIJOCS. Mai es navega sobre parent/top.
function exitGame(){
  bgMusic.pause();
  townVideo.pause();
  if(window.parent !== window){
    window.parent.postMessage({type:'BANDA_MINIGAME_CLOSE',game:'escacs-a-banda',action:'close'}, '*');
    return;
  }
  $('#closeStandalone').classList.add('open');
}
$('#exitGameBtn').addEventListener('click',exitGame);
$('#exitGameOverBtn').addEventListener('click',exitGame);
$('#returnGameBtn').addEventListener('click',()=>{
  $('#closeStandalone').classList.remove('open');
  townVideo.play().catch(()=>{});
  if(musicEnabled) startMusic();
});

musicBtn.addEventListener('click',toggleMusic);

// Keep board polygons ready behind the start menu.
makeBoardSVG();

// Prevent context menu / image long press on game surface.
$('#stage').addEventListener('contextmenu',e=>e.preventDefault());
})();
