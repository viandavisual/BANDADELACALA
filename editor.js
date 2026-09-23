// PWA INSTALL v0.26 — patró estable de Disturbing Stories App.
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
let editingHistoricImages = [];
let pendingHemerotecaImages = [];
let editingHemerotecaImages = [];
let hemerotecaEditorFilter = 'all';

const DRESS_DEFS = [
  {key:'shirt', label:'CAMISA', options:[
    ['white_short','CAMISA BLANCA MÀNIGA CURTA','Camisa blanca màniga curta ⚪️'],
    ['white_long','CAMISA BLANCA MÀNIGA LLARGA','Camisa blanca màniga llarga ⚪️'],
    ['black','CAMISA NEGRA','Camisa negra ⚫️']
  ]},
  {key:'bottom', label:'PANTALÓ / FALDILLA', options:[
    ['suit_trousers','PANTALONS DEL TRATGE','Pantalons del tratge 👖'],
    ['skirt','FALDILLA DEL TRATGE','Faldilla del tratge ⚫️'],
    ['jeans','TEJANOS','Tejanos 👖']
  ]},
  {key:'footwear', label:'CALÇAT', options:[
    ['black','CALÇAT NEGRE (NI ESPORTIU NI CONVERSE)','Calçat negre, no esportiu, no Converse ⚫️⛔']
  ]},
  {key:'socks', label:'MITJONS', options:[
    ['black','MITJONS NEGRES','Mitjons negres ⚫️'],
    ['none','SENSE INDICACIÓ','']
  ]},
  {key:'tie', label:'CORBATA', options:[
    ['tie','CORBATA I PINZA','Corbata i pinza 👔'],
    ['none','SENSE CORBATA','Sense corbata']
  ]}
];
const DEFAULT_DRESS_PRESETS = {
  boys:{shirt:'white_short',bottom:'suit_trousers',footwear:'black',socks:'black',tie:'tie'},
  girls:{shirt:'white_short',bottom:'skirt',footwear:'black',socks:'none',tie:'tie'}
};

const views = {
  dashboard:{eyebrow:'CONTROL',title:'RESUM'},
  home:{eyebrow:'CONTINGUT',title:'HOME'},
  calendar:{eyebrow:'CONTINGUT',title:'CALENDARI'},
  dresscode:{eyebrow:'CONTINGUT',title:'DRESSCODE'},
  player:{eyebrow:'CONTINGUT',title:'PLAYER'},
  history:{eyebrow:'CONTINGUT',title:'HISTÒRIC'},
  games:{eyebrow:'CONTINGUT',title:'MINIJOCS'},
  users:{eyebrow:'GESTIÓ',title:'USUARIS'},
  system:{eyebrow:'CONFIGURACIÓ',title:'SISTEMA'}
};

function showToast(message){
  const toast=$('#toast'); toast.textContent=message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('show'),2800);
}
function markSaved(text='DESAT A SUPABASE'){ $('#saveState').textContent=text; clearTimeout(markSaved.timer); }
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
    if(error?.message==='STORAGE_QUOTA') showToast('No hi ha prou espai local. Migra les dades a Supabase.');
    else showToast('No s’han pogut desar els canvis');
    return false;
  }
}
function bootIdentity(){ $$('[data-app-name]').forEach(el=>el.textContent=CFG.appName||'BANDA DE LA CALA'); $$('[data-app-subtitle]').forEach(el=>el.textContent=CFG.subtitle||'L’Ametlla de Mar'); $$('[data-app-icon]').forEach(el=>el.src=CFG.appIcon||'assets/brand/app-icon.png'); $$('[data-app-version]').forEach(el=>el.textContent=CFG.version||window.BANDA_VERSION||'v0.26'); }
function switchEditorView(id){ if(!views[id]) id='dashboard'; $$('.editor-view').forEach(view=>view.classList.toggle('active',view.dataset.editorView===id)); $$('[data-editor-nav]').forEach(btn=>btn.classList.toggle('active',btn.dataset.editorNav===id)); $('#editorEyebrow').textContent=views[id].eyebrow; $('#editorTitle').textContent=views[id].title; const installBtn=$('#editorInstallBtn'); if(installBtn) installBtn.classList.toggle('view-hidden',id!=='dashboard'); window.scrollTo({top:0,behavior:'smooth'}); }
function bindNavigation(){ $$('[data-editor-nav]').forEach(btn=>btn.addEventListener('click',()=>switchEditorView(btn.dataset.editorNav))); $$('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>switchEditorView(btn.dataset.jump))); }
function formatDate(date){ if(!date) return 'Sense data'; const d=new Date(date+'T12:00:00'); return new Intl.DateTimeFormat('ca-ES',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(d).replace(/^./,c=>c.toUpperCase()); }

function renderDashboard(){
  const events=[...(content.events||[])].sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const tracks=content.tracks||[]; const now=new Date(); const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; const next=events.find(event=>event.date>=today);
  $('#statEvents').textContent=events.length; $('#statNextEvent').textContent=next?`${formatDate(next.date)} · ${next.title}`:'Cap activitat futura';
  $('#statDresscodes').textContent=(content.dresscodes||[]).length; $('#statTracks').textContent=tracks.length; $('#statVisibleTracks').textContent=`${tracks.filter(track=>track.visible!==false).length} visibles`; $('#statHistoric').textContent=(content.historicItems||[]).length;
}

function renderHomeEditor(){
  const src=content.settings?.homeHeroImage || CFG.logo || 'assets/brand/logo-banda-de-la-cala.png';
  const previewImage=$('#homeHeroPreview'); if(previewImage) previewImage.src=src;
  const mode=$('#homePreviewMode');
  if(mode) mode.textContent=window.matchMedia('(max-width: 780px)').matches?'MOBILE · MATEIXA COMPOSICIÓ DE L’APP':'DESKTOP · MATEIXA COMPOSICIÓ DE L’APP';
}
async function compressImage(file){
  const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=dataUrl;});
  const maxW=1600,maxH=1000,scale=Math.min(1,maxW/img.width,maxH/img.height); const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(img.width*scale)); canvas.height=Math.max(1,Math.round(img.height*scale));
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height); return canvas.toDataURL('image/jpeg',0.84);
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
      let imageSrc=compressed;
      if(editorCanWrite && supabaseActive && currentSession){
        showToast('Pujant imatge de HOME…');
        imageSrc=(await BandaSupabase.uploadDataUrl('app-images',compressed,'home','home-hero')).url;
      }
      content.settings=content.settings||{}; content.settings.homeHeroImage=imageSrc;
      save(content,'Imatge de HOME actualitzada');
    }catch(error){ console.error(error); showToast('No s’ha pogut processar o pujar la imatge'); }
    event.target.value='';
  });
  $('#clearHomeHero').onclick=()=>{ content.settings=content.settings||{}; content.settings.homeHeroImage=''; save(content,'Imatge per defecte restaurada'); };
}

