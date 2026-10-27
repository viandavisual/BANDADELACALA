/* BANDA DE LA CALA v0.140 — 3 caixes de notificacions */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function session(){const c=window.BandaSupabase?.getClient?.();if(!c)throw Error('Supabase no disponible');const {data:{session},error}=await c.auth.getSession();if(error||!session)throw Error('Cal iniciar sessió');return session;}
async function call(mode,title,body){const s=await session();const url=String(window.BANDA_CONFIG?.supabase?.url||'').replace(/\/$/,'')+'/functions/v1/send-push-notification';let r;try{r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.access_token,'apikey':window.BANDA_CONFIG.supabase.publishableKey},body:JSON.stringify({mode,title,body})});}catch(e){throw Error('Error de connexió: '+e.message)}const output=await r.json().catch(()=>({}));if(!r.ok)throw Error(output.error||('HTTP '+r.status));return output;}
function setup(formId,titleId,bodyId,buttonId,statusId,mode){const f=$(formId);if(!f)return;f.addEventListener('submit',async e=>{e.preventDefault();const title=$(titleId).value.trim(),body=$(bodyId).value.trim();if(!title||!body)return;const ask=mode==='broadcast'?'ATENCIÓ: enviar ara aquesta notificació a TOTS els dispositius subscrits? Aquesta acció no es pot desfer.':'Enviar la prova només als teus dispositius?';if(!confirm(ask))return;const btn=$(buttonId),stat=$(statusId);btn.disabled=true;stat.textContent='Enviant...';try{const r=await call(mode,title,body);stat.textContent=`Resultat: ${r.sent||0} enviades, ${r.failed||0} fallides, ${r.total||0} dispositius.`;}catch(err){stat.textContent='No s’ha pogut enviar: '+err.message}finally{btn.disabled=false}});}
setup('manualPushForm','manualPushTitle','manualPushBody','manualPushSend','manualPushStatus','self');
setup('broadcastPushForm','broadcastPushTitle','broadcastPushBody','broadcastPushSend','broadcastPushStatus','broadcast');
function timeMadrid(date,time){const raw=String(date||'')+'T'+String(time||'00:00');if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw))return NaN;const guess=Date.parse(raw+':00Z');if(!Number.isFinite(guess))return NaN;let instant=guess;for(let i=0;i<3;i++){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant));const m=Object.fromEntries(parts.map(p=>[p.type,p.value]));const observed=Date.UTC(+m.year,+m.month-1,+m.day,+m.hour,+m.minute);instant+=guess-observed;}return instant;}
function formatReminder(instant,now){
 if(instant<=now)return 'Ja ha passat';
 return new Date(instant).toLocaleString('ca-ES',{timeZone:'Europe/Madrid',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
function renderUpcoming(){
 const host=$('pushUpcoming');if(!host)return;
 let events=[];
 try{const c=window.BandaStore?.loadRemoteCache?.()||window.BandaStore?.loadPublished?.();events=Array.isArray(c?.events)?c.events:[]}catch(e){}
 const now=Date.now();
 const listed=events.map(e=>({...e,at:timeMadrid(e.date,e.time)}))
   .filter(e=>Number.isFinite(e.at)&&e.at>now&&e.at-9*3600000>now)
   .sort((a,b)=>a.at-b.at).slice(0,5);
 host.innerHTML=listed.length?listed.map((e,i)=>{
  const kind=String(e.type||'').toUpperCase();
  const colorClass=kind==='ASSAIG'?'event-strip-rehearsal':(kind==='ALTRES'?'event-strip-other':'event-strip-featured');
  const when=String(e.date||'').split('-').reverse().join('/');
  return `<article class="event-strip push-event-strip ${colorClass}">
   <button type="button" class="event-strip-summary push-event-summary" aria-expanded="false" aria-controls="push-event-detail-${i}">
    <span class="event-strip-title">${escape(e.title||'Esdeveniment')}</span>
    <span class="event-strip-date">${escape(when)} · ${escape(e.time||'')}</span>
    <span class="event-strip-chevron" aria-hidden="true">⌄</span>
   </button>
   <div class="event-strip-details push-event-details" id="push-event-detail-${i}" hidden>
    <div class="event-strip-detail-grid push-reminder-grid">
     <div><span>TIPUS D'ESDEVENIMENT</span><strong>${escape(e.type||'—')}</strong></div>
     <div><span>RECORDATORI · 24 H ABANS</span><strong>${escape(formatReminder(e.at-86400000,now))}</strong></div>
     <div><span>RECORDATORI · 9 H ABANS</span><strong>${escape(formatReminder(e.at-32400000,now))}</strong></div>
    </div>
   </div>
  </article>`;
 }).join(''):'<p class="helper-copy">No hi ha esdeveniments amb avisos pendents.</p>';
 host.querySelectorAll('.push-event-summary').forEach(button=>button.addEventListener('click',()=>{
  const article=button.closest('.push-event-strip');const detail=article?.querySelector('.push-event-details');if(!detail)return;
  const open=detail.hidden;detail.hidden=!open;article.classList.toggle('is-open',open);
  button.setAttribute('aria-expanded',String(open));
 }));
}
$('pushRefreshUpcoming')?.addEventListener('click',renderUpcoming);document.querySelector('[data-editor-nav="notifications"]')?.addEventListener('click',()=>setTimeout(renderUpcoming,50));renderUpcoming();
})();
