const CFG = window.BANDA_CONFIG || {};

const state = {
  currentView: 'home',
  viewHistory: [],
  calendarDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDate: null,
  currentTrack: -1,
  deferredPrompt: null,
  playbackMode: 'normal',
  lastRandomTrack: -1,
  content: window.BandaStore ? BandaStore.load() : {events:[],tracks:[]}
};

const navItems = [
  { id:'home', label:'HOME', icon:'home', eyebrow:'INICI', title:'HOME' },
  { id:'calendar', label:'CALENDARI', icon:'calendar', eyebrow:'AGENDA', title:'CALENDARI' },
  { id:'history', label:'HISTÒRIC', icon:'history', eyebrow:'MEMÒRIA', title:'HISTÒRIC' },
  { id:'playlist', label:'PLAYER', icon:'playlist', eyebrow:'MÚSICA', title:'PLAYER' },
  { id:'games', label:'MINIJOCS', icon:'games', eyebrow:'OCI', title:'MINIJOCS' }
];

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[char]));
const getEvents = () => [...(state.content.events || [])].sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
const getTracks = () => (state.content.tracks || []).filter(track=>track.visible !== false);

function iconSvg(type){
  const common = `viewBox="0 0 32 32" class="menu-icon icon-${type}" aria-hidden="true"`;
  const icons = {
    home: `<svg ${common}>
      <path class="blue boat" d="M8 14.5 16 8l8 6.5-2 7.5H10Z" stroke-width="1.9" stroke-linejoin="round"/>
      <path class="gold boat" d="M12 18h8l-1.7 4h-4.6Z" stroke-width="1.9" stroke-linejoin="round"/>
      <path class="blue wave-a" d="M4 24c3-2 5-2 8 0s5 2 8 0 5-2 8 0" stroke-width="1.8" stroke-linecap="round"/>
      <path class="blue wave-b" d="M5 27c3-1.7 5-1.7 8 0s5 1.7 8 0 4-1.7 6 0" stroke-width="1.4" stroke-linecap="round" opacity=".65"/>
    </svg>`,
    calendar: `<svg ${common}>
      <rect class="blue cal-ring" x="5.5" y="7.5" width="21" height="19" rx="4" stroke-width="1.9"/>
      <path class="gold" d="M5.5 12.5h21M11 5.5v4M21 5.5v4" stroke-width="1.9" stroke-linecap="round"/>
      <circle class="gold-fill cal-dot d1" cx="11" cy="17" r="1.45"/><circle class="blue-fill cal-dot d2" cx="16" cy="17" r="1.45"/><circle class="gold-fill cal-dot d3" cx="21" cy="17" r="1.45"/>
      <path class="blue" d="M10 22h7" stroke-width="1.7" stroke-linecap="round"/>
    </svg>`,
    history: `<svg ${common}>
      <circle class="blue" cx="16" cy="16" r="10.5" stroke-width="1.9"/>
      <path class="gold clock-hand" d="M16 10v6l4.5 2.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle class="gold-fill clock-dot" cx="16" cy="16" r="1.7"/>
      <path class="blue" d="M9.5 5.5 6.8 8.2M22.5 5.5l2.7 2.7" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>
    </svg>`,
    playlist: `<svg ${common}>
      <rect class="gold-fill bar b1" x="4.4" y="15" width="3.2" height="11" rx="1.4"/>
      <rect class="blue-fill bar b2" x="9.3" y="11" width="3.2" height="15" rx="1.4"/>
      <rect class="gold-fill bar b3" x="14.2" y="17" width="3.2" height="9" rx="1.4"/>
      <rect class="blue-fill bar b4" x="19.1" y="9" width="3.2" height="17" rx="1.4"/>
      <rect class="gold-fill bar b5" x="24" y="13" width="3.2" height="13" rx="1.4"/>
    </svg>`,
    games: `<svg ${common}>
      <path class="blue game-body" d="M8 15.5c-2.2 0-3.8 1.6-4.1 3.8-.4 2.8 1.1 6.2 3.4 6.2 1 0 1.7-.5 2.8-1.3.8-.6 1.7-.7 2.6-.1.9.6 1.7 1.2 2.7 1.2s1.8-.6 2.7-1.2c.9-.6 1.8-.6 2.6.1 1.1.8 1.8 1.3 2.8 1.3 2.3 0 3.8-3.4 3.4-6.2-.3-2.2-1.9-3.8-4.1-3.8H8Z" stroke-width="1.7" stroke-linejoin="round"/>
      <path class="gold dpad" d="M11 17.8v5.4M8.3 20.5h5.4" stroke-width="1.8" stroke-linecap="round"/>
      <circle class="gold-fill game-btn gb1" cx="21.8" cy="19" r="1.6"/>
      <circle class="blue-fill game-btn gb2" cx="24.6" cy="22" r="1.6"/>
      <path class="blue cable" d="M13.5 14.8c.8-2.3 1.9-3.8 2.5-5.8.4-1.2 1.9-1.2 2.3 0 .6 2 1.8 3.5 2.5 5.8" stroke-width="1.4" stroke-linecap="round" opacity=".65"/>
    </svg>`
  };
  return icons[type] || icons.home;
}