function syncEventFormVisibility(){
  const isRehearsal=$('#eventType').value==='ASSAIG'; $('#rehearsalTitleWrap').hidden=!isRehearsal; $('#freeTitleWrap').hidden=isRehearsal;
  $('#eventTitleDetailWrap').hidden=!isRehearsal || $('#eventTitlePreset').value!=='ASSAIG PARCIAL CONCRET';
  $('#eventPlaceDetailWrap').hidden=$('#eventPlacePreset').value!=='ALTRES';
}
function resetEventForm(){
  $('#eventForm').reset(); $('#eventId').value=''; $('#eventType').value='ASSAIG'; $('#eventTitlePreset').value='ASSAIG GENERAL'; $('#eventTime').value='21:30'; $('#eventPlacePreset').value='LOCAL SOCIAL'; $('#eventFormTitle').textContent='Nou esdeveniment'; syncEventFormVisibility();
}
function eventTitleFromForm(){
  if($('#eventType').value!=='ASSAIG') return $('#eventFreeTitle').value.trim();
  const preset=$('#eventTitlePreset').value; if(preset==='ASSAIG PARCIAL CONCRET'){ const detail=$('#eventTitleDetail').value.trim(); return detail?`${preset} · ${detail}`:preset; } return preset;
}
function eventPlaceFromForm(){ return $('#eventPlacePreset').value==='ALTRES' ? $('#eventPlaceDetail').value.trim() : 'LOCAL SOCIAL'; }
function editEvent(id){
  const event=(content.events||[]).find(item=>item.id===id); if(!event) return;
  $('#eventId').value=event.id; $('#eventType').value=event.type||'ASSAIG'; $('#eventDate').value=event.date||''; $('#eventTime').value=event.time||''; $('#eventNotes').value=event.notes||'';
  if((event.type||'ASSAIG')==='ASSAIG'){
    const presets=['ASSAIG GENERAL','ASSAIG PARCIAL FUSTA','ASSAIG PARCIAL PERCUSIÓ','ASSAIG PARCIAL METALL'];
    const upper=String(event.title||'').toUpperCase();
    if(upper.startsWith('ASSAIG PARCIAL CONCRET')){ $('#eventTitlePreset').value='ASSAIG PARCIAL CONCRET'; $('#eventTitleDetail').value=String(event.title).split('·').slice(1).join('·').trim(); }
    else if(presets.includes(upper)){ $('#eventTitlePreset').value=upper; $('#eventTitleDetail').value=''; }
    else { $('#eventTitlePreset').value='ASSAIG PARCIAL CONCRET'; $('#eventTitleDetail').value=event.title||''; }
  } else $('#eventFreeTitle').value=event.title||'';
  if(String(event.place||'').toUpperCase()==='LOCAL SOCIAL'){ $('#eventPlacePreset').value='LOCAL SOCIAL'; $('#eventPlaceDetail').value=''; } else { $('#eventPlacePreset').value='ALTRES'; $('#eventPlaceDetail').value=event.place||''; }
  $('#eventFormTitle').textContent='Editar esdeveniment'; syncEventFormVisibility(); $('#eventForm').scrollIntoView({behavior:'smooth',block:'start'});
}
function deleteEvent(id){ const event=(content.events||[]).find(item=>item.id===id); if(!event) return; if(!confirm(`Vols eliminar “${event.title}”?`)) return; const linked=(content.dresscodes||[]).filter(d=>d.eventId===id).map(d=>d.id); content.dresscodes=(content.dresscodes||[]).filter(d=>d.eventId!==id); content.events=content.events.filter(item=>item.id!==id && !linked.includes(item.dresscodeId)); save(content,'Esdeveniment eliminat'); resetEventForm(); resetDresscodeForm(); }
function renderEvents(){
  const list=[...(content.events||[])].sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)); $('#eventCount').textContent=list.length;
  $('#eventEditorList').innerHTML=list.length?list.map(event=>`<article class="list-item"><div class="list-main"><div class="list-kicker"><span>${esc(event.type)}</span><span>·</span><span>${esc(formatDate(event.date))}${event.time?` · ${esc(event.time)}`:''}</span></div><h3>${esc(event.title)}</h3>${event.place?`<p>⌖ ${esc(event.place)}</p>`:''}${event.dresscodeId?'<p class="gold-note">Dresscode vinculat</p>':''}${event.notes?`<p>${esc(event.notes)}</p>`:''}</div><div class="list-actions"><button class="tiny-btn" data-edit-event="${event.id}" title="Editar">✎</button><button class="tiny-btn delete" data-delete-event="${event.id}" title="Eliminar">×</button></div></article>`).join(''):'<div class="empty-state">Encara no hi ha cap esdeveniment.</div>';
  $$('[data-edit-event]').forEach(btn=>btn.onclick=()=>editEvent(btn.dataset.editEvent)); $$('[data-delete-event]').forEach(btn=>btn.onclick=()=>deleteEvent(btn.dataset.deleteEvent));
}
function bindEventForm(){
  $('#eventForm').addEventListener('submit',event=>{ event.preventDefault(); const id=$('#eventId').value||BandaStore.uid('evt'); const old=(content.events||[]).find(e=>e.id===id); const item={id,type:$('#eventType').value,title:eventTitleFromForm(),date:$('#eventDate').value,time:$('#eventTime').value,place:eventPlaceFromForm(),notes:$('#eventNotes').value.trim(),dresscodeId:old?.dresscodeId||''}; if(!item.title||!item.date){showToast('Cal indicar títol i data');return;} if($('#eventPlacePreset').value==='ALTRES'&&!item.place){showToast('Cal especificar el lloc');return;} const index=content.events.findIndex(e=>e.id===id); if(index>=0) content.events[index]=item; else content.events.push(item); save(content,index>=0?'Esdeveniment actualitzat':'Esdeveniment afegit'); resetEventForm(); });
  $('#newEventBtn').onclick=resetEventForm; $('#cancelEventEdit').onclick=resetEventForm;
  $('#eventType').addEventListener('change',()=>{ if($('#eventType').value==='ASSAIG'&&!$('#eventTime').value){$('#eventTime').value='21:30';$('#eventPlacePreset').value='LOCAL SOCIAL';} syncEventFormVisibility(); });
  $('#eventTitlePreset').addEventListener('change',()=>{ if($('#eventTitlePreset').value==='ASSAIG GENERAL'){ $('#eventTime').value='21:30'; $('#eventPlacePreset').value='LOCAL SOCIAL'; $('#eventPlaceDetail').value=''; } syncEventFormVisibility(); });
  $('#eventPlacePreset').addEventListener('change',syncEventFormVisibility);
}

