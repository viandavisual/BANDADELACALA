// PWA INSTALL v0.110 — auditoria robusta EDITOR.
let editorInstallPrompt = null;
function captureEditorInstallPrompt(event){
  event.preventDefault();
  editorInstallPrompt = event;
  try{ syncEditorInstallButton(); }catch(_error){}
}
function clearEditorInstallPrompt(){
  editorInstallPrompt = null;
  try{ syncEditorInstallButton(); }catch(_error){}
}
window.addEventListener('beforeinstallprompt', captureEditorInstallPrompt);
window.addEventListener('appinstalled', clearEditorInstallPrompt);

const CFG = window.BANDA_CONFIG || {};
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[char]));
const upperUserName = value => String(value||'').trim().toLocaleUpperCase('ca-ES');
function safeWebUrl(value){try{const url=new URL(String(value||''));return ['http:','https:'].includes(url.protocol)?url.href:'';}catch(_error){return '';}}

const legacyLocalContent = BandaStore.load();
let content = BandaStore.loadRemoteCache?.() || BandaStore.loadPublished();
let supabaseActive = false;
let migrationPending = false;
let currentSession = null;
let currentProfile = null;
let editorGuestMode = false;
let editorCanWrite = false;
let remoteSaveChain = Promise.resolve();
let draggedTrackId = null;
let toastTimer = null;
let audioLibrary = [];
let userProfiles = [];
let pendingHistoricImages = [];
let pendingHistoricCoverFile = null;
let pendingHistoricCoverPreview = '';
let historicFeaturedSrc = '';
const selectedHistoricMergeIds = new Set();
let pendingHistoricOriginalFiles = [];
let editingHistoricImages = [];
let pendingHemerotecaImages = [];
let pendingHemerotecaOriginalFiles = [];
let pendingHemerotecaDocuments = [];
let editingHemerotecaImages = [];
let hemerotecaFeaturedIndex = 0;
let hemerotecaEditorFilter = 'all';
let archiveReviewFilter = 'pending';
let archiveSubmissions = [];
let archiveCounts = {pending:0,rejected:0};
let suggestionCounts = {pending:0,archived:0};
let suggestionsPending = [];
let suggestionsArchived = [];
const openHistoricEditorPeriods=new Set();
const openHemerotecaEditorSections=new Set();
const openCartellsEditorPeriods=new Set();
let trackListResizeObserver=null;
const eventListResizeObservers=new Map();
let eventExpiryTimer=null;

const DRESS_DEFS = [
  {key:'shirt', label:'CAMISA', options:[
    {id:'white_long',label:'MÀNIGA LLARGA · BLANCA',text:'Camisa blanca de màniga llarga'},
    {id:'black_long',label:'MÀNIGA LLARGA · NEGRA',text:'Camisa negra de màniga llarga'},
    {id:'white_short',label:'MÀNIGA CURTA · BLANCA',text:'Camisa blanca de màniga curta'},
    {id:'black_short',label:'MÀNIGA CURTA · NEGRA',text:'Camisa negra de màniga curta'},
    {id:'other',label:'ALTRES',text:''}
  ]},
  {key:'bottom', label:'PANTALONS/FALDILLA', options:[
    {id:'suit',label:'PANTALONS/FALDILLA DEL TRATGE',text:'Pantalons/Faldilla del tratge'},
    {id:'denim',label:'TEXANS / FALDILLA O PANTALÓ TEXÀ (NORMAL)',text:'Texans / Faldilla o pantaló texà (normal)'},
    {id:'other',label:'ALTRES',text:''}
  ]},
  {key:'socks', label:'MITGES/MITJONS', options:[
    {id:'black',label:'NEGRES',text:'Mitges/Mitjons negres'},
    {id:'other',label:'ALTRES',text:''}
  ]},
  {key:'jacket', label:'AMERICANA', options:[
    {id:'yes',label:'SÍ',text:'Americana: sí'},
    {id:'no',label:'NO',text:'Americana: no'},
    {id:'other',label:'ALTRES',text:''}
  ]},
  {key:'footwear', label:'CALÇAT', options:[
    {id:'black',label:'CALÇAT NEGRE (NO ES PERMET ESPORTIU NI CONVERSE)',text:'Calçat negre (no es permet esportiu ni Converse)'},
    {id:'other',label:'ALTRES',text:''}
  ]},
  {key:'tie', label:'CORBATA + PINZA', options:[
    {id:'yes',label:'SÍ',text:'Corbata + pinza: sí'},
    {id:'no',label:'NO',text:'Corbata + pinza: no'},
    {id:'other',label:'ALTRES',text:''}
  ]},
  {key:'coat', label:'ABRIC', options:[
    {id:'yes',label:'SÍ',text:'Abric: sí'},
    {id:'no',label:'NO',text:'Abric: no'},
    {id:'other',label:'ALTRES',text:''}
  ]}
];
const DEFAULT_DRESS_PRESETS={shirt:'white_short',bottom:'suit',socks:'black',jacket:'no',footwear:'black',tie:'yes',coat:'no'};

function garmentBaseSvg(key,variant='default'){
  const common='viewBox="0 0 48 48" class="garment-icon-svg" aria-hidden="true"';
  const stroke='fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
  if(key==='shirt') return `<svg ${common}><path ${stroke} d="M15 10 20 7h8l5 3 8 6-5 7-5-3v18H17V20l-5 3-5-7 8-6Z"/><path class="garment-gold" ${stroke} d="M20 7c.7 4 2 6 4 6s3.3-2 4-6"/></svg>`;
  if(key==='bottom' && variant==='skirt') return `<svg ${common}><path ${stroke} d="M18 8h12l2 7 6 24H10l6-24 2-7Z"/><path class="garment-gold" ${stroke} d="M16 15h16"/></svg>`;
  if(key==='bottom') return `<svg ${common}><path ${stroke} d="M14 8h20l-2 31h-8l-1-18-1 18h-8L14 8Z"/><path class="garment-gold" ${stroke} d="M23 9v12"/></svg>`;
  if(key==='socks' && variant==='tights') return `<svg ${common}><path ${stroke} d="M12 7h24l-2 9-4 25h-8l2-21-3-4-3 4 2 21h-8L8 16l4-9Z"/><path class="garment-gold" ${stroke} d="M10 15h24M21 16v7"/></svg>`;
  if(key==='socks') return `<svg ${common}><path ${stroke} d="M12 8h9v20l-4 10H8l4-12V8ZM27 8h9v20l4 10h-9l-4-12V8Z"/><path class="garment-gold" ${stroke} d="M12 13h9M27 13h9"/></svg>`;
  if(key==='jacket') return `<svg ${common}><path ${stroke} d="M15 9 21 6h6l6 3 6 8-5 5-3-4v21H17V18l-3 4-5-5 6-8Z"/><path class="garment-gold" ${stroke} d="m21 7 3 8 3-8M24 15v24"/></svg>`;
  if(key==='coat') return `<svg ${common}><path ${stroke} d="M16 8 21 5h6l5 3 6 8-5 5-3-4v24H18V17l-3 4-5-5 6-8Z"/><path class="garment-gold" ${stroke} d="m21 6 3 9 3-9M24 15v26M19 27h10"/></svg>`;
  if(key==='footwear') return `<svg ${common}><path ${stroke} d="M8 29c7 0 10-2 13-7l5 4c4 4 8 6 14 7v6H8V29Z"/><path class="garment-gold" ${stroke} d="M22 28h7M12 39v2"/></svg>`;
  return `<svg ${common}><path ${stroke} d="M20 7h8l-2 8 4 20-6 7-6-7 4-20-2-8Z"/><path class="garment-gold" ${stroke} d="M20 7l4 8 4-8"/></svg>`;
}
function garmentIconSvg(key){
  if(key==='bottom') return `<span class="garment-crossfade garment-crossfade-bottom"><span>${garmentBaseSvg('bottom')}</span><span>${garmentBaseSvg('bottom','skirt')}</span></span>`;
  if(key==='socks') return `<span class="garment-crossfade garment-crossfade-socks"><span>${garmentBaseSvg('socks')}</span><span>${garmentBaseSvg('socks','tights')}</span></span>`;
  return garmentBaseSvg(key);
}

const views = {
  dashboard:{eyebrow:'CONTROL',title:'RESUM'},
  home:{eyebrow:'CONTINGUT',title:'HOME'},
  calendar:{eyebrow:'CONTINGUT',title:'CALENDARI'},
  dresscode:{eyebrow:'CONTINGUT',title:'DRESSCODE'},
  player:{eyebrow:'CONTINGUT',title:'PLAYER'},
  demos:{eyebrow:'CONTINGUT',title:'DEMOS'},
  history:{eyebrow:'CONTINGUT',title:'HISTÒRIC'},
  archive:{eyebrow:'GESTIÓ',title:'APORTACIONS'},
  games:{eyebrow:'CONTINGUT',title:'MINIJOCS'},
  users:{eyebrow:'GESTIÓ',title:'USUARIS'},
  system:{eyebrow:'CONFIGURACIÓ',title:'SISTEMA'}
};

function editorPageTitleIcon(id){
  if(id!=='history') return '';
  return `<svg viewBox="0 0 40 40" aria-hidden="true" class="editor-photo-icon-svg"><rect class="photo-back" x="4" y="8" width="29" height="24" rx="5"/><rect class="photo-front" x="8" y="5" width="28" height="24" rx="5"/><circle class="photo-sun" cx="27" cy="13" r="3.2"/><path class="photo-land" d="m11 25 7-7 5 5 4-4 6 6"/></svg>`;
}

function editorIsAdmin(){ return currentProfile?.role==='admin'; }
function cleanTechnicalUiText(message){
  const text=String(message??'');
  if(editorIsAdmin()) return text;
  const exact={
    'DESAT A SUPABASE':'DESAT',
    'DESANT A SUPABASE…':'DESANT…',
    'CAL MIGRAR A SUPABASE':'REVISIÓ D’ADMINISTRACIÓ PENDENT',
    'ACTUALITZAT DES DE SUPABASE':'CONTINGUT ACTUALITZAT'
  };
  if(exact[text]) return exact[text];
  return text.replace(/Supabase Storage/gi,'el núvol compartit').replace(/Supabase Auth/gi,'el sistema de comptes').replace(/Supabase/gi,'el sistema compartit');
}
function syncAdminOnlyUi(){
  document.body.classList.toggle('editor-admin',editorIsAdmin());
  $$('[data-admin-only]').forEach(el=>{el.hidden=!editorIsAdmin();});
  const gestor=currentProfile?.role==='gestor';
  ['games','system'].forEach(id=>{
    $$(`[data-editor-nav="${id}"], [data-editor-view="${id}"]`).forEach(el=>{ el.hidden=gestor; });
  });
  const activeRestricted=document.querySelector('.editor-view.active[data-editor-view="games"], .editor-view.active[data-editor-view="system"]');
  if(gestor && activeRestricted) switchEditorView('dashboard');
}
function showToast(message){
  const toast=$('#toast'); toast.textContent=cleanTechnicalUiText(message); toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('show'),2800);
}
function markSaved(text='DESAT A SUPABASE'){ $('#saveState').textContent=cleanTechnicalUiText(text); clearTimeout(markSaved.timer); }
function save(next=content,message='Canvis desats'){
  if(!editorCanWrite){ showToast('Mode consulta · no pots publicar canvis'); return false; }
  try{
    content=BandaStore.normalize(next);
    renderAll();
    if(supabaseActive && currentSession){
      const snapshot=BandaStore.normalize(content);
      BandaStore.cacheRemote?.(snapshot);
      markSaved('DESANT A SUPABASE…');
      remoteSaveChain=remoteSaveChain.then(()=>BandaSupabase.saveContent(snapshot)).then(clean=>{
        content=BandaStore.normalize(clean);
        BandaStore.cacheRemote?.(content);
        renderAll();
        markSaved('DESAT A SUPABASE');
        if(message) showToast(message);
      }).catch(error=>{
        console.error(error);
        markSaved('ERROR DE SINCRONITZACIÓ');
        showToast('No s’ha pogut desar a Supabase');
      });
      return true;
    }
    content=BandaStore.save(content);
    migrationPending=true;
    markSaved('CAL MIGRAR A SUPABASE');
    if(message) showToast(`${message} · pendent de migrar`);
    return true;
  }catch(error){
    if(error?.message==='STORAGE_QUOTA') showToast(editorIsAdmin()?'No hi ha prou espai local. Migra les dades a Supabase.':'No hi ha prou espai local. Contacta amb el USER ADMIN.');
    else showToast('No s’han pogut desar els canvis');
    return false;
  }
}
function bootIdentity(){ $$('[data-app-name]').forEach(el=>el.textContent=CFG.appName||'BANDA DE LA CALA'); $$('[data-app-subtitle]').forEach(el=>el.textContent=CFG.subtitle||'L’Ametlla de Mar'); $$('[data-app-icon]').forEach(el=>el.src=CFG.appIcon||'assets/brand/app-icon.png'); $$('[data-app-version]').forEach(el=>el.textContent=CFG.version||window.BANDA_VERSION||'v0.26'); }
function editorCanAccessView(id){ return !(currentProfile?.role==='gestor' && ['games','system'].includes(id)); }
function switchEditorView(id){ if(!views[id] || !editorCanAccessView(id)) id='dashboard'; $$('.editor-view').forEach(view=>view.classList.toggle('active',view.dataset.editorView===id)); $$('[data-editor-nav]').forEach(btn=>btn.classList.toggle('active',btn.dataset.editorNav===id)); $('#editorEyebrow').textContent=views[id].eyebrow; $('#editorTitle').textContent=views[id].title; const titleIcon=$('#editorTitleIcon'); if(titleIcon){titleIcon.innerHTML=editorPageTitleIcon(id);titleIcon.hidden=id!=='history';} const installBtn=$('#editorInstallBtn'); if(installBtn) installBtn.classList.toggle('view-hidden',id!=='dashboard'); if(id==='dashboard') renderDashboard(); if(id==='archive') refreshArchiveReview(); else refreshArchivePendingBadge(); window.scrollTo({top:0,behavior:'smooth'}); }
function bindNavigation(){ $$('[data-editor-nav]').forEach(btn=>btn.addEventListener('click',()=>switchEditorView(btn.dataset.editorNav))); $$('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>switchEditorView(btn.dataset.jump))); }
function formatDate(date){ if(!date) return 'Sense data'; const d=new Date(date+'T12:00:00'); return new Intl.DateTimeFormat('ca-ES',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(d).replace(/^./,c=>c.toUpperCase()); }
function formatDateNumeric(date){ if(!date) return '—'; const [y,m,d]=String(date).split('-'); return y&&m&&d?`${d}/${m}/${y}`:String(date); }
function formatDashboardEventDate(date){
  if(!date) return 'SENSE DATA';
  const [y,m,d]=String(date).split('-');
  if(!y||!m||!d) return String(date).toUpperCase();
  const parsed=new Date(`${y}-${m}-${d}T12:00:00`);
  const weekday=new Intl.DateTimeFormat('ca-ES',{weekday:'long'}).format(parsed).replace(/^./,c=>c.toUpperCase()).toUpperCase();
  return `${weekday} · ${d}/${m}/${String(y).slice(-2)}`;
}

function animateStatCounter(element,target,duration=720){
  if(!element) return;
  const end=Math.max(0,Number(target)||0);
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){element.textContent=String(end);return;}
  if(element._counterFrame) cancelAnimationFrame(element._counterFrame);
  const start=performance.now();
  const step=now=>{
    const progress=Math.min(1,(now-start)/duration);
    const eased=1-Math.pow(1-progress,3);
    element.textContent=String(Math.round(end*eased));
    if(progress<1) element._counterFrame=requestAnimationFrame(step);
    else element._counterFrame=null;
  };
  element.textContent='0';
  element._counterFrame=requestAnimationFrame(step);
}

const MANAGED_LISTS={
  dresscodeList:'.dresscode-strip',
  historicEditorList:'.historic-editor-item',
  hemerotecaEditorList:'.historic-editor-item',
  usersList:'.list-item'
};
const managedListResizeObservers=new Map();
function managedMaterialItems(host){
  const selector=MANAGED_LISTS[host?.id];
  if(!host||!selector) return [];
  return [...host.children].filter(child=>child.matches?.(selector));
}
function observeManagedListGeometry(host,items){
  if(!('ResizeObserver' in window)) return;
  let observer=managedListResizeObservers.get(host);
  if(!observer){
    observer=new ResizeObserver(()=>fitManagedListToFour(host));
    managedListResizeObservers.set(host,observer);
  }
  observer.disconnect();
  const isUsers=host?.id==='usersList';
  const required=isUsers?10:5;
  if(items.length<required) return;
  const lastObserved=items[isUsers?9:3];
  const allChildren=[...host.children];
  const lastIndex=allChildren.indexOf(lastObserved);
  allChildren.slice(0,Math.max(0,lastIndex+1)).forEach(child=>observer.observe(child));
}
function fitManagedListToFour(host){
  if(!host) return;
  if(host._managedFitFrame) cancelAnimationFrame(host._managedFitFrame);
  host._managedFitFrame=requestAnimationFrame(()=>{
    host._managedFitFrame=0;
    const items=managedMaterialItems(host);
    observeManagedListGeometry(host,items);

    /* USUARIS v0.84: 9 targetes completes + mitja desena targeta visibles. */
    if(host.id==='usersList'){
      if(items.length<10){
        host.style.height='';
        host.style.maxHeight='';
        host.classList.remove('managed-scroll-list');
        return;
      }
      const previousScroll=host.scrollTop;
      host.classList.add('managed-scroll-list');
      host.style.height='auto';
      host.style.maxHeight='none';
      void host.offsetWidth;
      const gap=parseFloat(getComputedStyle(host).rowGap||getComputedStyle(host).gap)||0;
      const heights=items.slice(0,10).map(item=>item.getBoundingClientRect().height);
      const visibleHeight=heights.slice(0,9).reduce((sum,h)=>sum+h,0)+(gap*9)+(heights[9]*.5);
      const px=`${Math.ceil(visibleHeight)}px`;
      host.style.height=px;
      host.style.maxHeight=px;
      host.scrollTop=Math.min(previousScroll,Math.max(0,host.scrollHeight-host.clientHeight));
      return;
    }

    if(items.length<=4){
      host.style.height='';
      host.style.maxHeight='';
      host.classList.remove('managed-scroll-list');
      return;
    }

    /* HISTÒRIC / HEMEROTECA / DRESSCODE: 4 targetes completes. */
    const previousScroll=host.scrollTop;
    host.classList.add('managed-scroll-list');
    host.style.height='';
    host.style.maxHeight='none';
    void host.offsetWidth;
    const hostRect=host.getBoundingClientRect();
    const fourthRect=items[3].getBoundingClientRect();
    const visibleHeight=Math.max(1,fourthRect.bottom-hostRect.top+host.scrollTop);
    host.style.maxHeight=`${Math.ceil(visibleHeight)}px`;
    host.scrollTop=Math.min(previousScroll,Math.max(0,host.scrollHeight-host.clientHeight));
  });
}
function refreshManagedLists(){Object.keys(MANAGED_LISTS).forEach(id=>fitManagedListToFour(document.getElementById(id)));}
function initManagedListViewports(){
  Object.keys(MANAGED_LISTS).forEach(id=>{
    const host=document.getElementById(id); if(!host) return;
    new MutationObserver(()=>fitManagedListToFour(host)).observe(host,{childList:true});
    /* Les imatges de HISTÒRIC/HEMEROTECA carreguen després del render. */
    host.addEventListener('load',event=>{if(event.target?.tagName==='IMG')fitManagedListToFour(host);},true);
    fitManagedListToFour(host);
  });
  window.addEventListener('resize',()=>{refreshManagedLists();fitTrackListFourAndHalf();fitEventListNineAndHalf('#eventEditorList');fitEventListNineAndHalf('#pastEventEditorList');},{passive:true});
  document.fonts?.ready?.then(()=>{refreshManagedLists();fitTrackListFourAndHalf();fitEventListNineAndHalf('#eventEditorList');fitEventListNineAndHalf('#pastEventEditorList');}).catch?.(()=>{});
}

function renderDashboard(){
  const {agenda}=splitEventsByStatus();
  const tracks=content.tracks||[];
  const next=agenda[0];
  animateStatCounter($('#statEvents'),agenda.length); $('#statNextEvent').textContent=next?`${formatDashboardEventDate(next.date)} · ${next.title}`:'Cap activitat futura';
  animateStatCounter($('#statDresscodes'),(content.dresscodes||[]).length); animateStatCounter($('#statTracks'),tracks.length); $('#statVisibleTracks').textContent=`${tracks.filter(track=>track.visible!==false).length} visibles`; const historicPhotoTotal=(content.historicItems||[]).reduce((sum,item)=>sum+historicImages(item).length,0); animateStatCounter($('#statHistoric'),historicPhotoTotal);
}

function editorAllHistoricHeroImages(){
  const out=[];
  (content.historicItems||[]).forEach(item=>{
    const images=historicImages(item);
    const featured=String(item?.featuredImageSrc||'').trim();
    if(featured && !images.includes(featured))images.unshift(featured);
    images.forEach(src=>{src=String(src||'').trim();if(src && !out.includes(src))out.push(src);});
  });
  return out;
}
function editorHistoricImageRefsNewestFirst(){
  const rows=[];
  (content.historicItems||[]).forEach((item,itemOrder)=>{
    const images=historicImages(item);
    images.forEach((src,index)=>{
      src=String(src||'').trim();
      if(src) rows.push({src,itemId:item.id,index,createdAt:item.createdAt||'',year:Number(item.year)||0,itemOrder,indexOrder:index});
    });
    const featured=String(item?.featuredImageSrc||'').trim();
    if(featured && !images.includes(featured)) rows.push({src:featured,itemId:item.id,index:-1,createdAt:item.createdAt||'',year:Number(item.year)||0,itemOrder,indexOrder:999999});
  });
  const seen=new Set();
  return rows.sort((a,b)=>{
    const ta=Date.parse(a.createdAt)||0,tb=Date.parse(b.createdAt)||0;
    if(ta!==tb)return tb-ta;
    if(a.year!==b.year)return b.year-a.year;
    if(a.itemOrder!==b.itemOrder)return b.itemOrder-a.itemOrder;
    return b.indexOrder-a.indexOrder;
  }).filter(row=>{if(seen.has(row.src))return false;seen.add(row.src);return true;});
}
function homeHeroExcludedImageSet(){
  const raw=content.settings?.homeHeroExcludedImages;
  return new Set((Array.isArray(raw)?raw:[]).map(src=>String(src||'').trim()).filter(Boolean));
}
function editorHistoricHeroImages(){
  const excluded=homeHeroExcludedImageSet();
  return editorAllHistoricHeroImages().filter(src=>!excluded.has(src));
}
function renderHomeRandomExclusions(){
  const gallery=$('#homeRandomExclusionsGallery');
  const counter=$('#homeRandomExclusionsCount');
  if(!gallery||!counter)return;
  const refs=editorHistoricImageRefsNewestFirst();
  const excluded=homeHeroExcludedImageSet();
  counter.textContent=String(excluded.size);
  counter.title=`${excluded.size} ${excluded.size===1?'imatge exclosa':'imatges excloses'}`;
  if(!refs.length){
    gallery.innerHTML='<div class="empty-state">No hi ha fotografies disponibles a l’HISTÒRIC.</div>';
    return;
  }
  gallery.innerHTML=refs.map((ref,index)=>{
    const checked=excluded.has(ref.src);
    const crop=ref.index>=0?`<button class="random-exclusion-crop" type="button" data-home-random-crop="${index}" title="Fer crop" aria-label="Fer crop">✂</button>`:'';
    return `<div class="random-exclusion-thumb ${checked?'is-excluded':''}"><label class="random-exclusion-choice"><input type="checkbox" data-home-random-exclusion="${index}" ${checked?'checked':''} /><span class="random-exclusion-image"><img src="${esc(ref.src)}" alt="Fotografia HISTÒRIC ${index+1}" loading="lazy" /><span class="random-exclusion-state">${checked?'EXCLOSA':'DISPONIBLE'}</span></span></label>${crop}</div>`;
  }).join('');
  $$('[data-home-random-exclusion]',gallery).forEach(input=>input.addEventListener('change',()=>{
    if(!editorIsAdmin()){showToast('Aquesta configuració està reservada al USER ADMIN');renderHomeRandomExclusions();return;}
    const ref=refs[Number(input.dataset.homeRandomExclusion)];
    if(!ref?.src)return;
    content.settings=content.settings||{};
    const next=homeHeroExcludedImageSet();
    if(input.checked)next.add(ref.src);else next.delete(ref.src);
    content.settings.homeHeroExcludedImages=[...next];
    save(content,input.checked?'Imatge exclosa del banner random':'Imatge recuperada per al banner random');
    renderHomeRandomExclusions();
  }));
  $$('[data-home-random-crop]',gallery).forEach(btn=>btn.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();
    if(!editorIsAdmin()){showToast('Aquesta configuració està reservada al USER ADMIN');return;}
    const ref=refs[Number(btn.dataset.homeRandomCrop)];
    if(ref?.itemId && ref.index>=0)openHistoricCrop(ref.itemId,ref.index);
  }));
}
function renderHomeEditor(){
  content.settings=content.settings||{};
  const heroMode=['random','logo','manual'].includes(content.settings.homeHeroMode) ? content.settings.homeHeroMode : (content.settings.homeHeroImage?'manual':'random');
  const historic=editorHistoricHeroImages();
  const src=heroMode==='logo' ? 'assets/brand/imago-banda-de-la-cala.png' : (heroMode==='manual' && content.settings.homeHeroImage ? content.settings.homeHeroImage : (historic[0]||'assets/brand/imago-banda-de-la-cala.png'));
  const previewImage=$('#homeHeroPreview'); if(previewImage) previewImage.src=src;
  const mode=$('#homePreviewMode');
  if(mode) mode.textContent=window.matchMedia('(max-width: 780px)').matches?'MOBILE · MATEIXA COMPOSICIÓ DE L’APP':'DESKTOP · MATEIXA COMPOSICIÓ DE L’APP';
  const status=$('#homeHeroModeStatus');
  if(status)status.textContent=heroMode==='random' ? `ACTIU · IMATGES RANDOM DE L’HISTÒRIC${historic.length?` · ${historic.length} disponibles`:' · sense fotos disponibles (es mostrarà el logotip)'}` : (heroMode==='logo'?'ACTIU · LOGOTIP BANDA':'ACTIU · IMATGE MANUAL');
  $('#randomHomeHero')?.classList.toggle('is-active',heroMode==='random');
  $('#logoHomeHero')?.classList.toggle('is-active',heroMode==='logo');
}
function quinaNotaEditorSettings(){
  content.settings=content.settings||{};
  content.settings.minigames=content.settings.minigames&&typeof content.settings.minigames==='object'?content.settings.minigames:{};
  const current=content.settings.minigames.quinaNota&&typeof content.settings.minigames.quinaNota==='object'?content.settings.minigames.quinaNota:{};
  content.settings.minigames.quinaNota={
    active:current.active!==false,
    visibleName:String(current.visibleName||'QUINA NOTA ÉS?').trim()||'QUINA NOTA ÉS?',
    description:String(current.description||'Endevina la nota del dia i suma punts musicals.').trim()||'Endevina la nota del dia i suma punts musicals.',
    icon:String(current.icon||'').trim(),
    titleImage:String(current.titleImage||'').trim()
  };
  return content.settings.minigames.quinaNota;
}
function renderQuinaNotaIconPreview(settings=quinaNotaEditorSettings()){
  const img=$('#quinaNotaPreviewIconImg'), fallback=$('#quinaNotaPreviewIconFallback');
  if(!img||!fallback)return;
  if(settings.icon){
    img.hidden=false; fallback.hidden=true; img.src=settings.icon;
    img.onerror=()=>{img.hidden=true;fallback.hidden=false;};
  }else{
    img.hidden=true; img.removeAttribute('src'); fallback.hidden=false;
  }
}
function renderQuinaNotaTitlePreview(settings=quinaNotaEditorSettings()){
  const img=$('#quinaNotaPreviewTitleImage'), text=$('#quinaNotaPreviewName');
  if(!img||!text)return;
  if(settings.titleImage){img.hidden=false;img.src=settings.titleImage;text.hidden=true;img.onerror=()=>{img.hidden=true;text.hidden=false;};}
  else{img.hidden=true;img.removeAttribute('src');text.hidden=false;}
}
function renderMinigames(){
  const settings=quinaNotaEditorSettings();
  const active=$('#quinaNotaActive'), name=$('#quinaNotaVisibleName'), description=$('#quinaNotaDescription');
  if(active) active.checked=settings.active;
  if(name && document.activeElement!==name) name.value=settings.visibleName;
  if(description && document.activeElement!==description) description.value=settings.description;
  const previewName=$('#quinaNotaPreviewName'); if(previewName) previewName.textContent=settings.visibleName;
  const previewDescription=$('#quinaNotaPreviewDescription'); if(previewDescription) previewDescription.textContent=settings.description;
  const status=$('#quinaNotaPreviewStatus'); if(status){status.textContent=settings.active?'ACTIU':'INACTIU';status.classList.toggle('is-inactive',!settings.active);}
  renderQuinaNotaIconPreview(settings);
  renderQuinaNotaTitlePreview(settings);
}
function backupSafeSegment(value,fallback='fitxer'){
  const clean=String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'');
  return clean || fallback;
}
function backupOriginalName(file){
  const raw=backupSafeSegment(file?.name||'imatge','imatge');
  if(/\.[a-z0-9]{1,8}$/i.test(raw)) return raw;
  const ext=String(file?.type||'').split('/').pop()?.replace(/[^a-z0-9]/gi,'').toLowerCase() || 'bin';
  return `${raw}.${ext}`;
}
function mediaBackupPath(root,file){
  const cleanRoot=String(root||'altres').replace(/^\/+|\/+$/g,'');
  const stamp=`${Number(file?.lastModified)||0}-${Number(file?.size)||0}`;
  return `${cleanRoot}/${stamp}-${backupOriginalName(file)}`;
}
function cloudMediaReady(){
  return !!(editorCanWrite && supabaseActive && currentSession && window.BandaSupabase?.backupOriginalMedia);
}
async function uploadImageWithBackup({file,compressed,activeFile=null,activeBucket,activeFolder,activeName,backupRoot,backupLabel='imatge'}){
  if(!cloudMediaReady()) throw new Error('MEDIA_CLOUD_REQUIRED');
  const githubPath=mediaBackupPath(backupRoot,file);
  showToast(`Creant còpia de seguretat de ${backupLabel}…`);
  const backup=await BandaSupabase.backupOriginalMedia(file,githubPath);
  if(backup?.stagingRemoved===false) console.warn('Backup confirmat però staging pendent de neteja',backup);
  showToast(`Pujant ${backupLabel} al núvol…`);
  if(activeFile instanceof Blob){
    return (await BandaSupabase.uploadFile(activeBucket,activeFile,activeFolder,activeName)).url;
  }
  return (await BandaSupabase.uploadDataUrl(activeBucket,compressed,activeFolder,activeName)).url;
}
function mediaUploadErrorToast(error,fallback='No s’ha pogut pujar la imatge'){
  const code=String(error?.message||'');
  if(code==='MEDIA_CLOUD_REQUIRED') return showToast('Cal connexió i sessió de gestor per pujar imatges. No s’ha desat cap base64 local.');
  if(/BACKUP|GITHUB|EDGE_FUNCTION|STORAGE/i.test(code)) return showToast('No s’ha pogut confirmar la còpia de seguretat. La imatge NO s’ha publicat. Torna-ho a provar.');
  showToast(fallback);
}

