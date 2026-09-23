const CFG = window.BANDA_CONFIG || {};
const initialGlobalMuted = (() => { try { return localStorage.getItem('banda-de-la-cala-muted') === '1'; } catch(error) { return false; } })();

const state = {
  currentView: 'home',
  viewHistory: [],
  calendarDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDate: null,
  currentTrack: -1,
  deferredPrompt: null,
  playbackMode: 'normal',
  lastRandomTrack: -1,
  globalMuted: initialGlobalMuted,
  session: null,
  profile: null,
  authenticated: false,
  collapsedPeriods: new Set(),
  historyViewer: { scale:1, maxScale:1, baseWidth:0 },
  content: window.BandaStore ? (BandaStore.loadApp ? BandaStore.loadApp() : BandaStore.load()) : {events:[],tracks:[],dresscodes:[],historicItems:[],settings:{}}
};

const navItems = [
  { id:'home', label:'HOME', icon:'home', eyebrow:'INICI', title:'HOME', public:true },
  { id:'calendar', label:'CALENDARI', icon:'calendar', eyebrow:'AGENDA', title:'CALENDARI', public:false },
  { id:'history', label:'HISTÒRIC', icon:'history', eyebrow:'MEMÒRIA', title:'HISTÒRIC', public:true },
  { id:'playlist', label:'PLAYER', icon:'playlist', eyebrow:'MÚSICA', title:'PLAYER', public:true },
  { id:'games', label:'MINIJOCS', icon:'games', eyebrow:'OCI', title:'MINIJOCS', public:false },
  { id:'user', label:'USER', icon:'user', eyebrow:'COMPTE', title:'USER', public:true }
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
    </svg>`,
    user: `<svg ${common}>
      <circle class="gold" cx="16" cy="10.5" r="5" stroke-width="1.9"/>
      <path class="blue" d="M7.5 26c.8-5.1 4.1-8 8.5-8s7.7 2.9 8.5 8" stroke-width="1.9" stroke-linecap="round"/>
    </svg>`
  };
  return icons[type] || icons.home;
}

function bootIdentity(){
  $$('[data-app-name]').forEach(el => el.textContent = CFG.appName || 'BANDA DE LA CALA');
  $$('[data-app-subtitle]').forEach(el => el.textContent = CFG.subtitle || 'L’Ametlla de Mar');
  $$('[data-app-logo]').forEach(el => el.src = CFG.logo || 'assets/brand/logo-banda-de-la-cala.png');
  $$('[data-app-icon]').forEach(el => el.src = CFG.appIcon || CFG.logo || 'assets/brand/app-icon.png');
  $$('[data-app-version]').forEach(el => el.textContent = CFG.version || window.BANDA_VERSION || 'v0.22');
  document.title = CFG.appName || 'BANDA DE LA CALA';
}

function availableNavItems(){
  return navItems.filter(item => item.public || state.authenticated);
}

function renderNavigation(){
  const items=availableNavItems();
  const make = item => `<button class="nav-btn ${item.id===state.currentView?'active':''}" data-nav="${item.id}"><span class="nav-icon">${iconSvg(item.icon)}</span><span>${item.label}</span></button>`;
  $('.desktop-nav').innerHTML = items.map(make).join('');
  $('.mobile-nav').innerHTML = items.map(make).join('');
  $('.mobile-nav').style.gridTemplateColumns=`repeat(${items.length},1fr)`;
  $$('[data-nav]').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.nav, true)));
}


function renderHome(){
  const cards = state.authenticated ? [
    { id:'calendar', icon:'calendar', title:'CALENDARI', text:'Assajos, actuacions i agenda de la banda.', status:'ACTIU' },
    { id:'history', icon:'history', title:'HISTÒRIC', text:'Cronologia visual de la història de la banda.', status:'ACTIU' },
    { id:'playlist', icon:'playlist', title:'PLAYER', text:'Reproductor de pistes i repertori d’àudio.', status:'ACTIU' },
    { id:'games', icon:'games', title:'MINIJOCS', text:'Jocs casuals de la banda.', status:'PROPERAMENT' },
    { id:'user', icon:'user', title:'USER', text:'Perfil i dades del teu compte.', status:'ACTIU' }
  ] : [
    { id:'history', icon:'history', title:'HISTÒRIC', text:'Cronologia visual de la història de la banda.', status:'ACTIU' },
    { id:'playlist', icon:'playlist', title:'PLAYER', text:'Reproductor de pistes i repertori d’àudio.', status:'ACTIU' },
    { id:'user', icon:'user', title:'USER', text:'Accés privat per als músics de la banda.', status:'ACCÉS' }
  ];
  const homeGrid=$('#homeGrid');
  homeGrid.classList.toggle('five-cards', cards.length===5);
  homeGrid.innerHTML = cards.map(card => `<button class="home-card ${card.status==='PROPERAMENT'?'disabled':''}" data-open="${card.id}">
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
  const isHome = id === 'home';
  $('#backBtn').classList.toggle('is-hidden', isHome);
  $('#backBtn').setAttribute('aria-hidden', isHome ? 'true' : 'false');
  $('#backBtn').tabIndex = isHome ? -1 : 0;
  $('#homeHeaderIcon')?.classList.toggle('is-hidden', !isHome);
}