function renderDresscodeEventOptions(){
  const events=[...(content.events||[])].filter(e=>['CONCERT','ACTUACIÓ'].includes(String(e.type||'').toUpperCase())).sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const current=$('#dresscodeEvent')?.value;
  $('#dresscodeEvent').innerHTML='<option value="">— Selecciona CONCERT o ACTUACIÓ —</option>'+events.map(e=>`<option value="${e.id}">${esc(formatDate(e.date))} · ${esc(e.title)}</option>`).join('');
  if(current && events.some(e=>e.id===current)) $('#dresscodeEvent').value=current;
}
function dressDef(key){ return DRESS_DEFS.find(def=>def.key===key); }
function optionText(def,preset){ const option=def.options.find(opt=>opt[0]===preset) || def.options[0]; return option?.[2] ?? ''; }
function normalizeDressItems(items,sex,legacyText=''){
  const incoming=Array.isArray(items)?items:[];
  const legacyLines=String(legacyText||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
  return DRESS_DEFS.map((def,index)=>{
    const found=incoming.find(item=>item.key===def.key);
    const preset=found?.preset || DEFAULT_DRESS_PRESETS[sex][def.key] || def.options[0][0];
    let text=typeof found?.text==='string'?found.text:optionText(def,preset);
    if(!incoming.length && legacyLines.length){
      const legacyMap=sex==='girls'&&legacyLines.length===4?{shirt:0,bottom:1,footwear:2,tie:3}:{shirt:0,bottom:1,footwear:2,socks:3,tie:4};
      const legacyIndex=legacyMap[def.key]; if(Number.isInteger(legacyIndex)&&legacyLines[legacyIndex]) text=legacyLines[legacyIndex];
    }
    return {key:def.key,preset,text};
  });
}
function renderDressItems(sex,items){
  const target=$(`#${sex}DressItems`); if(!target) return;
  target.innerHTML=normalizeDressItems(items,sex).map(item=>{
    const def=dressDef(item.key); const opts=def.options.map(opt=>`<option value="${esc(opt[0])}" ${opt[0]===item.preset?'selected':''}>${esc(opt[1])}</option>`).join('');
    return `<div class="dress-item-row" data-dress-row="${sex}" data-key="${esc(item.key)}"><label>${esc(def.label)}<select class="dress-preset">${opts}</select></label><label>TEXT FINAL<input class="dress-final-text" maxlength="180" value="${esc(item.text)}" placeholder="Text que veuran els músics" /></label></div>`;
  }).join('');
  target.querySelectorAll('.dress-preset').forEach(select=>select.addEventListener('change',()=>{ const row=select.closest('.dress-item-row'); const def=dressDef(row.dataset.key); row.querySelector('.dress-final-text').value=optionText(def,select.value); }));
}
function collectDressItems(sex){
  return [...document.querySelectorAll(`[data-dress-row="${sex}"]`)].map(row=>({key:row.dataset.key,preset:row.querySelector('.dress-preset').value,text:row.querySelector('.dress-final-text').value.trim()}));
}
function itemsToText(items){ return (items||[]).map(item=>item.text?.trim()).filter(Boolean).join('\n'); }
function resetDresscodeForm(){
  $('#dresscodeForm').reset(); $('#dresscodeId').value=''; $('#dresscodeFormTitle').textContent='Nou dresscode'; $('#dresscodeTitle').value='Dress code - diada'; $('#dresscodeSubtitle').value='Uniforme de banda';
  renderDressItems('boys',normalizeDressItems([], 'boys')); renderDressItems('girls',normalizeDressItems([], 'girls')); renderDresscodeEventOptions();
}
function editDresscode(id){
  const d=(content.dresscodes||[]).find(x=>x.id===id); if(!d) return; $('#dresscodeId').value=d.id; renderDresscodeEventOptions(); $('#dresscodeEvent').value=d.eventId||''; $('#dresscodeTitle').value=d.title||''; $('#dresscodeSubtitle').value=d.subtitle||'';
  renderDressItems('boys',normalizeDressItems(d.boysItems,'boys',d.boys)); renderDressItems('girls',normalizeDressItems(d.girlsItems,'girls',d.girls)); $('#dresscodeFormTitle').textContent='Editar dresscode'; $('#dresscodeForm').scrollIntoView({behavior:'smooth',block:'start'});
}
function deleteDresscode(id){ const d=(content.dresscodes||[]).find(x=>x.id===id); if(!d) return; if(!confirm(`Vols eliminar “${d.title}”?`)) return; content.dresscodes=content.dresscodes.filter(x=>x.id!==id); content.events.forEach(e=>{if(e.dresscodeId===id)e.dresscodeId='';}); save(content,'Dresscode eliminat'); resetDresscodeForm(); }
function renderDresscodes(){ const list=content.dresscodes||[]; $('#dresscodeCount').textContent=list.length; $('#dresscodeList').innerHTML=list.length?list.map(d=>{const e=(content.events||[]).find(x=>x.id===d.eventId);return `<article class="list-item"><div class="list-main"><div class="list-kicker"><span>DRESSCODE</span><span>·</span><span>${e?esc(formatDate(e.date)):'Sense esdeveniment'}</span></div><h3>${esc(d.title)}</h3><p>${e?esc(e.title):'Esdeveniment eliminat'}</p><p>${esc(d.subtitle)}</p></div><div class="list-actions"><button class="tiny-btn" data-edit-dress="${d.id}">✎</button><button class="tiny-btn delete" data-delete-dress="${d.id}">×</button></div></article>`;}).join(''):'<div class="empty-state">Encara no hi ha cap dresscode.</div>'; $$('[data-edit-dress]').forEach(btn=>btn.onclick=()=>editDresscode(btn.dataset.editDress)); $$('[data-delete-dress]').forEach(btn=>btn.onclick=()=>deleteDresscode(btn.dataset.deleteDress)); }
function bindDresscodes(){
  $('#dresscodeForm').addEventListener('submit',event=>{ event.preventDefault(); const eventId=$('#dresscodeEvent').value; if(!eventId){showToast('Selecciona un CONCERT o una ACTUACIÓ');return;} const linkedEvent=(content.events||[]).find(e=>e.id===eventId); if(!linkedEvent || !['CONCERT','ACTUACIÓ'].includes(String(linkedEvent.type||'').toUpperCase())){showToast('El dresscode només es pot aplicar a CONCERTS o ACTUACIONS');return;} const id=$('#dresscodeId').value||BandaStore.uid('dress'); const boysItems=collectDressItems('boys'), girlsItems=collectDressItems('girls'); const item={id,eventId,title:$('#dresscodeTitle').value.trim()||'Dress code',subtitle:$('#dresscodeSubtitle').value.trim()||'Uniforme de banda',boysItems,girlsItems,boys:itemsToText(boysItems),girls:itemsToText(girlsItems)}; const previous=(content.dresscodes||[]).find(d=>d.id===id); if(previous && previous.eventId!==eventId){ const oldEvent=content.events.find(e=>e.id===previous.eventId); if(oldEvent&&oldEvent.dresscodeId===id) oldEvent.dresscodeId=''; }
    const existingForEvent=(content.dresscodes||[]).find(d=>d.eventId===eventId&&d.id!==id); if(existingForEvent){ content.dresscodes=content.dresscodes.filter(d=>d.id!==existingForEvent.id); }
    const index=content.dresscodes.findIndex(d=>d.id===id); if(index>=0) content.dresscodes[index]=item; else content.dresscodes.push(item); const ev=content.events.find(e=>e.id===eventId); if(ev) ev.dresscodeId=id; save(content,index>=0?'Dresscode actualitzat':'Dresscode afegit'); resetDresscodeForm(); }); $('#newDresscodeBtn').onclick=resetDresscodeForm; $('#cancelDresscodeEdit').onclick=resetDresscodeForm;
}

function resetTrackForm(){ $('#trackForm').reset(); $('#trackId').value=''; $('#trackVisible').checked=true; $('#trackFormTitle').textContent='Nova pista'; $('#trackPreviewBox').hidden=true; $('#trackPreview').removeAttribute('src'); }
function updateTrackPreview(){ const src=$('#trackSrc').value.trim(); const box=$('#trackPreviewBox'); const audio=$('#trackPreview'); if(src){audio.src=src;box.hidden=false;}else{audio.removeAttribute('src');box.hidden=true;} }
function editTrack(id){ const track=(content.tracks||[]).find(item=>item.id===id); if(!track) return; $('#trackId').value=track.id; $('#trackTitle').value=track.title||''; $('#trackMeta').value=track.meta||''; $('#trackSrc').value=track.src||''; $('#trackVisible').checked=track.visible!==false; $('#trackFormTitle').textContent='Editar pista'; updateTrackPreview(); $('#trackForm').scrollIntoView({behavior:'smooth',block:'start'}); }
function deleteTrack(id){ const track=(content.tracks||[]).find(item=>item.id===id); if(!track) return; if(!confirm(`Vols eliminar “${track.title}”?`)) return; content.tracks=content.tracks.filter(item=>item.id!==id); save(content,'Pista eliminada'); resetTrackForm(); }
function moveTrack(id,direction){ const index=content.tracks.findIndex(track=>track.id===id); if(index<0) return; const target=index+direction; if(target<0||target>=content.tracks.length)return; [content.tracks[index],content.tracks[target]]=[content.tracks[target],content.tracks[index]]; save(content,'Ordre actualitzat'); }
function toggleTrack(id){ const track=content.tracks.find(item=>item.id===id); if(!track)return; track.visible=track.visible===false; save(content,track.visible?'Pista visible':'Pista oculta'); }
function renderTracks(){ const list=content.tracks||[]; $('#trackCountEditor').textContent=list.length; $('#trackEditorList').innerHTML=list.length?list.map((track,index)=>`<article class="list-item track-list-item" draggable="true" data-track-row="${track.id}"><span class="drag-handle">⋮⋮</span><div class="list-main"><div class="list-kicker"><span>#${String(index+1).padStart(2,'0')}</span><span class="visibility-pill ${track.visible===false?'hidden':''}">${track.visible===false?'OCULTA':'VISIBLE'}</span></div><h3>${esc(track.title)}</h3>${track.meta?`<p>${esc(track.meta)}</p>`:''}<p>${esc(track.src||'Sense ruta')}</p></div><div class="list-actions"><button class="tiny-btn" data-up-track="${track.id}">↑</button><button class="tiny-btn" data-down-track="${track.id}">↓</button><button class="tiny-btn" data-toggle-track="${track.id}">◉</button><button class="tiny-btn" data-edit-track="${track.id}">✎</button><button class="tiny-btn delete" data-delete-track="${track.id}">×</button></div></article>`).join(''):'<div class="empty-state">Encara no hi ha cap pista al Player.</div>';
  $$('[data-up-track]').forEach(btn=>btn.onclick=()=>moveTrack(btn.dataset.upTrack,-1)); $$('[data-down-track]').forEach(btn=>btn.onclick=()=>moveTrack(btn.dataset.downTrack,1)); $$('[data-toggle-track]').forEach(btn=>btn.onclick=()=>toggleTrack(btn.dataset.toggleTrack)); $$('[data-edit-track]').forEach(btn=>btn.onclick=()=>editTrack(btn.dataset.editTrack)); $$('[data-delete-track]').forEach(btn=>btn.onclick=()=>deleteTrack(btn.dataset.deleteTrack));
  $$('[data-track-row]').forEach(row=>{row.addEventListener('dragstart',()=>{draggedTrackId=row.dataset.trackRow;row.classList.add('dragging');});row.addEventListener('dragend',()=>{draggedTrackId=null;row.classList.remove('dragging');});row.addEventListener('dragover',e=>e.preventDefault());row.addEventListener('drop',e=>{e.preventDefault();const targetId=row.dataset.trackRow;if(!draggedTrackId||draggedTrackId===targetId)return;const from=content.tracks.findIndex(t=>t.id===draggedTrackId),to=content.tracks.findIndex(t=>t.id===targetId);if(from<0||to<0)return;const[moved]=content.tracks.splice(from,1);content.tracks.splice(to,0,moved);save(content,'Ordre del Player actualitzat');});});
}
function bindTrackForm(){ $('#trackForm').addEventListener('submit',event=>{event.preventDefault();const id=$('#trackId').value||BandaStore.uid('trk');const item={id,title:$('#trackTitle').value.trim(),meta:$('#trackMeta').value.trim(),src:$('#trackSrc').value.trim(),visible:$('#trackVisible').checked};if(!item.title||!item.src){showToast('Cal indicar títol i ruta/URL');return;}const index=content.tracks.findIndex(t=>t.id===id);if(index>=0)content.tracks[index]=item;else content.tracks.push(item);save(content,index>=0?'Pista actualitzada':'Pista afegida');resetTrackForm();}); $('#newTrackBtn').onclick=resetTrackForm; $('#cancelTrackEdit').onclick=resetTrackForm; $('#trackSrc').addEventListener('change',updateTrackPreview); }

function renderAudioLibrary(files=audioLibrary){
  audioLibrary=(files||[]).map(item=>typeof item==='string'?{name:item,url:`assets/AUDIO/${item}`,source:'GITHUB'}:item)
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
  if(!gh) return [];
  const branch=gh.branch?`?ref=${encodeURIComponent(gh.branch)}`:'';
  const url=`https://api.github.com/repos/${encodeURIComponent(gh.owner)}/${encodeURIComponent(gh.repo)}/contents/assets/AUDIO${branch}`;
  const response=await fetch(url,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
  if(!response.ok) return [];
  const entries=await response.json();
  if(!Array.isArray(entries)) return [];
  return entries.filter(item=>item&&item.type==='file'&&/\.(mp3|wav|m4a|ogg)$/i.test(item.name||''))
    .map(item=>({name:item.name,url:`assets/AUDIO/${item.name}`,source:'GITHUB'}));
}

async function refreshAudioDirectory(){
  const status=$('#audioFolderStatus');
  status.textContent='Actualitzant…';
  $('#refreshAudioFolder').disabled=true;
  try{
    const [remote,github]=await Promise.all([
      window.BandaSupabase?.enabled ? BandaSupabase.listPublicFiles('player-audio').catch(()=>[]) : Promise.resolve([]),
      fetchGitHubAudioFiles().catch(()=>[])
    ]);
    const remoteItems=remote.map(item=>({name:item.name,url:item.url,source:'SUPABASE'}));
    renderAudioLibrary([...remoteItems,...github]);
    showToast(`${remoteItems.length} àudios a Supabase · ${github.length} a GitHub`);
  }catch(error){
    console.error(error);
    renderAudioLibrary([]);
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
        showToast('Cal tenir permisos de gestor per pujar àudio a Supabase');
        return;
      }
      $('#uploadMp3Btn').disabled=true;
      showToast(`Pujant ${file.name}…`);
      const uploaded=await BandaSupabase.uploadFile('player-audio',file,'tracks',file.name.replace(/\.[^.]+$/,''));
      $('#trackSrc').value=uploaded.url;
      if(!$('#trackTitle').value.trim()) $('#trackTitle').value=file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ');
      updateTrackPreview();
      await refreshAudioDirectory();
      showToast('MP3 pujat a Supabase');
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
    return `<div class="history-image-preview-item ${isNew?'is-new':''}"><img src="${esc(src)}" alt="Previsualització ${index+1}" /><span>${isNew?'NOVA':'DESADA'}</span><button class="history-image-remove-btn" type="button" ${removeAttr} title="${removeLabel}" aria-label="${removeLabel}">×</button></div>`;
  }).join('');
  $$('[data-remove-pending-historic]').forEach(btn=>btn.onclick=()=>{
    pendingHistoricImages.splice(Number(btn.dataset.removePendingHistoric||0),1);
    renderHistoricFormPreview();
    showToast('Fotografia nova descartada');
  });
  $$('[data-remove-saved-historic]').forEach(btn=>btn.onclick=()=>removeHistoricSavedPhoto(Number(btn.dataset.removeSavedHistoric||0)));
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
      showToast('Eliminant fotografia de Supabase…');
      await BandaSupabase.deletePublicFile('historic-media',src);
    }
  }catch(error){
    console.error(error);
    showToast('No s’ha pogut eliminar la fotografia de Storage');
    return;
  }
  images.splice(index,1);
  if(!images.length){
    content.historicItems=(content.historicItems||[]).filter(entry=>entry.id!==id);
    editingHistoricImages=[];
    pendingHistoricImages=[];
    if(save(content,'Última fotografia eliminada · esdeveniment eliminat')) resetHistoricForm();
    return;
  }
  const target=(content.historicItems||[]).find(entry=>entry.id===id);
  if(target){ target.images=[...images]; target.imageSrc=images[0]||''; }
  editingHistoricImages=[...images];
  save(content,'Fotografia eliminada definitivament');
  renderHistoricFormPreview();
}