function bindMinigames(){
  const form=$('#quinaNotaSettingsForm'); if(!form) return;
  const livePreview=()=>{
    const previewName=$('#quinaNotaPreviewName'); if(previewName) previewName.textContent=$('#quinaNotaVisibleName')?.value.trim()||'QUINA NOTA ÉS?';
    const previewDescription=$('#quinaNotaPreviewDescription'); if(previewDescription) previewDescription.textContent=$('#quinaNotaDescription')?.value.trim()||'Endevina la nota del dia i suma punts musicals.';
    const status=$('#quinaNotaPreviewStatus'); if(status){const active=!!$('#quinaNotaActive')?.checked;status.textContent=active?'ACTIU':'INACTIU';status.classList.toggle('is-inactive',!active);}
  };
  $('#quinaNotaActive')?.addEventListener('change',livePreview);
  $('#quinaNotaVisibleName')?.addEventListener('input',livePreview);
  $('#quinaNotaDescription')?.addEventListener('input',livePreview);
  $('#quinaNotaIconFile')?.addEventListener('change',async event=>{
    const file=event.target.files?.[0]; if(!file)return;
    try{
      const compressed=await compressImage(file,true);
      const imageSrc=await uploadImageWithBackup({
        file,compressed,activeFile:file,
        activeBucket:'app-images',activeFolder:'minigames/quina-nota-es',activeName:'quina-nota-es-icon',
        backupRoot:'minijocs/quina-nota-es/icon',backupLabel:'la icona del minijoc'
      });
      const settings=quinaNotaEditorSettings(); settings.icon=imageSrc;
      save(content,'Icona de QUINA NOTA ÉS? actualitzada');
    }catch(error){console.error(error);mediaUploadErrorToast(error,'No s’ha pogut processar o pujar la icona');}
    event.target.value='';
  });
  $('#quinaNotaTitleImageFile')?.addEventListener('change',async event=>{
    const file=event.target.files?.[0]; if(!file)return;
    try{
      const compressed=await compressImage(file,true);
      const imageSrc=await uploadImageWithBackup({
        file,compressed,activeFile:file,
        activeBucket:'app-images',activeFolder:'minigames/quina-nota-es',activeName:'quina-nota-es-title',
        backupRoot:'minijocs/quina-nota-es/title',backupLabel:'la imatge del títol'
      });
      const settings=quinaNotaEditorSettings(); settings.titleImage=imageSrc;
      save(content,'Imatge del títol de QUINA NOTA ÉS? actualitzada');
    }catch(error){console.error(error);mediaUploadErrorToast(error,'No s’ha pogut processar o pujar la imatge del títol');}
    event.target.value='';
  });
  $('#clearQuinaNotaTitleImage')?.addEventListener('click',()=>{
    const settings=quinaNotaEditorSettings(); settings.titleImage='';
    save(content,'Imatge del títol de QUINA NOTA ÉS? eliminada');
  });
  $('#clearQuinaNotaIcon')?.addEventListener('click',()=>{
    const settings=quinaNotaEditorSettings(); settings.icon='';
    save(content,'Icona per defecte de QUINA NOTA ÉS? restaurada');
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const current=quinaNotaEditorSettings();
    content.settings=content.settings||{};
    content.settings.minigames=content.settings.minigames||{};
    content.settings.minigames.quinaNota={
      active:!!$('#quinaNotaActive')?.checked,
      visibleName:$('#quinaNotaVisibleName')?.value.trim()||'QUINA NOTA ÉS?',
      description:$('#quinaNotaDescription')?.value.trim()||'Endevina la nota del dia i suma punts musicals.',
      icon:current.icon||'',
      titleImage:current.titleImage||''
    };
    save(content,'Configuració de QUINA NOTA ÉS? desada');
  });
}

async function compressImage(file,preserveAlpha=false){
  const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=dataUrl;});
  const maxW=1600,maxH=1000,scale=Math.min(1,maxW/img.width,maxH/img.height); const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(img.width*scale)); canvas.height=Math.max(1,Math.round(img.height*scale));
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height); return preserveAlpha?canvas.toDataURL('image/png'):canvas.toDataURL('image/jpeg',0.84);
}
function bindHomeEditor(){
  try{
    const mq=window.matchMedia('(max-width: 780px)');
    const syncPreviewMode=()=>renderHomeEditor();
    if(mq.addEventListener) mq.addEventListener('change',syncPreviewMode);
    else if(mq.addListener) mq.addListener(syncPreviewMode);
  }catch(_error){}
  $('#homeHeroFile').addEventListener('change',async event=>{
    const file=event.target.files?.[0]; if(!file) return;
    try{
      const compressed=await compressImage(file);
      const imageSrc=await uploadImageWithBackup({
        file,compressed,
        activeBucket:'app-images',activeFolder:'home',activeName:'home-hero',
        backupRoot:'home',backupLabel:'la imatge de HOME'
      });
      content.settings=content.settings||{}; content.settings.homeHeroImage=imageSrc; content.settings.homeHeroMode='manual';
      save(content,'Imatge manual de HOME actualitzada');
    }catch(error){ console.error(error); mediaUploadErrorToast(error,'No s’ha pogut processar o pujar la imatge'); }
    event.target.value='';
  });
  $('#randomHomeHero').onclick=()=>{ content.settings=content.settings||{}; content.settings.homeHeroMode='random'; save(content,'HOME configurada amb imatges random de l’HISTÒRIC'); };
  $('#logoHomeHero').onclick=()=>{ content.settings=content.settings||{}; content.settings.homeHeroMode='logo'; save(content,'HOME configurada amb el logotip de la banda'); };
}

function renderEventDresscodeOptions(selected=''){
  const select=$('#eventDresscode'); if(!select) return;
  const items=[...(content.dresscodes||[])].sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'ca'));
  select.innerHTML='<option value="">SENSE DRESSCODE</option>'+items.map(d=>`<option value="${esc(d.id)}">${esc(d.title||'Dresscode')}</option>`).join('');
  if(selected && items.some(d=>d.id===selected)) select.value=selected;
}
function syncEventFormVisibility(){
  const isRehearsal=$('#eventType').value==='ASSAIG';
  $('#rehearsalTitleWrap').hidden=!isRehearsal;
  $('#freeTitleWrap').hidden=isRehearsal;
  $('#eventTitleDetailWrap').hidden=!isRehearsal || $('#eventTitlePreset').value!=='ASSAIG PARCIAL CONCRET';
  $('#eventPlaceDetailWrap').hidden=$('#eventPlacePreset').value!=='ALTRES';
  const canDresscode=['CONCERT','ACTUACIÓ'].includes(String($('#eventType').value||'').toUpperCase());
  const dressWrap=$('#eventDresscodeWrap');
  if(dressWrap) dressWrap.hidden=!canDresscode;
  if(!canDresscode && $('#eventDresscode')) $('#eventDresscode').value='';
}
function resetEventForm(){
  $('#eventForm').reset();
  $('#eventId').value='';
  $('#eventType').value='ASSAIG';
  $('#eventTitlePreset').value='ASSAIG GENERAL';
  $('#eventTime').value='21:30';
  $('#eventPlacePreset').value='LOCAL SOCIAL';
  $('#eventFormTitle').textContent='Nou esdeveniment';
  renderEventDresscodeOptions('');
  syncEventFormVisibility();
}
function eventTitleFromForm(){
  if($('#eventType').value!=='ASSAIG') return $('#eventFreeTitle').value.trim();
  const preset=$('#eventTitlePreset').value;
  if(preset==='ASSAIG PARCIAL CONCRET'){
    const detail=$('#eventTitleDetail').value.trim();
    return detail?`${preset} · ${detail}`:preset;
  }
  return preset;
}
function eventPlaceFromForm(){ return $('#eventPlacePreset').value==='ALTRES' ? $('#eventPlaceDetail').value.trim() : 'LOCAL SOCIAL'; }
function editEvent(id){
  const event=(content.events||[]).find(item=>item.id===id); if(!event) return;
  $('#eventId').value=event.id;
  $('#eventType').value=event.type||'ASSAIG';
  $('#eventDate').value=event.date||'';
  $('#eventTime').value=event.time||'';
  $('#eventNotes').value=event.notes||'';
  if((event.type||'ASSAIG')==='ASSAIG'){
    const presets=['ASSAIG GENERAL','ASSAIG PARCIAL FUSTA','ASSAIG PARCIAL PERCUSIÓ','ASSAIG PARCIAL METALL'];
    const upper=String(event.title||'').toUpperCase();
    if(upper.startsWith('ASSAIG PARCIAL CONCRET')){ $('#eventTitlePreset').value='ASSAIG PARCIAL CONCRET'; $('#eventTitleDetail').value=String(event.title).split('·').slice(1).join('·').trim(); }
    else if(presets.includes(upper)){ $('#eventTitlePreset').value=upper; $('#eventTitleDetail').value=''; }
    else { $('#eventTitlePreset').value='ASSAIG PARCIAL CONCRET'; $('#eventTitleDetail').value=event.title||''; }
  }else $('#eventFreeTitle').value=event.title||'';
  if(String(event.place||'').toUpperCase()==='LOCAL SOCIAL'){ $('#eventPlacePreset').value='LOCAL SOCIAL'; $('#eventPlaceDetail').value=''; }
  else { $('#eventPlacePreset').value='ALTRES'; $('#eventPlaceDetail').value=event.place||''; }
  renderEventDresscodeOptions(event.dresscodeId||'');
  $('#eventFormTitle').textContent='Editar esdeveniment';
  syncEventFormVisibility();
  $('#eventForm').scrollIntoView({behavior:'smooth',block:'start'});
}
function deleteEvent(id){
  const event=(content.events||[]).find(item=>item.id===id); if(!event) return;
  if(!confirm(`Vols eliminar “${event.title}”?`)) return;
  content.events=content.events.filter(item=>item.id!==id);
  save(content,'Esdeveniment eliminat');
  resetEventForm();
}
function eventStripDetails(event){
  const dress=(content.dresscodes||[]).find(d=>d.id===event.dresscodeId);
  return `<div class="event-strip-detail-grid">
    <div><span>TIPUS</span><strong>${esc(event.type||'—')}</strong></div>
    ${event.place?`<div><span>LLOC</span><strong>${esc(event.place)}</strong></div>`:''}
    ${dress?`<div><span>DRESSCODE</span><strong>${esc(dress.title||'Dresscode')}</strong></div>`:''}
    ${event.notes?`<div class="event-strip-notes"><span>NOTES</span><strong>${esc(event.notes)}</strong></div>`:''}
  </div>`;
}
function eventDateTimeMs(event){
  const date=String(event?.date||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Number.POSITIVE_INFINITY;
  const rawTime=String(event?.time||'').trim();
  const time=/^\d{2}:\d{2}$/.test(rawTime)?`${rawTime}:00`:'23:59:59';
  const value=new Date(`${date}T${time}`).getTime();
  return Number.isFinite(value)?value:Number.POSITIVE_INFINITY;
}
function splitEventsByStatus(){
  const now=Date.now();
  const all=[...(content.events||[])];
  const agenda=all.filter(event=>eventDateTimeMs(event)>=now)
    .sort((a,b)=>eventDateTimeMs(a)-eventDateTimeMs(b) || String(a.title||'').localeCompare(String(b.title||''),'ca'));
  const past=all.filter(event=>eventDateTimeMs(event)<now)
    .sort((a,b)=>eventDateTimeMs(b)-eventDateTimeMs(a) || String(b.title||'').localeCompare(String(a.title||''),'ca'));
  return {agenda,past};
}
function scheduleNextEventExpiry(){
  if(eventExpiryTimer){clearTimeout(eventExpiryTimer);eventExpiryTimer=null;}
  const now=Date.now();
  const next=[...(content.events||[])].map(eventDateTimeMs).filter(value=>Number.isFinite(value)&&value>=now).sort((a,b)=>a-b)[0];
  if(!Number.isFinite(next)) return;
  const MAX_DELAY=2147480000;
  const delay=Math.min(MAX_DELAY,Math.max(1000,next-now+1100));
  eventExpiryTimer=setTimeout(()=>{renderEvents();renderDashboard();},delay);
}
function fitEventListNineAndHalf(hostOrSelector='#eventEditorList'){
  const host=typeof hostOrSelector==='string'?$(hostOrSelector):hostOrSelector;
  if(!host) return;
  if(host._eventFitFrame) cancelAnimationFrame(host._eventFitFrame);
  host._eventFitFrame=requestAnimationFrame(()=>{
    host._eventFitFrame=0;
    const items=[...host.children].filter(el=>el.matches?.('.event-strip'));
    const oldObserver=eventListResizeObservers.get(host);
    if(oldObserver){oldObserver.disconnect();eventListResizeObservers.delete(host);}
    const previousScroll=host.scrollTop;
    host.style.height='';
    host.style.maxHeight='';
    host.classList.remove('event-scroll-preview');
    if(items.length<10) return;

    /* v0.87: l'alçada es calcula a partir de la tira tancada, no de l'article complet.
       Això evita el bucle de ResizeObserver que podia comprimir tota l'AGENDA
       en arribar a 10 elements. Les tires obertes continuen funcionant dins del scroll. */
    const summaryHeights=items.slice(0,10).map(item=>{
      const summary=item.querySelector('.event-strip-summary');
      const actions=item.querySelector('.event-strip-actions');
      return Math.max(48, summary?.getBoundingClientRect().height||0, actions?.getBoundingClientRect().height||0);
    });
    const representative=summaryHeights.filter(Boolean).reduce((sum,h)=>sum+h,0)/Math.max(1,summaryHeights.length);
    const gap=parseFloat(getComputedStyle(host).rowGap||getComputedStyle(host).gap)||0;
    const visibleHeight=(representative*9.5)+(gap*9);
    const px=`${Math.ceil(visibleHeight)}px`;
    host.classList.add('event-scroll-preview');
    host.style.height=px;
    host.style.maxHeight=px;
    host.scrollTop=Math.min(previousScroll,Math.max(0,host.scrollHeight-host.clientHeight));
  });
}

function eventStripMarkup(event,{expired=false}={}){
  const type=String(event.type||'').toUpperCase();
  const eventClass=type==='ASSAIG'?'event-strip-rehearsal':(type==='ALTRES'?'event-strip-other':'event-strip-featured');
  return `<article class="event-strip ${eventClass} ${expired?'event-strip-expired':''}" data-event-strip="${esc(event.id)}">
    <button type="button" class="event-strip-summary" data-toggle-event="${esc(event.id)}" aria-expanded="false">
      <span class="event-strip-title">${esc(event.title)}</span>
      <span class="event-strip-date">${esc(formatDateNumeric(event.date))}${event.time?` · ${esc(event.time)}`:''}</span>
      <span class="event-strip-chevron" aria-hidden="true">⌄</span>
    </button>
    <div class="list-actions event-strip-actions">
      <button class="tiny-btn" data-edit-event="${esc(event.id)}" title="Editar">✎</button>
      <button class="tiny-btn delete" data-delete-event="${esc(event.id)}" title="Eliminar">×</button>
    </div>
    <div class="event-strip-details" hidden>${eventStripDetails(event)}</div>
  </article>`;
}
function renderEvents(){
  const {agenda,past}=splitEventsByStatus();
  $('#eventCount').textContent=agenda.length;
  const pastCount=$('#pastEventCount'); if(pastCount) pastCount.textContent=past.length;
  const agendaHost=$('#eventEditorList');
  const pastHost=$('#pastEventEditorList');
  if(agendaHost) agendaHost.innerHTML=agenda.length?agenda.map(event=>eventStripMarkup(event)).join(''):'<div class="empty-state">No hi ha cap esdeveniment pendent.</div>';
  if(pastHost) pastHost.innerHTML=past.length?past.map(event=>eventStripMarkup(event,{expired:true})).join(''):'<div class="empty-state">Encara no hi ha esdeveniments passats.</div>';
  $$('[data-toggle-event]').forEach(btn=>btn.onclick=()=>{
    const article=btn.closest('[data-event-strip]'); const details=article?.querySelector('.event-strip-details'); if(!details)return;
    const open=details.hidden;
    details.hidden=!open;
    article.classList.toggle('is-open',open);
    btn.setAttribute('aria-expanded',open?'true':'false');
    fitEventListNineAndHalf(article.closest('.editor-list'));
  });
  $$('[data-edit-event]').forEach(btn=>btn.onclick=event=>{event.stopPropagation();editEvent(btn.dataset.editEvent);});
  $$('[data-delete-event]').forEach(btn=>btn.onclick=event=>{event.stopPropagation();deleteEvent(btn.dataset.deleteEvent);});
  fitEventListNineAndHalf(agendaHost);
  fitEventListNineAndHalf(pastHost);
  scheduleNextEventExpiry();
}
function bindEventForm(){
  $('#eventForm').addEventListener('submit',event=>{
    event.preventDefault();
    const id=$('#eventId').value||BandaStore.uid('evt');
    const type=$('#eventType').value;
    const canDresscode=['CONCERT','ACTUACIÓ'].includes(String(type||'').toUpperCase());
    const item={
      id,
      type,
      title:String(eventTitleFromForm()||'').trim().toUpperCase(),
      date:$('#eventDate').value,
      time:$('#eventTime').value,
      place:eventPlaceFromForm(),
      notes:$('#eventNotes').value.trim(),
      dresscodeId:canDresscode?($('#eventDresscode')?.value||''):''
    };
    if(!item.title||!item.date){showToast('Cal indicar títol i data');return;}
    if($('#eventPlacePreset').value==='ALTRES'&&!item.place){showToast('Cal especificar el lloc');return;}
    const index=content.events.findIndex(e=>e.id===id);
    if(index>=0) content.events[index]=item; else content.events.push(item);
    save(content,index>=0?'Esdeveniment actualitzat':'Esdeveniment afegit');
    resetEventForm();
  });
  $('#newEventBtn').onclick=resetEventForm;
  $('#cancelEventEdit').onclick=resetEventForm;
  $('#eventType').addEventListener('change',()=>{
    if($('#eventType').value==='ASSAIG'&&!$('#eventTime').value){$('#eventTime').value='21:30';$('#eventPlacePreset').value='LOCAL SOCIAL';}
    syncEventFormVisibility();
  });
  $('#eventTitlePreset').addEventListener('change',()=>{
    if($('#eventTitlePreset').value==='ASSAIG GENERAL'){ $('#eventTime').value='21:30'; $('#eventPlacePreset').value='LOCAL SOCIAL'; $('#eventPlaceDetail').value=''; }
    syncEventFormVisibility();
  });
  $('#eventPlacePreset').addEventListener('change',syncEventFormVisibility);
}

function dressDef(key){ return DRESS_DEFS.find(def=>def.key===key); }
function dressOptions(def){ return def?.options || []; }
function dressOption(def,preset){ const options=dressOptions(def); return options.find(opt=>opt.id===preset) || options[0]; }
function optionText(def,preset){
  const option=dressOption(def,preset); if(!option) return '';
  if(preset==='other') return '';
  return option.text ?? '';
}
function legacyDressItem(d,key){
  const boys=Array.isArray(d?.boysItems)?d.boysItems:[];
  const girls=Array.isArray(d?.girlsItems)?d.girlsItems:[];
  return boys.find(x=>x.key===key)||girls.find(x=>x.key===key)||null;
}
function inferLegacyUnifiedPreset(d,key){
  const boys=Array.isArray(d?.boysItems)?d.boysItems:[];
  const girls=Array.isArray(d?.girlsItems)?d.girlsItems:[];
  const b=boys.find(x=>x.key===key)?.preset||'';
  const g=girls.find(x=>x.key===key)?.preset||'';
  if(key==='bottom'){
    if(['jeans','denim_bottom'].includes(b)||['jeans','denim_bottom'].includes(g)) return 'denim';
    return 'suit';
  }
  if(key==='socks') return 'black';
  const raw=b||g||DEFAULT_DRESS_PRESETS[key]||'';
  const map={tie:'yes',none:'no',suit_trousers:'suit',skirt:'suit',jeans:'denim',denim_bottom:'denim'};
  return map[raw]||raw;
}
function legacyUnifiedText(d,key,preset){
  if(key==='bottom') return preset==='denim'?'Texans / Faldilla o pantaló texà (normal)':'Pantalons/Faldilla del tratge';
  if(key==='socks') return 'Mitges/Mitjons negres';
  const item=legacyDressItem(d,key);
  const def=dressDef(key);
  return String(item?.text||'').trim() || optionText(def,preset);
}
function normalizeUnifiedDressItems(items,dresscode=null){
  const incoming=Array.isArray(items)?items:[];
  return DRESS_DEFS.map(def=>{
    const found=incoming.find(item=>item.key===def.key);
    let preset=found?.preset || (dresscode?inferLegacyUnifiedPreset(dresscode,def.key):DEFAULT_DRESS_PRESETS[def.key]) || dressOptions(def)[0]?.id || '';
    if(!dressOptions(def).some(opt=>opt.id===preset)) preset=DEFAULT_DRESS_PRESETS[def.key]||dressOptions(def)[0]?.id||'';
    let text=String(found?.text||'').trim();
    if(!text) text=dresscode?legacyUnifiedText(dresscode,def.key,preset):optionText(def,preset);
    const visible=def.key==='coat' ? (found?found.visible!==false:Boolean(dresscode?.coatVisible)) : true;
    return {key:def.key,preset,text,detail:'',visible};
  });
}
function syncDressRow(row,{forceText=false}={}){
  if(!row) return;
  const def=dressDef(row.dataset.key);
  const select=row.querySelector('.dress-preset');
  const finalInput=row.querySelector('.dress-final-text');
  if(!select||!finalInput) return;
  if(forceText){
    const generated=optionText(def,select.value);
    finalInput.value=select.value==='other'?'':generated;
    if(select.value==='other') finalInput.focus();
  }else if(!finalInput.value.trim() && select.value!=='other') finalInput.value=optionText(def,select.value);
}
function renderDressItems(items,dresscode=null){
  const target=$('#unifiedDressItems'); if(!target) return;
  target.innerHTML=normalizeUnifiedDressItems(items,dresscode).map(item=>{
    const def=dressDef(item.key);
    const opts=dressOptions(def).map(opt=>`<option value="${esc(opt.id)}" ${opt.id===item.preset?'selected':''}>${esc(opt.label)}</option>`).join('');
    const visibility=def.key==='coat'?`<label class="dress-visible-toggle"><input class="dress-visible" type="checkbox" ${item.visible?'checked':''}/><span>VISIBLE A L’APP</span></label>`:'';
    return `<div class="dress-item-row" data-dress-row="unified" data-key="${esc(item.key)}">
      <span class="dress-item-icon" aria-hidden="true">${garmentIconSvg(item.key)}</span>
      <div class="dress-item-content">
        <div class="dress-item-name-row"><strong class="dress-item-name">${esc(def.label)}</strong>${visibility}</div>
        <div class="dress-item-fields">
          <label>OPCIÓ<select class="dress-preset">${opts}</select></label>
          <label>TEXT FINAL<input class="dress-final-text" maxlength="180" value="${esc(item.text)}" placeholder="${item.preset==='other'?'Escriu aquí quin és l’altre vestuari':'Text que veuran els músics'}" /></label>
        </div>
      </div>
    </div>`;
  }).join('');
  target.querySelectorAll('[data-dress-row]').forEach(row=>{
    row.querySelector('.dress-preset')?.addEventListener('change',()=>syncDressRow(row,{forceText:true}));
    syncDressRow(row);
  });
}
function collectDressItems(){
  return [...document.querySelectorAll('[data-dress-row="unified"]')].map(row=>({
    key:row.dataset.key,
    preset:row.querySelector('.dress-preset').value,
    text:row.querySelector('.dress-final-text').value.trim(),
    detail:'',
    visible:row.dataset.key==='coat'?(row.querySelector('.dress-visible')?.checked===true):true
  }));
}
function itemsToText(items){ return (items||[]).filter(item=>item.visible!==false).map(item=>item.text?.trim()).filter(Boolean).join('\n'); }
function resetDresscodeForm(){
  $('#dresscodeForm').reset();
  $('#dresscodeId').value='';
  $('#dresscodeFormTitle').textContent='Nou dresscode';
  $('#dresscodeTitle').value='';
  $('#dresscodeSubtitle').value='Uniforme de banda';
  $('#dresscodeOther').value='';
  renderDressItems(normalizeUnifiedDressItems([]));
}
function editDresscode(id){
  const d=(content.dresscodes||[]).find(x=>x.id===id); if(!d) return;
  $('#dresscodeId').value=d.id;
  $('#dresscodeTitle').value=d.title||'';
  $('#dresscodeSubtitle').value=d.subtitle||'';
  $('#dresscodeOther').value=d.other||'';
  renderDressItems(d.items,d);
  $('#dresscodeFormTitle').textContent='Editar dresscode';
  $('#dresscodeForm').scrollIntoView({behavior:'smooth',block:'start'});
}
function deleteDresscode(id){
  const d=(content.dresscodes||[]).find(x=>x.id===id); if(!d) return;
  if(!confirm(`Vols eliminar “${d.title}”?`)) return;
  content.dresscodes=content.dresscodes.filter(x=>x.id!==id);
  content.events.forEach(e=>{if(e.dresscodeId===id)e.dresscodeId='';});
  save(content,'Dresscode eliminat');
  resetDresscodeForm();
}
function dresscodeListDetail(d){
  const linked=(content.events||[]).filter(e=>e.dresscodeId===d.id);
  const items=normalizeUnifiedDressItems(d.items,d).filter(i=>i.key!=='coat'||i.visible!==false).map(i=>i.text).filter(Boolean);
  return `<div class="dresscode-strip-detail-grid">
    ${d.subtitle?`<div class="dresscode-strip-wide"><span>SUBTÍTOL</span><strong>${esc(d.subtitle)}</strong></div>`:''}
    <div class="dresscode-strip-wide"><span>VESTUARI</span><strong>${items.length?items.map(esc).join(' · '):'Sense indicacions'}</strong></div>
    ${d.other?`<div class="dresscode-strip-wide"><span>ALTRES</span><strong>${esc(d.other)}</strong></div>`:''}
    <div class="dresscode-strip-wide"><span>VINCULAT A</span><strong>${linked.length?linked.map(e=>`${esc(e.title)} · ${esc(formatDateNumeric(e.date))}`).join('<br>'):'Cap esdeveniment encara'}</strong></div>
  </div>`;
}
function renderDresscodes(){
  const list=[...(content.dresscodes||[])].sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'ca'));
  $('#dresscodeCount').textContent=list.length;
  const host=$('#dresscodeList');
  host.innerHTML=list.length?list.map(d=>{
    const linked=(content.events||[]).filter(e=>e.dresscodeId===d.id).length;
    return `<article class="dresscode-strip" data-dresscode-strip="${esc(d.id)}">
      <button type="button" class="dresscode-strip-summary" data-toggle-dress="${esc(d.id)}" aria-expanded="false">
        <span class="dresscode-strip-title">${esc(d.title||'Dresscode')}</span>
        <span class="dresscode-strip-meta">${linked?`${linked} ${linked===1?'ESDEVENIMENT':'ESDEVENIMENTS'}`:'DISPONIBLE'}</span>
        <span class="dresscode-strip-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="list-actions dresscode-strip-actions">
        <button class="tiny-btn" data-edit-dress="${esc(d.id)}" title="Editar">✎</button>
        <button class="tiny-btn delete" data-delete-dress="${esc(d.id)}" title="Eliminar">×</button>
      </div>
      <div class="dresscode-strip-details" hidden>${dresscodeListDetail(d)}</div>
    </article>`;
  }).join(''):'<div class="empty-state">Encara no hi ha cap dresscode.</div>';
  $$('[data-toggle-dress]').forEach(btn=>btn.onclick=()=>{
    const article=btn.closest('[data-dresscode-strip]'); const details=article?.querySelector('.dresscode-strip-details'); if(!details)return;
    const open=details.hidden; details.hidden=!open; article.classList.toggle('is-open',open); btn.setAttribute('aria-expanded',open?'true':'false');
  });
  $$('[data-edit-dress]').forEach(btn=>btn.onclick=event=>{event.stopPropagation();editDresscode(btn.dataset.editDress);});
  $$('[data-delete-dress]').forEach(btn=>btn.onclick=event=>{event.stopPropagation();deleteDresscode(btn.dataset.deleteDress);});
}
function bindDresscodes(){
  $('#dresscodeForm').addEventListener('submit',event=>{
    event.preventDefault();
    const id=$('#dresscodeId').value||BandaStore.uid('dress');
    const items=collectDressItems();
    const previous=(content.dresscodes||[]).find(d=>d.id===id);
    const title=$('#dresscodeTitle').value.trim();
    if(!title){showToast('Cal indicar un títol per al dresscode');$('#dresscodeTitle').focus();return;}
    const coat=items.find(i=>i.key==='coat');
    const item={
      id,eventId:'',title,
      subtitle:$('#dresscodeSubtitle').value.trim()||'Uniforme de banda',
      items,
      coatVisible:coat?.visible===true,
      other:$('#dresscodeOther').value.trim(),
      // Camps legacy buits: a partir de v0.111 la font canònica és items[].
      boys:'',girls:'',boysItems:[],girlsItems:[],
      createdAt:previous?.createdAt||new Date().toISOString()
    };
    const index=content.dresscodes.findIndex(d=>d.id===id);
    if(index>=0) content.dresscodes[index]=item; else content.dresscodes.push(item);
    save(content,index>=0?'Dresscode actualitzat':'Dresscode afegit');
    resetDresscodeForm();
  });
  $('#newDresscodeBtn').onclick=resetDresscodeForm;
  $('#cancelDresscodeEdit').onclick=resetDresscodeForm;
}