function bootIdentity(){
  $$('[data-app-name]').forEach(el => el.textContent = CFG.appName || 'BANDA DE LA CALA');
  $$('[data-app-subtitle]').forEach(el => el.textContent = CFG.subtitle || 'L’Ametlla de Mar');
  $$('[data-app-logo]').forEach(el => el.src = CFG.logo || 'assets/brand/logo-banda-de-la-cala.png');
  $$('[data-app-icon]').forEach(el => el.src = CFG.appIcon || CFG.logo || 'assets/brand/app-icon.png');
  $$('[data-app-version]').forEach(el => el.textContent = CFG.version || window.BANDA_VERSION || 'v0.10');
  document.title = CFG.appName || 'BANDA DE LA CALA';
}

function renderNavigation(){
  const make = item => `<button class="nav-btn ${item.id==='home'?'active':''}" data-nav="${item.id}"><span class="nav-icon">${iconSvg(item.icon)}</span><span>${item.label}</span></button>`;
  $('.desktop-nav').innerHTML = navItems.map(make).join('');
  $('.mobile-nav').innerHTML = navItems.map(make).join('');
  $$('[data-nav]').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.nav, true)));
}

function renderHome(){
  const cards = [
    { id:'calendar', icon:'calendar', title:'CALENDARI', text:'Assajos, actuacions i agenda de la banda.', status:'ACTIU' },
    { id:'history', icon:'history', title:'HISTÒRIC', text:'Cronologia multimèdia de la història de la banda.', status:'PROPERAMENT' },
    { id:'playlist', icon:'playlist', title:'PLAYER', text:'Reproductor de pistes i repertori d’àudio.', status:'ACTIU' },
    { id:'games', icon:'games', title:'MINIJOCS', text:'Jocs casuals de la banda.', status:'PROPERAMENT' }
  ];
  $('#homeGrid').innerHTML = cards.map(card => `<button class="home-card ${card.status==='PROPERAMENT'?'disabled':''}" data-open="${card.id}">
    <span class="big-icon">${iconSvg(card.icon)}</span>
    <div><span class="status-pill">${card.status}</span><h4>${card.title}</h4><p>${card.text}</p></div>
  </button>`).join('');
  $$('#homeGrid [data-open]').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.open, true)));
}

function renderStandaloneSectionIcons(){
  $$('[data-section-icon]').forEach(el => { el.innerHTML = iconSvg(el.dataset.sectionIcon); });
}

function updateHeader(id){
  const item = navItems.find(n => n.id === id) || navItems[0];
  $('#sectionEyebrow').textContent = item.eyebrow;
  $('#sectionTitle').textContent = item.title;
  $('#sectionTitleIcon').innerHTML = iconSvg(item.icon);
  $('#backBtn').classList.toggle('is-hidden', id === 'home');
  $('#backBtn').setAttribute('aria-hidden', id === 'home' ? 'true' : 'false');
  $('#backBtn').tabIndex = id === 'home' ? -1 : 0;
}

function switchView(id, remember = true){
  if(!navItems.some(item => item.id === id)) id = 'home';
  if(id === state.currentView){ updateHeader(id); return; }
  if(remember && state.currentView) state.viewHistory.push(state.currentView);
  state.currentView = id;
  $$('.view').forEach(view => view.classList.toggle('active', view.dataset.view === id));
  $$('[data-nav]').forEach(btn => btn.classList.toggle('active', btn.dataset.nav === id));
  updateHeader(id);
  window.scrollTo({top:0, behavior:'smooth'});
}

function goBack(){
  const previous = state.viewHistory.pop() || 'home';
  switchView(previous, false);
}

function showApp(){
  $('#startScreen').classList.remove('active');
  $('#introScreen').classList.remove('active');
  $('#appShell').hidden = false;
  updateHeader(state.currentView);
}