function resetHistoricForm(){
  const form=$('#historicForm'); if(!form) return;
  form.reset();
  pendingHistoricImages=[];
  editingHistoricImages=[];
  $('#historicId').value='';
  $('#historicFormTitle').textContent='Nova entrada';
  $('#historicImagePreviewWrap').hidden=true;
  $('#historicImagePreviewGrid').innerHTML='';
  $('#historicPeriodHint').hidden=true;
  $('#historicImageFile').required=true;
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
  editingHistoricImages=historicImages(item);
  $('#historicId').value=item.id;
  $('#historicYear').value=item.year||'';
  renderHistoricPeriodOptions(item.periodId||'');
  $('#historicTitle').value=item.title||'';
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
      for(let i=0;i<images.length;i++){
        showToast(`Eliminant fotografia ${i+1}/${images.length}…`);
        await BandaSupabase.deletePublicFile('historic-media',images[i]);
      }
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

function renderHistoric(){
  const list=[...(content.historicItems||[])].sort((a,b)=>{
    const pa=historicPeriods().findIndex(p=>p.id===a.periodId), pb=historicPeriods().findIndex(p=>p.id===b.periodId);
    if(pa!==pb) return pa-pb;
    const ya=Number(a.year)||0,yb=Number(b.year)||0;
    if(ya!==yb) return ya-yb;
    return String(a.title||'').localeCompare(String(b.title||''),'ca');
  });
  $('#historicCount').textContent=list.length;
  const host=$('#historicEditorList');
  if(!list.length){ host.innerHTML='<div class="empty-state">Encara no hi ha cap fotografia a l’Històric.</div>'; return; }
  let currentPeriod='';
  host.innerHTML=list.map(item=>{
    const period=historicPeriodById(item.periodId);
    const group=item.periodId!==currentPeriod ? `<div class="history-editor-period"><strong>${esc(period?.years||'—')}</strong><span>${esc(period?.director||'Període desconegut')}</span></div>` : '';
    currentPeriod=item.periodId;
    const images=historicImages(item);
    const thumbCols=Math.max(1,Math.ceil(Math.sqrt(images.length||1)));
    const thumbs=images.length ? `<div class="historic-thumb-grid" style="--thumb-cols:${thumbCols}">${images.map((src,index)=>`<div class="historic-thumb-cell"><img src="${esc(src)}" alt="" loading="lazy" /><button class="historic-download-btn" type="button" data-download-historic="${esc(item.id)}" data-download-index="${index}" title="Descarregar fotografia" aria-label="Descarregar fotografia ${index+1}">⇩</button></div>`).join('')}</div>` : '<div class="historic-thumb"><span>◷</span></div>';
    return `${group}<article class="historic-editor-item">
      <div class="historic-thumb-wrap">${thumbs}</div>
      <div class="list-main"><div class="list-kicker"><span>${esc(item.year)}</span><span>·</span><span>${esc(period?.director||'Sense període')}</span><span>·</span><span>${images.length} ${images.length===1?'foto':'fotos'}</span></div>${item.title?`<h3>${esc(item.title)}</h3>`:'<h3>Sense títol</h3>'}${item.description?`<p>${esc(item.description)}</p>`:''}</div>
      <div class="list-actions"><button class="tiny-btn" data-edit-historic="${esc(item.id)}" title="Editar">✎</button><button class="tiny-btn delete" data-delete-historic="${esc(item.id)}" title="Eliminar">×</button></div>
    </article>`;
  }).join('');
  $$('[data-edit-historic]').forEach(btn=>btn.onclick=()=>editHistoric(btn.dataset.editHistoric));
  $$('[data-delete-historic]').forEach(btn=>btn.onclick=()=>deleteHistoric(btn.dataset.deleteHistoric));
  $$('[data-download-historic]').forEach(btn=>btn.onclick=()=>{ const item=(content.historicItems||[]).find(entry=>entry.id===btn.dataset.downloadHistoric); const images=historicImages(item); const index=Number(btn.dataset.downloadIndex||0); if(item&&images[index]) downloadHistoricPhoto(images[index],item,index); });
}

function bindHistoric(){
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
        added.push(compressed);
      }
      renderHistoricFormPreview();
      showToast(`${files.length} ${files.length===1?'fotografia afegida':'fotografies afegides'} · ${pendingHistoricImages.length} pendents de desar`);
    }catch(error){
      console.error(error);
      if(added.length) pendingHistoricImages.splice(Math.max(0,pendingHistoricImages.length-added.length),added.length);
      renderHistoricFormPreview();
      showToast('No s’han pogut processar totes les fotografies');
    }finally{
      // Permet tornar a obrir el selector i afegir una altra tanda abans de DESAR ENTRADA.
      event.target.value='';
    }
  });
  $('#clearPendingHistoricImages')?.addEventListener('click',()=>{
    pendingHistoricImages=[];
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
        for(let i=0;i<pendingHistoricImages.length;i++){
          let src=pendingHistoricImages[i];
          if(editorCanWrite && supabaseActive && currentSession){
            showToast(`Pujant fotografia ${i+1}/${pendingHistoricImages.length} a Supabase…`);
            src=(await BandaSupabase.uploadDataUrl('historic-media',src,String(year),`historic-${year}-${images.length+i+1}`)).url;
          }
          images.push(src);
        }
      }catch(error){ console.error(error); showToast('No s’han pogut pujar les fotografies'); return; }
    }
    if(!images.length){ showToast('Cal seleccionar almenys una fotografia'); return; }
    const item={id,year,periodId,title:$('#historicTitle').value.trim(),description:$('#historicDescription').value.trim(),images,imageSrc:images[0]||'',createdAt:existing?.createdAt||new Date().toISOString()};
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
  wrap.hidden=!images.length;
  grid.innerHTML=images.map((src,index)=>{const isNew=index>=savedCount;const localIndex=isNew?index-savedCount:index;const attr=isNew?`data-remove-pending-hemero="${localIndex}"`:`data-remove-saved-hemero="${localIndex}"`;return `<div class="history-image-preview-item ${isNew?'is-new':''}"><img src="${esc(src)}" alt="Previsualització ${index+1}" /><span>${isNew?'NOVA':'DESADA'}</span><button class="history-image-remove-btn" type="button" ${attr} aria-label="Eliminar imatge">×</button></div>`;}).join('');
  $$('[data-remove-pending-hemero]').forEach(btn=>btn.onclick=()=>{pendingHemerotecaImages.splice(Number(btn.dataset.removePendingHemero||0),1);renderHemerotecaFormPreview();});
  $$('[data-remove-saved-hemero]').forEach(btn=>btn.onclick=()=>removeHemerotecaSavedImage(Number(btn.dataset.removeSavedHemero||0)));
}
function syncHemerotecaRuleHelp(){
  const type=$('#hemerotecaType')?.value||'cartells'; const help=$('#hemerotecaRuleHelp'); if(!help)return;
  help.textContent=type==='cartells'?'CARTELLS necessita almenys una imatge. Pots afegir-ne més d’una si vols conservar diferents versions o detalls.':type==='noticies'?'NOTÍCIES admet retalls/imatges, un enllaç web actual o totes dues coses.':'ENTREVISTES admet un enllaç, imatges/documentació o totes dues coses.';
}
function resetHemerotecaForm(){
  const form=$('#hemerotecaForm'); if(!form)return; form.reset(); pendingHemerotecaImages=[];editingHemerotecaImages=[];
  $('#hemerotecaId').value='';$('#hemerotecaFormTitle').textContent='Nova entrada';$('#hemerotecaType').value='cartells';$('#hemerotecaYear').max=String(new Date().getFullYear());$('#hemerotecaMonth').value='';$('#hemerotecaDay').value='';renderHemerotecaFormPreview();syncHemerotecaRuleHelp();
}
function editHemeroteca(id){
  const item=(content.hemerotecaItems||[]).find(entry=>entry.id===id); if(!item)return;
  pendingHemerotecaImages=[];editingHemerotecaImages=hemerotecaImages(item);$('#hemerotecaId').value=item.id;$('#hemerotecaType').value=item.type||'cartells';$('#hemerotecaYear').value=item.year||'';$('#hemerotecaMonth').value=item.month||'';$('#hemerotecaDay').value=item.day||'';$('#hemerotecaTitle').value=item.title||'';$('#hemerotecaDescription').value=item.description||'';$('#hemerotecaUrl').value=item.url||'';$('#hemerotecaFormTitle').textContent='Editar entrada';renderHemerotecaFormPreview();syncHemerotecaRuleHelp();$('#hemerotecaForm').scrollIntoView({behavior:'smooth',block:'start'});
}
async function removeHemerotecaSavedImage(index){
  const id=$('#hemerotecaId')?.value||''; const item=(content.hemerotecaItems||[]).find(entry=>entry.id===id); if(!item)return;
  const images=hemerotecaImages(item); const src=images[index]; if(!src)return;
  const remaining=images.length-1; const hasUrl=!!String(item.url||'').trim();
  if(item.type==='cartells'&&!remaining){showToast('Un CARTELL ha de conservar almenys una imatge. Elimina l’entrada completa si ja no la vols.');return;}
  if(item.type!=='cartells'&&!remaining&&!hasUrl){showToast('Aquesta entrada necessita conservar una imatge o tenir un enllaç. Afegeix primer l’enllaç o elimina l’entrada completa.');return;}
  if(!confirm('Vols eliminar definitivament aquesta imatge?'))return;
  try{if(supabaseActive&&currentSession&&window.BandaSupabase?.deletePublicFile)await BandaSupabase.deletePublicFile('historic-media',src);}catch(error){console.error(error);showToast('No s’ha pogut eliminar la imatge de Storage');return;}
  images.splice(index,1); item.images=images;item.imageSrc=images[0]||'';editingHemerotecaImages=[...images];save(content,'Imatge de l’Hemeroteca eliminada');renderHemerotecaFormPreview();
}
async function deleteHemeroteca(id){
  const item=(content.hemerotecaItems||[]).find(entry=>entry.id===id); if(!item)return;
  if(!confirm(`Vols eliminar aquesta entrada de ${hemerotecaTypeLabel(item.type)}?`))return;
  try{for(const src of hemerotecaImages(item)){if(supabaseActive&&currentSession&&window.BandaSupabase?.deletePublicFile)await BandaSupabase.deletePublicFile('historic-media',src);}}catch(error){console.error(error);showToast('No s’han pogut eliminar totes les imatges de Storage');return;}
  content.hemerotecaItems=(content.hemerotecaItems||[]).filter(entry=>entry.id!==id);save(content,'Entrada de l’Hemeroteca eliminada');resetHemerotecaForm();
}
function renderHemerotecaEditor(){
  const all=[...(content.hemerotecaItems||[])].sort((a,b)=>{const da=hemerotecaSortValue(a),db=hemerotecaSortValue(b);if(da!==db)return db-da;return String(b.createdAt||'').localeCompare(String(a.createdAt||''));});
  $('#hemerotecaCount').textContent=all.length;$$('[data-hemeroteca-editor-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.hemerotecaEditorFilter===hemerotecaEditorFilter));
  const list=hemerotecaEditorFilter==='all'?all:all.filter(item=>item.type===hemerotecaEditorFilter); const host=$('#hemerotecaEditorList');if(!host)return;
  if(!list.length){host.innerHTML='<div class="empty-state">Encara no hi ha cap document en aquesta categoria.</div>';return;}
  host.innerHTML=list.map(item=>{const images=hemerotecaImages(item);const thumbs=images.length?`<div class="historic-thumb-grid" style="--thumb-cols:${Math.max(1,Math.ceil(Math.sqrt(images.length)))}">${images.map((src,index)=>`<div class="historic-thumb-cell"><img src="${esc(src)}" alt="" loading="lazy" /><button class="historic-download-btn" type="button" data-download-hemero="${esc(item.id)}" data-download-index="${index}" title="Descarregar imatge" aria-label="Descarregar imatge ${index+1}">⇩</button></div>`).join('')}</div>`:'<div class="historic-thumb"><span>▤</span></div>';const dateLabel=hemerotecaDateLabel(item);return `<article class="historic-editor-item hemeroteca-editor-item type-${esc(item.type)}"><div class="historic-thumb-wrap">${thumbs}</div><div class="list-main"><div class="list-kicker"><span>${esc(hemerotecaTypeLabel(item.type))}</span>${dateLabel?`<span>·</span><span>${esc(dateLabel)}</span>`:''}${item.url?'<span>·</span><span>ENLLAÇ</span>':''}</div><h3>${esc(item.title||hemerotecaTypeLabel(item.type))}</h3>${item.description?`<p>${esc(item.description)}</p>`:''}</div><div class="list-actions"><button class="tiny-btn" data-edit-hemero="${esc(item.id)}" title="Editar">✎</button><button class="tiny-btn delete" data-delete-hemero="${esc(item.id)}" title="Eliminar">×</button></div></article>`;}).join('');
  $$('[data-edit-hemero]').forEach(btn=>btn.onclick=()=>editHemeroteca(btn.dataset.editHemero));$$('[data-delete-hemero]').forEach(btn=>btn.onclick=()=>deleteHemeroteca(btn.dataset.deleteHemero));$$('[data-download-hemero]').forEach(btn=>btn.onclick=()=>{const item=(content.hemerotecaItems||[]).find(entry=>entry.id===btn.dataset.downloadHemero);const images=hemerotecaImages(item);const index=Number(btn.dataset.downloadIndex||0);if(item&&images[index])downloadHistoricPhoto(images[index],item,index);});
}
function bindHemerotecaEditor(){
  $('#hemerotecaYear').max=String(new Date().getFullYear());$('#hemerotecaType').addEventListener('change',syncHemerotecaRuleHelp);
  $('#hemerotecaImageFile').addEventListener('change',async event=>{const files=[...(event.target.files||[])];if(!files.length)return;try{showToast(`Preparant ${files.length} ${files.length===1?'imatge':'imatges'}…`);for(const file of files)pendingHemerotecaImages.push(await compressHistoricImage(file));renderHemerotecaFormPreview();}catch(error){console.error(error);showToast('No s’han pogut preparar les imatges');}finally{event.target.value='';}});
  $('#clearPendingHemerotecaImages')?.addEventListener('click',()=>{pendingHemerotecaImages=[];renderHemerotecaFormPreview();});
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
    try{
      for(let i=0;i<pendingHemerotecaImages.length;i++){
        let src=pendingHemerotecaImages[i];
        if(editorCanWrite&&supabaseActive&&currentSession){
          showToast(`Pujant imatge ${i+1}/${pendingHemerotecaImages.length}…`);
          src=(await BandaSupabase.uploadDataUrl('historic-media',src,`hemeroteca/${type}/${year}`,`hemeroteca-${type}-${year}-${images.length+i+1}`)).url;
        }
        images.push(src);
      }
    }catch(error){console.error(error);showToast('No s’han pogut pujar les imatges');return;}
    if(type==='cartells'&&!images.length){showToast('CARTELLS necessita almenys una imatge');return;}
    if(type!=='cartells'&&!images.length&&!url){showToast('Afegeix almenys una imatge o un enllaç');return;}
    const item={id,type,year,month,day,title:$('#hemerotecaTitle').value.trim(),description:$('#hemerotecaDescription').value.trim(),url,images,imageSrc:images[0]||'',createdAt:existing?.createdAt||new Date().toISOString()};
    content.hemerotecaItems=content.hemerotecaItems||[];
    const index=content.hemerotecaItems.findIndex(entry=>entry.id===id);
    if(index>=0)content.hemerotecaItems[index]=item;else content.hemerotecaItems.push(item);
    if(save(content,index>=0?'Entrada de l’Hemeroteca actualitzada':'Entrada afegida a l’Hemeroteca'))resetHemerotecaForm();
  });
  $('#newHemerotecaBtn').onclick=resetHemerotecaForm;$('#cancelHemerotecaEdit').onclick=resetHemerotecaForm;$$('[data-hemeroteca-editor-filter]').forEach(btn=>btn.onclick=()=>{hemerotecaEditorFilter=btn.dataset.hemerotecaEditorFilter;renderHemerotecaEditor();});syncHemerotecaRuleHelp();
}