function resetTrackForm(){ $('#trackForm').reset(); $('#trackId').value=''; $('#trackVisible').checked=true; $('#trackFormTitle').textContent='Nova pista'; $('#trackPreviewBox').hidden=true; $('#trackPreview').removeAttribute('src'); }
function updateTrackPreview(){ const src=$('#trackSrc').value.trim(); const box=$('#trackPreviewBox'); const audio=$('#trackPreview'); if(src){audio.src=src;box.hidden=false;}else{audio.removeAttribute('src');box.hidden=true;} }
function editTrack(id){ const track=(content.tracks||[]).find(item=>item.id===id); if(!track) return; $('#trackId').value=track.id; $('#trackTitle').value=track.title||''; $('#trackMeta').value=track.meta||''; $('#trackSrc').value=track.src||''; $('#trackVisible').checked=track.visible!==false; $('#trackFormTitle').textContent='Editar pista'; updateTrackPreview(); $('#trackForm').scrollIntoView({behavior:'smooth',block:'start'}); }
function deleteTrack(id){ const track=(content.tracks||[]).find(item=>item.id===id); if(!track) return; if(!confirm(`Vols eliminar “${track.title}”?`)) return; content.tracks=content.tracks.filter(item=>item.id!==id); save(content,'Pista eliminada'); resetTrackForm(); }
function moveTrack(id,direction){ const index=content.tracks.findIndex(track=>track.id===id); if(index<0) return; const target=index+direction; if(target<0||target>=content.tracks.length)return; [content.tracks[index],content.tracks[target]]=[content.tracks[target],content.tracks[index]]; save(content,'Ordre actualitzat'); }
function toggleTrack(id){ const track=content.tracks.find(item=>item.id===id); if(!track)return; track.visible=track.visible===false; save(content,track.visible?'Pista visible':'Pista oculta'); }
function fitTrackListFourAndHalf(){
  const host=$('#trackEditorList'); if(!host) return;
  if(host._trackFitFrame) cancelAnimationFrame(host._trackFitFrame);
  host._trackFitFrame=requestAnimationFrame(()=>{
    host._trackFitFrame=0;
    const items=[...host.children].filter(el=>el.matches?.('.track-list-item'));
    if(trackListResizeObserver){trackListResizeObserver.disconnect();trackListResizeObserver=null;}
    const previousScroll=host.scrollTop;
    if(items.length<5){
      host.style.height='';
      host.style.maxHeight='';
      host.classList.remove('track-scroll-preview');
      return;
    }
    host.classList.add('track-scroll-preview');
    const gap=parseFloat(getComputedStyle(host).rowGap||getComputedStyle(host).gap)||0;
    const heights=items.slice(0,5).map(item=>item.getBoundingClientRect().height);
    const visibleHeight=heights.slice(0,4).reduce((sum,h)=>sum+h,0)+(gap*4)+(heights[4]*.5);
    const px=`${Math.ceil(visibleHeight)}px`;
    host.style.height=px;
    host.style.maxHeight=px;
    host.scrollTop=Math.min(previousScroll,Math.max(0,host.scrollHeight-host.clientHeight));
    if('ResizeObserver' in window){
      trackListResizeObserver=new ResizeObserver(()=>fitTrackListFourAndHalf());
      items.slice(0,5).forEach(item=>trackListResizeObserver.observe(item));
    }
  });
}
function renderTracks(){
  const list=content.tracks||[];
  $('#trackCountEditor').textContent=list.length;
  $('#trackEditorList').innerHTML=list.length?list.map((track,index)=>`<article class="list-item track-list-item" draggable="true" data-track-row="${esc(track.id)}"><span class="drag-handle">⋮⋮</span><div class="list-main"><div class="list-kicker"><span>#${String(index+1).padStart(2,'0')}</span><span class="visibility-pill ${track.visible===false?'hidden':''}">${track.visible===false?'OCULTA':'VISIBLE'}</span></div><h3>${esc(track.title)}</h3>${track.meta?`<p>${esc(track.meta)}</p>`:''}<p>${esc(track.src||'Sense ruta')}</p></div><div class="list-actions"><button class="tiny-btn" data-up-track="${esc(track.id)}">↑</button><button class="tiny-btn" data-down-track="${esc(track.id)}">↓</button><button class="tiny-btn" data-toggle-track="${esc(track.id)}">◉</button><button class="tiny-btn" data-edit-track="${esc(track.id)}">✎</button><button class="tiny-btn delete" data-delete-track="${esc(track.id)}">×</button></div></article>`).join(''):'<div class="empty-state">Encara no hi ha cap pista al Player.</div>';
  $$('[data-up-track]').forEach(btn=>btn.onclick=()=>moveTrack(btn.dataset.upTrack,-1));
  $$('[data-down-track]').forEach(btn=>btn.onclick=()=>moveTrack(btn.dataset.downTrack,1));
  $$('[data-toggle-track]').forEach(btn=>btn.onclick=()=>toggleTrack(btn.dataset.toggleTrack));
  $$('[data-edit-track]').forEach(btn=>btn.onclick=()=>editTrack(btn.dataset.editTrack));
  $$('[data-delete-track]').forEach(btn=>btn.onclick=()=>deleteTrack(btn.dataset.deleteTrack));
  $$('[data-track-row]').forEach(row=>{
    row.addEventListener('dragstart',()=>{draggedTrackId=row.dataset.trackRow;row.classList.add('dragging');});
    row.addEventListener('dragend',()=>{draggedTrackId=null;row.classList.remove('dragging');});
    row.addEventListener('dragover',e=>e.preventDefault());
    row.addEventListener('drop',e=>{
      e.preventDefault();
      const targetId=row.dataset.trackRow;
      if(!draggedTrackId||draggedTrackId===targetId)return;
      const from=content.tracks.findIndex(t=>t.id===draggedTrackId),to=content.tracks.findIndex(t=>t.id===targetId);
      if(from<0||to<0)return;
      const[moved]=content.tracks.splice(from,1);
      content.tracks.splice(to,0,moved);
      save(content,'Ordre del Player actualitzat');
    });
  });
  fitTrackListFourAndHalf();
}

function bindTrackForm(){ $('#trackForm').addEventListener('submit',event=>{event.preventDefault();const id=$('#trackId').value||BandaStore.uid('trk');const item={id,title:$('#trackTitle').value.trim(),meta:$('#trackMeta').value.trim(),src:$('#trackSrc').value.trim(),visible:$('#trackVisible').checked};if(!item.title||!item.src){showToast('Cal indicar títol i ruta/URL');return;}const index=content.tracks.findIndex(t=>t.id===id);if(index>=0)content.tracks[index]=item;else content.tracks.push(item);save(content,index>=0?'Pista actualitzada':'Pista afegida');resetTrackForm();}); $('#newTrackBtn').onclick=resetTrackForm; $('#cancelTrackEdit').onclick=resetTrackForm; $('#trackSrc').addEventListener('change',updateTrackPreview); }

function youtubeVideoId(url){
  const raw=String(url||'').trim();
  if(!raw) return '';
  try{
    const parsed=new URL(raw,/^https?:/i.test(raw)?undefined:'https://www.youtube.com');
    const host=parsed.hostname.replace(/^www\./,'').toLowerCase();
    if(host==='youtu.be') return parsed.pathname.split('/').filter(Boolean)[0]||'';
    if(host.endsWith('youtube.com')){
      if(parsed.searchParams.get('v')) return parsed.searchParams.get('v')||'';
      const parts=parsed.pathname.split('/').filter(Boolean);
      if(['shorts','embed','live'].includes(parts[0])) return parts[1]||'';
    }
  }catch(_error){}
  return '';
}
function demoThumbnail(videoId){ return videoId?`https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`:''; }
function resetDemoForm(){
  $('#demoForm')?.reset();
  if($('#demoId')) $('#demoId').value='';
  if($('#demoFormTitle')) $('#demoFormTitle').textContent='Nou vídeo';
  renderDemoPreview();
}
function renderDemoPreview(){
  const host=$('#demoPreview'); if(!host) return;
  const url=$('#demoUrl')?.value?.trim()||'';
  const id=youtubeVideoId(url);
  if(!id){host.hidden=true;host.innerHTML='';return;}
  host.innerHTML=`<img src="${esc(demoThumbnail(id))}" alt="Miniatura del vídeo" /><span>VÍDEO YOUTUBE DETECTAT</span>`;
  host.hidden=false;
}
function editDemo(id){
  const item=(content.demos||[]).find(d=>d.id===id); if(!item) return;
  $('#demoId').value=item.id; $('#demoTitle').value=item.title||''; $('#demoUrl').value=item.url||'';
  $('#demoFormTitle').textContent='Editar vídeo'; renderDemoPreview();
  $('#demoForm').scrollIntoView({behavior:'smooth',block:'start'});
}
function deleteDemo(id){
  const item=(content.demos||[]).find(d=>d.id===id); if(!item) return;
  if(!confirm(`Vols eliminar aquesta demo${item.title?` (“${item.title}”)`:''}?`)) return;
  content.demos=(content.demos||[]).filter(d=>d.id!==id); save(content,'Demo eliminada'); resetDemoForm();
}
function moveDemo(id,delta){
  const list=content.demos||[]; const index=list.findIndex(d=>d.id===id); const target=index+delta;
  if(index<0||target<0||target>=list.length) return;
  [list[index],list[target]]=[list[target],list[index]]; save(content,'Ordre de demos actualitzat');
}
function renderDemos(){
  const list=content.demos||[]; const count=$('#demoCountEditor'); if(count) count.textContent=list.length;
  const visible=$('#demoSectionVisible'); if(visible) visible.checked=content.settings?.demosVisible!==false;
  const concertName=$('#demoConcertName'); if(concertName) concertName.value=content.settings?.demosConcertName||'';
  const host=$('#demoEditorList'); if(!host) return;
  host.innerHTML=list.length?list.map((item,index)=>{
    const id=item.videoId||youtubeVideoId(item.url); const thumb=demoThumbnail(id);
    const title=String(item.title||'').trim();
    return `<article class="list-item demo-editor-item"><span class="demo-editor-thumb">${thumb?`<img loading="lazy" src="${esc(thumb)}" alt="" />`:'<span>▶</span>'}</span><div class="list-main"><div class="list-kicker"><span>#${String(index+1).padStart(2,'0')}</span><span>YOUTUBE</span></div>${title?`<h3>${esc(title)}</h3>`:'<h3 class="demo-untitled">SENSE TÍTOL</h3>'}<p>${esc(item.url)}</p></div><div class="list-actions"><button class="tiny-btn" data-up-demo="${esc(item.id)}" title="Pujar">↑</button><button class="tiny-btn" data-down-demo="${esc(item.id)}" title="Baixar">↓</button><button class="tiny-btn" data-edit-demo="${esc(item.id)}" title="Editar">✎</button><button class="tiny-btn delete" data-delete-demo="${esc(item.id)}" title="Eliminar">×</button></div></article>`;
  }).join(''):'<div class="empty-state">Encara no hi ha cap demo configurada.</div>';
  $$('[data-up-demo]').forEach(btn=>btn.onclick=()=>moveDemo(btn.dataset.upDemo,-1));
  $$('[data-down-demo]').forEach(btn=>btn.onclick=()=>moveDemo(btn.dataset.downDemo,1));
  $$('[data-edit-demo]').forEach(btn=>btn.onclick=()=>editDemo(btn.dataset.editDemo));
  $$('[data-delete-demo]').forEach(btn=>btn.onclick=()=>deleteDemo(btn.dataset.deleteDemo));
}
function bindDemos(){
  $('#demoForm')?.addEventListener('submit',event=>{
    event.preventDefault();
    content.settings=content.settings||{};
    content.settings.demosConcertName=String($('#demoConcertName')?.value||'').trim();
    const title=$('#demoTitle').value.trim(), url=$('#demoUrl').value.trim(), videoId=youtubeVideoId(url);
    if(!videoId){showToast('Cal indicar un enllaç de YouTube vàlid');$('#demoUrl').focus();return;}
    const id=$('#demoId').value||BandaStore.uid('demo'); const item={id,title,url,videoId};
    const index=(content.demos||[]).findIndex(d=>d.id===id); if(!Array.isArray(content.demos)) content.demos=[];
    if(index>=0) content.demos[index]=item; else content.demos.push(item);
    save(content,index>=0?'Demo actualitzada':'Demo afegida'); resetDemoForm();
  });
  $('#newDemoBtn')?.addEventListener('click',resetDemoForm);
  $('#cancelDemoEdit')?.addEventListener('click',resetDemoForm);
  $('#demoUrl')?.addEventListener('input',renderDemoPreview);
  $('#demoSectionVisible')?.addEventListener('change',event=>{
    content.settings=content.settings||{};
    content.settings.demosVisible=Boolean(event.currentTarget.checked);
    save(content,content.settings.demosVisible?'DEMOS visibles a l’APP':'DEMOS ocultes a l’APP');
  });
  $('#demoConcertName')?.addEventListener('change',event=>{
    content.settings=content.settings||{};
    content.settings.demosConcertName=String(event.currentTarget.value||'').trim();
    save(content,'Nom del concert de DEMOS actualitzat');
  });
}

function renderAudioLibrary(files=audioLibrary){
  audioLibrary=(files||[]).map(item=>typeof item==='string'?{name:item,url:`../assets/AUDIO/${encodeURIComponent(item)}`,source:'GITHUB'}:item)
    .filter(item=>item?.name && /\.(mp3|wav|m4a|ogg)$/i.test(item.name))
    .sort((a,b)=>a.name.localeCompare(b.name,'ca',{numeric:true}));
  const select=$('#audioLibrarySelect');
  const current=select.value;
  select.innerHTML='<option value="">— Selecciona un àudio disponible —</option>'+audioLibrary.map(item=>`<option value="${esc(item.url)}">${esc(item.name)} · ${esc(item.source||'')}</option>`).join('');
  if([...select.options].some(o=>o.value===current)) select.value=current;
  $('#audioFolderStatus').textContent=`${audioLibrary.length} fitxer${audioLibrary.length===1?'':'s'} disponible${audioLibrary.length===1?'':'s'}`;
}

function resolveGitHubRepository(){
  if(CFG.githubOwner && CFG.githubRepo) return {owner:CFG.githubOwner,repo:CFG.githubRepo,branch:CFG.githubBranch||''};
  const host=location.hostname.toLowerCase();
  const match=host.match(/^([a-z0-9-]+)\.github\.io$/i);
  if(!match) return null;
  const owner=match[1];
  const parts=location.pathname.split('/').filter(Boolean);
  const repo=parts[0] || `${owner}.github.io`;
  return {owner,repo,branch:CFG.githubBranch||''};
}

async function fetchGitHubAudioFiles(){
  const gh=resolveGitHubRepository();
  if(!gh) throw new Error('No s’ha pogut identificar el repositori de GitHub');
  const repoBase=`https://api.github.com/repos/${encodeURIComponent(gh.owner)}/${encodeURIComponent(gh.repo)}`;
  const branch=gh.branch||'main';
  const headers={Accept:'application/vnd.github+json'};
  const names=new Set();
  const errors=[];
  const collect=entries=>{
    for(const item of entries||[]){
      if(item?.type==='file' && /\.(mp3|wav|m4a|ogg)$/i.test(item.name||'')) names.add(item.name);
    }
  };
  // Primera opció: API Contents, carpeta exacta al repositori públic.
  try{
    const url=`${repoBase}/contents/assets/AUDIO?ref=${encodeURIComponent(branch)}`;
    const response=await fetch(url,{cache:'no-store',headers});
    if(!response.ok) throw new Error(`GitHub Contents HTTP ${response.status}`);
    const entries=await response.json();
    if(!Array.isArray(entries)) throw new Error('Resposta inesperada de GitHub Contents');
    collect(entries);
  }catch(error){errors.push(String(error.message||error));}
  // Fallback: arbre Git recursiu, útil si Contents falla o retorna buit.
  if(!names.size){
    try{
      const url=`${repoBase}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
      const response=await fetch(url,{cache:'no-store',headers});
      if(!response.ok) throw new Error(`GitHub Tree HTTP ${response.status}`);
      const payload=await response.json();
      const entries=(payload.tree||[])
        .filter(item=>item?.type==='blob' && /^assets\/AUDIO\/[^/]+\.(mp3|wav|m4a|ogg)$/i.test(item.path||''))
        .map(item=>({type:'file',name:item.path.split('/').pop()}));
      collect(entries);
    }catch(error){errors.push(String(error.message||error));}
  }
  if(!names.size && errors.length===2) throw new Error(errors.join(' · '));
  return [...names].map(name=>({name,url:`../assets/AUDIO/${encodeURIComponent(name)}`,source:'GITHUB'}));
}

// Índice estático generado por GitHub Actions, servido desde el mismo dominio.
// No depende de cuotas, permisos ni CORS de la API pública de GitHub.
async function fetchPublishedAudioCatalog(){
  const response=await fetch(`../assets/AUDIO/catalog.json?ts=${Date.now()}`,{cache:'no-store'});
  if(!response.ok) throw new Error(`Catàleg HTTP ${response.status}`);
  const payload=await response.json();
  if(!Array.isArray(payload.files)) throw new Error('Format incorrecte de catalog.json');
  return payload.files
    .filter(name=>typeof name==='string' && !name.includes('/') && !name.includes('\\') && /\.(mp3|wav|m4a|ogg)$/i.test(name))
    .map(name=>({name,url:`../assets/AUDIO/${encodeURIComponent(name)}`,source:'WEB'}));
}

async function refreshAudioDirectory(){
  const status=$('#audioFolderStatus');
  status.textContent='Actualitzant…';
  $('#refreshAudioFolder').disabled=true;
  try{
    const results=await Promise.allSettled([
      window.BandaSupabase?.enabled ? BandaSupabase.listPublicFiles('player-audio') : Promise.resolve([]),
      fetchPublishedAudioCatalog()
    ]);
    const remote=results[0].status==='fulfilled'?results[0].value:[];
    let folder=results[1].status==='fulfilled'?results[1].value:[];
    let apiError=null;
    // Compatible con repositorios que aún no hayan generado el catálogo.
    if(results[1].status==='rejected'){
      try { folder=await fetchGitHubAudioFiles(); }
      catch(error){apiError=error;}
    }
    const remoteItems=remote.map(item=>({name:item.name,url:item.url,source:'NÚVOL'}));
    renderAudioLibrary([...remoteItems,...folder]);
    if(results[1].status==='rejected' && apiError){
      console.warn('Catàleg AUDIO:',results[1].reason,'GitHub:',apiError);
      status.textContent=`${audioLibrary.length} àudios disponibles · Falta el catàleg assets/AUDIO/catalog.json`;
      showToast('Falta el catàleg AUDIO. Executa «Actualitzar catàleg AUDIO» a GitHub Actions.');
    }else if(results[0].status==='rejected'){
      console.warn('Biblioteca Supabase:',results[0].reason);
      showToast(`${folder.length} àudios al web · No s’ha pogut consultar el núvol`);
    }else{
      showToast(`${remoteItems.length} àudios al núvol · ${folder.length} a assets/AUDIO`);
    }
  }catch(error){
    console.error(error);
    status.textContent='No s’ha pogut actualitzar';
    showToast('No s’ha pogut actualitzar la biblioteca d’àudio');
  }finally{
    $('#refreshAudioFolder').disabled=false;
  }
}

function bindAudioLibrary(){
  renderAudioLibrary([]);
  $('#refreshAudioFolder').onclick=refreshAudioDirectory;
  $('#audioLibrarySelect').addEventListener('change',event=>{
    const src=event.target.value;
    if(!src)return;
    $('#trackSrc').value=src;
    const found=audioLibrary.find(item=>item.url===src);
    const name=found?.name || src.split('/').pop();
    if(!$('#trackTitle').value.trim()) $('#trackTitle').value=name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ');
    updateTrackPreview();
  });
  $('#uploadMp3Btn').onclick=()=>$('#trackUploadInput').click();
  $('#trackUploadInput').addEventListener('change',async event=>{
    const file=event.target.files?.[0];
    if(!file)return;
    try{
      if(!(editorCanWrite && supabaseActive && currentSession)){
        showToast('Cal tenir permisos de gestor per pujar àudio');
        return;
      }
      $('#uploadMp3Btn').disabled=true;
      showToast(`Pujant ${file.name}…`);
      const uploaded=await BandaSupabase.uploadFile('player-audio',file,'tracks',file.name.replace(/\.[^.]+$/,''));
      $('#trackSrc').value=uploaded.url;
      if(!$('#trackTitle').value.trim()) $('#trackTitle').value=file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ');
      updateTrackPreview();
      await refreshAudioDirectory();
      showToast('MP3 pujat correctament');
    }catch(error){ console.error(error); showToast('No s’ha pogut pujar l’àudio'); }
    finally{ $('#uploadMp3Btn').disabled=false; event.target.value=''; }
  });
}


function historicPeriods(){ return Array.isArray(CFG.historicPeriods) ? CFG.historicPeriods : []; }
function historicPeriodById(id){ return historicPeriods().find(period=>period.id===id); }
function historicPeriodLabel(period){ return period ? `${period.years} · ${period.director}` : 'Període desconegut'; }
function yearFitsPeriod(year,period){ return !!period && year>=period.start && (period.end===null || year<=period.end); }

function renderHistoricPeriodOptions(selected=''){
  const select=$('#historicPeriod');
  if(!select) return;
  select.innerHTML='<option value="">— Selecciona període —</option>'+historicPeriods().map(period=>`<option value="${esc(period.id)}">${esc(historicPeriodLabel(period))}</option>`).join('');
  if(selected && [...select.options].some(option=>option.value===selected)) select.value=selected;
}

function autoHistoricPeriodFromYear(){
  const year=Number.parseInt($('#historicYear').value,10);
  const hint=$('#historicPeriodHint');
  if(!Number.isInteger(year)){
    hint.hidden=true;
    return;
  }
  const matches=historicPeriods().filter(period=>yearFitsPeriod(year,period));
  if(matches.length===1){
    $('#historicPeriod').value=matches[0].id;
    hint.hidden=false;
    hint.textContent=`Període detectat: ${historicPeriodLabel(matches[0])}`;
  }else if(matches.length>1){
    $('#historicPeriod').value='';
    hint.hidden=false;
    hint.textContent='Aquest any coincideix amb un canvi de direcció. Selecciona manualment el període correcte.';
  }else{
    $('#historicPeriod').value='';
    hint.hidden=false;
    hint.textContent='Aquest any queda fora dels períodes configurats.';
  }
}

function historicImages(item){
  const images=Array.isArray(item?.images) ? item.images.filter(Boolean) : [];
  if(!images.length && item?.imageSrc) images.push(item.imageSrc);
  return images;
}
function historicOriginalImages(item){
  const images=historicImages(item);
  const originals=Array.isArray(item?.originalImages)?item.originalImages:[];
  return images.map((src,index)=>String(originals[index]||src||''));
}
function historicImageCrops(item){
  const images=historicImages(item);
  const crops=Array.isArray(item?.imageCrops)?item.imageCrops:[];
  return images.map((_,index)=>{
    const crop=crops[index]&&typeof crops[index]==='object'?crops[index]:{};
    return {left:Number(crop.left)||0,right:Number(crop.right)||0,top:Number(crop.top)||0,bottom:Number(crop.bottom)||0};
  });
}
function historicImageSubmitters(item){
  const images=historicImages(item);
  const rows=Array.isArray(item?.imageSubmitters)?item.imageSubmitters:[];
  return images.map((_,index)=>{
    const row=rows[index]&&typeof rows[index]==='object'?rows[index]:{};
    return {name:row.name||item?.submittedByName||'',userId:row.userId||item?.submittedByUserId||'',archiveSubmissionId:row.archiveSubmissionId||item?.archiveSubmissionId||''};
  });
}

function renderHistoricFormPreview(){
  const wrap=$('#historicImagePreviewWrap'), grid=$('#historicImagePreviewGrid');
  if(!wrap||!grid) return;
  const savedCount=editingHistoricImages.length;
  const images=[...editingHistoricImages,...pendingHistoricImages];
  wrap.hidden=!images.length;
  grid.innerHTML=images.map((src,index)=>{
    const isNew=index>=savedCount;
    const localIndex=isNew ? index-savedCount : index;
    const removeAttr=isNew ? `data-remove-pending-historic="${localIndex}"` : `data-remove-saved-historic="${localIndex}"`;
    const removeLabel=isNew ? 'Descartar fotografia nova' : 'Eliminar fotografia definitivament';
    const cropButton=isNew?'':`<button class="history-image-crop-btn" type="button" data-crop-saved-historic="${localIndex}" title="Fer crop manual" aria-label="Fer crop manual">✂</button>`;
    const featuredButton=isNew?'':`<button class="history-image-feature-btn ${historicFeaturedSrc===src?'is-featured':''}" type="button" data-feature-saved-historic="${localIndex}" title="Marcar com a imatge destacada">${historicFeaturedSrc===src?'★':'☆'}</button>`;
    const transferControls=isNew?'':`<div class="history-image-transfer-panel"><select data-historic-transfer-target="${localIndex}" aria-label="Destí a Hemeroteca"><option value="cartells">CARTELLS</option><option value="noticies">NOTÍCIES</option><option value="entrevistes">ENTREVISTES</option></select><button type="button" data-move-saved-historic="${localIndex}">MOURE</button></div>`;
    const stateBubble=isNew?'<span>NOVA</span>':'';
    return `<div class="history-image-preview-item ${isNew?'is-new':''}"><div class="history-image-preview-visual"><img src="${esc(src)}" alt="Previsualització ${index+1}" />${stateBubble}${cropButton}${featuredButton}<button class="history-image-remove-btn" type="button" ${removeAttr} title="${removeLabel}" aria-label="${removeLabel}">×</button></div>${transferControls}</div>`;
  }).join('');
  $$('[data-remove-pending-historic]').forEach(btn=>btn.onclick=()=>{
    const index=Number(btn.dataset.removePendingHistoric||0);
    pendingHistoricImages.splice(index,1);
    pendingHistoricOriginalFiles.splice(index,1);
    renderHistoricFormPreview();
    showToast('Fotografia nova descartada');
  });
  $$('[data-remove-saved-historic]').forEach(btn=>btn.onclick=()=>removeHistoricSavedPhoto(Number(btn.dataset.removeSavedHistoric||0)));
  $$('[data-crop-saved-historic]').forEach(btn=>btn.onclick=()=>openHistoricCrop($('#historicId')?.value||'',Number(btn.dataset.cropSavedHistoric||0)));
  $$('[data-feature-saved-historic]').forEach(btn=>btn.onclick=()=>{const i=Number(btn.dataset.featureSavedHistoric||0);historicFeaturedSrc=editingHistoricImages[i]||'';renderHistoricFormPreview();showToast('Imatge destacada seleccionada');});
  $$('[data-move-saved-historic]').forEach(btn=>btn.onclick=()=>{
    const i=Number(btn.dataset.moveSavedHistoric||0);
    const select=document.querySelector(`[data-historic-transfer-target="${i}"]`);
    moveHistoricPhotoToHemeroteca($('#historicId')?.value||'',i,select?.value||'cartells');
  });
}

async function downloadHistoricPhoto(url,item,index){
  if(!['admin','gestor'].includes(currentProfile?.role)){ showToast('Només ADMIN/GESTOR poden descarregar fotografies'); return; }
  try{
    showToast('Preparant descàrrega…');
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP_${response.status}`);
    const blob=await response.blob();
    const ext=(blob.type.split('/')[1]||'jpg').replace('jpeg','jpg').replace(/[^a-z0-9]/gi,'')||'jpg';
    const title=String(item.title||'historic').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'historic';
    const filename=`${item.year||'sense-any'}-${title}-${String(index+1).padStart(2,'0')}.${ext}`;
    const objectUrl=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=objectUrl; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(objectUrl),1200);
    showToast('Fotografia descarregada');
  }catch(error){
    console.error(error);
    showToast('No s’ha pogut descarregar la fotografia');
  }
}


