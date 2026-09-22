const CFG = window.BANDA_CONFIG || {};
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[char]));

let content = BandaStore.load();
let draggedTrackId = null;
let toastTimer = null;
let audioDirHandle = null;
let folderFallbackFiles = [];
let audioLibrary = [];

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
  system:{eyebrow:'CONFIGURACIÓ',title:'SISTEMA'}
};

function showToast(message){
  const toast=$('#toast'); toast.textContent=message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('show'),2800);
}
function markSaved(){ $('#saveState').textContent='DESAT'; clearTimeout(markSaved.timer); markSaved.timer=setTimeout(()=>$('#saveState').textContent='DADES CARREGADES',1400); }
function save(next=content,message='Canvis desats'){ content=BandaStore.save(next); renderAll(); markSaved(); if(message) showToast(message); }
function bootIdentity(){ $$('[data-app-name]').forEach(el=>el.textContent=CFG.appName||'BANDA DE LA CALA'); $$('[data-app-subtitle]').forEach(el=>el.textContent=CFG.subtitle||'L’Ametlla de Mar'); $$('[data-app-icon]').forEach(el=>el.src=CFG.appIcon||'assets/brand/app-icon.png'); $$('[data-app-version]').forEach(el=>el.textContent=CFG.version||'v0.9'); }
function switchEditorView(id){ if(!views[id]) id='dashboard'; $$('.editor-view').forEach(view=>view.classList.toggle('active',view.dataset.editorView===id)); $$('[data-editor-nav]').forEach(btn=>btn.classList.toggle('active',btn.dataset.editorNav===id)); $('#editorEyebrow').textContent=views[id].eyebrow; $('#editorTitle').textContent=views[id].title; window.scrollTo({top:0,behavior:'smooth'}); }
function bindNavigation(){ $$('[data-editor-nav]').forEach(btn=>btn.addEventListener('click',()=>switchEditorView(btn.dataset.editorNav))); $$('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>switchEditorView(btn.dataset.jump))); }
function formatDate(date){ if(!date) return 'Sense data'; const d=new Date(date+'T12:00:00'); return new Intl.DateTimeFormat('ca-ES',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(d).replace(/^./,c=>c.toUpperCase()); }

function renderDashboard(){
  const events=[...(content.events||[])].sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const tracks=content.tracks||[]; const now=new Date(); const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; const next=events.find(event=>event.date>=today);
  $('#statEvents').textContent=events.length; $('#statNextEvent').textContent=next?`${formatDate(next.date)} · ${next.title}`:'Cap activitat futura';
  $('#statDresscodes').textContent=(content.dresscodes||[]).length; $('#statTracks').textContent=tracks.length; $('#statVisibleTracks').textContent=`${tracks.filter(track=>track.visible!==false).length} visibles`;
}

function renderHomeEditor(){
  const src=content.settings?.homeHeroImage || CFG.logo || 'assets/brand/logo-banda-de-la-cala.png';
  $('#homeHeroPreview').src=src;
  const preview=$('.hero-preview'); if(preview) preview.style.setProperty('--hero-preview-image',`url(${JSON.stringify(src)})`);
}
async function compressImage(file){
  const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=dataUrl;});
  const maxW=1600,maxH=1000,scale=Math.min(1,maxW/img.width,maxH/img.height); const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(img.width*scale)); canvas.height=Math.max(1,Math.round(img.height*scale));
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height); return canvas.toDataURL('image/jpeg',0.84);
}
function bindHomeEditor(){
  $('#homeHeroFile').addEventListener('change',async event=>{ const file=event.target.files?.[0]; if(!file) return; try{ const compressed=await compressImage(file); content.settings=content.settings||{}; content.settings.homeHeroImage=compressed; save(content,'Imatge de HOME actualitzada'); }catch(error){showToast('No s’ha pogut processar la imatge');} event.target.value=''; });
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

function knownAudioFiles(){ return [...new Set((content.tracks||[]).map(t=>t.src).filter(src=>/^assets\/audio\//i.test(src)).map(src=>src.split('/').pop()))]; }
function renderAudioLibrary(files=audioLibrary){ audioLibrary=[...new Set([...knownAudioFiles(),...files])].sort((a,b)=>a.localeCompare(b,'ca')); const select=$('#audioLibrarySelect'); const current=select.value; select.innerHTML='<option value="">— Selecciona un fitxer detectat —</option>'+audioLibrary.map(name=>`<option value="assets/AUDIO/${esc(name)}">${esc(name)}</option>`).join(''); if([...select.options].some(o=>o.value===current)) select.value=current; $('#audioFolderStatus').textContent=`${audioLibrary.length} fitxer${audioLibrary.length===1?'':'s'} detectat${audioLibrary.length===1?'':'s'}`; }
async function refreshAudioDirectory(){
  try{
    if(audioDirHandle){ const names=[]; for await (const [name,handle] of audioDirHandle.entries()){ if(handle.kind==='file'&&/\.(mp3|wav|m4a|ogg)$/i.test(name)) names.push(name); } renderAudioLibrary(names); showToast('Carpeta AUDIO actualitzada'); return; }
    if(folderFallbackFiles.length){ renderAudioLibrary(folderFallbackFiles.filter(f=>/\.(mp3|wav|m4a|ogg)$/i.test(f.name)).map(f=>f.name)); showToast('Llista d’àudio actualitzada'); return; }
    renderAudioLibrary(); showToast('Selecciona primer la carpeta assets/AUDIO');
  }catch(error){showToast('No s’ha pogut llegir la carpeta AUDIO');}
}
async function chooseAudioFolder(){
  if('showDirectoryPicker' in window){
    try{ audioDirHandle=await window.showDirectoryPicker({mode:'readwrite'}); await refreshAudioDirectory(); return; }catch(error){ if(error?.name==='AbortError') return; }
  }
  $('#audioFolderInput').click();
}
async function copyMp3ToAudio(file){
  if(!audioDirHandle){ showToast('Selecciona primer la carpeta assets/AUDIO per poder copiar-hi l’MP3'); return false; }
  try{ const handle=await audioDirHandle.getFileHandle(file.name,{create:true}); const writable=await handle.createWritable(); await writable.write(file); await writable.close(); await refreshAudioDirectory(); return true; }catch(error){ showToast('No s’ha pogut copiar l’MP3 a assets/AUDIO'); return false; }
}
function bindAudioLibrary(){
  renderAudioLibrary(); $('#chooseAudioFolder').onclick=chooseAudioFolder; $('#refreshAudioFolder').onclick=refreshAudioDirectory;
  $('#audioFolderInput').addEventListener('change',event=>{ folderFallbackFiles=[...(event.target.files||[])]; renderAudioLibrary(folderFallbackFiles.map(f=>f.name)); showToast('Carpeta AUDIO detectada'); });
  $('#audioLibrarySelect').addEventListener('change',event=>{ const src=event.target.value; if(!src)return; $('#trackSrc').value=src; if(!$('#trackTitle').value.trim()) $('#trackTitle').value=src.split('/').pop().replace(/\.[^.]+$/,'').replace(/[_-]+/g,' '); updateTrackPreview(); });
  $('#uploadMp3Btn').onclick=async()=>{ if(!audioDirHandle){ showToast('Selecciona primer la carpeta assets/AUDIO'); await chooseAudioFolder(); if(!audioDirHandle) return; } $('#trackUploadInput').click(); };
  $('#trackUploadInput').addEventListener('change',async event=>{ const file=event.target.files?.[0]; if(!file)return; const copied=await copyMp3ToAudio(file); if(copied){ $('#trackSrc').value=`assets/AUDIO/${file.name}`; if(!$('#trackTitle').value.trim()) $('#trackTitle').value=file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' '); updateTrackPreview(); showToast('MP3 copiat a assets/AUDIO i preparat'); } event.target.value=''; });
}

function renderSystem(){ const date=content.updatedAt?new Date(content.updatedAt):null; $('#lastUpdated').textContent=date&&!Number.isNaN(date.valueOf())?new Intl.DateTimeFormat('ca-ES',{dateStyle:'medium',timeStyle:'short'}).format(date):'—'; $('#systemEvents').textContent=(content.events||[]).length; $('#systemDresscodes').textContent=(content.dresscodes||[]).length; $('#systemTracks').textContent=(content.tracks||[]).length; $('#systemProtocol').textContent=location.protocol==='file:'?'Fitxer local':location.host||location.protocol; $('#storageBadge').textContent=location.protocol==='file:'?'MODE LOCAL':'MATEIX ORIGEN'; }
async function savePublishedFile(){ const text=BandaStore.makePublishedJs(content); if('showSaveFilePicker' in window){try{const handle=await window.showSaveFilePicker({suggestedName:'content-published.js',types:[{description:'JavaScript',accept:{'text/javascript':['.js']}}]});const writable=await handle.createWritable();await writable.write(text);await writable.close();showToast('Fitxer content-published.js desat');return;}catch(error){if(error?.name==='AbortError')return;}} BandaStore.exportPublishedJs(content);showToast('Fitxer descarregat'); }
function bindSystem(){ $('#exportJsonBtn').onclick=()=>{BandaStore.exportJson(content);showToast('Còpia JSON creada');}; $('#importJsonBtn').onclick=()=>$('#importJsonInput').click(); $('#importJsonInput').addEventListener('change',event=>{const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{content=BandaStore.importObject(JSON.parse(reader.result));renderAll();showToast('Dades importades correctament');resetEventForm();resetTrackForm();resetDresscodeForm();}catch(error){showToast('El fitxer JSON no és vàlid');}event.target.value='';};reader.readAsText(file);}); $('#downloadPublishedBtn').onclick=()=>{BandaStore.exportPublishedJs(content);showToast('content-published.js descarregat');}; $('#savePublishedBtn').onclick=savePublishedFile; $('#resetLocalBtn').onclick=()=>{if(!confirm('Vols descartar tots els canvis locals i tornar al contingut publicat?'))return;content=BandaStore.clearLocal();renderAll();resetEventForm();resetTrackForm();resetDresscodeForm();showToast('Contingut local restaurat');}; }
function renderAll(){ renderDashboard(); renderHomeEditor(); renderEvents(); renderDresscodeEventOptions(); renderDresscodes(); renderTracks(); renderAudioLibrary(); renderSystem(); }
function bindExternalUpdates(){ window.addEventListener('banda-content-changed',event=>{content=BandaStore.normalize(event.detail);renderAll();}); }
function init(){ bootIdentity(); bindNavigation(); bindHomeEditor(); bindEventForm(); bindDresscodes(); bindTrackForm(); bindAudioLibrary(); bindSystem(); bindExternalUpdates(); renderAll(); resetEventForm(); resetTrackForm(); resetDresscodeForm(); }
init();