function contentHasUsefulData(value){
  if(!value) return false;
  if(value.settings?.supabaseInitialized) return true;
  return ['events','tracks','dresscodes','historicItems','hemerotecaItems'].some(key=>Array.isArray(value[key]) && value[key].length>0) || !!value.settings?.homeHeroImage;
}

function renderSystem(){
  const date=content.updatedAt?new Date(content.updatedAt):null;
  $('#lastUpdated').textContent=date&&!Number.isNaN(date.valueOf())?new Intl.DateTimeFormat('ca-ES',{dateStyle:'medium',timeStyle:'short'}).format(date):'—';
  $('#systemEvents').textContent=(content.events||[]).length;
  $('#systemDresscodes').textContent=(content.dresscodes||[]).length;
  $('#systemTracks').textContent=(content.tracks||[]).length;
  $('#systemHistoric').textContent=(content.historicItems||[]).length;
  $('#systemHemeroteca').textContent=(content.hemerotecaItems||[]).length;
  $('#systemProtocol').textContent=supabaseActive?'SUPABASE · sincronització central':(migrationPending?'DADES LOCALS · pendent de migrar':'CONNECTANT…');
  $('#storageBadge').textContent=supabaseActive?'SUPABASE ACTIU':(migrationPending?'MIGRACIÓ PENDENT':'SUPABASE');
  const migrationBtn=$('#migrateToSupabaseBtn');
  if(migrationBtn) migrationBtn.disabled=!editorCanWrite || (supabaseActive && !migrationPending);
  const text=$('#supabaseMigrationText');
  if(text) text.textContent=!editorCanWrite
    ? 'Mode consulta. Aquest accés pot veure el contingut compartit, però no pot publicar canvis.'
    : (supabaseActive && !migrationPending
      ? 'Sincronització activa. Els canvis que desis aquí es publiquen a Supabase i arriben a la resta de dispositius.'
      : 'Aquest navegador conserva dades locals de versions anteriors. Migra-les una sola vegada a Supabase per convertir-les en el contingut compartit oficial.');
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
  if(!currentSession || !editorCanWrite){ showToast('Cal iniciar sessió amb permisos de gestor'); return; }
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

function bindSystem(){
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
    if(!confirm('Vols netejar l’antic esborrany local d’aquest navegador? Les dades de Supabase no es tocaran.'))return;
    BandaStore.clearLocal();
    showToast('Memòria local netejada');
  };
}
function roleEditorLabel(role){
  return ({admin:'USER ADMIN',gestor:'USER GESTOR',standard:'USER STANDARD'})[role] || String(role||'USER').toUpperCase();
}