async function removeHistoricSavedPhoto(index){
  if(!['admin','gestor'].includes(currentProfile?.role)){ showToast('No tens permisos per eliminar fotografies'); return; }
  const id=$('#historicId')?.value||'';
  const item=(content.historicItems||[]).find(entry=>entry.id===id);
  if(!item) return;
  const images=historicImages(item);
  const src=images[index];
  if(!src) return;
  const isLast=images.length===1;
  const question=isLast
    ? 'Aquesta és l’última fotografia. Si l’elimines, també desapareixerà completament aquest esdeveniment del timeline. Continuar?'
    : 'Vols eliminar definitivament aquesta fotografia?';
  if(!confirm(question)) return;
  try{
    if(supabaseActive && currentSession && window.BandaSupabase?.deletePublicFile){
      showToast('Eliminant fotografia del núvol…');
      await BandaSupabase.deletePublicFile('historic-media',src);
      const original=historicOriginalImages(item)[index];
      if(original && original!==src) await BandaSupabase.deletePublicFile('historic-media',original);
    }
  }catch(error){
    console.error(error);
    showToast('No s’ha pogut eliminar la fotografia de Storage');
    return;
  }
  images.splice(index,1);
  const originals=historicOriginalImages(item); originals.splice(index,1);
  const crops=historicImageCrops(item); crops.splice(index,1);
  const submitters=historicImageSubmitters(item); submitters.splice(index,1);
  if(!images.length){
    content.historicItems=(content.historicItems||[]).filter(entry=>entry.id!==id);
    editingHistoricImages=[];
    pendingHistoricImages=[];
    if(save(content,'Última fotografia eliminada · esdeveniment eliminat')) resetHistoricForm();
    return;
  }
  const target=(content.historicItems||[]).find(entry=>entry.id===id);
  if(target){ target.images=[...images]; target.imageSrc=images[0]||''; target.originalImages=originals; target.imageCrops=crops; target.imageSubmitters=submitters; if(target.featuredImageSrc===src) target.featuredImageSrc=images[0]||''; }
  editingHistoricImages=[...images];
  save(content,'Fotografia eliminada definitivament');
  renderHistoricFormPreview();
}

function resetHistoricForm(){
  const form=$('#historicForm'); if(!form) return;
  form.reset();
  pendingHistoricImages=[];
  pendingHistoricOriginalFiles=[];
  editingHistoricImages=[];
  pendingHistoricCoverFile=null; pendingHistoricCoverPreview=''; historicFeaturedSrc='';
  const cover=$('#historicCoverFile'); if(cover) cover.value='';
  $('#historicId').value='';
  $('#historicFormTitle').textContent='Nova entrada';
  $('#historicImagePreviewWrap').hidden=true;
  const authorField=$('#historicAuthorSource'); if(authorField) authorField.value='';
  $('#historicImagePreviewGrid').innerHTML='';
  $('#historicPeriodHint').hidden=true;
  $('#historicImageFile').required=false;
  renderHistoricPeriodOptions('');
  $('#historicYear').max=String(new Date().getFullYear());
}

async function readImage(file){
  return await new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(file); });
}

async function compressHistoricImage(file){
  const raw=await readImage(file);
  const img=await new Promise((resolve,reject)=>{ const el=new Image(); el.onload=()=>resolve(el); el.onerror=reject; el.src=raw; });
  let maxSide=1200;
  let quality=.76;
  const encode=(side,q)=>{
    const scale=Math.min(1,side/img.width,side/img.height);
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.width*scale));
    canvas.height=Math.max(1,Math.round(img.height*scale));
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/jpeg',q);
  };
  let out=encode(maxSide,quality);
  if(out.length>520000) out=encode(1100,.66);
  if(out.length>520000) out=encode(950,.58);
  return out;
}

function editHistoric(id){
  const item=(content.historicItems||[]).find(entry=>entry.id===id); if(!item) return;
  pendingHistoricImages=[];
  pendingHistoricOriginalFiles=[];
  editingHistoricImages=historicImages(item);
  historicFeaturedSrc=item.featuredImageSrc||editingHistoricImages[0]||'';
  pendingHistoricCoverFile=null; pendingHistoricCoverPreview=''; const cover=$('#historicCoverFile'); if(cover) cover.value='';
  $('#historicId').value=item.id;
  $('#historicYear').value=item.year||'';
  renderHistoricPeriodOptions(item.periodId||'');
  $('#historicTitle').value=item.title||'';
  $('#historicAuthorSource').value=item.authorSource||'';
  $('#historicDescription').value=item.description||'';
  $('#historicFormTitle').textContent='Editar entrada';
  $('#historicImageFile').required=false;
  renderHistoricFormPreview();
  $('#historicPeriodHint').hidden=true;
  $('#historicForm').scrollIntoView({behavior:'smooth',block:'start'});
}

async function deleteHistoric(id){
  const item=(content.historicItems||[]).find(entry=>entry.id===id); if(!item) return;
  if(!confirm(`Vols eliminar aquesta entrada de ${item.year} i totes les seves fotografies?`)) return;
  try{
    if(supabaseActive && currentSession && window.BandaSupabase?.deletePublicFile){
      const images=historicImages(item);
      const originals=historicOriginalImages(item);
      const cover=item.featuredImageSrc||'';
      for(let i=0;i<images.length;i++){
        showToast(`Eliminant fotografia ${i+1}/${images.length}…`);
        await BandaSupabase.deletePublicFile('historic-media',images[i]);
        if(originals[i] && originals[i]!==images[i]) await BandaSupabase.deletePublicFile('historic-media',originals[i]);
      }
      if(cover && !images.includes(cover) && !originals.includes(cover)) await BandaSupabase.deletePublicFile('historic-media',cover);
    }
  }catch(error){
    console.error(error);
    showToast('No s’han pogut eliminar totes les fotografies de Storage');
    return;
  }
  content.historicItems=(content.historicItems||[]).filter(entry=>entry.id!==id);
  save(content,'Entrada i fotografies eliminades');
  resetHistoricForm();
}


async function moveHistoricPhotoToHemeroteca(itemId,index,targetType='cartells'){
  if(!['admin','gestor'].includes(currentProfile?.role)){showToast('No tens permisos per moure fotografies');return;}
  const allowed=new Set(['cartells','noticies','entrevistes']);
  if(!allowed.has(targetType)) targetType='cartells';
  const item=(content.historicItems||[]).find(entry=>entry.id===itemId); if(!item)return;
  const images=historicImages(item); const src=images[index]; if(!src)return;
  const targetLabel=hemerotecaTypeLabel(targetType);
  if(!confirm(`Vols moure aquesta fotografia de l’HISTÒRIC a HEMEROTECA · ${targetLabel}?`))return;
  const originals=historicOriginalImages(item); const crops=historicImageCrops(item); const submitters=historicImageSubmitters(item);
  const original=originals[index]||src; const crop=crops[index]||{left:0,right:0,top:0,bottom:0}; const submitter=submitters[index]||{};
  content.hemerotecaItems=content.hemerotecaItems||[];
  content.hemerotecaItems.push({
    id:BandaStore.uid('hemero'),type:targetType,year:Number.parseInt(item.year,10)||'',month:'',day:'',
    title:item.title||'',description:item.description||'',authorSource:item.authorSource||'',url:'',
    images:[src],imageSrc:src,featuredImageIndex:0,originalImages:[original],imageCrops:[crop],createdAt:new Date().toISOString(),
    submittedByName:submitter.name||item.submittedByName||'',submittedByUserId:submitter.userId||item.submittedByUserId||'',archiveSubmissionId:submitter.archiveSubmissionId||item.archiveSubmissionId||''
  });
  images.splice(index,1); originals.splice(index,1); crops.splice(index,1); submitters.splice(index,1);
  if(!images.length && item.featuredImageSrc && item.featuredImageSrc!==src){
    try{if(supabaseActive&&currentSession&&window.BandaSupabase?.deletePublicFile) await BandaSupabase.deletePublicFile('historic-media',item.featuredImageSrc);}catch(error){console.warn('No s’ha pogut netejar la portada del minialbum',error);}
  }
  if(!images.length){
    content.historicItems=(content.historicItems||[]).filter(entry=>entry.id!==itemId);
  }else{
    item.images=[...images]; item.imageSrc=images[0]||''; item.originalImages=originals; item.imageCrops=crops; item.imageSubmitters=submitters; if(item.featuredImageSrc===src)item.featuredImageSrc=images[0]||'';
  }
  if(save(content,`Fotografia moguda a HEMEROTECA · ${targetLabel}`)){
    renderHistoric(); renderHemerotecaEditor();
    const stillExists=(content.historicItems||[]).some(entry=>entry.id===itemId);
    if($('#historicId')?.value===itemId){
      if(stillExists) editHistoric(itemId); else resetHistoricForm();
    }
  }
}

async function moveHemerotecaPhotoToDestination(itemId,index,target='historic'){
  if(!['admin','gestor'].includes(currentProfile?.role)){showToast('No tens permisos per moure fotografies');return;}
  const item=(content.hemerotecaItems||[]).find(entry=>entry.id===itemId); if(!item)return;
  const allowed=new Set(['historic','cartells','noticies','entrevistes']);
  if(!allowed.has(target))return;
  if(target===item.type){showToast('La imatge ja és en aquesta secció');return;}
  const images=hemerotecaImages(item); const src=images[index]; if(!src)return;
  const originals=hemerotecaOriginalImages(item); const crops=hemerotecaImageCrops(item);
  const original=originals[index]||src; const crop=crops[index]||{left:0,right:0,top:0,bottom:0};
  const year=Number.parseInt(item.year,10);
  if(!Number.isInteger(year)){showToast('Aquesta imatge necessita un ANY vàlid abans de moure-la');return;}

  if(target==='historic'){
    const period=historicPeriods().find(period=>yearFitsPeriod(year,period));
    if(!period){showToast('No s’ha pogut determinar el període HISTÒRIC per aquest any');return;}
    if(!confirm('Vols moure aquesta imatge de l’HEMEROTECA a l’HISTÒRIC?'))return;
    content.historicItems=content.historicItems||[];
    content.historicItems.push({
      id:BandaStore.uid('hist'),year,periodId:period.id,title:item.title||'',authorSource:item.authorSource||'',description:item.description||'',
      images:[src],imageSrc:src,featuredImageSrc:src,originalImages:[original],imageCrops:[crop],imageSubmitters:[{name:item.submittedByName||'',userId:item.submittedByUserId||'',archiveSubmissionId:item.archiveSubmissionId||''}],createdAt:new Date().toISOString(),
      submittedByName:item.submittedByName||'',submittedByUserId:item.submittedByUserId||'',archiveSubmissionId:item.archiveSubmissionId||''
    });
  }else{
    const targetLabel=hemerotecaTypeLabel(target);
    if(!confirm(`Vols moure aquesta imatge a HEMEROTECA · ${targetLabel}?`))return;
    content.hemerotecaItems=content.hemerotecaItems||[];
    content.hemerotecaItems.push({
      id:BandaStore.uid('hemero'),type:target,year,month:item.month||'',day:item.day||'',title:item.title||'',description:item.description||'',authorSource:item.authorSource||'',url:'',
      images:[src],imageSrc:src,featuredImageIndex:0,originalImages:[original],imageCrops:[crop],createdAt:new Date().toISOString(),
      submittedByName:item.submittedByName||'',submittedByUserId:item.submittedByUserId||'',archiveSubmissionId:item.archiveSubmissionId||''
    });
  }

  const oldFeatured=Number.parseInt(item.featuredImageIndex,10)||0;
  images.splice(index,1); originals.splice(index,1); crops.splice(index,1);
  const nextFeatured=oldFeatured===index?0:(oldFeatured>index?oldFeatured-1:oldFeatured);
  const mustRemove=!images.length && (item.type==='cartells' || (!String(item.url||'').trim() && !hemerotecaDocuments(item).length));
  if(mustRemove){
    content.hemerotecaItems=(content.hemerotecaItems||[]).filter(entry=>entry.id!==itemId);
  }else{
    item.images=[...images]; item.imageSrc=images[0]||''; item.featuredImageIndex=Math.max(0,Math.min(Math.max(0,images.length-1),nextFeatured)); item.originalImages=originals; item.imageCrops=crops;
  }
  const targetLabel=target==='historic'?'HISTÒRIC':`HEMEROTECA · ${hemerotecaTypeLabel(target)}`;
  if(save(content,`Imatge moguda a ${targetLabel}`)){
    renderHistoric(); renderHemerotecaEditor();
    const stillExists=(content.hemerotecaItems||[]).some(entry=>entry.id===itemId);
    if($('#hemerotecaId')?.value===itemId){
      if(stillExists) editHemeroteca(itemId); else resetHemerotecaForm();
    }
  }
}
async function moveHemerotecaPhotoToHistoric(itemId,index){
  return moveHemerotecaPhotoToDestination(itemId,index,'historic');
}

function historicEditorItemMarkup(item){
  const period=historicPeriodById(item.periodId);
  const images=historicImages(item);
  const thumbCols=Math.max(1,Math.ceil(Math.sqrt(images.length||1)));
  const showListCrop=images.length<3;
  const thumbs=images.length ? `<div class="historic-thumb-grid" style="--thumb-cols:${thumbCols}">${images.map((src,index)=>`<div class="historic-thumb-cell"><img src="${esc(src)}" alt="" loading="lazy" />${showListCrop?`<button class="historic-crop-thumb-btn" type="button" data-crop-historic="${esc(item.id)}" data-crop-index="${index}" title="Fer crop manual" aria-label="Fer crop manual">✂</button>`:''}</div>`).join('')}</div>` : '<div class="historic-thumb"><span>◷</span></div>';
  const checked=selectedHistoricMergeIds.has(item.id)?'checked':'';
  return `<article class="historic-editor-item">
    <label class="historic-merge-check" title="Seleccionar per agrupar"><input type="checkbox" data-select-historic-merge="${esc(item.id)}" ${checked}/><span>AGRUPAR</span></label>
    <div class="historic-thumb-wrap">${thumbs}</div>
    <div class="list-main"><div class="list-kicker"><span>${esc(item.year)}</span><span>·</span><span>${esc(period?.director||'Sense període')}</span><span>·</span><span>${images.length} ${images.length===1?'foto':'fotos'}</span></div>${item.title?`<h3>${esc(item.title)}</h3>`:'<h3>Sense títol</h3>'}${item.authorSource?`<p><strong>Autor / procedència:</strong> ${esc(item.authorSource)}</p>`:''}${item.description?`<p>${esc(item.description)}</p>`:''}</div>
    <div class="list-actions"><button class="tiny-btn" data-edit-historic="${esc(item.id)}" title="Editar">✎</button><button class="tiny-btn delete" data-delete-historic="${esc(item.id)}" title="Eliminar">×</button></div>
  </article>`;
}
function updateHistoricMergeToolbar(){
  const bar=$('#historicMergeToolbar'), count=$('#historicMergeCount'); if(!bar||!count)return;
  const n=selectedHistoricMergeIds.size; bar.hidden=n<1; count.textContent=`${n} ${n===1?'seleccionada':'seleccionades'}`;
  const btn=$('#historicMergeBtn'); if(btn)btn.disabled=n<2;
}
function mergeSelectedHistoricEntries(){
  const ids=[...selectedHistoricMergeIds]; if(ids.length<2){showToast('Selecciona almenys dues entrades');return;}
  const selected=ids.map(id=>(content.historicItems||[]).find(x=>x.id===id)).filter(Boolean); if(selected.length<2)return;
  const year=selected[0].year, periodId=selected[0].periodId;
  if(selected.some(x=>String(x.year)!==String(year)||x.periodId!==periodId)){showToast('Per agrupar, les entrades han de ser del mateix any i període');return;}
  if(!confirm(`Agrupar ${selected.length} entrades en un únic acte del timeline?`))return;
  const base=selected[0]; const images=[], originals=[], crops=[], submitters=[];
  selected.forEach(entry=>{images.push(...historicImages(entry));originals.push(...historicOriginalImages(entry));crops.push(...historicImageCrops(entry));submitters.push(...historicImageSubmitters(entry));});
  const title=selected.map(x=>String(x.title||'').trim()).find(Boolean)||'';
  const description=selected.map(x=>String(x.description||'').trim()).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join('\n\n');
  const authorSource=selected.map(x=>String(x.authorSource||'').trim()).find(Boolean)||'';
  const merged={...base,id:BandaStore.uid('hist'),year,periodId,title,description,authorSource,images,imageSrc:images[0]||'',featuredImageSrc:base.featuredImageSrc||images[0]||'',originalImages:originals,imageCrops:crops,imageSubmitters:submitters,createdAt:selected.map(x=>x.createdAt).filter(Boolean).sort()[0]||new Date().toISOString()};
  const idSet=new Set(ids); content.historicItems=(content.historicItems||[]).filter(x=>!idSet.has(x.id)); content.historicItems.push(merged);
  selectedHistoricMergeIds.clear();
  if(save(content,'Entrades agrupades en un sol acte')){renderHistoric();editHistoric(merged.id);showToast('Minialbum creat · ara pots triar la imatge DESTACADA o pujar una portada');}
}
function renderHistoric(){
  const list=[...(content.historicItems||[])].sort((a,b)=>{
    const pa=historicPeriods().findIndex(p=>p.id===a.periodId), pb=historicPeriods().findIndex(p=>p.id===b.periodId);
    // v0.106 · períodes més actuals primer al llistat de CRONOLOGIA FOTOGRAFIES.
    if(pa!==pb) return pb-pa;
    const ya=Number(a.year)||0,yb=Number(b.year)||0;
    if(ya!==yb) return ya-yb;
    return String(a.title||'').localeCompare(String(b.title||''),'ca');
  });
  $('#historicCount').textContent=list.length;
  const host=$('#historicEditorList');
  if(!list.length){ host.innerHTML='<div class="empty-state">Encara no hi ha cap fotografia a l’Històric.</div>'; return; }
  const periods=historicPeriods();
  const groupIds=[...new Set(list.map(item=>item.periodId||'unknown'))];
  host.innerHTML=groupIds.map(periodId=>{
    const items=list.filter(item=>(item.periodId||'unknown')===periodId);
    const period=periods.find(p=>p.id===periodId);
    const open=openHistoricEditorPeriods.has(periodId);
    return `<section class="editor-collapse-group history-collapse-group ${open?'is-open':''}" data-history-editor-group="${esc(periodId)}">
      <button type="button" class="editor-collapse-head" data-toggle-history-editor="${esc(periodId)}" aria-expanded="${open?'true':'false'}">
        <span class="editor-collapse-main"><strong>${esc(period?.years||'SENSE PERÍODE')}</strong><span>${esc(period?.director||'Període desconegut')}</span></span>
        <span class="editor-collapse-count">${items.length}</span><span class="editor-collapse-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="editor-collapse-body" ${open?'':'hidden'}>${items.map(historicEditorItemMarkup).join('')}</div>
    </section>`;
  }).join('');
  $$('[data-toggle-history-editor]').forEach(btn=>btn.onclick=()=>{
    const id=btn.dataset.toggleHistoryEditor;
    if(openHistoricEditorPeriods.has(id)) openHistoricEditorPeriods.delete(id); else openHistoricEditorPeriods.add(id);
    renderHistoric();
  });
  $$('[data-edit-historic]').forEach(btn=>btn.onclick=()=>editHistoric(btn.dataset.editHistoric));
  $$('[data-delete-historic]').forEach(btn=>btn.onclick=()=>deleteHistoric(btn.dataset.deleteHistoric));
  $$('[data-crop-historic]').forEach(btn=>btn.onclick=()=>openHistoricCrop(btn.dataset.cropHistoric,Number(btn.dataset.cropIndex||0)));
  $$('[data-select-historic-merge]').forEach(input=>input.onchange=()=>{const id=input.dataset.selectHistoricMerge;if(input.checked)selectedHistoricMergeIds.add(id);else selectedHistoricMergeIds.delete(id);updateHistoricMergeToolbar();});
  updateHistoricMergeToolbar();
}