function startIntro(){
  const startScreen = $('#startScreen');
  const introScreen = $('#introScreen');
  const video = $('#introVideo');
  const introAudio = $('#introAudio');

  if(startScreen){
    startScreen.classList.remove('active');
    startScreen.style.display = 'none';
    startScreen.setAttribute('aria-hidden','true');
  }
  if(introScreen){
    introScreen.style.background = '#fff';
    introScreen.classList.add('active');
  }

  let finished = false;
  const finish = () => {
    if(finished) return;
    finished = true;
    showApp();
    // El vídeo queda fuera de pantalla; el himno NO se detiene y continúa en HOME hasta terminar.
  };

  if(introScreen) introScreen.onclick = finish;
  const fallbackTimer = setTimeout(finish, Math.max(3500, CFG.introFallbackMs || 6000));

  if(introAudio){
    introAudio.src = CFG.introAudio || 'assets/AUDIO/introhimne.mp3';
    introAudio.currentTime = 0;
    introAudio.play().catch(() => {});
  }

  if(video){
    video.src = CFG.introVideo || 'assets/intro.webm';
    video.addEventListener('canplay', () => video.classList.add('is-ready'), { once:true });
    video.addEventListener('ended', () => { clearTimeout(fallbackTimer); finish(); }, { once:true });
    video.addEventListener('error', () => { clearTimeout(fallbackTimer); video.classList.remove('is-ready'); finish(); }, { once:true });
    video.play().catch(() => { clearTimeout(fallbackTimer); finish(); });
  }
}