function canDeleteUserProfile(profile){
  if(!profile || !currentSession || !currentProfile) return false;
  if(profile.user_id===currentSession.user.id) return false;
  if(profile.role==='admin') return false;
  if(currentProfile.role==='admin') return ['gestor','standard'].includes(profile.role);
  if(currentProfile.role==='gestor') return profile.role==='standard';
  return false;
}

function renderUsers(){
  const list=$('#usersList'); if(!list) return;
  $('#usersCount').textContent=userProfiles.length;
  list.innerHTML=userProfiles.length?userProfiles.map(profile=>{
    const deleteBtn=canDeleteUserProfile(profile)?`<button class="tiny-btn delete" data-delete-user="${esc(profile.user_id)}" title="Eliminar usuari" aria-label="Eliminar ${esc(profile.name||profile.email||'usuari')}">×</button>`:'';
    return `<article class="list-item user-list-item"><div class="list-main"><div class="list-kicker"><span>${esc(roleEditorLabel(profile.role))}</span>${profile.must_change_password?'<span>·</span><span class="gold-note">PENDENT DE CONFIGURAR</span>':''}</div><h3>${esc(profile.name||'Sense nom')}</h3><p>${esc(profile.email||'')}</p></div>${deleteBtn?`<div class="list-actions">${deleteBtn}</div>`:''}</article>`;
  }).join(''):'<div class="empty-state">Encara no hi ha usuaris.</div>';
  $$('[data-delete-user]').forEach(btn=>btn.onclick=()=>deleteManagedUserFromEditor(btn.dataset.deleteUser));
}