function bindHistoric(){
  $('#historicMergeBtn')?.addEventListener('click',mergeSelectedHistoricEntries);
  $('#historicMergeClear')?.addEventListener('click',()=>{selectedHistoricMergeIds.clear();renderHistoric();});
  renderHistoricPeriodOptions('');
  $('#historicYear').max=String(new Date().getFullYear());
  $('#historicYear').addEventListener('input',autoHistoricPeriodFromYear);
  $('#historicImageFile').addEventListener('change',async event=>{
    const files=[...(event.target.files||[])];
    if(!files.length){ renderHistoricFormPreview(); return; }
    const added=[];
    try{
      showToast(`Preparant ${files.length} ${files.length===1?'fotografia':'fotografies'}…`);
      for(const file of files){
        const compressed=await compressHistoricImage(file);
        pendingHistoricImages.push(compressed);
        pendingHistoricOriginalFiles.push(file);
        added.push(compressed);
      }
      renderHistoricFormPreview();
      showToast(`${files.length} ${files.length===1?'fotografia afegida':'fotografies afegides'} · ${pendingHistoricImages.length} pendents de desar`);
    }catch(error){
      console.error(error);
      if(added.length){
        pendingHistoricImages.splice(Math.max(0,pendingHistoricImages.length-added.length),added.length);
        pendingHistoricOriginalFiles.splice(Math.max(0,pendingHistoricOriginalFiles.length-added.length),added.length);
      }
      renderHistoricFormPreview();
      showToast('No s’han pogut processar totes les fotografies');
    }finally{
      // Permet tornar a obrir el selector i afegir una altra tanda abans de DESAR ENTRADA.
      event.target.value='';
    }
  });
  $('#historicCoverFile')?.addEventListener('change',async event=>{
    const file=event.target.files?.[0]||null; pendingHistoricCoverFile=file; pendingHistoricCoverPreview='';
    if(file){try{pendingHistoricCoverPreview=await compressHistoricImage(file);showToast('Portada preparada · es desarà amb l’entrada');}catch(error){console.error(error);pendingHistoricCoverFile=null;event.target.value='';showToast('No s’ha pogut preparar la portada');}}
  });
  $('#clearPendingHistoricImages')?.addEventListener('click',()=>{
    pendingHistoricImages=[];
    pendingHistoricOriginalFiles=[];
    renderHistoricFormPreview();
    showToast('Fotografies noves descartades');
  });
  $('#historicForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const id=$('#historicId').value||BandaStore.uid('hist');
    const year=Number.parseInt($('#historicYear').value,10);
    const periodId=$('#historicPeriod').value;
    const period=historicPeriodById(periodId);
    if(!Number.isInteger(year)){ showToast('Cal indicar un any'); return; }
    if(!period){ showToast('Cal seleccionar un període'); return; }
    if(!yearFitsPeriod(year,period)){ showToast('L’any no correspon al període seleccionat'); return; }
    const existing=(content.historicItems||[]).find(entry=>entry.id===id);
    const images=existing ? historicImages(existing) : [];
    if(pendingHistoricImages.length){
      try{
        if(!cloudMediaReady()) throw new Error('MEDIA_CLOUD_REQUIRED');
        for(let i=0;i<pendingHistoricImages.length;i++){
          const compressed=pendingHistoricImages[i];
          const file=pendingHistoricOriginalFiles[i];
          if(!file) throw new Error('BACKUP_FILE_REQUIRED');
          const src=await uploadImageWithBackup({
            file,compressed,
            activeBucket:'historic-media',activeFolder:String(year),activeName:`historic-${year}-${images.length+i+1}`,
            backupRoot:`historic/${year}`,backupLabel:`la fotografia ${i+1}/${pendingHistoricImages.length}`
          });
          images.push(src);
        }
      }catch(error){ console.error(error); mediaUploadErrorToast(error,'No s’han pogut pujar les fotografies'); return; }
    }
    if(!images.length){ showToast('Cal seleccionar almenys una fotografia'); return; }
    const originals=existing?historicOriginalImages(existing):[];
    const crops=existing?historicImageCrops(existing):[];
    const submitters=existing?historicImageSubmitters(existing):[];
    while(originals.length<images.length) originals.push(images[originals.length]||'');
    while(crops.length<images.length) crops.push({left:0,right:0,top:0,bottom:0});
    while(submitters.length<images.length) submitters.push({name:'',userId:'',archiveSubmissionId:''});
    let featuredImageSrc=historicFeaturedSrc||existing?.featuredImageSrc||images[0]||'';
    if(pendingHistoricCoverFile){
      try{
        if(!cloudMediaReady()) throw new Error('MEDIA_CLOUD_REQUIRED');
        const compressed=pendingHistoricCoverPreview||await compressHistoricImage(pendingHistoricCoverFile);
        featuredImageSrc=await uploadImageWithBackup({file:pendingHistoricCoverFile,compressed,activeBucket:'historic-media',activeFolder:String(year),activeName:`historic-${year}-cover-${id}`,backupRoot:`historic/${year}`,backupLabel:'la portada destacada'});
      }catch(error){console.error(error);mediaUploadErrorToast(error,'No s’ha pogut pujar la portada');return;}
    }
    const item={id,year,periodId,title:$('#historicTitle').value.trim(),authorSource:$('#historicAuthorSource').value.trim(),description:$('#historicDescription').value.trim(),images,imageSrc:images[0]||'',featuredImageSrc,originalImages:originals,imageCrops:crops,imageSubmitters:submitters,createdAt:existing?.createdAt||new Date().toISOString(),submittedByName:existing?.submittedByName||'',submittedByUserId:existing?.submittedByUserId||'',archiveSubmissionId:existing?.archiveSubmissionId||''};
    content.historicItems=content.historicItems||[];
    const index=content.historicItems.findIndex(entry=>entry.id===id);
    if(index>=0) content.historicItems[index]=item; else content.historicItems.push(item);
    if(save(content,index>=0?'Entrada actualitzada':'Entrada afegida')) resetHistoricForm();
  });
  $('#newHistoricBtn').onclick=resetHistoricForm;
  $('#cancelHistoricEdit').onclick=resetHistoricForm;
}

function hemerotecaImages(item){
  const images=Array.isArray(item?.images)?item.images.filter(Boolean):[];
  if(!images.length&&item?.imageSrc) images.push(item.imageSrc);
  return images;
}
function hemerotecaDocuments(item){
  return Array.isArray(item?.documents)?item.documents.filter(doc=>doc&&typeof doc.url==='string'&&doc.url.trim()).map(doc=>({url:doc.url,name:doc.name||'document.pdf',mime:doc.mime||'application/pdf'})):[];
}
function hemerotecaOriginalImages(item){
  const images=hemerotecaImages(item);
  const originals=Array.isArray(item?.originalImages)?item.originalImages:[];
  return images.map((src,index)=>originals[index]||src);
}
function hemerotecaImageCrops(item){
  const images=hemerotecaImages(item);
  const crops=Array.isArray(item?.imageCrops)?item.imageCrops:[];
  return images.map((_,index)=>{const c=crops[index]||{};return {left:Number(c.left)||0,right:Number(c.right)||0,top:Number(c.top)||0,bottom:Number(c.bottom)||0};});
}
function hemerotecaTypeLabel(type){return ({cartells:'CARTELLS',noticies:'NOTÍCIES',entrevistes:'ENTREVISTES'})[type]||'HEMEROTECA';}
const HEMEROTECA_MONTHS=['','gener','febrer','març','abril','maig','juny','juliol','agost','setembre','octubre','novembre','desembre'];
function hemerotecaDateLabel(item){
  const year=Number.parseInt(item?.year,10)||'';
  const month=Number.parseInt(item?.month,10)||0;
  const day=Number.parseInt(item?.day,10)||0;
  if(!year)return '';
  if(month>=1&&month<=12&&day>=1&&day<=31)return `${day} ${HEMEROTECA_MONTHS[month]} ${year}`;
  if(month>=1&&month<=12)return `${HEMEROTECA_MONTHS[month]} ${year}`;
  return String(year);
}
function hemerotecaSortValue(item){return (Number(item?.year)||0)*10000+(Number(item?.month)||0)*100+(Number(item?.day)||0);}
function renderHemerotecaFormPreview(){
  const wrap=$('#hemerotecaImagePreviewWrap'),grid=$('#hemerotecaImagePreviewGrid'); if(!wrap||!grid)return;
  const savedCount=editingHemerotecaImages.length; const images=[...editingHemerotecaImages,...pendingHemerotecaImages];
  const currentType=$('#hemerotecaType')?.value||'cartells';
  const existing=(content.hemerotecaItems||[]).find(entry=>entry.id===($('#hemerotecaId')?.value||''));
  const savedDocuments=hemerotecaDocuments(existing);
  wrap.hidden=!images.length&&!savedDocuments.length&&!pendingHemerotecaDocuments.length;
  const imageMarkup=images.map((src,index)=>{
    const isNew=index>=savedCount; const localIndex=isNew?index-savedCount:index;
    const attr=isNew?`data-remove-pending-hemero="${localIndex}"`:`data-remove-saved-hemero="${localIndex}"`;
    const featuredButton=currentType==='noticies'&&images.length>1?`<button class="history-image-feature-btn ${hemerotecaFeaturedIndex===index?'is-featured':''}" type="button" data-feature-hemero="${index}" title="Marcar com a portada de la notícia">${hemerotecaFeaturedIndex===index?'★ PORTADA':'☆ PORTADA'}</button>`:'';
    let transfer='';
    if(!isNew){
      const destinations=[
        ['historic','HISTÒRIC'],['cartells','CARTELLS'],['noticies','NOTÍCIES'],['entrevistes','ENTREVISTES']
      ].filter(([value])=>value!==currentType);
      transfer=`<div class="history-image-transfer-panel"><select data-hemero-transfer-target="${localIndex}" aria-label="Moure imatge a una altra secció">${destinations.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select><button type="button" data-move-saved-hemero="${localIndex}">MOURE</button></div>`;
    }
    return `<div class="history-image-preview-item ${isNew?'is-new':''}"><div class="history-image-preview-visual"><img src="${esc(src)}" alt="Previsualització ${index+1}" /><span>${isNew?'NOVA':'DESADA'}</span>${featuredButton}<button class="history-image-remove-btn" type="button" ${attr} aria-label="Eliminar imatge">×</button></div>${transfer}</div>`;
  }).join('');
  const savedDocMarkup=savedDocuments.map((doc,index)=>`<div class="history-image-preview-item hemeroteca-document-preview"><div class="hemeroteca-document-tile"><strong>PDF</strong><span>${esc(doc.name||`Document ${index+1}.pdf`)}</span><button class="history-image-remove-btn" type="button" data-remove-saved-hemero-doc="${index}" aria-label="Eliminar PDF">×</button></div></div>`).join('');
  const pendingDocMarkup=pendingHemerotecaDocuments.map((file,index)=>`<div class="history-image-preview-item hemeroteca-document-preview is-new"><div class="hemeroteca-document-tile"><strong>PDF</strong><span>${esc(file.name||`Document ${index+1}.pdf`)}</span><button class="history-image-remove-btn" type="button" data-remove-pending-hemero-doc="${index}" aria-label="Eliminar PDF">×</button></div></div>`).join('');
  grid.innerHTML=imageMarkup+savedDocMarkup+pendingDocMarkup;
  $$('[data-remove-pending-hemero]').forEach(btn=>btn.onclick=()=>{const localIndex=Number(btn.dataset.removePendingHemero||0);const globalIndex=savedCount+localIndex;pendingHemerotecaImages.splice(localIndex,1);pendingHemerotecaOriginalFiles.splice(localIndex,1);if(hemerotecaFeaturedIndex===globalIndex)hemerotecaFeaturedIndex=0;else if(hemerotecaFeaturedIndex>globalIndex)hemerotecaFeaturedIndex--;renderHemerotecaFormPreview();});
  $$('[data-remove-saved-hemero]').forEach(btn=>btn.onclick=()=>removeHemerotecaSavedImage(Number(btn.dataset.removeSavedHemero||0)));
  $$('[data-feature-hemero]').forEach(btn=>btn.onclick=()=>{hemerotecaFeaturedIndex=Number(btn.dataset.featureHemero||0);renderHemerotecaFormPreview();showToast('Portada de la notícia seleccionada');});
  $$('[data-remove-pending-hemero-doc]').forEach(btn=>btn.onclick=()=>{pendingHemerotecaDocuments.splice(Number(btn.dataset.removePendingHemeroDoc||0),1);renderHemerotecaFormPreview();});
  $$('[data-remove-saved-hemero-doc]').forEach(btn=>btn.onclick=()=>removeHemerotecaSavedDocument(Number(btn.dataset.removeSavedHemeroDoc||0)));
  $$('[data-move-saved-hemero]').forEach(btn=>btn.onclick=()=>{
    const index=Number(btn.dataset.moveSavedHemero||0);
    const select=document.querySelector(`[data-hemero-transfer-target="${index}"]`);
    moveHemerotecaPhotoToDestination($('#hemerotecaId')?.value||'',index,select?.value||'historic');
  });
}

function syncHemerotecaRuleHelp(){
  const type=$('#hemerotecaType')?.value||'cartells'; const help=$('#hemerotecaRuleHelp'); if(!help)return;
  help.textContent=type==='cartells'?'CARTELLS necessita almenys una imatge. Pots afegir-ne més d’una si vols conservar diferents versions o detalls.':type==='noticies'?'NOTÍCIES admet imatges, PDFs, un enllaç web o una combinació d’aquests elements. Si hi ha diverses imatges, a l’APP es mostraran com diapositives.':'ENTREVISTES admet un enllaç, imatges/documentació o totes dues coses.';
}
function resetHemerotecaForm(){
  const form=$('#hemerotecaForm'); if(!form)return; form.reset(); pendingHemerotecaImages=[];pendingHemerotecaOriginalFiles=[];pendingHemerotecaDocuments=[];editingHemerotecaImages=[];hemerotecaFeaturedIndex=0;
  $('#hemerotecaId').value='';$('#hemerotecaFormTitle').textContent='Nova entrada';$('#hemerotecaType').value='cartells';$('#hemerotecaYear').max=String(new Date().getFullYear());$('#hemerotecaMonth').value='';$('#hemerotecaDay').value='';renderHemerotecaFormPreview();syncHemerotecaRuleHelp();syncHemerotecaFileAccept();
}
function editHemeroteca(id){
  const item=(content.hemerotecaItems||[]).find(entry=>entry.id===id); if(!item)return;
  pendingHemerotecaImages=[];pendingHemerotecaOriginalFiles=[];pendingHemerotecaDocuments=[];editingHemerotecaImages=hemerotecaImages(item);hemerotecaFeaturedIndex=Math.max(0,Math.min(Math.max(0,editingHemerotecaImages.length-1),Number.parseInt(item.featuredImageIndex,10)||0));$('#hemerotecaId').value=item.id;$('#hemerotecaType').value=item.type||'cartells';$('#hemerotecaYear').value=item.year||'';$('#hemerotecaMonth').value=item.month||'';$('#hemerotecaDay').value=item.day||'';$('#hemerotecaTitle').value=item.title||'';$('#hemerotecaDescription').value=item.description||'';$('#hemerotecaUrl').value=item.url||'';$('#hemerotecaFormTitle').textContent='Editar entrada';renderHemerotecaFormPreview();syncHemerotecaRuleHelp();syncHemerotecaFileAccept();$('#hemerotecaForm').scrollIntoView({behavior:'smooth',block:'start'});
}
async function removeHemerotecaSavedImage(index){
  const id=$('#hemerotecaId')?.value||''; const item=(content.hemerotecaItems||[]).find(entry=>entry.id===id); if(!item)return;
  const images=hemerotecaImages(item); const src=images[index]; if(!src)return;
  const remaining=images.length-1; const hasUrl=!!String(item.url||'').trim(); const hasDocuments=hemerotecaDocuments(item).length>0;
  if(item.type==='cartells'&&!remaining){showToast('Un CARTELL ha de conservar almenys una imatge. Elimina l’entrada completa si ja no la vols.');return;}
  if(item.type!=='cartells'&&!remaining&&!hasUrl&&!hasDocuments){showToast('Aquesta entrada necessita conservar una imatge, document o enllaç.');return;}
  if(!confirm('Vols eliminar definitivament aquesta imatge?'))return;
  const originals=hemerotecaOriginalImages(item); const crops=hemerotecaImageCrops(item);
  try{
    if(supabaseActive&&currentSession&&window.BandaSupabase?.deletePublicFile){
      await BandaSupabase.deletePublicFile('historic-media',src);
      if(originals[index]&&originals[index]!==src) await BandaSupabase.deletePublicFile('historic-media',originals[index]);
    }
  }catch(error){console.error(error);showToast('No s’ha pogut eliminar la imatge de Storage');return;}
  originals.splice(index,1); crops.splice(index,1); images.splice(index,1);
  let featured=Number.parseInt(item.featuredImageIndex,10)||0;
  if(featured===index) featured=0; else if(featured>index) featured--;
  featured=Math.max(0,Math.min(Math.max(0,images.length-1),featured));
  item.images=images;item.imageSrc=images[0]||'';item.featuredImageIndex=featured;item.originalImages=originals;item.imageCrops=crops;editingHemerotecaImages=[...images];hemerotecaFeaturedIndex=featured;save(content,'Imatge de l’Hemeroteca eliminada');renderHemerotecaFormPreview();
}
async function removeHemerotecaSavedDocument(index){
  const id=$('#hemerotecaId')?.value||''; const item=(content.hemerotecaItems||[]).find(entry=>entry.id===id); if(!item)return;
  const documents=hemerotecaDocuments(item); const doc=documents[index]; if(!doc)return;
  const images=hemerotecaImages(item); const hasUrl=!!String(item.url||'').trim();
  if(item.type==='noticies'&&!images.length&&documents.length===1&&!hasUrl){showToast('Aquesta notícia necessita conservar almenys una imatge, PDF o enllaç.');return;}
  if(!confirm(`Vols eliminar el PDF «${doc.name||'document.pdf'}»?`))return;
  try{if(supabaseActive&&currentSession&&window.BandaSupabase?.deletePublicFile)await BandaSupabase.deletePublicFile('historic-media',doc.url);}catch(error){console.error(error);showToast('No s’ha pogut eliminar el PDF de Storage');return;}
  documents.splice(index,1); item.documents=documents;
  if(save(content,'PDF de l’Hemeroteca eliminat'))renderHemerotecaFormPreview();
}

async function deleteHemeroteca(id){
  const item=(content.hemerotecaItems||[]).find(entry=>entry.id===id); if(!item)return;
  if(!confirm(`Vols eliminar aquesta entrada de ${hemerotecaTypeLabel(item.type)}?`))return;
  try{
    const images=hemerotecaImages(item); const originals=hemerotecaOriginalImages(item);
    for(let i=0;i<images.length;i++){
      if(supabaseActive&&currentSession&&window.BandaSupabase?.deletePublicFile){
        await BandaSupabase.deletePublicFile('historic-media',images[i]);
        if(originals[i]&&originals[i]!==images[i]) await BandaSupabase.deletePublicFile('historic-media',originals[i]);
      }
    }
  }catch(error){console.error(error);showToast('No s’han pogut eliminar totes les imatges de Storage');return;}
  content.hemerotecaItems=(content.hemerotecaItems||[]).filter(entry=>entry.id!==id);save(content,'Entrada de l’Hemeroteca eliminada');resetHemerotecaForm();
}
function hemerotecaEditorItemMarkup(item){
  const images=hemerotecaImages(item);
  const thumbs=images.length?`<div class="historic-thumb-grid" style="--thumb-cols:${Math.max(1,Math.ceil(Math.sqrt(images.length)))}">${images.map((src,index)=>`<div class="historic-thumb-cell"><img src="${esc(src)}" alt="" loading="lazy" /><button class="historic-download-btn" type="button" data-download-hemero="${esc(item.id)}" data-download-index="${index}" title="Descarregar imatge" aria-label="Descarregar imatge ${index+1}">⇩</button></div>`).join('')}</div>`:'<div class="historic-thumb"><span>▤</span></div>';
  const dateLabel=hemerotecaDateLabel(item);
  const documents=hemerotecaDocuments(item);
  return `<article class="historic-editor-item hemeroteca-editor-item type-${esc(item.type)}"><div class="historic-thumb-wrap">${thumbs}</div><div class="list-main"><div class="list-kicker"><span>${esc(hemerotecaTypeLabel(item.type))}</span>${dateLabel?`<span>·</span><span>${esc(dateLabel)}</span>`:''}${item.url?'<span>·</span><span>ENLLAÇ</span>':''}${documents.length?`<span>·</span><span>${documents.length} PDF</span>`:''}</div><h3>${esc(item.title||hemerotecaTypeLabel(item.type))}</h3>${item.description?`<p>${esc(item.description)}</p>`:''}</div><div class="list-actions"><button class="tiny-btn" data-edit-hemero="${esc(item.id)}" title="Editar">✎</button><button class="tiny-btn delete" data-delete-hemero="${esc(item.id)}" title="Eliminar">×</button></div></article>`;
}
function renderHemerotecaEditor(){
  const all=[...(content.hemerotecaItems||[])].sort((a,b)=>{const da=hemerotecaSortValue(a),db=hemerotecaSortValue(b);if(da!==db)return db-da;return String(b.createdAt||'').localeCompare(String(a.createdAt||''));});
  $('#hemerotecaCount').textContent=all.length;
  const host=$('#hemerotecaEditorList'); if(!host)return;
  const groups=[
    {id:'cartells',label:'CARTELLS'},
    {id:'noticies',label:'NOTÍCIES'},
    {id:'entrevistes',label:'ENTREVISTES'}
  ];
  const cartellsPeriodsMarkup=(items)=>{
    const periods=historicPeriods();
    const buckets=periods.map(period=>({id:period.id,label:historicPeriodLabel(period),items:items.filter(item=>yearFitsPeriod(Number(item.year)||0,period))}));
    const assigned=new Set(buckets.flatMap(bucket=>bucket.items.map(item=>item.id)));
    const unassigned=items.filter(item=>!assigned.has(item.id));
    if(unassigned.length)buckets.push({id:'sense-periode',label:'SENSE PERÍODE',items:unassigned});
    return buckets.map(bucket=>{
      const open=openCartellsEditorPeriods.has(bucket.id);
      return `<section class="cartells-period-group ${open?'is-open':''}" data-cartells-period="${esc(bucket.id)}">
        <button type="button" class="cartells-period-head" data-toggle-cartells-period="${esc(bucket.id)}" aria-expanded="${open?'true':'false'}">
          <span><strong>${esc(bucket.label)}</strong><small>${bucket.items.length?`${bucket.items.length} ${bucket.items.length===1?'cartell':'cartells'}`:'Sense cartells'}</small></span>
          <span class="editor-collapse-count">${bucket.items.length}</span><span class="editor-collapse-chevron" aria-hidden="true">⌄</span>
        </button>
        <div class="cartells-period-body" ${open?'':'hidden'}>${bucket.items.length?bucket.items.map(hemerotecaEditorItemMarkup).join(''):'<div class="empty-state compact">Encara no hi ha cap cartell en aquest període.</div>'}</div>
      </section>`;
    }).join('');
  };
  host.innerHTML=groups.map(group=>{
    const items=all.filter(item=>item.type===group.id);
    const open=openHemerotecaEditorSections.has(group.id);
    const body=group.id==='cartells'?cartellsPeriodsMarkup(items):(items.length?items.map(hemerotecaEditorItemMarkup).join(''):'<div class="empty-state compact">Encara no hi ha cap document en aquesta categoria.</div>');
    return `<section class="editor-collapse-group hemeroteca-collapse-group type-${group.id} ${open?'is-open':''}" data-hemero-editor-group="${group.id}">
      <button type="button" class="editor-collapse-head" data-toggle-hemero-editor="${group.id}" aria-expanded="${open?'true':'false'}">
        <span class="editor-collapse-main"><strong>${group.label}</strong><span>${items.length?`${items.length} ${items.length===1?'document':'documents'}`:'Sense documents'}</span></span>
        <span class="editor-collapse-count">${items.length}</span><span class="editor-collapse-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="editor-collapse-body" ${open?'':'hidden'}>${body}</div>
    </section>`;
  }).join('');
  $$('[data-toggle-hemero-editor]').forEach(btn=>btn.onclick=()=>{
    const id=btn.dataset.toggleHemeroEditor;
    if(openHemerotecaEditorSections.has(id)) openHemerotecaEditorSections.delete(id); else openHemerotecaEditorSections.add(id);
    renderHemerotecaEditor();
  });
  $$('[data-toggle-cartells-period]').forEach(btn=>btn.onclick=(event)=>{
    event.stopPropagation();
    const id=btn.dataset.toggleCartellsPeriod;
    if(openCartellsEditorPeriods.has(id)) openCartellsEditorPeriods.delete(id); else openCartellsEditorPeriods.add(id);
    renderHemerotecaEditor();
  });
  $$('[data-edit-hemero]').forEach(btn=>btn.onclick=()=>editHemeroteca(btn.dataset.editHemero));
  $$('[data-delete-hemero]').forEach(btn=>btn.onclick=()=>deleteHemeroteca(btn.dataset.deleteHemero));
  $$('[data-download-hemero]').forEach(btn=>btn.onclick=()=>{const item=(content.hemerotecaItems||[]).find(entry=>entry.id===btn.dataset.downloadHemero);const images=hemerotecaImages(item);const index=Number(btn.dataset.downloadIndex||0);if(item&&images[index])downloadHistoricPhoto(images[index],item,index);});
}

function syncHemerotecaFileAccept(){
  const input=$('#hemerotecaImageFile'); if(!input)return;
  const type=$('#hemerotecaType')?.value||'cartells';
  input.accept=type==='noticies'?'image/*,application/pdf':'image/*';
  const label=$('#hemerotecaFileLabel'); if(label)label.firstChild.textContent=type==='noticies'?'Imatges / PDF ':'Imatges ';
}

function bindHemerotecaEditor(){
  $('#hemerotecaYear').max=String(new Date().getFullYear());$('#hemerotecaType').addEventListener('change',()=>{syncHemerotecaRuleHelp();syncHemerotecaFileAccept();renderHemerotecaFormPreview();});
  $('#hemerotecaImageFile').addEventListener('change',async event=>{
    const files=[...(event.target.files||[])]; if(!files.length)return;
    const added=[];
    try{
      showToast(`Preparant ${files.length} ${files.length===1?'imatge':'imatges'}…`);
      for(const file of files){
        const isPdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name||'');
        if(isPdf){
          if(($('#hemerotecaType')?.value||'')!=='noticies'){showToast('Els PDF només es poden afegir a NOTÍCIES');continue;}
          pendingHemerotecaDocuments.push(file);
          continue;
        }
        if(!String(file.type||'').startsWith('image/')){showToast(`Format no admès: ${file.name||'fitxer'}`);continue;}
        const compressed=await compressHistoricImage(file);
        pendingHemerotecaImages.push(compressed);
        pendingHemerotecaOriginalFiles.push(file);
        added.push(compressed);
      }
      renderHemerotecaFormPreview();
    }catch(error){
      console.error(error);
      if(added.length){
        pendingHemerotecaImages.splice(Math.max(0,pendingHemerotecaImages.length-added.length),added.length);
        pendingHemerotecaOriginalFiles.splice(Math.max(0,pendingHemerotecaOriginalFiles.length-added.length),added.length);
      }
      renderHemerotecaFormPreview();
      showToast('No s’han pogut preparar totes les imatges');
    }finally{event.target.value='';}
  });
  $('#clearPendingHemerotecaImages')?.addEventListener('click',()=>{pendingHemerotecaImages=[];pendingHemerotecaOriginalFiles=[];pendingHemerotecaDocuments=[];hemerotecaFeaturedIndex=0;renderHemerotecaFormPreview();});
  $('#hemerotecaForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const id=$('#hemerotecaId').value||BandaStore.uid('hemero');
    const type=$('#hemerotecaType').value;
    const year=Number.parseInt($('#hemerotecaYear').value,10);
    const month=Number.parseInt($('#hemerotecaMonth').value,10)||'';
    const day=Number.parseInt($('#hemerotecaDay').value,10)||'';
    if(!Number.isInteger(year)){showToast('L’any és obligatori a l’Hemeroteca');return;}
    if(month!==''&&(month<1||month>12)){showToast('El mes no és vàlid');return;}
    if(day!==''&&(day<1||day>31)){showToast('El dia no és vàlid');return;}
    if(day!==''&&month===''){showToast('Per indicar el dia, selecciona també el mes');return;}
    if(month!==''&&day!==''){
      const check=new Date(year,month-1,day);
      if(check.getFullYear()!==year||check.getMonth()!==month-1||check.getDate()!==day){showToast('La data indicada no existeix');return;}
    }
    const urlRaw=$('#hemerotecaUrl').value.trim();
    const url=urlRaw?safeWebUrl(urlRaw):'';
    if(urlRaw&&!url){showToast('L’enllaç ha de començar per http:// o https://');return;}
    const existing=(content.hemerotecaItems||[]).find(entry=>entry.id===id);
    const images=existing?hemerotecaImages(existing):[];
    const originals=existing?hemerotecaOriginalImages(existing):[];
    const crops=existing?hemerotecaImageCrops(existing):[];
    const documents=existing?hemerotecaDocuments(existing):[];
    if(type!=='noticies'&&(documents.length||pendingHemerotecaDocuments.length)){showToast('Els PDF només es poden desar a NOTÍCIES');return;}
    try{
      if(pendingHemerotecaImages.length && !cloudMediaReady()) throw new Error('MEDIA_CLOUD_REQUIRED');
      for(let i=0;i<pendingHemerotecaImages.length;i++){
        const compressed=pendingHemerotecaImages[i];
        const file=pendingHemerotecaOriginalFiles[i];
        if(!file) throw new Error('BACKUP_FILE_REQUIRED');
        const src=await uploadImageWithBackup({
          file,compressed,
          activeBucket:'historic-media',activeFolder:`hemeroteca/${type}/${year}`,activeName:`hemeroteca-${type}-${year}-${images.length+i+1}`,
          backupRoot:`hemeroteca/${type}/${year}`,backupLabel:`la imatge ${i+1}/${pendingHemerotecaImages.length}`
        });
        images.push(src); originals.push(src); crops.push({left:0,right:0,top:0,bottom:0});
      }
      if(pendingHemerotecaDocuments.length){
        if(type!=='noticies') throw new Error('PDF_ONLY_NOTICIES');
        if(!cloudMediaReady()) throw new Error('MEDIA_CLOUD_REQUIRED');
        for(let i=0;i<pendingHemerotecaDocuments.length;i++){
          const file=pendingHemerotecaDocuments[i];
          const src=await uploadImageWithBackup({file,compressed:'',activeFile:file,activeBucket:'historic-media',activeFolder:`hemeroteca/noticies/${year}/pdf`,activeName:`noticia-${year}-${documents.length+i+1}`,backupRoot:`hemeroteca/noticies/${year}/pdf`,backupLabel:`el PDF ${i+1}/${pendingHemerotecaDocuments.length}`});
          documents.push({url:src,name:file.name||`noticia-${year}-${i+1}.pdf`,mime:file.type||'application/pdf'});
        }
      }
    }catch(error){console.error(error);mediaUploadErrorToast(error,'No s’han pogut pujar les imatges');return;}
    if(type==='cartells'&&!images.length){showToast('CARTELLS necessita almenys una imatge');return;}
    if(type!=='cartells'&&!images.length&&!documents.length&&!url){showToast(type==='noticies'?'Afegeix almenys una imatge, PDF o enllaç':'Afegeix almenys una imatge o un enllaç');return;}
    const featuredImageIndex=type==='noticies'?Math.max(0,Math.min(Math.max(0,images.length-1),Number(hemerotecaFeaturedIndex)||0)):0;
    const item={id,type,year,month,day,title:$('#hemerotecaTitle').value.trim(),description:$('#hemerotecaDescription').value.trim(),authorSource:existing?.authorSource||'',url,images,imageSrc:images[0]||'',featuredImageIndex,originalImages:originals,imageCrops:crops,documents,createdAt:existing?.createdAt||new Date().toISOString(),submittedByName:existing?.submittedByName||'',submittedByUserId:existing?.submittedByUserId||'',archiveSubmissionId:existing?.archiveSubmissionId||''};
    content.hemerotecaItems=content.hemerotecaItems||[];
    const index=content.hemerotecaItems.findIndex(entry=>entry.id===id);
    if(index>=0)content.hemerotecaItems[index]=item;else content.hemerotecaItems.push(item);
    if(save(content,index>=0?'Entrada de l’Hemeroteca actualitzada':'Entrada afegida a l’Hemeroteca'))resetHemerotecaForm();
  });
  $('#newHemerotecaBtn').onclick=resetHemerotecaForm;$('#cancelHemerotecaEdit').onclick=resetHemerotecaForm;$$('[data-hemeroteca-editor-filter]').forEach(btn=>btn.onclick=()=>{hemerotecaEditorFilter=btn.dataset.hemerotecaEditorFilter;renderHemerotecaEditor();});syncHemerotecaRuleHelp();syncHemerotecaFileAccept();
}