function switchView(id, remember = true){
  const target=navItems.find(item=>item.id===id);
  if(!target) id='home';
  else if(!target.public && !state.authenticated) id='user';
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
    const dayEvents = events.filter(event => event.date === key);
    const has = dayEvents.length > 0;
    const featured = dayEvents.some(event => ['CONCERT','ACTUACIÓ'].includes(String(event.type||'').toUpperCase()));
    const eventClass = has ? (featured ? 'event-featured' : 'event-normal') : '';
    const isToday = key === isoDate(today.getFullYear(),today.getMonth(),today.getDate());
    const selected = key === state.selectedDate;
    cells.push(`<button class="calendar-day ${outside?'outside':''} ${has?'has-event':''} ${eventClass} ${isToday?'today':''} ${selected?'selected':''}" data-date="${key}" aria-label="${key}"><span class="day-number">${day}</span></button>`);
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


function getHistoricPeriods(){
  return Array.isArray(CFG.historicPeriods) ? CFG.historicPeriods : [];
}

function getHistoricItems(){
  return [...(state.content.historicItems || [])].sort((a,b)=>{
    const ya=Number(a.year)||0, yb=Number(b.year)||0;
    if(ya!==yb) return yb-ya;
    return String(b.title||'').localeCompare(String(a.title||''),'ca');
  });
}

function renderHistory(){
  const host=$('#historyTimeline');
  if(!host) return;
  const periods=getHistoricPeriods();
  const items=getHistoricItems();
  if(!periods.length){
    host.innerHTML='<div class="history-empty panel">No hi ha períodes configurats.</div>';
    return;
  }
  let visualIndex=0;
  const displayPeriods=[...periods].reverse();
  host.innerHTML=displayPeriods.map(period=>{
    const originalIndex=periods.findIndex(p=>p.id===period.id);
    const periodItems=items.filter(item=>item.periodId===period.id);
    const collapsed=state.collapsedPeriods.has(period.id);
    const media=periodItems.length ? periodItems.map(item=>{
      const side=(visualIndex++ % 2===0)?'left':'right';
      const title=item.title ? `<h4>${esc(item.title)}</h4>` : '';
      const desc=item.description ? `<p>${esc(item.description)}</p>` : '';
      const img=item.imageSrc ? `<button class="history-image-button" type="button" data-history-image-id="${esc(item.id || item.imageSrc)}" aria-label="Ampliar fotografia de ${esc(item.year)}"><img loading="lazy" decoding="async" src="${esc(item.imageSrc)}" alt="${esc(item.title || `Fotografia de ${item.year}`)}" /></button>` : '';
      return `<article class="history-item ${side}">
        <div class="history-node" aria-hidden="true"></div>
        <div class="history-card">
          ${img}
          <div class="history-card-copy"><span class="history-year">${esc(item.year)}</span>${title}${desc}</div>
        </div>
      </article>`;
    }).join('') : `<div class="history-period-empty">Encara no hi ha fotografies en aquest període.</div>`;
    const periodColor = period.color || '#393a86';
    const periodText = period.textColor || '#ffffff';
    return `<section class="history-period period-tone-${originalIndex+1} ${collapsed?'is-collapsed':''}" data-period="${esc(period.id)}" style="--period-color:${esc(periodColor)};--period-text:${esc(periodText)}">
      <button class="history-period-head" type="button" data-toggle-period="${esc(period.id)}" aria-expanded="${collapsed?'false':'true'}">
        <span class="history-period-dot" aria-hidden="true"></span>
        <div><strong>${esc(period.years)}</strong><span>${esc(period.director)}</span></div>
        <span class="history-period-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="history-period-items">${media}</div>
    </section>`;
  }).join('');
  $$('[data-toggle-period]').forEach(btn=>btn.addEventListener('click',()=>{
    const id=btn.dataset.togglePeriod;
    if(state.collapsedPeriods.has(id)) state.collapsedPeriods.delete(id); else state.collapsedPeriods.add(id);
    try{localStorage.setItem('banda-history-collapsed-v021',JSON.stringify([...state.collapsedPeriods]));}catch(_error){}
    renderHistory();
  }));
  $$('[data-history-image-id]').forEach(btn=>btn.addEventListener('click',()=>openHistoryImage(btn.dataset.historyImageId)));
}

function restoreHistoryCollapsed(){
  const periods=getHistoricPeriods();
  const current=periods.find(period=>period.end==null || /actualitat/i.test(period.years||'')) || periods[periods.length-1];
  try{
    const raw=localStorage.getItem('banda-history-collapsed-v021');
    if(raw!==null){
      const saved=JSON.parse(raw);
      if(Array.isArray(saved)){ state.collapsedPeriods=new Set(saved); return; }
    }
  }catch(_error){}
  state.collapsedPeriods=new Set(periods.filter(period=>!current || period.id!==current.id).map(period=>period.id));
}

function historyViewerApply(){
  const img=$('#historyImageLarge'), value=$('#historyZoomValue'), out=$('#historyZoomOut'), inn=$('#historyZoomIn');
  if(!img) return;
  const scale=Math.max(1,Math.min(state.historyViewer.scale,state.historyViewer.maxScale||1));
  state.historyViewer.scale=scale;
  if(state.historyViewer.baseWidth) img.style.width=`${Math.round(state.historyViewer.baseWidth*scale)}px`;
  if(value) value.textContent=`${Math.round(scale*100)}%`;
  if(out) out.disabled=scale<=1.001;
  if(inn) inn.disabled=scale>=(state.historyViewer.maxScale||1)-.001;
}
function historyViewerReset(){
  const img=$('#historyImageLarge'), viewport=$('#historyImageViewport');
  if(!img||!viewport) return;
  img.style.width='auto'; img.style.height='auto'; img.style.maxWidth='100%'; img.style.maxHeight='100%';
  requestAnimationFrame(()=>{
    const rect=img.getBoundingClientRect();
    state.historyViewer.baseWidth=Math.max(1,rect.width);
    const naturalRatio=rect.width ? img.naturalWidth/rect.width : 1;
    state.historyViewer.maxScale=Math.max(1,Math.min(2.5,naturalRatio));
    state.historyViewer.scale=1;
    img.style.maxWidth='none'; img.style.maxHeight='none';
    img.style.width=`${Math.round(state.historyViewer.baseWidth)}px`;
    historyViewerApply();
    viewport.scrollTo({left:0,top:0,behavior:'auto'});
  });
}
function openHistoryImage(id){
  const item=(state.content.historicItems||[]).find(entry=>String(entry.id||entry.imageSrc)===String(id));
  if(!item?.imageSrc) return;
  const modal=$('#historyImageModal'), img=$('#historyImageLarge');
  $('#historyImageTitle').textContent=item.title || String(item.year||'');
  $('#historyImageCaption').textContent=item.description || (item.title ? String(item.year||'') : '');
  img.alt=item.title || `Fotografia de ${item.year||''}`;
  img.onload=historyViewerReset;
  img.src=item.imageSrc;
  modal.hidden=false;
  document.body.classList.add('modal-open');
  if(img.complete) historyViewerReset();
}
function closeHistoryImage(){
  const modal=$('#historyImageModal'); if(!modal) return;
  modal.hidden=true; document.body.classList.remove('modal-open');
  const img=$('#historyImageLarge'); if(img){img.removeAttribute('src');img.style.width='';}
}
function bindHistoryImageModal(){
  $$('[data-close-history-image]').forEach(el=>el.addEventListener('click',closeHistoryImage));
  $('#historyZoomIn')?.addEventListener('click',()=>{state.historyViewer.scale=Math.min(state.historyViewer.maxScale,state.historyViewer.scale+.25);historyViewerApply();});
  $('#historyZoomOut')?.addEventListener('click',()=>{state.historyViewer.scale=Math.max(1,state.historyViewer.scale-.25);historyViewerApply();});
  $('#historyZoomReset')?.addEventListener('click',historyViewerReset);
  $('#historyImageViewport')?.addEventListener('wheel',event=>{
    if(!$('#historyImageModal')?.hidden && (event.ctrlKey || Math.abs(event.deltaY)>0)){
      event.preventDefault();
      const delta=event.deltaY<0?.15:-.15;
      state.historyViewer.scale=Math.max(1,Math.min(state.historyViewer.maxScale,state.historyViewer.scale+delta));
      historyViewerApply();
    }
  },{passive:false});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#historyImageModal')?.hidden) closeHistoryImage();});
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
  $('#appShell')?.classList.add('has-mini-player');
  renderTracks();
  if(autoplay) player.play().catch(()=>{});
}

function setPlayIcon(){
  const player=audio();
  const playing = !!player && !player.paused && !player.ended && state.currentTrack >= 0;
  $('#playPause').textContent = playing ? '❚❚' : '▶';
  $('#miniPlay').textContent = playing ? '❚❚' : '▶';
  const icon=document.querySelector('.record-icon');
  if(icon) icon.classList.toggle('is-playing', playing);
  const card=document.querySelector('.player-card');
  if(card) card.classList.toggle('is-playing', playing);
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
  setPlayIcon();
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

function applyGlobalMute(){
  document.querySelectorAll('audio').forEach(el => { el.muted = state.globalMuted; });
  const btn = $('#muteBtn');
  if(btn){
    btn.classList.toggle('is-muted', state.globalMuted);
    btn.setAttribute('aria-pressed', state.globalMuted ? 'true' : 'false');
    btn.setAttribute('aria-label', state.globalMuted ? "Activar tot l'àudio de l'app" : "Silenciar tot l'àudio de l'app");
    btn.title = state.globalMuted ? "Activar tot l'àudio de l'app" : "Silenciar tot l'àudio de l'app";

  }
}
function toggleGlobalMute(){
  state.globalMuted = !state.globalMuted;
  try{ localStorage.setItem('banda-de-la-cala-muted', state.globalMuted ? '1' : '0'); }catch(error){}
  applyGlobalMute();
}
function publicOnlyCopy(source){
  const clean=BandaStore.normalize(source||BandaStore.defaults());
  clean.events=[];
  clean.dresscodes=[];
  return clean;
}
async function refreshPublishedFromNetwork(){
  if(!window.BandaStore?.fetchPublished || BandaStore.isLocalPreview?.()) return;
  const latest = await BandaStore.fetchPublished();
  refreshContent(state.authenticated?latest:publicOnlyCopy(latest));
}

function refreshContent(next){
  state.content = next || BandaStore.load();
  applyHomeHero();
  renderCalendar();
  if(state.selectedDate) selectDate(state.selectedDate);
  renderTracks();
  renderHistory();
}

function bindContentUpdates(){
  if(window.BandaStore?.isLocalPreview?.()){
    window.addEventListener('banda-content-changed',event=>refreshContent(event.detail));
  }
}


function remoteContentReady(content){
  if(!content) return false;
  if(content.settings?.supabaseInitialized) return true;
  return ['events','tracks','dresscodes','historicItems'].some(key=>Array.isArray(content[key]) && content[key].length>0) || !!content.settings?.homeHeroImage;
}

async function initSupabaseContent(){
  if(!window.BandaSupabase?.enabled){
    await refreshPublishedFromNetwork();
    return;
  }
  try{
    const remote=await BandaSupabase.loadContent({publicOnly:!state.authenticated});
    if(remoteContentReady(remote)){
      BandaStore.cacheRemote?.(remote);
      refreshContent(remote);
    }else{
      await refreshPublishedFromNetwork();
    }
    BandaSupabase.subscribeContent(next=>{
      if(!remoteContentReady(next)) return;
      BandaStore.cacheRemote?.(next);
      refreshContent(next);
    },{publicOnly:!state.authenticated});
  }catch(error){
    console.warn('Supabase no disponible; utilitzant caché/publicat.',error);
    await refreshPublishedFromNetwork();
  }
}

function roleLabel(role){
  return ({admin:'USER ADMIN',gestor:'USER GESTOR',standard:'USER STANDARD'})[role] || 'USER';
}

function renderUserSection(){
  const login=$('#userLoginCard'), profile=$('#userProfileCard');
  if(!login||!profile) return;
  login.hidden=state.authenticated;
  profile.hidden=!state.authenticated;
  if(!state.authenticated) return;
  $('#userProfileName').textContent=state.profile?.name || state.session?.user?.email?.split('@')[0] || 'Músic';
  $('#userProfileEmail').textContent=state.session?.user?.email || state.profile?.email || '';
  $('#userProfileRole').textContent=roleLabel(state.profile?.role);
  const temp=$('#temporaryPasswordNotice');
  if(temp) temp.hidden=!state.profile?.must_change_password;
}

async function reloadAuthAwareContent(){
  renderNavigation();
  renderHome();
  renderUserSection();
  await initSupabaseContent();
}

async function establishAppSession(session){
  state.session=session||null;
  state.authenticated=!!session;
  state.profile=null;
  if(session){
    try{ state.profile=await BandaSupabase.getMyProfile(); }catch(error){ console.warn('No s’ha pogut carregar el perfil',error); }
  }
  await reloadAuthAwareContent();
}

function bindUserAuth(){
  $('#userLoginForm')?.addEventListener('submit',async event=>{
    event.preventDefault();
    const status=$('#userLoginStatus');
    const email=$('#userLoginEmail').value.trim();
    const password=$('#userLoginPassword').value;
    status.textContent='Entrant…';
    try{
      const session=await BandaSupabase.signIn(email,password);
      $('#userLoginPassword').value='';
      await establishAppSession(session);
      status.textContent='';
      switchView('user',false);
    }catch(error){
      console.error(error);
      status.textContent='Email o contrasenya incorrectes, o el compte encara no està validat.';
    }
  });
  $('#userLogoutBtn')?.addEventListener('click',async()=>{
    try{ await BandaSupabase.signOut(); }catch(_error){}
    state.session=null; state.profile=null; state.authenticated=false;
    state.currentView='home'; state.viewHistory=[];
    await reloadAuthAwareContent();
    $$('.view').forEach(view=>view.classList.toggle('active',view.dataset.view==='home'));
    updateHeader('home');
  });
  $('#changePasswordForm')?.addEventListener('submit',async event=>{
    event.preventDefault();
    const status=$('#changePasswordStatus');
    const password=$('#newUserPassword').value;
    const repeat=$('#repeatUserPassword').value;
    if(password.length<8){status.textContent='La contrasenya ha de tenir almenys 8 caràcters.';return;}
    if(password!==repeat){status.textContent='Les dues contrasenyes no coincideixen.';return;}
    status.textContent='Canviant contrasenya…';
    try{
      await BandaSupabase.updatePassword(password);
      $('#newUserPassword').value=''; $('#repeatUserPassword').value='';
      state.profile=await BandaSupabase.getMyProfile();
      renderUserSection();
      status.textContent='Contrasenya actualitzada correctament.';
    }catch(error){ console.error(error); status.textContent='No s’ha pogut canviar la contrasenya.'; }
  });
}

async function initAppAuth(){
  if(!window.BandaSupabase?.enabled){ state.content=publicOnlyCopy(state.content); renderNavigation(); renderHome(); renderUserSection(); return; }
  try{
    const session=await BandaSupabase.session();
    await establishAppSession(session);
  }catch(error){
    console.warn('No s’ha pogut iniciar la sessió',error);
    state.session=null; state.profile=null; state.authenticated=false;
    await reloadAuthAwareContent();
  }
}


function appIsStandalone(){
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function getAppInstallPrompt(){
  return state.deferredPrompt || window.__appInstallPrompt || null;
}

function syncAppInstallUI(){
  const headerBtn=$('#installBtn'), homeBtn=$('#homeInstallBtn'), card=$('#appInstallCard'), status=$('#appInstallStatus');
  const installed=appIsStandalone();
  if(card) card.hidden=installed;
  if(headerBtn) headerBtn.hidden=installed;
  if(homeBtn) homeBtn.hidden=installed;
  if(installed) return;
  const ready=!!getAppInstallPrompt();
  [headerBtn,homeBtn].filter(Boolean).forEach(btn=>{
    btn.disabled=false;
    btn.classList.toggle('install-ready',ready);
    btn.textContent='INSTAL·LAR APP';
  });
  if(status) status.textContent=ready ? 'Preparada · prem INSTAL·LAR APP.' : 'PWA activa · prem INSTAL·LAR APP.';
}

function waitForAppInstallPrompt(timeout=2400){
  const current=getAppInstallPrompt();
  if(current) return Promise.resolve(current);
  return new Promise(resolve=>{
    let done=false;
    let timer=0;
    const finish=value=>{
      if(done) return;
      done=true;
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt',onPrompt);
      resolve(value || getAppInstallPrompt());
    };
    const onPrompt=event=>{
      event.preventDefault();
      state.deferredPrompt=event;
      window.__appInstallPrompt=event;
      syncAppInstallUI();
      finish(event);
    };
    window.addEventListener('beforeinstallprompt',onPrompt,{once:true});
    timer=setTimeout(()=>finish(null),timeout);
  });
}

function waitForAppController(timeout=3500){
  if(navigator.serviceWorker?.controller) return Promise.resolve(true);
  return new Promise(resolve=>{
    let settled=false;
    const finish=value=>{
      if(settled) return;
      settled=true;
      clearTimeout(timer);
      navigator.serviceWorker?.removeEventListener('controllerchange',onChange);
      resolve(value);
    };
    const onChange=()=>finish(!!navigator.serviceWorker.controller);
    const timer=setTimeout(()=>finish(!!navigator.serviceWorker?.controller),timeout);
    navigator.serviceWorker?.addEventListener('controllerchange',onChange,{once:true});
  });
}

async function ensureAppServiceWorker(){
  if(location.protocol==='file:' || !('serviceWorker' in navigator)) return {ok:false,controlled:false};
  try{
    const root=new URL('../', location.href);
    const swUrl=new URL('app/sw.js?v=0.22', root);
    const reg=await navigator.serviceWorker.register(swUrl.href,{updateViaCache:'none'});
    try{ await reg.update(); }catch(_error){}
    try{ await Promise.race([navigator.serviceWorker.ready,new Promise(resolve=>setTimeout(resolve,3000))]); }catch(_error){}
    const controlled=await waitForAppController(3500);
    return {ok:true,controlled,registration:reg};
  }catch(error){
    console.warn('APP SW',error);
    return {ok:false,controlled:false,error};
  }
}

async function appPwaHealth(){
  const root=new URL('../', location.href);
  const result={secure:window.isSecureContext,manifest:false,icons:false,sw:false,controlled:!!navigator.serviceWorker?.controller};
  try{
    const response=await fetch(new URL('app/manifest.webmanifest?v=0.22',root).href,{cache:'no-store'});
    const manifest=response.ok ? await response.json() : null;
    result.manifest=!!(manifest && manifest.start_url && manifest.display && Array.isArray(manifest.icons));
    if(manifest?.icons?.length){
      const checks=await Promise.all(manifest.icons.map(async icon=>{
        try{return (await fetch(new URL(icon.src,new URL('app/manifest.webmanifest',root)).href,{cache:'no-store'})).ok;}catch(_error){return false;}
      }));
      result.icons=checks.some(Boolean);
    }
  }catch(_error){}
  try{
    const reg=await navigator.serviceWorker?.getRegistration(new URL('app/',root).href);
    result.sw=!!reg?.active;
    result.controlled=!!navigator.serviceWorker?.controller;
  }catch(_error){}
  return result;
}

function showAppInstallMessage(message){
  const status=$('#appInstallStatus');
  if(status) status.textContent=message;
}

async function promptAppInstall(){
  if(appIsStandalone()) return;
  const buttons=[$('#installBtn'),$('#homeInstallBtn')].filter(Boolean);
  buttons.forEach(btn=>{btn.disabled=true;btn.textContent='PREPARANT…';});
  showAppInstallMessage('Preparant la instal·lació…');

  let prompt=getAppInstallPrompt();
  if(!prompt){
    await ensureAppServiceWorker();
    prompt=await waitForAppInstallPrompt(2600);
  }

  if(!prompt && /iPad|iPhone|iPod/.test(navigator.userAgent)){
    buttons.forEach(btn=>{btn.disabled=false;btn.textContent='INSTAL·LAR APP';});
    alert('A Safari: prem Compartir i després “Afegir a la pantalla d’inici”.');
    return;
  }

  if(!prompt){
    const health=await appPwaHealth();
    buttons.forEach(btn=>{btn.disabled=false;btn.textContent='INSTAL·LAR APP';});
    if(!health.secure) showAppInstallMessage('La instal·lació PWA necessita HTTPS.');
    else if(!health.manifest || !health.icons) showAppInstallMessage('No s’ha pogut validar el manifest o les icones de la PWA.');
    else if(!health.sw) showAppInstallMessage('El Service Worker encara no s’ha activat. Torna a prémer INSTAL·LAR APP en uns segons.');
    else showAppInstallMessage('PWA validada. Chrome encara no ha lliurat el diàleg; torna a prémer INSTAL·LAR APP en uns segons.');
    return;
  }

  try{
    await prompt.prompt();
    const choice=await prompt.userChoice;
    state.deferredPrompt=null;
    window.__appInstallPrompt=null;
    if(choice?.outcome==='accepted'){
      $('#appInstallCard')?.setAttribute('hidden','');
      if($('#installBtn')) $('#installBtn').hidden=true;
    }
  }catch(error){
    console.warn('No s’ha pogut obrir el diàleg d’instal·lació',error);
    showAppInstallMessage('No s’ha pogut obrir el diàleg. Torna-ho a provar.');
  }finally{
    buttons.forEach(btn=>{btn.disabled=false;btn.textContent='INSTAL·LAR APP';});
    syncAppInstallUI();
  }
}

function bindPwaInstall(){
  state.deferredPrompt=window.__appInstallPrompt || state.deferredPrompt;
  syncAppInstallUI();
  window.addEventListener('bandaappinstallready',()=>{
    state.deferredPrompt=window.__appInstallPrompt || state.deferredPrompt;
    syncAppInstallUI();
  });
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    state.deferredPrompt=event;
    window.__appInstallPrompt=event;
    syncAppInstallUI();
  });
  $('#installBtn')?.addEventListener('click',promptAppInstall);
  $('#homeInstallBtn')?.addEventListener('click',promptAppInstall);
  window.addEventListener('appinstalled',()=>{
    state.deferredPrompt=null;
    window.__appInstallPrompt=null;
    if($('#pwaStatus')) $('#pwaStatus').textContent='PWA instal·lada';
    syncAppInstallUI();
  });
  setTimeout(syncAppInstallUI,1000);
}

function registerSW(){
  if(location.protocol === 'file:'){
    if($('#pwaStatus')) $('#pwaStatus').textContent='Mode local · PWA activa quan es publiqui per HTTPS';
    return;
  }
  ensureAppServiceWorker().then(result=>{
    if($('#pwaStatus')) $('#pwaStatus').textContent=result.ok?'PWA preparada':'No s’ha pogut activar el Service Worker';
    syncAppInstallUI();
  });
}

async function init(){
  const startBtn = $('#startBtn');
  const startIconBtn = $('#startIconBtn');
  if(startBtn) startBtn.onclick = startIntro;
  if(startIconBtn) startIconBtn.onclick = startIntro;
  bootIdentity();
  restoreHistoryCollapsed();
  renderStandaloneSectionIcons();
  applyHomeHero();
  updateHeader('home');
  renderCalendar();
  renderHistory();
  bindCalendar();
  bindDresscodeModal();
  bindHistoryImageModal();
  renderTracks();
  bindPlayer();
  applyGlobalMute();
  const muteBtn = $('#muteBtn');
  if(muteBtn) muteBtn.onclick = toggleGlobalMute;
  bindContentUpdates();
  bindUserAuth();
  await initAppAuth();
  const requestedView=new URLSearchParams(location.search).get('view');
  renderNavigation(); renderHome(); renderUserSection();
  if(requestedView==='user'){ state.currentView='home'; switchView('user',false); }
  bindPwaInstall();
  registerSW();
  const backBtn = $('#backBtn');
  if(backBtn) backBtn.onclick = goBack;
}


init();