async function deleteManagedUserFromEditor(userId){
  if(!editorCanWrite || !userId) return;
  const profile=userProfiles.find(row=>row.user_id===userId);
  if(!profile || !canDeleteUserProfile(profile)) return;
  const label=profile.name||profile.email||'aquest usuari';
  const ok=confirm(`Vols eliminar completament ${label}?\n\nS'esborrarà el seu accés de Supabase Auth i el seu perfil. Aquesta acció no es pot desfer.`);
  if(!ok) return;
  try{
    showToast('Eliminant usuari…');
    await BandaSupabase.deleteManagedUser(userId);
    await loadUsers();
    showToast('Usuari eliminat completament');
  }catch(error){
    console.error(error);
    const message=String(error?.message||'No s’ha pogut eliminar l’usuari.');
    if(/ADMIN_CANNOT_BE_DELETED/i.test(message)) showToast('El USER ADMIN no es pot eliminar des de l’EDITOR');
    else if(/GESTOR_CANNOT_DELETE_GESTOR/i.test(message)) showToast('Un USER GESTOR només pot eliminar USER STANDARD');
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
  $('#createUserForm')?.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!editorCanWrite) return;
    const name=$('#newUserName').value.trim();
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
      if(/rate|limit/i.test(message)) status.textContent='Límit temporal d’emails de Supabase. No s’ha creat el compte; torna-ho a provar més tard o configura SMTP propi.';
      else if(/EMAIL_ALREADY_REGISTERED|already registered/i.test(message)) status.textContent='Aquest email ja correspon a un usuari confirmat. Revisa el compte existent.';
      else if(/already|exists/i.test(message)) status.textContent='Aquest email ja existeix a Supabase Auth. Revisa l’usuari existent.';
      else if(/function|404|not found/i.test(message)) status.textContent='La funció create-band-user no està desplegada/actualitzada. Desplega la versió v0.29 inclosa al paquet.';
      else status.textContent=`ERROR: ${message}`;
    }finally{btn.disabled=false;}
  });
}