function archivePeriodOptions(year,selected=''){
  const y=Number.parseInt(year,10);
  const periods=historicPeriods().filter(period=>Number.isInteger(y)&&yearFitsPeriod(y,period));
  const options=(periods.length?periods:historicPeriods()).map(period=>`<option value="${esc(period.id)}" ${selected===period.id?'selected':''}>${esc(historicPeriodLabel(period))}</option>`).join('');
  return `<option value="">— Selecciona període —</option>${options}`;
}
function archiveSubmissionDate(row){
  const d=new Date(row.created_at||'');
  return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('ca-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);
}
function archiveReviewCard(row){
  const rejected=row.status==='rejected';
  const type=row.media_type==='cartell'?'cartell':'photo';
  const guessed=type==='photo' ? (historicPeriods().filter(period=>yearFitsPeriod(Number(row.year),period))[0]?.id||'') : '';
  const preview=row.preview_url?`<img src="${esc(row.preview_url)}" alt="Material enviat" loading="lazy" />`:'<div class="empty-state">Sense previsualització</div>';
  const submittedBy=esc(upperUserName(row.submitter_name)||row.submitter_email||'USER');
  const date=esc(archiveSubmissionDate(row));
  const form=`<div class="archive-review-form">
      <div class="archive-review-meta"><strong>${type==='cartell'?'CARTELL':'FOTO HISTÒRIC'}</strong><span>${date}</span></div>
      <div class="form-row"><label>Tipus<select data-archive-field="media_type"><option value="photo" ${type==='photo'?'selected':''}>FOTO HISTÒRIC</option><option value="cartell" ${type==='cartell'?'selected':''}>CARTELL</option></select></label><label>Any *<input data-archive-field="year" type="number" min="1900" max="2100" value="${esc(row.year||'')}" required /></label></div>
      <div class="form-row"><label>Mes<input data-archive-field="month" type="number" min="1" max="12" value="${esc(row.month||'')}" placeholder="Opcional" /></label><label>Dia<input data-archive-field="day" type="number" min="1" max="31" value="${esc(row.day||'')}" placeholder="Opcional" /></label></div>
      <label class="archive-period-field" ${type==='cartell'?'hidden':''}>Període HISTÒRIC *<select data-archive-field="period_id">${archivePeriodOptions(row.year,guessed)}</select></label>
      <label>Títol<input data-archive-field="title" maxlength="180" value="${esc(row.title||'')}" placeholder="Opcional" /></label>
      <label>Descripció<textarea data-archive-field="description" rows="3" maxlength="1600" placeholder="Opcional">${esc(row.description||'')}</textarea></label>
      <label>Autor / procedència<input data-archive-field="author_source" maxlength="180" value="${esc(row.author_source||'')}" placeholder="Opcional" /></label>
      ${rejected?`<label>Nota interna del rebuig<textarea data-archive-field="rejection_note" rows="2" maxlength="500" placeholder="Opcional">${esc(row.rejection_note||'')}</textarea></label>`:''}
      <div class="archive-crop-summary">${[row.crop_left,row.crop_right,row.crop_top,row.crop_bottom].some(v=>Number(v)>0)?'<strong>CROP CONFIGURAT</strong><span>Es conservarà l’original complet al backup.</span>':'<span>Sense crop manual.</span>'}</div>
      <div class="archive-review-actions"><button class="secondary-btn archive-crop-btn" type="button" data-archive-crop>CROP</button>${rejected?'<button class="secondary-btn" type="button" data-archive-restore>TORNAR A PENDENTS</button>':'<button class="primary-btn" type="button" data-archive-validate>VALIDAR</button><button class="danger-btn" type="button" data-archive-reject>REBUTJAR</button>'}<button class="danger-btn archive-delete-forever" type="button" data-archive-delete>ELIMINAR DEFINITIVAMENT</button></div>
    </div>`;
  if(rejected){
    const extra=[row.title,row.author_source,row.description].filter(Boolean).map(value=>esc(value)).join(' · ');
    return `<details class="archive-review-card archive-rejected-item" data-archive-id="${esc(row.id)}">
      <summary class="archive-rejected-summary">
        <span class="archive-rejected-thumb">${preview}</span>
        <span class="archive-rejected-summary-copy"><strong>${esc(row.year||'SENSE ANY')}</strong><span>${type==='cartell'?'CARTELL':'FOTO HISTÒRIC'} · ${submittedBy}${extra?` · ${extra}`:''}</span></span>
        <span class="archive-rejected-date">${date}</span>
        <span class="archive-rejected-toggle" aria-hidden="true">+</span>
      </summary>
      <div class="archive-rejected-expanded">
        <div class="archive-review-media">${preview}<span>ENVIAT PER ${submittedBy}</span></div>
        ${form}
      </div>
    </details>`;
  }
  return `<article class="archive-review-card" data-archive-id="${esc(row.id)}">
    <div class="archive-review-media">${preview}<span>ENVIAT PER ${submittedBy}</span></div>
    ${form}
  </article>`;
}
function suggestionDate(value){
  const d=new Date(value||'');
  return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('ca-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);
}
function suggestionPendingCard(row){
  return `<article class="suggestion-card suggestion-card-pending" data-suggestion-id="${esc(row.id)}">
    <div class="suggestion-card-head"><div><span class="eyebrow">NOU SUGGERIMENT</span><h3>${esc(upperUserName(row.submitter_name)||row.submitter_email||'USER')}</h3></div><time>${esc(suggestionDate(row.created_at))}</time></div>
    <p class="suggestion-text">${esc(row.suggestion||'')}</p>
    <div class="suggestion-card-actions"><button class="primary-btn" type="button" data-suggestion-archive>ARXIVAR</button></div>
  </article>`;
}
function suggestionArchivedCard(row){
  const archivedBy=upperUserName(row.archived_by_name)||'USER GESTOR';
  return `<article class="suggestion-card suggestion-card-archived" data-suggestion-id="${esc(row.id)}">
    <div class="suggestion-card-head"><div><span class="eyebrow">ARXIVAT</span><h3>${esc(upperUserName(row.submitter_name)||row.submitter_email||'USER')}</h3></div><time>${esc(suggestionDate(row.created_at))}</time></div>
    <p class="suggestion-text">${esc(row.suggestion||'')}</p>
    <div class="suggestion-archive-meta">ARXIVAT PER <strong>${esc(archivedBy)}</strong> · ${esc(suggestionDate(row.archived_at))}</div>
    <div class="suggestion-card-actions"><button class="danger-btn" type="button" data-suggestion-delete>ELIMINAR DEFINITIVAMENT</button></div>
  </article>`;
}
function syncSuggestionBadge(){
  const count=Math.max(0,Number(suggestionCounts.pending)||0);
  const tabBadge=$('#suggestionTabBadge');
  if(tabBadge){tabBadge.textContent=count>99?'99+':String(count);tabBadge.hidden=count<1;tabBadge.setAttribute('aria-label',`${count} suggeriments nous`);}
  const countNode=$('#suggestionPendingCount'); if(countNode) countNode.textContent=String(count);
}
function renderSuggestionsReview(){
  const host=$('#archiveReviewList'); if(!host) return;
  const pendingHtml=suggestionsPending.length?suggestionsPending.map(suggestionPendingCard).join(''):'<div class="empty-state">No hi ha suggeriments nous.</div>';
  const archivedHtml=suggestionsArchived.length?suggestionsArchived.map(suggestionArchivedCard).join(''):'<div class="empty-state compact">Encara no hi ha suggeriments arxivats.</div>';
  host.innerHTML=`<section class="suggestion-review-section"><div class="suggestion-review-heading"><div><span class="eyebrow">BÚSTIA DE SUGGERIMENTS</span><h2>Nous suggeriments</h2></div><span class="count-pill">${suggestionsPending.length}</span></div><div class="suggestion-list">${pendingHtml}</div></section><section class="suggestion-review-section suggestion-archive-history"><div class="suggestion-review-heading"><div><span class="eyebrow">HISTORIAL</span><h2>Suggeriments arxivats</h2></div><span class="count-pill muted">${suggestionsArchived.length}</span></div><div class="suggestion-list">${archivedHtml}</div></section>`;
  host.querySelectorAll('[data-suggestion-archive]').forEach(btn=>btn.onclick=()=>archiveSuggestionFromEditor(btn.closest('[data-suggestion-id]')?.dataset.suggestionId));
  host.querySelectorAll('[data-suggestion-delete]').forEach(btn=>btn.onclick=()=>deleteSuggestionFromEditor(btn.closest('[data-suggestion-id]')?.dataset.suggestionId));
}
async function archiveSuggestionFromEditor(id){
  if(!id||!confirm('Vols arxivar aquest suggeriment?')) return;
  try{showToast('Arxivant suggeriment…');await BandaSupabase.archiveSuggestion(id);showToast('Suggeriment arxivat');await refreshArchiveReview();}
  catch(error){console.error(error);showToast('No s’ha pogut arxivar el suggeriment');}
}
async function deleteSuggestionFromEditor(id){
  if(!id||!confirm('Vols ELIMINAR DEFINITIVAMENT aquest suggeriment arxivat? Aquesta acció no es pot desfer.')) return;
  try{showToast('Eliminant suggeriment…');await BandaSupabase.deleteSuggestion(id);showToast('Suggeriment eliminat definitivament');await refreshArchiveReview();}
  catch(error){console.error(error);showToast('No s’ha pogut eliminar el suggeriment');}
}
function renderArchiveReview(){
  const host=$('#archiveReviewList'); if(!host) return;
  $('#archivePendingCount').textContent=String(archiveCounts.pending||0);
  $('#archiveRejectedCount').textContent=String(archiveCounts.rejected||0);
  syncSuggestionBadge();
  $$('[data-archive-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.archiveFilter===archiveReviewFilter));
  if(archiveReviewFilter==='suggestions'){ renderSuggestionsReview(); return; }
  if(!archiveSubmissions.length){ host.innerHTML=`<div class="empty-state">No hi ha aportacions ${archiveReviewFilter==='pending'?'pendents':'rebutjades'}.</div>`; return; }
  host.innerHTML=archiveSubmissions.map(archiveReviewCard).join('');
  host.querySelectorAll('[data-archive-field="media_type"]').forEach(select=>select.addEventListener('change',()=>{
    const card=select.closest('.archive-review-card'); const period=card?.querySelector('.archive-period-field'); if(period) period.hidden=select.value==='cartell';
  }));
  host.querySelectorAll('[data-archive-field="year"]').forEach(input=>input.addEventListener('change',()=>{
    const card=input.closest('.archive-review-card'); const select=card?.querySelector('[data-archive-field="period_id"]'); const type=card?.querySelector('[data-archive-field="media_type"]')?.value;
    if(select&&type==='photo') select.innerHTML=archivePeriodOptions(input.value,'');
  }));
  host.querySelectorAll('[data-archive-validate]').forEach(btn=>btn.onclick=()=>validateArchiveSubmission(btn.closest('.archive-review-card')));
  host.querySelectorAll('[data-archive-reject]').forEach(btn=>btn.onclick=()=>rejectArchiveSubmission(btn.closest('.archive-review-card')));
  host.querySelectorAll('[data-archive-restore]').forEach(btn=>btn.onclick=()=>restoreArchiveSubmission(btn.closest('.archive-review-card')));
  host.querySelectorAll('[data-archive-delete]').forEach(btn=>btn.onclick=()=>deleteArchiveSubmissionForever(btn.closest('.archive-review-card')));
  host.querySelectorAll('[data-archive-crop]').forEach(btn=>btn.onclick=()=>openArchiveCrop(btn.closest('.archive-review-card')));
}
let archiveCropState={mode:'archive',id:'',row:null,itemId:'',index:-1,currentUrl:'',sourceUrl:'',objectUrl:'',image:null,left:0,right:0,top:0,bottom:0};
function closeArchiveCrop(){
  const modal=$('#archiveCropModal'); if(modal) modal.hidden=true;
  if(archiveCropState.objectUrl){try{URL.revokeObjectURL(archiveCropState.objectUrl);}catch(_error){}}
  archiveCropState={mode:'archive',id:'',row:null,itemId:'',index:-1,currentUrl:'',sourceUrl:'',objectUrl:'',image:null,left:0,right:0,top:0,bottom:0};
}
function archiveCropValuesFromUi(){
  const read=id=>Math.max(0,Math.min(45,Number($(id)?.value)||0));
  return {left:read('#archiveCropLeft'),right:read('#archiveCropRight'),top:read('#archiveCropTop'),bottom:read('#archiveCropBottom')};
}
function renderArchiveCropCanvas(){
  const canvas=$('#archiveCropCanvas'), image=archiveCropState.image; if(!canvas||!image) return;
  const values=archiveCropValuesFromUi(); archiveCropState={...archiveCropState,...values};
  const sx=image.naturalWidth*(values.left/100), sy=image.naturalHeight*(values.top/100);
  const sw=image.naturalWidth*(1-(values.left+values.right)/100), sh=image.naturalHeight*(1-(values.top+values.bottom)/100);
  const status=$('#archiveCropStatus');
  if(sw<10||sh<10){ if(status) status.textContent='El retall és massa petit.'; return; }
  const maxW=780,maxH=520,scale=Math.min(1,maxW/sw,maxH/sh);
  canvas.width=Math.max(1,Math.round(sw*scale)); canvas.height=Math.max(1,Math.round(sh*scale));
  const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(image,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
  ['Left','Right','Top','Bottom'].forEach(key=>{const out=$(`#archiveCrop${key}Value`);if(out)out.textContent=`${values[key.toLowerCase()]}%`;});
  if(status) status.textContent=`Previsualització · ${Math.round(sw)} × ${Math.round(sh)} px`;
}
async function openArchiveCrop(card){
  const data=archiveCardData(card), row=archiveRowById(data.id); if(!row) return;
  const modal=$('#archiveCropModal'), status=$('#archiveCropStatus'); if(!modal) return;
  const eyebrow=$('#archiveCropEyebrow'); if(eyebrow) eyebrow.textContent='APORTACIONS';
  modal.hidden=false; if(status) status.textContent='Carregant original…';
  try{
    const blob=await BandaSupabase.downloadArchiveSubmission(row.storage_path);
    const url=URL.createObjectURL(blob), img=new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
    archiveCropState={id:row.id,row,objectUrl:url,image:img,left:Number(row.crop_left)||0,right:Number(row.crop_right)||0,top:Number(row.crop_top)||0,bottom:Number(row.crop_bottom)||0};
    const map={Left:'left',Right:'right',Top:'top',Bottom:'bottom'};
    Object.entries(map).forEach(([suffix,key])=>{const input=$(`#archiveCrop${suffix}`);if(input)input.value=String(archiveCropState[key]);});
    renderArchiveCropCanvas();
  }catch(error){console.error(error);if(status)status.textContent='No s’ha pogut carregar la imatge per fer el crop.';}
}
async function openHistoricCrop(itemId,index){
  const item=(content.historicItems||[]).find(entry=>entry.id===itemId);
  const images=historicImages(item);
  if(!item||!images[index]) return;
  const originals=historicOriginalImages(item), crops=historicImageCrops(item);
  const sourceUrl=originals[index]||images[index], crop=crops[index]||{left:0,right:0,top:0,bottom:0};
  const modal=$('#archiveCropModal'),status=$('#archiveCropStatus'); if(!modal)return;
  const eyebrow=$('#archiveCropEyebrow'); if(eyebrow) eyebrow.textContent='HISTÒRIC';
  modal.hidden=false; if(status)status.textContent='Carregant fotografia…';
  try{
    const response=await fetch(sourceUrl,{cache:'no-store'}); if(!response.ok) throw new Error(`HTTP_${response.status}`);
    const blob=await response.blob(),url=URL.createObjectURL(blob),img=new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
    archiveCropState={mode:'historic',id:'',row:null,itemId,index,currentUrl:images[index],sourceUrl,objectUrl:url,image:img,left:crop.left,right:crop.right,top:crop.top,bottom:crop.bottom};
    const map={Left:'left',Right:'right',Top:'top',Bottom:'bottom'};
    Object.entries(map).forEach(([suffix,key])=>{const input=$(`#archiveCrop${suffix}`);if(input)input.value=String(archiveCropState[key]||0);});
    renderArchiveCropCanvas();
  }catch(error){console.error(error);if(status)status.textContent='No s’ha pogut carregar la fotografia per fer el crop.';}
}
async function historicCropFileFromState(values){
  const image=archiveCropState.image; if(!image) throw new Error('CROP_IMAGE_REQUIRED');
  const sx=image.naturalWidth*(values.left/100),sy=image.naturalHeight*(values.top/100);
  const sw=image.naturalWidth*(1-(values.left+values.right)/100),sh=image.naturalHeight*(1-(values.top+values.bottom)/100);
  if(sw<10||sh<10) throw new Error('CROP_TOO_SMALL');
  const scale=Math.min(1,1200/sw,1200/sh),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(sh*scale));
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('CROP_FAILED')),'image/jpeg',0.86));
  return new File([blob],`historic-crop-${archiveCropState.itemId}-${archiveCropState.index+1}.jpg`,{type:'image/jpeg'});
}
async function saveHistoricCrop(values){
  const item=(content.historicItems||[]).find(entry=>entry.id===archiveCropState.itemId); if(!item)return;
  const images=historicImages(item),originals=historicOriginalImages(item),crops=historicImageCrops(item);
  const index=archiveCropState.index,oldUrl=images[index],sourceUrl=archiveCropState.sourceUrl||originals[index]||oldUrl;
  const noCrop=!(values.left||values.right||values.top||values.bottom);
  try{
    $('#archiveCropStatus').textContent=noCrop?'Restablint fotografia original…':'Publicant crop…';
    let nextUrl=sourceUrl;
    if(!noCrop){
      if(!supabaseActive||!currentSession||!window.BandaSupabase?.uploadFile) throw new Error('MEDIA_CLOUD_REQUIRED');
      const file=await historicCropFileFromState(values);
      nextUrl=(await BandaSupabase.uploadFile('historic-media',file,String(item.year||'sense-any'),`historic-crop-${item.id}-${index+1}`)).url;
    }
    originals[index]=sourceUrl; crops[index]={...values}; images[index]=nextUrl;
    item.images=[...images]; item.imageSrc=images[0]||''; item.originalImages=originals; item.imageCrops=crops;
    if(item.featuredImageSrc===oldUrl || (!item.featuredImageSrc && index===0)) item.featuredImageSrc=nextUrl;
    content.settings=content.settings||{};
    const excluded=homeHeroExcludedImageSet();
    if(excluded.has(oldUrl)){
      excluded.delete(oldUrl);excluded.add(nextUrl);
      content.settings.homeHeroExcludedImages=[...excluded];
    }
    const saved=save(content,noCrop?'Crop restablert':'CROP HISTÒRIC desat'); if(!saved) throw new Error('CONTENT_SAVE_FAILED');
    if(supabaseActive&&currentSession) await remoteSaveChain;
    if(oldUrl&&oldUrl!==sourceUrl&&oldUrl!==nextUrl){try{await BandaSupabase.deletePublicFile('historic-media',oldUrl);}catch(error){console.warn('No s’ha pogut netejar el crop anterior',error);}}
    if($('#historicId')?.value===item.id){editingHistoricImages=[...images];renderHistoricFormPreview();}
    closeArchiveCrop(); renderHistoric(); renderHomeRandomExclusions(); renderHomeEditor();
  }catch(error){console.error(error);$('#archiveCropStatus').textContent='No s’ha pogut desar el crop de l’HISTÒRIC.';}
}

async function saveArchiveCrop(){
  const values=archiveCropValuesFromUi();
  if(archiveCropState.mode==='historic'){
    if(archiveCropState.itemId && archiveCropState.index>=0) await saveHistoricCrop(values);
    return;
  }
  if(!archiveCropState.id) return;
  if(values.left+values.right>=90||values.top+values.bottom>=90){$('#archiveCropStatus').textContent='El crop és massa extrem.';return;}
  try{
    $('#archiveCropStatus').textContent='Desant crop…';
    const updated=await BandaSupabase.updateArchiveSubmission(archiveCropState.id,{crop_left:values.left,crop_right:values.right,crop_top:values.top,crop_bottom:values.bottom});
    const index=archiveSubmissions.findIndex(row=>row.id===archiveCropState.id); if(index>=0) archiveSubmissions[index]={...archiveSubmissions[index],...updated};
    closeArchiveCrop(); renderArchiveReview(); showToast('CROP desat');
  }catch(error){console.error(error);$('#archiveCropStatus').textContent='No s’ha pogut desar el crop. Comprova SUPABASE_UPDATE_v0.68.sql.';}
}
function resetArchiveCrop(){
  ['#archiveCropLeft','#archiveCropRight','#archiveCropTop','#archiveCropBottom'].forEach(id=>{const input=$(id);if(input)input.value='0';});
  renderArchiveCropCanvas();
}
async function cropArchiveFile(file,row){
  const left=Number(row.crop_left)||0,right=Number(row.crop_right)||0,top=Number(row.crop_top)||0,bottom=Number(row.crop_bottom)||0;
  if(!(left||right||top||bottom)) return file;
  const url=URL.createObjectURL(file), img=new Image();
  try{
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
    const sx=Math.round(img.naturalWidth*(left/100)), sy=Math.round(img.naturalHeight*(top/100));
    const sw=Math.max(1,Math.round(img.naturalWidth*(1-(left+right)/100))), sh=Math.max(1,Math.round(img.naturalHeight*(1-(top+bottom)/100)));
    const canvas=document.createElement('canvas'); canvas.width=sw; canvas.height=sh; canvas.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,sw,sh);
    const type=['image/jpeg','image/png','image/webp'].includes(file.type)?file.type:'image/jpeg';
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('CROP_FAILED')),type,type==='image/jpeg'?0.94:0.92));
    return new File([blob],file.name||'aportacio.jpg',{type});
  }finally{URL.revokeObjectURL(url);}
}
function syncArchiveNavBadge(){
  const badge=$('#archiveNavBadge'); if(!badge) return;
  const count=Math.max(0,(Number(archiveCounts.pending)||0)+(Number(suggestionCounts.pending)||0));
  badge.textContent=count>99?'99+':String(count);
  badge.hidden=count<1;
  badge.setAttribute('aria-label',`${count} aportacions o suggeriments pendents`);
}
async function refreshArchivePendingBadge(){
  if(!currentSession || !['admin','gestor'].includes(currentProfile?.role) || !window.BandaSupabase?.countArchiveSubmissions) return;
  try{
    const [pending,suggestions]=await Promise.all([
      BandaSupabase.countArchiveSubmissions('pending'),
      BandaSupabase.countSuggestions?BandaSupabase.countSuggestions('pending').catch(()=>0):Promise.resolve(0)
    ]);
    archiveCounts.pending=pending; suggestionCounts.pending=suggestions;
    syncArchiveNavBadge(); syncSuggestionBadge();
  }catch(error){ console.error(error); }
}
async function deleteArchiveSubmissionForever(card){
  const data=archiveCardData(card), row=archiveRowById(data.id); if(!row) return;
  if(!confirm('Vols ELIMINAR DEFINITIVAMENT aquesta aportació? La imatge i les seves dades s’esborraran del sistema i no es podran recuperar.')) return;
  try{
    showToast('Eliminant aportació definitivament…');
    await BandaSupabase.deleteArchiveSubmission(row.id,row.storage_path||'');
    showToast('Aportació eliminada definitivament');
    await refreshArchiveReview();
  }catch(error){ console.error(error); showToast('No s’ha pogut eliminar definitivament l’aportació'); }
}