function isoDate(year, month, day){
  return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function renderCalendar(){
  const events = getEvents();
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  $('#calendarMonthLabel').textContent = new Intl.DateTimeFormat('ca-ES',{month:'long',year:'numeric'}).format(new Date(year,month,1)).replace(/^./,char=>char.toUpperCase());
  const first = new Date(year,month,1);
  const startIndex = (first.getDay()+6)%7;
  const daysInMonth = new Date(year,month+1,0).getDate();
  const prevMonthDays = new Date(year,month,0).getDate();
  const today = new Date();
  const cells = [];
  for(let i=0;i<42;i++){
    let day, cellMonth = month, cellYear = year, outside = false;
    if(i < startIndex){ day = prevMonthDays-startIndex+i+1; cellMonth=month-1; outside=true; }
    else if(i >= startIndex+daysInMonth){ day=i-(startIndex+daysInMonth)+1; cellMonth=month+1; outside=true; }
    else day=i-startIndex+1;
    if(cellMonth<0){cellMonth=11;cellYear--;}
    if(cellMonth>11){cellMonth=0;cellYear++;}
    const key = isoDate(cellYear,cellMonth,day);
    const has = events.some(event => event.date === key);
    const isToday = key === isoDate(today.getFullYear(),today.getMonth(),today.getDate());
    const selected = key === state.selectedDate;
    cells.push(`<button class="calendar-day ${outside?'outside':''} ${has?'has-event':''} ${isToday?'today':''} ${selected?'selected':''}" data-date="${key}" aria-label="${key}"><span class="day-number">${day}</span></button>`);
  }
  $('#calendarGrid').innerHTML = cells.join('');
  $$('#calendarGrid [data-date]').forEach(btn => btn.addEventListener('click', () => selectDate(btn.dataset.date)));
}

function selectDate(date){
  state.selectedDate = date;
  renderCalendar();
  const parsed = new Date(date+'T12:00:00');
  $('#selectedDateTitle').textContent = new Intl.DateTimeFormat('ca-ES',{weekday:'long',day:'numeric',month:'long'}).format(parsed).replace(/^./,char=>char.toUpperCase());
  const list = getEvents().filter(event => event.date === date);
  $('#eventList').innerHTML = list.length ? list.map(event => {
    const dresscodeAllowed=['CONCERT','ACTUACIÓ'].includes(String(event.type||'').toUpperCase());
    const dresscode=dresscodeAllowed?(state.content.dresscodes||[]).find(item=>item.id===event.dresscodeId):null;
    return `<article class="event-card"><span class="event-type">${esc(event.type)}</span><h4>${esc(event.title)}</h4>${event.time?`<p>🕒 ${esc(event.time)}</p>`:''}${event.place?`<p>⌖ ${esc(event.place)}</p>`:''}${event.notes?`<p>${esc(event.notes)}</p>`:''}${dresscode?`<button class="dresscode-btn" data-dresscode="${esc(dresscode.id)}">⚪️ VEURE DRESSCODE</button>`:''}</article>`;
  }).join('') : '<p class="empty-copy">No hi ha cap activitat prevista per aquest dia.</p>';
  $$('[data-dresscode]').forEach(btn=>btn.addEventListener('click',()=>openDresscode(btn.dataset.dresscode)));
}

function applyHomeHero(){
  const el=$('#heroBackground');
  if(!el) return;
  const src=state.content.settings?.homeHeroImage || CFG.logo || 'assets/brand/logo-banda-de-la-cala.png';
  el.src=src;
}

function openDresscode(id){
  const item=(state.content.dresscodes||[]).find(d=>d.id===id);
  if(!item) return;
  $('#dresscodeModalTitle').textContent=item.title||'Dress code';
  $('#dresscodeModalSubtitle').textContent=item.subtitle||'';
  const boys=item.boys || (item.boysItems||[]).map(x=>x.text).filter(Boolean).join('\n');
  const girls=item.girls || (item.girlsItems||[]).map(x=>x.text).filter(Boolean).join('\n');
  $('#dresscodeBoysView').textContent=boys;
  $('#dresscodeGirlsView').textContent=girls;
  const modal=$('#dresscodeModal'); modal.hidden=false; document.body.classList.add('modal-open');
}
function closeDresscode(){ $('#dresscodeModal').hidden=true; document.body.classList.remove('modal-open'); }
function bindDresscodeModal(){ $$('[data-close-dresscode]').forEach(el=>el.addEventListener('click',closeDresscode)); document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#dresscodeModal').hidden) closeDresscode();}); }

function bindCalendar(){
  $('#prevMonth').onclick = () => { state.calendarDate = new Date(state.calendarDate.getFullYear(),state.calendarDate.getMonth()-1,1); renderCalendar(); };
  $('#nextMonth').onclick = () => { state.calendarDate = new Date(state.calendarDate.getFullYear(),state.calendarDate.getMonth()+1,1); renderCalendar(); };
  $('#todayMonth').onclick = () => {
    const today = new Date();
    state.calendarDate = new Date(today.getFullYear(),today.getMonth(),1);
    state.selectedDate = isoDate(today.getFullYear(),today.getMonth(),today.getDate());
    selectDate(state.selectedDate);
  };
}

const audio = () => $('#audioPlayer');

function renderTracks(){
  const tracks = getTracks();
  if(state.currentTrack >= tracks.length) state.currentTrack = -1;
  $('#trackCount').textContent = `${tracks.length} ${tracks.length===1?'pista':'pistes'}`;
  $('#trackList').innerHTML = tracks.length ? tracks.map((track,index) => `<button class="track-row ${index===state.currentTrack?'active':''}" data-track="${index}"><span class="track-index">${String(index+1).padStart(2,'0')}</span><span class="track-main"><strong>${esc(track.title)}</strong><small>${esc(track.meta || 'Banda de la Cala')}</small></span><span class="track-length">▶</span></button>`).join('') : '<p class="empty-copy">Encara no hi ha pistes publicades.</p>';
  $$('#trackList [data-track]').forEach(btn => btn.addEventListener('click', () => loadTrack(+btn.dataset.track,true)));
}

function loadTrack(index, autoplay = false){
  const tracks = getTracks();
  if(!tracks.length) return;
  state.currentTrack = (index + tracks.length) % tracks.length;
  const track = tracks[state.currentTrack];
  const player = audio();
  player.src = track.src;
  $('#nowPlayingTitle').textContent = track.title;
  $('#nowPlayingMeta').textContent = track.meta || 'Banda de la Cala';
  $('#miniTitle').textContent = track.title;
  $('#miniMeta').textContent = track.meta || 'PLAYER';
  $('#miniPlayer').classList.add('visible');
  $('#miniPlayer').hidden = false;
  renderTracks();
  if(autoplay) player.play().catch(()=>{});
}

function setPlayIcon(){
  const playing = !audio().paused;
  $('#playPause').textContent = playing ? '❚❚' : '▶';
  $('#miniPlay').textContent = playing ? '❚❚' : '▶';
}

function formatTime(seconds){
  if(!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds/60);
  const secs = Math.floor(seconds%60);
  return `${minutes}:${String(secs).padStart(2,'0')}`;
}

function updatePlaybackModeButtons(){
  const map={one:'#repeatOneBtn',all:'#repeatAllBtn',random:'#randomBtn'};
  Object.entries(map).forEach(([mode,selector])=>{
    const btn=$(selector); if(!btn) return;
    const active=state.playbackMode===mode;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',active?'true':'false');
  });
}
function setPlaybackMode(mode){
  state.playbackMode = state.playbackMode===mode ? 'normal' : mode;
  updatePlaybackModeButtons();
}
function randomTrackIndex(tracks){
  if(tracks.length<=1) return 0;
  let next=state.currentTrack;
  while(next===state.currentTrack) next=Math.floor(Math.random()*tracks.length);
  return next;
}
function playNextFromMode(){
  const tracks=getTracks();
  if(!tracks.length) return;
  if(state.playbackMode==='one'){ audio().currentTime=0; audio().play().catch(()=>{}); return; }
  if(state.playbackMode==='random'){ loadTrack(randomTrackIndex(tracks),true); return; }
  if(state.currentTrack < tracks.length-1){ loadTrack(state.currentTrack+1,true); return; }
  if(state.playbackMode==='all'){ loadTrack(0,true); return; }
  audio().currentTime=0;
  setPlayIcon();
}
function bindPlayer(){
  const player = audio();
  const toggle = () => {
    const tracks = getTracks();
    if(!tracks.length) return;
    if(state.currentTrack < 0) loadTrack(0,false);
    player.paused ? player.play().catch(()=>{}) : player.pause();
  };
  $('#playPause').onclick = toggle;
  $('#miniPlay').onclick = toggle;
  $('#prevTrack').onclick = () => { const tracks=getTracks(); if(tracks.length) loadTrack(state.currentTrack<=0 ? tracks.length-1 : state.currentTrack-1,true); };
  $('#nextTrack').onclick = () => { const tracks=getTracks(); if(!tracks.length)return; state.playbackMode==='random'?loadTrack(randomTrackIndex(tracks),true):loadTrack((state.currentTrack+1)%tracks.length,true); };
  $('#repeatOneBtn').onclick=()=>setPlaybackMode('one');
  $('#repeatAllBtn').onclick=()=>setPlaybackMode('all');
  $('#randomBtn').onclick=()=>setPlaybackMode('random');
  updatePlaybackModeButtons();
  player.addEventListener('play',setPlayIcon);
  player.addEventListener('pause',setPlayIcon);
  player.addEventListener('ended',playNextFromMode);
  player.addEventListener('loadedmetadata',() => { $('#durationTime').textContent = formatTime(player.duration); });
  player.addEventListener('timeupdate',() => {
    const progress = player.duration ? (player.currentTime/player.duration)*100 : 0;
    $('#seekBar').value = progress;
    $('#currentTime').textContent = formatTime(player.currentTime);
    $('#miniProgress').style.width = `${progress}%`;
  });
  $('#seekBar').addEventListener('input',event => { if(player.duration) player.currentTime = (+event.target.value/100)*player.duration; });
}

function refreshContent(next){
  state.content = next || BandaStore.load();
  applyHomeHero();
  renderCalendar();
  if(state.selectedDate) selectDate(state.selectedDate);
  renderTracks();
}

function bindContentUpdates(){
  window.addEventListener('banda-content-changed',event=>refreshContent(event.detail));
}

function bindPwaInstall(){
  const btn = $('#installBtn');
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    state.deferredPrompt = event;
    btn.hidden = false;
  });
  btn.addEventListener('click',async() => {
    if(!state.deferredPrompt) return;
    state.deferredPrompt.prompt();
    await state.deferredPrompt.userChoice;
    state.deferredPrompt = null;
    btn.hidden = true;
  });
  window.addEventListener('appinstalled',() => {
    $('#pwaStatus').textContent = 'PWA instal·lada';
    btn.hidden = true;
  });
}

function registerSW(){
  if(location.protocol === 'file:'){
    $('#pwaStatus').textContent = 'Mode local · PWA activa quan es publiqui per HTTPS';
    return;
  }
  if('serviceWorker' in navigator){
    window.addEventListener('load',() => navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{ reg.update().catch(()=>{}); $('#pwaStatus').textContent = 'PWA preparada'; }).catch(() => { $('#pwaStatus').textContent = 'No s’ha pogut activar el Service Worker'; }));
  }
}

function init(){
  const startBtn = $('#startBtn');
  const startIconBtn = $('#startIconBtn');
  if(startBtn) startBtn.onclick = startIntro;
  if(startIconBtn) startIconBtn.onclick = startIntro;
  bootIdentity();
  renderNavigation();
  renderHome();
  renderStandaloneSectionIcons();
  applyHomeHero();
  updateHeader('home');
  renderCalendar();
  bindCalendar();
  bindDresscodeModal();
  renderTracks();
  bindPlayer();
  bindContentUpdates();
  bindPwaInstall();
  registerSW();
  const backBtn = $('#backBtn');
  if(backBtn) backBtn.onclick = goBack;
}

init();