function renderAll(){ renderDashboard(); renderHomeEditor(); renderEvents(); renderDresscodeEventOptions(); renderDresscodes(); renderTracks(); renderAudioLibrary(); renderHistoric(); renderHemerotecaEditor(); renderSystem(); renderUsers(); }
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
  const badge=$('#editorAccessBadge');
  if(badge){badge.textContent=editorCanWrite?`GESTIÓ · ${String(currentProfile?.role||'').toUpperCase()}`:'—';badge.classList.toggle('write',editorCanWrite);badge.classList.remove('readonly');}
}

function showEditorGate(status='Introdueix les teves credencials de gestió.'){
  currentSession=null; currentProfile=null; editorGuestMode=false; editorCanWrite=false;
  const gate=$('#editorLoginGate'), shell=$('#editorShell');
  gate?.classList.remove('is-hidden');
  if(shell){shell.setAttribute('aria-hidden','true');shell.classList.remove('is-ready','editor-readonly');}
  $('#editorUserEmail').textContent='Sense sessió';
  if($('#loginStatus')) $('#loginStatus').textContent=status;
}

function updatePermissionUi(){
  if(!editorCanWrite) return;
  const saveState=$('#saveState'); if(saveState && saveState.textContent==='PENDENT D’AUTORITZACIÓ') saveState.textContent='DADES CARREGADES';
  const storageBadge=$('#storageBadge'); if(storageBadge) storageBadge.textContent='SUPABASE';
  const systemProtocol=$('#systemProtocol'); if(systemProtocol) systemProtocol.textContent='SUPABASE · gestió autenticada';
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
      content=BandaStore.normalize(legacyLocalContent);
      supabaseActive=false; migrationPending=true;
      markSaved('CAL MIGRAR A SUPABASE');
      showToast('Supabase està buit · migra les dades actuals des de SISTEMA');
    }else{
      content=BandaStore.normalize(remote||BandaStore.defaults());
      content.settings=content.settings||{};
      content.settings.supabaseInitialized=true;
      content=await BandaSupabase.saveContent(content);
      BandaStore.cacheRemote?.(content);
      supabaseActive=true; migrationPending=false;
      markSaved('DESAT A SUPABASE');
    }
    renderAll(); updatePermissionUi(); await loadUsers();
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
  if(!window.BandaSupabase?.enabled){showEditorGate('Supabase no està configurat. L’EDITOR necessita connexió autenticada.');return;}
  try{
    const session=await BandaSupabase.session();
    if(session) await activateSupabaseEditor(session);
    else showEditorGate('Introdueix les teves credencials de gestió.');
  }catch(error){console.error(error);showEditorGate('No s’ha pogut connectar amb Supabase.');}
}

function editorIsStandalone(){
  try{
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.navigator.standalone === true ||
      String(document.referrer || '').startsWith('android-app://');
  }catch(_error){
    return window.navigator.standalone === true;
  }
}
function editorIsIOS(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent || '') ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function syncEditorInstallButton(){
  const btn=$('#editorInstallBtn'), cardBtn=$('#editorInstallCardBtn'), card=$('#editorInstallCard'), status=$('#editorInstallCardStatus');
  const installed=editorIsStandalone();
  if(btn) btn.hidden=installed;
  if(card) card.hidden=installed;
  if(installed) return;
  [btn,cardBtn].filter(Boolean).forEach(target=>{
    target.disabled=false;
    target.classList.toggle('install-ready',!!editorInstallPrompt);
    target.textContent='INSTAL·LAR EDITOR';
    target.title='Instal·lar BANDA DE LA CALA · EDITOR';
  });
  if(status) status.textContent=editorInstallPrompt ? 'Preparat · prem INSTAL·LAR EDITOR.' : 'Prem INSTAL·LAR EDITOR.';
}
async function waitForNativeEditorInstallPrompt(timeout=1800){
  if(editorInstallPrompt) return editorInstallPrompt;
  return await new Promise(resolve=>{
    let done=false,timer=0;
    const finish=value=>{
      if(done)return;
      done=true;
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt',onPrompt);
      resolve(value || editorInstallPrompt || null);
    };
    const onPrompt=event=>{
      event.preventDefault();
      editorInstallPrompt=event;
      syncEditorInstallButton();
      finish(event);
    };
    window.addEventListener('beforeinstallprompt',onPrompt,{once:true});
    timer=setTimeout(()=>finish(editorInstallPrompt),timeout);
  });
}
async function launchEditorInstall(){
  if(editorIsStandalone()){
    syncEditorInstallButton();
    return;
  }
  if(editorIsIOS()){
    alert('A Safari: prem Compartir i després “Afegir a la pantalla d’inici”.');
    return;
  }
  const prompt=editorInstallPrompt || await waitForNativeEditorInstallPrompt();
  if(!prompt){
    const status=$('#editorInstallCardStatus');
    if(status) status.textContent='Chrome encara no ha ofert el diàleg d’instal·lació.';
    return;
  }
  try{
    prompt.prompt();
    const choice=await prompt.userChoice;
    if(editorInstallPrompt===prompt) editorInstallPrompt=null;
    if(choice?.outcome==='accepted') showToast('EDITOR instal·lat');
  }catch(error){
    console.warn('EDITOR install',error);
    const status=$('#editorInstallCardStatus');
    if(status) status.textContent='No s’ha pogut obrir el diàleg d’instal·lació.';
  }finally{
    syncEditorInstallButton();
  }
}
function bindEditorPwaInstall(){
  const btn=$('#editorInstallBtn'), cardBtn=$('#editorInstallCardBtn');
  if(!btn && !cardBtn) return;
  syncEditorInstallButton();
  btn?.addEventListener('click',launchEditorInstall);
  cardBtn?.addEventListener('click',launchEditorInstall);
  window.addEventListener('appinstalled',()=>{
    showToast('EDITOR instal·lat');
  });
  window.matchMedia?.('(display-mode: standalone)')?.addEventListener?.('change',syncEditorInstallButton);
}
async function registerEditorSW(){
  if(location.protocol==='file:' || !('serviceWorker' in navigator)) return;
  try{
    const root=new URL('../',location.href);
    const swUrl=new URL('editor/sw.js?v=0.34',root).href;
    const scopeUrl=new URL('editor/',root).href;
    const reg=await navigator.serviceWorker.register(swUrl,{scope:scopeUrl,updateViaCache:'none'});
    try{ await reg.update(); }catch(_error){}
  }catch(error){ console.warn('EDITOR SW',error); }
}

function init(){ bootIdentity(); bindNavigation(); bindHomeEditor(); bindEventForm(); bindDresscodes(); bindTrackForm(); bindAudioLibrary(); bindHistoric(); bindHemerotecaEditor(); bindSystem(); bindUsers(); bindExternalUpdates(); bindEditorAuth(); bindEditorPwaInstall(); registerEditorSW(); renderAll(); resetEventForm(); resetTrackForm(); resetDresscodeForm(); resetHistoricForm(); resetHemerotecaForm(); initEditorBackend(); }
init();