async function refreshArchiveReview(){
  if(!currentSession || !['admin','gestor'].includes(currentProfile?.role) || !window.BandaSupabase?.listArchiveSubmissions) return;
  const status=$('#archiveReviewStatus'); if(status) status.textContent=archiveReviewFilter==='suggestions'?'Carregant suggeriments…':'Carregant aportacions…';
  try{
    const [pending,rejected,suggestionPending,suggestionArchived]=await Promise.all([
      BandaSupabase.listArchiveSubmissions('pending'),
      BandaSupabase.listArchiveSubmissions('rejected'),
      BandaSupabase.listSuggestions?BandaSupabase.listSuggestions('pending').catch(()=>[]):Promise.resolve([]),
      BandaSupabase.listSuggestions?BandaSupabase.listSuggestions('archived').catch(()=>[]):Promise.resolve([])
    ]);
    archiveCounts={pending:pending.length,rejected:rejected.length};
    suggestionCounts={pending:suggestionPending.length,archived:suggestionArchived.length};
    suggestionsPending=suggestionPending; suggestionsArchived=suggestionArchived;
    syncArchiveNavBadge(); syncSuggestionBadge();
    archiveSubmissions=archiveReviewFilter==='pending'?pending:(archiveReviewFilter==='rejected'?rejected:[]);
    renderArchiveReview(); if(status) status.textContent='';
  }catch(error){ console.error(error); if(status) status.textContent='No s’han pogut carregar les aportacions o els suggeriments. Comprova que has aplicat SUPABASE_UPDATE_v0.88.sql.'; }
}
function archiveCardData(card){
  const value=name=>card?.querySelector(`[data-archive-field="${name}"]`)?.value??'';
  return {id:card?.dataset.archiveId||'',media_type:value('media_type'),year:Number.parseInt(value('year'),10),month:Number.parseInt(value('month'),10)||null,day:Number.parseInt(value('day'),10)||null,period_id:value('period_id'),title:value('title').trim(),description:value('description').trim(),author_source:value('author_source').trim(),rejection_note:value('rejection_note').trim()};
}
function archiveRowById(id){ return archiveSubmissions.find(row=>row.id===id); }
function archiveMovedPath(row,state){ return String(row.storage_path||'').replace(/^(pending|rejected|validated)\//,`${state}/`); }
async function rejectArchiveSubmission(card){
  const data=archiveCardData(card), row=archiveRowById(data.id); if(!row) return;
  const note=prompt('Motiu intern del rebuig (opcional):',data.rejection_note||'') ?? null; if(note===null) return;
  try{
    showToast('Rebutjant aportació…');
    const nextPath=archiveMovedPath(row,'rejected');
    await BandaSupabase.moveArchiveSubmission(row.storage_path,nextPath);
    await BandaSupabase.updateArchiveSubmission(row.id,{...data,status:'rejected',rejection_note:note,storage_path:nextPath});
    showToast('Aportació enviada a REBUTJATS'); await refreshArchiveReview();
  }catch(error){console.error(error);showToast('No s’ha pogut rebutjar l’aportació');}
}
async function restoreArchiveSubmission(card){
  const data=archiveCardData(card), row=archiveRowById(data.id); if(!row) return;
  try{
    showToast('Tornant a PENDENTS…');
    const nextPath=archiveMovedPath(row,'pending');
    await BandaSupabase.moveArchiveSubmission(row.storage_path,nextPath);
    await BandaSupabase.updateArchiveSubmission(row.id,{...data,status:'pending',rejection_note:'',storage_path:nextPath});
    showToast('Aportació recuperada'); await refreshArchiveReview();
  }catch(error){console.error(error);showToast('No s’ha pogut recuperar l’aportació');}
}
async function validateArchiveSubmission(card){
  const data=archiveCardData(card), row=archiveRowById(data.id); if(!row) return;
  if(!Number.isInteger(data.year)){showToast('L’any és obligatori');return;}
  if(data.media_type==='photo'){
    const period=historicPeriodById(data.period_id);
    if(!period){showToast('Selecciona el període de l’HISTÒRIC');return;}
    if(!yearFitsPeriod(data.year,period)){showToast('L’any no correspon al període seleccionat');return;}
  }
  if(data.day && !data.month){showToast('Per indicar el dia, cal indicar també el mes');return;}
  if(!confirm('Vols validar i publicar aquesta aportació?')) return;
  try{
    showToast('Preparant original…');
    const blob=await BandaSupabase.downloadArchiveSubmission(row.storage_path);
    const file=new File([blob],row.original_filename||'aportacio.jpg',{type:row.mime_type||blob.type||'image/jpeg'});
    const croppedFile=await cropArchiveFile(file,row);
    const compressed=await compressHistoricImage(croppedFile);
    let activeUrl='',publishedItemId='';
    if(data.media_type==='cartell'){
      activeUrl=await uploadImageWithBackup({file,compressed,activeBucket:'historic-media',activeFolder:`hemeroteca/cartells/${data.year}`,activeName:`aportacio-${data.year}-${row.id.slice(0,8)}`,backupRoot:`hemeroteca/cartells/${data.year}/aportacions`,backupLabel:'l’aportació'});
      publishedItemId=BandaStore.uid('hemero');
      content.hemerotecaItems=content.hemerotecaItems||[];
      const cartellDescription=data.author_source?`${data.description}${data.description?'\n\n':''}Procedència: ${data.author_source}`:data.description;
      content.hemerotecaItems.push({id:publishedItemId,type:'cartells',year:data.year,month:data.month||'',day:data.day||'',title:data.title,description:cartellDescription,url:'',images:[activeUrl],imageSrc:activeUrl,createdAt:new Date().toISOString(),submittedByName:upperUserName(row.submitter_name)||'',submittedByUserId:row.user_id||'',archiveSubmissionId:row.id});
    }else{
      activeUrl=await uploadImageWithBackup({file,compressed,activeBucket:'historic-media',activeFolder:String(data.year),activeName:`aportacio-${data.year}-${row.id.slice(0,8)}`,backupRoot:`historic/${data.year}/aportacions`,backupLabel:'l’aportació'});
      publishedItemId=BandaStore.uid('hist');
      content.historicItems=content.historicItems||[];
      content.historicItems.push({id:publishedItemId,year:data.year,periodId:data.period_id,title:data.title,authorSource:data.author_source||'',description:data.description,images:[activeUrl],imageSrc:activeUrl,featuredImageSrc:activeUrl,originalImages:[activeUrl],imageCrops:[{left:0,right:0,top:0,bottom:0}],imageSubmitters:[{name:upperUserName(row.submitter_name)||'',userId:row.user_id||'',archiveSubmissionId:row.id}],createdAt:new Date().toISOString(),submittedByName:upperUserName(row.submitter_name)||'',submittedByUserId:row.user_id||'',archiveSubmissionId:row.id});
    }
    if(!save(content,'Aportació validada i publicada')) throw new Error('CONTENT_SAVE_FAILED');
    await remoteSaveChain;
    const nextPath=archiveMovedPath(row,'validated');
    await BandaSupabase.moveArchiveSubmission(row.storage_path,nextPath);
    await BandaSupabase.updateArchiveSubmission(row.id,{...data,status:'validated',storage_path:nextPath,published_item_id:publishedItemId,published_url:activeUrl,rejection_note:''});
    showToast('VALIDAT · ja forma part de l’arxiu'); await refreshArchiveReview();
  }catch(error){console.error(error);mediaUploadErrorToast(error,'No s’ha pogut validar l’aportació');}
}
function bindArchiveReview(){
  $$('[data-archive-filter]').forEach(btn=>btn.addEventListener('click',()=>{archiveReviewFilter=btn.dataset.archiveFilter||'pending';refreshArchiveReview();}));
  ['#archiveCropLeft','#archiveCropRight','#archiveCropTop','#archiveCropBottom'].forEach(id=>$(id)?.addEventListener('input',renderArchiveCropCanvas));
  $('#archiveCropClose')?.addEventListener('click',closeArchiveCrop);
  $('#archiveCropCancel')?.addEventListener('click',closeArchiveCrop);
  $('#archiveCropReset')?.addEventListener('click',resetArchiveCrop);
  $('#archiveCropSave')?.addEventListener('click',saveArchiveCrop);
  $('#archiveCropModal')?.addEventListener('click',event=>{if(event.target===event.currentTarget)closeArchiveCrop();});
}

function contentHasUsefulData(value){
  if(!value) return false;
  if(value.settings?.supabaseInitialized) return true;
  return ['events','tracks','dresscodes','historicItems','hemerotecaItems'].some(key=>Array.isArray(value[key]) && value[key].length>0) || !!value.settings?.homeHeroImage;
}

const HOME_CARD_EDITOR_DEFAULTS={
  calendar:{title:'CALENDARI',text:'Assajos, actuacions i agenda de la banda.'},
  history:{title:'HISTÒRIC',text:'Cronologia visual de la història de la banda.'},
  playlist:{title:'PLAYER',text:'Reproductor de pistes i repertori d’àudio.'},
  games:{title:'MINIJOCS',authenticatedText:'Jocs i reptes musicals de la banda.',guestText:'Jocs musicals oberts a tothom. Inicia sessió per guardar punts.',inactiveText:'Minijocs temporalment inactius.'},
  user:{guestTitle:'USUARI',authenticatedText:'Perfil i dades del teu compte.',guestText:'Accés privat per als músics de la banda.'}
};
function homeCardsEditorSettings(){
  const raw=content.settings?.homeCards||{};
  const clean=(value,fallback)=>typeof value==='string'&&value.trim()?value.trim():fallback;
  return {
    calendar:{title:clean(raw.calendar?.title,HOME_CARD_EDITOR_DEFAULTS.calendar.title),text:clean(raw.calendar?.text,HOME_CARD_EDITOR_DEFAULTS.calendar.text)},
    history:{title:clean(raw.history?.title,HOME_CARD_EDITOR_DEFAULTS.history.title),text:clean(raw.history?.text,HOME_CARD_EDITOR_DEFAULTS.history.text)},
    playlist:{title:clean(raw.playlist?.title,HOME_CARD_EDITOR_DEFAULTS.playlist.title),text:clean(raw.playlist?.text,HOME_CARD_EDITOR_DEFAULTS.playlist.text)},
    games:{title:clean(raw.games?.title,HOME_CARD_EDITOR_DEFAULTS.games.title),authenticatedText:clean(raw.games?.authenticatedText,HOME_CARD_EDITOR_DEFAULTS.games.authenticatedText),guestText:clean(raw.games?.guestText,HOME_CARD_EDITOR_DEFAULTS.games.guestText),inactiveText:clean(raw.games?.inactiveText,HOME_CARD_EDITOR_DEFAULTS.games.inactiveText)},
    user:{guestTitle:clean(raw.user?.guestTitle,HOME_CARD_EDITOR_DEFAULTS.user.guestTitle),authenticatedText:clean(raw.user?.authenticatedText,HOME_CARD_EDITOR_DEFAULTS.user.authenticatedText),guestText:clean(raw.user?.guestText,HOME_CARD_EDITOR_DEFAULTS.user.guestText)}
  };
}
function renderHomeCardSystemFields(){
  const values=homeCardsEditorSettings();
  const pairs={
    homeCardCalendarTitle:values.calendar.title,homeCardCalendarText:values.calendar.text,
    homeCardHistoryTitle:values.history.title,homeCardHistoryText:values.history.text,
    homeCardPlaylistTitle:values.playlist.title,homeCardPlaylistText:values.playlist.text,
    homeCardGamesTitle:values.games.title,homeCardGamesAuthenticatedText:values.games.authenticatedText,homeCardGamesGuestText:values.games.guestText,homeCardGamesInactiveText:values.games.inactiveText,
    homeCardUserGuestTitle:values.user.guestTitle,homeCardUserAuthenticatedText:values.user.authenticatedText,homeCardUserGuestText:values.user.guestText
  };
  Object.entries(pairs).forEach(([id,value])=>{const field=document.getElementById(id);if(field&&document.activeElement!==field)field.value=value;});
}

function renderSystem(){
  const date=content.updatedAt?new Date(content.updatedAt):null;
  $('#lastUpdated').textContent=date&&!Number.isNaN(date.valueOf())?new Intl.DateTimeFormat('ca-ES',{dateStyle:'medium',timeStyle:'short'}).format(date):'—';
  $('#systemEvents').textContent=(content.events||[]).length;
  $('#systemDresscodes').textContent=(content.dresscodes||[]).length;
  $('#systemTracks').textContent=(content.tracks||[]).length;
  $('#systemHistoric').textContent=(content.historicItems||[]).length;
  $('#systemHemeroteca').textContent=(content.hemerotecaItems||[]).length;
  $('#systemProtocol').textContent=editorIsAdmin()
    ? (supabaseActive?'SUPABASE · sincronització central':(migrationPending?'DADES LOCALS · pendent de migrar':'CONNECTANT…'))
    : (supabaseActive?'SINCRONITZACIÓ CENTRAL ACTIVA':(migrationPending?'REVISIÓ D’ADMINISTRACIÓ PENDENT':'CONNECTANT…'));
  const storageBadge=$('#storageBadge');
  if(storageBadge) storageBadge.textContent=supabaseActive?'SUPABASE ACTIU':(migrationPending?'MIGRACIÓ PENDENT':'SUPABASE');
  syncAdminOnlyUi();
  const migrationBtn=$('#migrateToSupabaseBtn');
  if(migrationBtn) migrationBtn.disabled=!editorCanWrite || (supabaseActive && !migrationPending);
  const text=$('#supabaseMigrationText');
  if(text) text.textContent=!editorCanWrite
    ? 'Mode consulta. Aquest accés pot veure el contingut compartit, però no pot publicar canvis.'
    : (supabaseActive && !migrationPending
      ? 'Sincronització activa. Els canvis que desis aquí es publiquen a Supabase i arriben a la resta de dispositius.'
      : 'Aquest navegador conserva dades locals de versions anteriors. Migra-les una sola vegada a Supabase per convertir-les en el contingut compartit oficial.');
  renderHomeCardSystemFields();
  renderHomeRandomExclusions();
}

async function savePublishedFile(){
  const text=BandaStore.makePublishedJs(content);
  if('showSaveFilePicker' in window){
    try{
      const handle=await window.showSaveFilePicker({suggestedName:'content-published.js',types:[{description:'JavaScript',accept:{'text/javascript':['.js']}}]});
      const writable=await handle.createWritable(); await writable.write(text); await writable.close();
      showToast('Còpia legacy creada'); return;
    }catch(error){ if(error?.name==='AbortError')return; }
  }
  BandaStore.exportPublishedJs(content); showToast('Còpia legacy creada');
}

async function migrateCurrentContentToSupabase(){
  if(!editorIsAdmin()){ showToast('Aquesta configuració està reservada al USER ADMIN'); return; }
  if(!currentSession || !editorCanWrite){ showToast('Cal iniciar sessió amb permisos d’administració'); return; }
  const btn=$('#migrateToSupabaseBtn');
  if(btn) btn.disabled=true;
  try{
    const migrating=BandaStore.normalize(content);
    migrating.settings=migrating.settings||{};
    if(/^data:image\//i.test(migrating.settings.homeHeroImage||'')){
      showToast('Migrant imatge de HOME…');
      migrating.settings.homeHeroImage=(await BandaSupabase.uploadDataUrl('app-images',migrating.settings.homeHeroImage,'home','home-hero')).url;
    }
    const items=migrating.historicItems||[];
    for(let i=0;i<items.length;i++){
      const images=historicImages(items[i]);
      for(let j=0;j<images.length;j++){
        if(/^data:image\//i.test(images[j]||'')){
          showToast(`Migrant fotografia ${j+1}/${images.length} de l’entrada ${i+1}/${items.length}…`);
          images[j]=(await BandaSupabase.uploadDataUrl('historic-media',images[j],String(items[i].year||'sense-any'),`historic-${items[i].year||i+1}-${j+1}`)).url;
        }
      }
      items[i].images=images;
      items[i].imageSrc=images[0]||'';
    }
    const hemero=migrating.hemerotecaItems||[];
    for(let i=0;i<hemero.length;i++){
      const images=hemerotecaImages(hemero[i]);
      for(let j=0;j<images.length;j++){
        if(/^data:image\//i.test(images[j]||'')){
          showToast(`Migrant Hemeroteca ${i+1}/${hemero.length}…`);
          images[j]=(await BandaSupabase.uploadDataUrl('historic-media',images[j],`hemeroteca/${hemero[i].type||'altres'}/${hemero[i].year||'sense-any'}`,`hemeroteca-${i+1}-${j+1}`)).url;
        }
      }
      hemero[i].images=images; hemero[i].imageSrc=images[0]||'';
    }
    migrating.settings.supabaseInitialized=true;
    content=await BandaSupabase.saveContent(migrating);
    BandaStore.cacheRemote?.(content);
    supabaseActive=true;
    migrationPending=false;
    renderAll();
    markSaved('DESAT A SUPABASE');
    showToast('Migració completada · Supabase ja és la font oficial');
  }catch(error){
    console.error(error);
    showToast(`Error de migració: ${error?.message||'desconegut'}`);
  }finally{ if(btn) btn.disabled=false; }
}

async function reloadSupabaseContent(){
  if(!editorIsAdmin()){ showToast('Aquesta configuració està reservada al USER ADMIN'); return; }
  try{
    const remote=await BandaSupabase.loadContent();
    if(remote && contentHasUsefulData(remote)){
      content=BandaStore.normalize(remote);
      BandaStore.cacheRemote?.(content);
      supabaseActive=true; migrationPending=false;
      renderAll(); markSaved('DESAT A SUPABASE'); showToast('Dades recarregades de Supabase');
    }else showToast('Supabase encara no conté dades. Utilitza MIGRAR DADES LOCALS.');
  }catch(error){ console.error(error); showToast('No s’han pogut carregar les dades de Supabase'); }
}


const mediaArchiveState={busy:false};
const MEDIA_ZIP_ENCODER=new TextEncoder();
let MEDIA_CRC32_TABLE=null;

function mediaArchiveSafePart(value,fallback='sense-nom'){
  const clean=String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^[-_.]+|[-_.]+$/g,'');
  return clean||fallback;
}
function mediaArchiveExtension(blob,url=''){
  const type=String(blob?.type||'').toLowerCase().split(';')[0].trim();
  const byType={
    'image/jpeg':'jpg','image/jpg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif','image/bmp':'bmp','image/svg+xml':'svg',
    'application/pdf':'pdf','video/mp4':'mp4','video/webm':'webm','audio/mpeg':'mp3','audio/mp4':'m4a','audio/wav':'wav','audio/x-wav':'wav'
  };
  if(byType[type]) return byType[type];
  try{
    const path=new URL(String(url||''),location.href).pathname;
    const match=path.match(/\.([a-zA-Z0-9]{2,5})$/);
    if(match) return match[1].toLowerCase().replace('jpeg','jpg');
  }catch(_error){}
  return 'bin';
}
function mediaArchiveUniquePath(path,used){
  let candidate=path, n=2;
  const dot=path.lastIndexOf('.');
  const base=dot>path.lastIndexOf('/')?path.slice(0,dot):path;
  const ext=dot>path.lastIndexOf('/')?path.slice(dot):'';
  while(used.has(candidate)) candidate=`${base}-${n++}${ext}`;
  used.add(candidate);
  return candidate;
}
function mediaCrc32(bytes){
  if(!MEDIA_CRC32_TABLE){
    MEDIA_CRC32_TABLE=new Uint32Array(256);
    for(let n=0;n<256;n++){
      let c=n;
      for(let k=0;k<8;k++) c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);
      MEDIA_CRC32_TABLE[n]=c>>>0;
    }
  }
  let crc=0xffffffff;
  for(let i=0;i<bytes.length;i++) crc=MEDIA_CRC32_TABLE[(crc^bytes[i])&0xff]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}
function mediaZipDosDateTime(value){
  const date=value instanceof Date&&!Number.isNaN(value.valueOf())?value:new Date();
  const year=Math.max(1980,date.getFullYear());
  const dosDate=((year-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
  const dosTime=(date.getHours()<<11)|(date.getMinutes()<<5)|Math.floor(date.getSeconds()/2);
  return {dosDate:dosDate&0xffff,dosTime:dosTime&0xffff};
}
function mediaZipLocalHeader(nameBytes,size,crc,date){
  const out=new Uint8Array(30+nameBytes.length),view=new DataView(out.buffer);
  view.setUint32(0,0x04034b50,true); view.setUint16(4,20,true); view.setUint16(6,0x0800,true); view.setUint16(8,0,true);
  view.setUint16(10,date.dosTime,true); view.setUint16(12,date.dosDate,true); view.setUint32(14,crc,true); view.setUint32(18,size,true); view.setUint32(22,size,true);
  view.setUint16(26,nameBytes.length,true); view.setUint16(28,0,true); out.set(nameBytes,30); return out;
}
function mediaZipCentralHeader(nameBytes,size,crc,date,offset){
  const out=new Uint8Array(46+nameBytes.length),view=new DataView(out.buffer);
  view.setUint32(0,0x02014b50,true); view.setUint16(4,20,true); view.setUint16(6,20,true); view.setUint16(8,0x0800,true); view.setUint16(10,0,true);
  view.setUint16(12,date.dosTime,true); view.setUint16(14,date.dosDate,true); view.setUint32(16,crc,true); view.setUint32(20,size,true); view.setUint32(24,size,true);
  view.setUint16(28,nameBytes.length,true); view.setUint16(30,0,true); view.setUint16(32,0,true); view.setUint16(34,0,true); view.setUint16(36,0,true); view.setUint32(38,0,true); view.setUint32(42,offset,true);
  out.set(nameBytes,46); return out;
}
function buildMediaZip(files){
  if(files.length>65535) throw new Error('TOO_MANY_FILES');
  const localParts=[],centralParts=[];
  let offset=0,centralSize=0;
  for(const file of files){
    const data=file.bytes instanceof Uint8Array?file.bytes:new Uint8Array(file.bytes);
    if(data.byteLength>0xffffffff) throw new Error('FILE_TOO_LARGE');
    const nameBytes=MEDIA_ZIP_ENCODER.encode(String(file.name||'fitxer.bin').replace(/^\/+/,''));
    const crc=mediaCrc32(data),stamp=mediaZipDosDateTime(file.modifiedAt?new Date(file.modifiedAt):new Date());
    const local=mediaZipLocalHeader(nameBytes,data.byteLength,crc,stamp);
    if(offset+local.byteLength+data.byteLength>0xffffffff) throw new Error('ARCHIVE_TOO_LARGE');
    const central=mediaZipCentralHeader(nameBytes,data.byteLength,crc,stamp,offset);
    localParts.push(local,data); centralParts.push(central); centralSize+=central.byteLength; offset+=local.byteLength+data.byteLength;
  }
  if(offset+centralSize>0xffffffff) throw new Error('ARCHIVE_TOO_LARGE');
  const end=new Uint8Array(22),view=new DataView(end.buffer);
  view.setUint32(0,0x06054b50,true); view.setUint16(4,0,true); view.setUint16(6,0,true); view.setUint16(8,files.length,true); view.setUint16(10,files.length,true);
  view.setUint32(12,centralSize,true); view.setUint32(16,offset,true); view.setUint16(20,0,true);
  return new Blob([...localParts,...centralParts,end],{type:'application/zip'});
}
function downloadMediaBlob(blob,filename){
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url; a.download=filename; a.style.display='none'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}
function collectHistoricMediaForArchive(){
  const seen=new Set(),rows=[];
  for(const item of content.historicItems||[]){
    const period=historicPeriodById(item.periodId);
    const periodPart=mediaArchiveSafePart(period?.years||'sense-periode','sense-periode');
    const yearPart=mediaArchiveSafePart(item.year||'sense-any','sense-any');
    const titlePart=mediaArchiveSafePart(item.title||'historic','historic');
    historicImages(item).forEach((url,index)=>{
      if(!url||seen.has(url)) return; seen.add(url);
      rows.push({url,basePath:`HISTORIC/${periodPart}/${yearPart}/${yearPart}-${titlePart}-${String(index+1).padStart(2,'0')}`,modifiedAt:item.createdAt||content.updatedAt||null});
    });
  }
  return rows;
}
function collectCartellsMediaForArchive(){
  const seen=new Set(),rows=[];
  for(const item of (content.hemerotecaItems||[]).filter(entry=>entry?.type==='cartells')){
    const yearPart=mediaArchiveSafePart(item.year||'sense-any','sense-any');
    const titlePart=mediaArchiveSafePart(item.title||'cartell','cartell');
    hemerotecaImages(item).forEach((url,index)=>{
      if(!url||seen.has(url)) return; seen.add(url);
      rows.push({url,basePath:`CARTELLS/${yearPart}/${yearPart}-${titlePart}-${String(index+1).padStart(2,'0')}`,modifiedAt:item.createdAt||content.updatedAt||null});
    });
  }
  return rows;
}
function setMediaArchiveBusy(busy,status=''){
  mediaArchiveState.busy=!!busy;
  ['downloadHistoricMediaBtn','downloadCartellsMediaBtn'].forEach(id=>{const btn=document.getElementById(id);if(btn)btn.disabled=!!busy;});
  const statusEl=document.getElementById('mediaArchiveStatus'); if(statusEl) statusEl.textContent=status||'';
}
async function downloadAdminMediaArchive(kind){
  if(!editorIsAdmin()||!currentSession){ showToast('Aquesta descàrrega està reservada al USER ADMIN'); return; }
  if(mediaArchiveState.busy) return;
  const isHistoric=kind==='historic';
  const rows=isHistoric?collectHistoricMediaForArchive():collectCartellsMediaForArchive();
  if(!rows.length){ showToast(isHistoric?'No hi ha fotografies a HISTÒRIC':'No hi ha CARTELLS per descarregar'); return; }
  setMediaArchiveBusy(true,`Preparant 0/${rows.length}…`);
  const files=[],errors=[],usedPaths=new Set();
  try{
    for(let i=0;i<rows.length;i++){
      const row=rows[i]; setMediaArchiveBusy(true,`Descarregant ${i+1}/${rows.length}…`);
      try{
        const response=await fetch(row.url,{cache:'no-store'});
        if(!response.ok) throw new Error(`HTTP_${response.status}`);
        const blob=await response.blob();
        const ext=mediaArchiveExtension(blob,row.url);
        const path=mediaArchiveUniquePath(`${row.basePath}.${ext}`,usedPaths);
        files.push({name:path,bytes:new Uint8Array(await blob.arrayBuffer()),modifiedAt:row.modifiedAt});
      }catch(error){
        console.error('media archive download failed',row.url,error);
        errors.push(`${row.basePath} -> ${row.url} -> ${error?.message||String(error)}`);
      }
    }
    if(errors.length){
      const report=MEDIA_ZIP_ENCODER.encode(`BANDA DE LA CALA · FITXERS NO DESCARREGATS\n\n${errors.join('\n')}\n`);
      files.push({name:'_ERRORS.txt',bytes:report,modifiedAt:new Date()});
    }
    if(!files.length) throw new Error('NO_FILES_DOWNLOADED');
    setMediaArchiveBusy(true,'Generant ZIP…');
    const zip=buildMediaZip(files);
    const stamp=new Date();
    const date=`${stamp.getFullYear()}-${String(stamp.getMonth()+1).padStart(2,'0')}-${String(stamp.getDate()).padStart(2,'0')}`;
    const filename=isHistoric?`BANDA_DE_LA_CALA_HISTORIC_MEDIA_${date}.zip`:`BANDA_DE_LA_CALA_CARTELLS_${date}.zip`;
    downloadMediaBlob(zip,filename);
    const okCount=files.length-(errors.length?1:0);
    setMediaArchiveBusy(false,errors.length?`ZIP creat · ${okCount}/${rows.length} fitxers · revisa _ERRORS.txt`:`ZIP creat · ${okCount} fitxers`);
    showToast(errors.length?`ZIP creat amb ${errors.length} incidències`:`ZIP creat · ${okCount} fitxers`);
  }catch(error){
    console.error(error); setMediaArchiveBusy(false,'');
    showToast('No s’ha pogut generar el ZIP');
  }
}

function bindSystem(){
  $('#homeCardsTextForm')?.addEventListener('submit',event=>{
    event.preventDefault();
    const value=id=>String(document.getElementById(id)?.value||'').trim();
    content.settings=content.settings||{};
    content.settings.homeCards={
      calendar:{title:value('homeCardCalendarTitle'),text:value('homeCardCalendarText')},
      history:{title:value('homeCardHistoryTitle'),text:value('homeCardHistoryText')},
      playlist:{title:value('homeCardPlaylistTitle'),text:value('homeCardPlaylistText')},
      games:{title:value('homeCardGamesTitle'),authenticatedText:value('homeCardGamesAuthenticatedText'),guestText:value('homeCardGamesGuestText'),inactiveText:value('homeCardGamesInactiveText')},
      user:{guestTitle:value('homeCardUserGuestTitle'),authenticatedText:value('homeCardUserAuthenticatedText'),guestText:value('homeCardUserGuestText')}
    };
    save(content,'Textos de HOME actualitzats');
  });
  $('#exportJsonBtn').onclick=()=>{BandaStore.exportJson(content);showToast('Còpia JSON creada');};
  $('#importJsonBtn').onclick=()=>$('#importJsonInput').click();
  $('#importJsonInput').addEventListener('change',event=>{
    const file=event.target.files?.[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{try{content=BandaStore.normalize(JSON.parse(reader.result));save(content,'Dades importades');resetEventForm();resetTrackForm();resetDresscodeForm();resetHistoricForm();resetHemerotecaForm();}catch(error){showToast('El fitxer JSON no és vàlid');}event.target.value='';};
    reader.readAsText(file);
  });
  $('#downloadPublishedBtn').onclick=()=>{BandaStore.exportPublishedJs(content);showToast('Còpia content-published.js creada');};
  $('#savePublishedBtn').onclick=savePublishedFile;
  $('#migrateToSupabaseBtn').onclick=migrateCurrentContentToSupabase;
  $('#reloadSupabaseBtn').onclick=reloadSupabaseContent;
  $('#resetLocalBtn').onclick=()=>{
    if(!confirm('Vols netejar l’antic esborrany local d’aquest navegador? El contingut compartit no es tocarà.'))return;
    BandaStore.clearLocal();
    showToast('Memòria local netejada');
  };
  $('#downloadHistoricMediaBtn')?.addEventListener('click',()=>downloadAdminMediaArchive('historic'));
  $('#downloadCartellsMediaBtn')?.addEventListener('click',()=>downloadAdminMediaArchive('cartells'));
}
function roleEditorLabel(role){
  return ({admin:'USER ADMIN',gestor:'USER GESTOR',standard:'USER STANDARD'})[role] || String(role||'USER').toUpperCase();
}

function canDeleteUserProfile(profile){
  if(!profile || !currentSession || !currentProfile) return false;
  // Ningú pot esborrar el seu propi compte des de la llista.
  if(profile.user_id===currentSession.user.id) return false;
  // ADMIN pot gestionar qualsevol altre usuari, inclosos altres ADMIN.
  if(currentProfile.role==='admin') return ['admin','gestor','standard'].includes(profile.role);
  // GESTOR només pot eliminar STANDARD; mai ADMIN ni altres GESTOR.
  if(currentProfile.role==='gestor') return profile.role==='standard';
  return false;
}

function renderUsers(){
  const list=$('#usersList'); if(!list) return;
  $('#usersCount').textContent=userProfiles.length;
  list.innerHTML=userProfiles.length?userProfiles.map(profile=>{
    const deleteBtn=canDeleteUserProfile(profile)?`<button class="user-strip-delete" data-delete-user="${esc(profile.user_id)}" title="Eliminar usuari" aria-label="Eliminar ${esc(upperUserName(profile.name)||profile.email||'usuari')}">×</button>`:'';
    const bubbles=[];
    if(profile.must_change_password) bubbles.push('<span class="user-info-bubble pending">PEND. CONF.</span>');
    return `<article class="list-item user-list-item user-strip"><div class="user-strip-main"><div class="user-strip-line1"><strong>${esc(upperUserName(profile.name)||'SENSE NOM')}</strong><span class="user-strip-role">${esc(roleEditorLabel(profile.role))}</span></div><span class="user-strip-email">${esc(profile.email||'')}</span></div><div class="user-strip-actions">${bubbles.join('')}${deleteBtn}</div></article>`;
  }).join(''):'<div class="empty-state">Encara no hi ha usuaris.</div>';
  $$('[data-delete-user]').forEach(btn=>btn.onclick=()=>deleteManagedUserFromEditor(btn.dataset.deleteUser));
  fitManagedListToFour(list);
}

async function deleteManagedUserFromEditor(userId){
  if(!editorCanWrite || !userId) return;
  const profile=userProfiles.find(row=>row.user_id===userId);
  if(!profile || !canDeleteUserProfile(profile)) return;
  const label=upperUserName(profile.name)||profile.email||'aquest usuari';
  const ok=confirm(`Vols eliminar completament ${label}?\n\nS'esborrarà el seu accés i el seu perfil. Aquesta acció no es pot desfer.`);
  if(!ok) return;
  try{
    showToast('Eliminant usuari…');
    await BandaSupabase.deleteManagedUser(userId);
    await loadUsers();
    showToast('Usuari eliminat completament');
  }catch(error){
    console.error(error);
    const message=String(error?.message||'No s’ha pogut eliminar l’usuari.');
    if(/ADMIN_DELETE_REQUIRES_ADMIN/i.test(message)) showToast('Només un USER ADMIN pot eliminar un altre USER ADMIN');
    else if(/GESTOR_CAN_ONLY_DELETE_STANDARD/i.test(message)) showToast('Un USER GESTOR només pot eliminar USER STANDARD');
    else if(/CANNOT_DELETE_SELF/i.test(message)) showToast('No pots eliminar el teu propi usuari');
    else showToast(`Error eliminant usuari: ${message}`);
  }
}

async function loadUsers(){
  if(!editorCanWrite) return;
  try{
    userProfiles=await BandaSupabase.listProfiles();
    renderUsers();
  }catch(error){ console.error(error); if($('#usersList')) $('#usersList').innerHTML='<div class="empty-state">No s’han pogut carregar els usuaris.</div>'; }
}

function bindUsers(){
  const accountsCard=$('#usersAccountsCard');
  const accountsToggle=$('#usersAccountsToggle');
  const mobileAccountsQuery=window.matchMedia?.('(max-width:780px)');
  const syncAccountsDisclosure=()=>{
    if(!accountsCard||!accountsToggle) return;
    const isMobile=!!mobileAccountsQuery?.matches;
    accountsToggle.setAttribute('aria-expanded',isMobile?String(!accountsCard.classList.contains('is-collapsed-mobile')):'true');
  };
  const toggleAccounts=()=>{
    if(!accountsCard||!accountsToggle||!mobileAccountsQuery?.matches) return;
    accountsCard.classList.toggle('is-collapsed-mobile');
    syncAccountsDisclosure();
    if(!accountsCard.classList.contains('is-collapsed-mobile')) requestAnimationFrame(()=>fitManagedListToFour($('#usersList')));
  };
  accountsToggle?.addEventListener('click',toggleAccounts);
  accountsToggle?.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleAccounts();}
  });
  mobileAccountsQuery?.addEventListener?.('change',syncAccountsDisclosure);
  syncAccountsDisclosure();

  $('#createUserForm')?.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!editorCanWrite) return;
    const name=$('#newUserName').value.trim().toLocaleUpperCase('ca-ES');
    const email=$('#newUserEmail').value.trim().toLowerCase();
    const role=$('#newUserRole').value;
    const status=$('#createUserStatus'), btn=$('#createUserBtn');
    if(!name||!email||!['gestor','standard'].includes(role)){status.textContent='Revisa les dades del nou usuari.';return;}
    status.textContent='Creant usuari i enviant invitació…'; btn.disabled=true;
    try{
      const result=await BandaSupabase.createManagedUser({name,email,role});
      status.textContent=result.replacedPendingUser
        ? 'Compte pendent reiniciat. S’ha enviat una nova invitació perquè l’usuari triï la seva contrasenya.'
        : 'Usuari creat correctament. Invitació enviada: l’usuari triarà la seva pròpia contrasenya.';
      $('#newUserName').value=''; $('#newUserEmail').value=''; $('#newUserRole').value='standard';
      await loadUsers();
    }catch(error){
      console.error(error);
      const message=String(error?.message||'No s’ha pogut crear l’usuari.');
      if(/rate|limit/i.test(message)) status.textContent='Límit temporal d’enviament d’emails. No s’ha creat el compte; torna-ho a provar més tard.';
      else if(/EMAIL_ALREADY_REGISTERED|already registered/i.test(message)) status.textContent='Aquest email ja correspon a un usuari confirmat. Revisa el compte existent.';
      else if(/already|exists/i.test(message)) status.textContent='Aquest email ja existeix al sistema de comptes. Revisa l’usuari existent.';
      else if(/function|404|not found/i.test(message)) status.textContent='La funció create-band-user no està desplegada/actualitzada. Desplega la versió v0.29 inclosa al paquet.';
      else status.textContent=`ERROR: ${message}`;
    }finally{btn.disabled=false;}
  });
}

function renderAll(){ renderDashboard(); renderHomeEditor(); renderEvents(); renderEventDresscodeOptions($('#eventDresscode')?.value||''); renderDresscodes(); renderTracks(); renderDemos(); renderAudioLibrary(); renderHistoric(); renderHemerotecaEditor(); renderArchiveReview(); renderMinigames(); renderSystem(); renderUsers(); }
function bindExternalUpdates(){ window.addEventListener('banda-content-changed',event=>{ if(supabaseActive) return; content=BandaStore.normalize(event.detail);renderAll();}); }

function setEditorAccess({session=null,profile=null}={}){
  currentSession=session||null;
  currentProfile=profile||null;
  editorGuestMode=false;
  editorCanWrite=!!(currentSession && ['admin','gestor'].includes(currentProfile?.role));
  const gate=$('#editorLoginGate'), shell=$('#editorShell');
  if(editorCanWrite){
    gate?.classList.add('is-hidden');
    if(shell){shell.setAttribute('aria-hidden','false');shell.classList.add('is-ready');shell.classList.remove('editor-readonly');}
  }else{
    gate?.classList.remove('is-hidden');
    if(shell){shell.setAttribute('aria-hidden','true');shell.classList.remove('is-ready','editor-readonly');}
  }
  $('#editorUserEmail').textContent=currentSession?.user?.email || 'Sense sessió';
  syncAdminOnlyUi();
  const badge=$('#editorAccessBadge');
  if(badge){badge.textContent=editorCanWrite?`GESTIÓ · ${String(currentProfile?.role||'').toUpperCase()}`:'—';badge.classList.toggle('write',editorCanWrite);badge.classList.remove('readonly');}
}

function showEditorGate(status='Introdueix les teves credencials de gestió.'){
  currentSession=null; currentProfile=null; editorGuestMode=false; editorCanWrite=false;
  const gate=$('#editorLoginGate'), shell=$('#editorShell');
  gate?.classList.remove('is-hidden');
  if(shell){shell.setAttribute('aria-hidden','true');shell.classList.remove('is-ready','editor-readonly');}
  $('#editorUserEmail').textContent='Sense sessió';
  syncAdminOnlyUi();
  if($('#loginStatus')) $('#loginStatus').textContent=cleanTechnicalUiText(status);
}

function updatePermissionUi(){
  if(!editorCanWrite) return;
  const saveState=$('#saveState'); if(saveState && saveState.textContent==='PENDENT D’AUTORITZACIÓ') saveState.textContent='DADES CARREGADES';
  const storageBadge=$('#storageBadge'); if(storageBadge) storageBadge.textContent='SUPABASE';
  const systemProtocol=$('#systemProtocol'); if(systemProtocol) systemProtocol.textContent=editorIsAdmin()?'SUPABASE · gestió autenticada':'SINCRONITZACIÓ CENTRAL · gestió autenticada';
  syncAdminOnlyUi();
}

async function activateSupabaseEditor(session){
  currentSession=session||null;
  if(!session) return showEditorGate();
  try{
    const profile=await BandaSupabase.getMyProfile();
    if(!profile || !['admin','gestor'].includes(profile.role)){
      showEditorGate('ACCÉS DENEGAT · L’EDITOR és exclusiu per a USER ADMIN i USER GESTOR.');
      return;
    }
    setEditorAccess({session,profile});
    const remote=await BandaSupabase.loadContent();
    if(remote && contentHasUsefulData(remote)){
      content=BandaStore.normalize(remote);
      BandaStore.cacheRemote?.(content);
      supabaseActive=true; migrationPending=false;
      markSaved('DESAT A SUPABASE');
    }else if(contentHasUsefulData(legacyLocalContent)){
      if(!editorIsAdmin()){
        showEditorGate('Cal que el USER ADMIN prepari el contingut compartit abans que un USER GESTOR pugui editar.');
        return;
      }
      content=BandaStore.normalize(legacyLocalContent);
      supabaseActive=false; migrationPending=true;
      markSaved('CAL MIGRAR A SUPABASE');
      showToast('Supabase està buit · migra les dades actuals des de SISTEMA');
    }else{
      if(!editorIsAdmin()){
        showEditorGate('Cal que el USER ADMIN inicialitzi el contingut compartit abans que un USER GESTOR pugui editar.');
        return;
      }
      content=BandaStore.normalize(remote||BandaStore.defaults());
      content.settings=content.settings||{};
      content.settings.supabaseInitialized=true;
      content=await BandaSupabase.saveContent(content);
      BandaStore.cacheRemote?.(content);
      supabaseActive=true; migrationPending=false;
      markSaved('DESAT A SUPABASE');
    }
    renderAll(); updatePermissionUi(); await refreshArchivePendingBadge(); await loadUsers();
    BandaSupabase.subscribeContent(next=>{
      if(!supabaseActive || !contentHasUsefulData(next)) return;
      content=BandaStore.normalize(next); BandaStore.cacheRemote?.(content); renderAll(); updatePermissionUi(); markSaved('ACTUALITZAT DES DE SUPABASE');
    });
  }catch(error){
    console.error(error);
    showEditorGate('No s’ha pogut validar l’accés a l’EDITOR. Revisa la connexió amb Supabase.');
  }
}

function bindEditorAuth(){
  $('#editorLoginForm')?.addEventListener('submit',async event=>{
    event.preventDefault();
    const email=$('#loginEmail').value.trim(), password=$('#loginPassword').value;
    $('#loginStatus').textContent='Entrant…';
    try{
      const session=await BandaSupabase.signIn(email,password);
      $('#loginPassword').value='';
      await activateSupabaseEditor(session);
    }catch(error){console.error(error);$('#loginStatus').textContent='Email o contrasenya incorrectes, o el compte no té accés a l’EDITOR.';}
  });

  $('#editorLogoutBtn')?.addEventListener('click',async()=>{
    if(currentSession){try{await BandaSupabase.signOut();}catch(_error){}}
    supabaseActive=false; currentSession=null; currentProfile=null; editorGuestMode=false; editorCanWrite=false; userProfiles=[];
    showEditorGate('Sessió tancada.');
  });
}

async function initEditorBackend(){
  if(!window.BandaSupabase?.enabled){showEditorGate('El servei de dades no està configurat. L’EDITOR necessita connexió autenticada.');return;}
  try{
    const session=await BandaSupabase.session();
    if(session) await activateSupabaseEditor(session);
    else showEditorGate('Introdueix les teves credencials de gestió.');
  }catch(error){console.error(error);showEditorGate('No s’ha pogut connectar amb el servei de dades.');}
}

function editorIsStandalone(){
  try{
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      window.navigator.standalone === true;
  }catch(_error){ return window.navigator.standalone === true; }
}
function editorDeviceInfo(){
  const ua=String(navigator.userAgent||'');
  const ios=/iphone|ipad|ipod/i.test(ua) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  const android=/android/i.test(ua);
  const windows=/windows nt/i.test(ua);
  const mac=!ios && /macintosh|mac os x/i.test(ua);
  const samsung=/samsungbrowser/i.test(ua);
  const edge=/edg\//i.test(ua);
  const firefox=/firefox\//i.test(ua) || /fxios/i.test(ua);
  const chrome=!edge && !samsung && (/chrome\//i.test(ua) || /crios/i.test(ua));
  const safari=!chrome && !edge && !firefox && /safari\//i.test(ua);
  return {ios,android,windows,mac,samsung,edge,firefox,chrome,safari,os:android?'Android':ios?'iOS / iPadOS':windows?'Windows':mac?'macOS':'Dispositiu',browser:samsung?'Samsung Internet':edge?'Microsoft Edge':chrome?'Chrome':firefox?'Firefox':safari?'Safari':'Navegador'};
}
async function editorInstalledRelatedApps(){
  if(typeof navigator.getInstalledRelatedApps!=='function') return {supported:false,apps:[]};
  try{ const apps=await navigator.getInstalledRelatedApps(); return {supported:true,apps:Array.isArray(apps)?apps:[]}; }
  catch(_error){ return {supported:true,apps:[]}; }
}
async function editorInstallSignals(){
  const related=await editorInstalledRelatedApps();
  let swControlled=!!navigator.serviceWorker?.controller,swReady=false,manifestOk=false;
  try{
    if('serviceWorker' in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      const expectedScope=new URL('./',location.href).href;
      swReady=regs.some(reg=>String(reg.scope||'')===expectedScope);
    }
  }catch(_error){}
  try{
    const manifest=document.querySelector('link[rel="manifest"]')?.href;
    if(manifest){ const response=await fetch(manifest,{cache:'no-store'}); manifestOk=response.ok; }
  }catch(_error){}
  return {standalone:editorIsStandalone(),nativeReady:!!editorInstallPrompt,relatedSupported:related.supported,relatedApps:related.apps,relatedInstalled:related.apps.some(item=>item?.platform==='webapp'||String(item?.id||'')==='/banda-de-la-cala-editor'),swControlled,swReady,manifestOk,secure:window.isSecureContext===true};
}
function editorInstallTechMarkup(signals){
  const yn=value=>value?'SÍ':'NO';
  const related=signals.relatedSupported?(signals.relatedInstalled?'INSTAL·LACIÓ DETECTADA':'CAP INSTAL·LACIÓ DETECTADA'):'NO DISPONIBLE EN AQUEST NAVEGADOR';
  return `<dl><div><dt>Mode EDITOR real</dt><dd>${yn(signals.standalone)}</dd></div><div><dt>Diàleg natiu</dt><dd>${signals.nativeReady?'DISPONIBLE':'NO DISPONIBLE'}</dd></div><div><dt>Instal·lació relacionada</dt><dd>${related}</dd></div><div><dt>Manifest</dt><dd>${signals.manifestOk?'OK':'NO VERIFICAT'}</dd></div><div><dt>Service Worker</dt><dd>${signals.swReady||signals.swControlled?'OK':'NO VERIFICAT'}</dd></div><div><dt>HTTPS</dt><dd>${yn(signals.secure)}</dd></div></dl>`;
}
function editorInstallHelpMarkup(reason='manual',signals={}){
  const d=editorDeviceInfo();
  let title='Instal·lació al dispositiu',html='',action='',label='';
  if(signals.standalone){
    title='EDITOR instal·lat'; html='<p>Perfecte. Estàs executant <strong>BANDA DE LA CALA · EDITOR</strong> com a aplicació instal·lada.</p>';
  }else if(d.ios){
    title='Instal·lar EDITOR';
    html=d.safari?'<p>Només has de fer això:</p><ol><li>Prem <strong>Compartir</strong> a Safari.</li><li>Tria <strong>Afegir a la pantalla d’inici</strong>.</li><li>Activa <strong>Obrir com a app web</strong>, si apareix.</li><li>Prem <strong>Afegir</strong>.</li></ol>':'<p>Obre l’EDITOR amb <strong>Safari</strong> i tria <strong>Compartir → Afegir a la pantalla d’inici</strong>.</p>';
  }else if(signals.nativeReady){
    title='Tot preparat'; html='<p>El dispositiu ja està preparat per instal·lar <strong>BANDA DE LA CALA · EDITOR</strong>.</p>'; action='native'; label='INSTAL·LAR ARA';
  }else if(d.android){
    title='CONTINUA DES DEL NAVEGADOR';
    html='<p>Pots continuar utilitzant l’EDITOR des del navegador.</p><p>Si vols provar la instal·lació alternativa d’Android, consulta la pàgina d’instal·lació.</p>';
    action='continue'; label='CONTINUAR A L’EDITOR';
  }else if(d.windows||d.mac){
    title='Instal·lar EDITOR';
    html=(d.chrome||d.edge)?'<p>Obre el menú del navegador o la icona d’instal·lació de la barra d’adreces i tria <strong>Instal·lar EDITOR</strong>.</p>':(d.safari&&d.mac?'<p>A Safari, utilitza <strong>Fitxer → Afegir al Dock</strong>.</p>':'<p>Utilitza l’opció d’instal·lació del navegador.</p>');
  }else html='<p>Utilitza l’opció <strong>Instal·lar aplicació</strong> del navegador.</p>';
  return {title,html,action,label,device:`Dispositiu detectat: ${d.os} · ${d.browser} · ${signals.standalone?'executant com a EDITOR':signals.nativeReady?'instal·lació preparada':'mode navegador'}`};
}
async function showEditorInstallHelp(reason='manual'){
  const modal=$('#editorInstallHelp'); if(!modal) return;
  const title=modal.querySelector('h2'),device=$('#editorInstallHelpDevice'),text=$('#editorInstallHelpText'),primary=$('#editorInstallPrimaryAction'),tech=$('#editorInstallTech');
  if(title) title.textContent='Comprovant instal·lació…';
  if(device) device.textContent='Un moment…';
  if(text) text.innerHTML='<p>Estem revisant automàticament aquest dispositiu.</p>';
  if(primary) primary.hidden=true;
  modal.hidden=false;
  const signals=await editorInstallSignals();
  const info=editorInstallHelpMarkup(reason,signals);
  if(title) title.textContent=info.title;
  if(device) device.textContent=info.device;
  if(text) text.innerHTML=info.html;
  if(tech) tech.innerHTML=editorInstallTechMarkup(signals);
  if(primary){ primary.hidden=!info.action; primary.disabled=false; primary.textContent=info.label||'CONTINUAR'; primary.dataset.action=info.action||''; }
  const alt=$('#editorInstallAndroidAlternative'); if(alt) alt.hidden=!(editorDeviceInfo().android&&!signals.standalone&&!signals.nativeReady);
}
function closeEditorInstallHelp(){ const modal=$('#editorInstallHelp'); if(modal) modal.hidden=true; }
function syncEditorInstallButton(){
  const btn=$('#editorInstallBtn'),cardBtn=$('#editorInstallCardBtn'),card=$('#editorInstallCard'),status=$('#editorInstallCardStatus');
  const installed=editorIsStandalone();
  if(btn) btn.hidden=installed;
  if(card) card.hidden=installed;
  if(installed) return;
  [btn,cardBtn].filter(Boolean).forEach(target=>{target.disabled=false;target.classList.toggle('install-ready',!!editorInstallPrompt);target.textContent='INSTAL·LAR EDITOR';target.title=editorInstallPrompt?'Instal·lació disponible':'Obrir assistent d’instal·lació';});
  if(status) status.textContent=editorInstallPrompt?'Preparat · prem INSTAL·LAR EDITOR.':'Prem INSTAL·LAR EDITOR.';
}
async function waitForNativeEditorInstallPrompt(timeout=1500){
  if(editorInstallPrompt) return editorInstallPrompt;
  return await new Promise(resolve=>{
    let done=false,timer=0;
    const finish=value=>{if(done)return;done=true;clearTimeout(timer);window.removeEventListener('beforeinstallprompt',onPrompt);resolve(value||editorInstallPrompt||null);};
    const onPrompt=event=>{event.preventDefault();editorInstallPrompt=event;syncEditorInstallButton();finish(event);};
    window.addEventListener('beforeinstallprompt',onPrompt,{once:true});
    timer=setTimeout(()=>finish(editorInstallPrompt),timeout);
  });
}
async function requestNativeEditorInstall(){
  const prompt=editorInstallPrompt||await waitForNativeEditorInstallPrompt();
  if(!prompt) return false;
  try{prompt.prompt();const choice=await prompt.userChoice;if(editorInstallPrompt===prompt)editorInstallPrompt=null;syncEditorInstallButton();return choice?.outcome==='accepted';}
  catch(error){console.warn('EDITOR install',error);return false;}
}
async function repairEditorInstallEnvironment(){
  const primary=$('#editorInstallPrimaryAction');
  if(primary){primary.disabled=true;primary.textContent='PREPARANT…';}
  try{
    if('serviceWorker' in navigator){const regs=await navigator.serviceWorker.getRegistrations();const expectedScope=new URL('./',location.href).href;for(const reg of regs){if(String(reg.scope||'')===expectedScope){try{await reg.update();}catch(_error){}}}}
    if('caches' in window){const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('banda-de-la-cala-editor-')&&key!=='banda-de-la-cala-editor-v0.110').map(key=>caches.delete(key)));}
  }catch(_error){}
  const prompt=await waitForNativeEditorInstallPrompt(1800);
  if(prompt){await showEditorInstallHelp('native-ready');return;}
  try{sessionStorage.setItem('bdc-editor-install-assistant','1');}catch(_error){}
  location.reload();
}
async function handleEditorInstallPrimary(){
  const action=$('#editorInstallPrimaryAction')?.dataset.action||'';
  if(action==='native'){
    const accepted=await requestNativeEditorInstall();
    if(!accepted) await showEditorInstallHelp('manual');
  }else if(action==='alternative'){ window.location.href=new URL('../install/?target=editor',location.href).href; }else if(action==='continue') closeEditorInstallHelp();
  else if(action==='repair') await repairEditorInstallEnvironment();
  else if(action==='recheck'){
    const prompt=await waitForNativeEditorInstallPrompt(1200);
    await showEditorInstallHelp(prompt?'native-ready':'after-repair');
  }
}
async function launchEditorInstall(){
  if(editorIsStandalone()){await showEditorInstallHelp('installed');return;}
  const d=editorDeviceInfo();
  if(d.ios){await showEditorInstallHelp('ios');return;}
  if(editorInstallPrompt){const accepted=await requestNativeEditorInstall();if(!accepted)await showEditorInstallHelp('manual');return;}
  const prompt=await waitForNativeEditorInstallPrompt(900);
  if(prompt){const accepted=await requestNativeEditorInstall();if(!accepted)await showEditorInstallHelp('manual');return;}
  await showEditorInstallHelp('manual');
}
function bindEditorPwaInstall(){
  const btn=$('#editorInstallBtn'),cardBtn=$('#editorInstallCardBtn');
  if(!btn&&!cardBtn)return;
  syncEditorInstallButton();
  btn?.addEventListener('click',launchEditorInstall);
  cardBtn?.addEventListener('click',launchEditorInstall);
  $('#editorInstallPrimaryAction')?.addEventListener('click',handleEditorInstallPrimary);
  $('#editorInstallAndroidAlternative')?.addEventListener('click',()=>{window.location.href=new URL('../install/?target=editor',location.href).href;});
  $('#closeEditorInstallHelp')?.addEventListener('click',closeEditorInstallHelp);
  $('#editorInstallHelp')?.addEventListener('click',event=>{if(event.target===$('#editorInstallHelp'))closeEditorInstallHelp();});
  window.addEventListener('appinstalled',()=>{editorInstallPrompt=null;showToast('EDITOR instal·lat');syncEditorInstallButton();showEditorInstallHelp('installed');});
  ['standalone','fullscreen','minimal-ui','window-controls-overlay'].forEach(mode=>window.matchMedia?.(`(display-mode: ${mode})`)?.addEventListener?.('change',syncEditorInstallButton));
  window.addEventListener('pageshow',syncEditorInstallButton);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncEditorInstallButton();});
  try{if(sessionStorage.getItem('bdc-editor-install-assistant')==='1'){sessionStorage.removeItem('bdc-editor-install-assistant');setTimeout(()=>showEditorInstallHelp('after-repair'),900);}}catch(_error){}
}
async function registerEditorSW(){
  if(location.protocol==='file:' || !('serviceWorker' in navigator)) return;
  try{
    const root=new URL('../',location.href);
    const swUrl=new URL('editor/sw.js?v=0.110',root).href;
    const scopeUrl=new URL('editor/',root).href;
    const reg=await navigator.serviceWorker.register(swUrl,{scope:scopeUrl,updateViaCache:'none'});
    try{ await reg.update(); }catch(_error){}
  }catch(error){ console.warn('EDITOR SW',error); }
}

function init(){ bootIdentity(); bindNavigation(); bindHomeEditor(); bindEventForm(); bindDresscodes(); bindTrackForm(); bindDemos(); bindAudioLibrary(); bindHistoric(); bindHemerotecaEditor(); bindArchiveReview(); bindMinigames(); bindSystem(); bindUsers(); bindExternalUpdates(); bindEditorAuth(); bindEditorPwaInstall(); registerEditorSW(); initManagedListViewports(); document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){renderEvents();renderDashboard();refreshArchivePendingBadge();}}); renderAll(); resetEventForm(); resetTrackForm(); resetDemoForm(); resetDresscodeForm(); resetHistoricForm(); resetHemerotecaForm(); initEditorBackend(); }
init();
