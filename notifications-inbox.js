/* v0.155 · Local inbox, registered users only, device specific. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const DB='banda-notifications-v1';const STORE='messages';
 function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
 async function all(){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);tx.oncomplete=()=>db.close()})}
 async function remove(id){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>{db.close();res()};tx.onerror=()=>rej(tx.error)})}
 function safeUrl(raw){try{const url=new URL(raw||'/app/',location.origin);return url.origin===location.origin&&url.pathname.startsWith('/app/')?url.href:'/app/'}catch{return '/app/'}}
 const dateFmt=new Intl.DateTimeFormat('ca-ES',{dateStyle:'medium',timeStyle:'short'});
 // An automatic reminder expires at its event's local Europe/Madrid date and time.
 // For earlier notifications without expiresAt, resolve the event against current
 // calendar content when possible; when not, expire at the END of eventDate.
 function madridEpoch(date,time){
   const when=String(date||'')+'T'+String(time||'00:00');
   if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when))return NaN;
   const expected=Date.parse(when+':00Z');if(!Number.isFinite(expected))return NaN;
   let epoch=expected;
   for(let i=0;i<3;i++){
     const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(new Date(epoch));
     const d=Object.fromEntries(parts.map(part=>[part.type,part.value]));
     epoch+=expected-Date.UTC(+d.year,+d.month-1,+d.day,+d.hour,+d.minute);
   }
   return epoch;
 }
 function expireTime(msg){
   const fromPayload=Number(msg.expiresAt);
   if(Number.isFinite(fromPayload)&&fromPayload>0)return fromPayload;
   if(!/^\d{4}-\d{2}-\d{2}$/.test(String(msg.eventDate||'')))return NaN;
   try{
     const remote=window.BandaStore?.loadRemoteCache?.()||window.BandaStore?.loadPublished?.();
     const ev=remote?.events?.find(e=>String(e.id)===String(msg.eventId));
     if(ev?.date===msg.eventDate&&/^\d{2}:\d{2}$/.test(String(ev.time||'')))return madridEpoch(msg.eventDate,ev.time);
   }catch(_e){}
   return madridEpoch(msg.eventDate,'23:59')+60000;
 }
 async function pending(){
   const items=await all();const now=Date.now(),open=[];
   for(const msg of items){const expires=expireTime(msg); if(Number.isFinite(expires)&&expires<=now){await remove(msg.id);} else open.push(msg);}
   return open.sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
 }

 const dismissing=new Set();
 async function dismissNotification(id,card){
   if(id===undefined||id===null||dismissing.has(id))return;
   dismissing.add(id);
   // The notification disappears immediately, exactly as after a swipe.
   if(card){card.style.pointerEvents='none';card.remove();}
   try{await remove(id);}
   catch(err){console.warn('INBOX_DISMISS_ERROR',err);}
   finally{dismissing.delete(id);await render();}
 }
 async function render(){const list=$('userNotificationsList');if(!list)return;try{const messages=await pending();list.replaceChildren();if(!messages.length){const empty=document.createElement('p');empty.className='user-notifications-empty';empty.textContent='No tens notificacions pendents.';list.append(empty);return}
 for(const msg of messages){const card=document.createElement('div');card.className='user-notification-item';card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','Obrir notificació: '+String(msg.title||''));const title=document.createElement('strong');title.textContent=String(msg.title||'BANDA DE LA CALA');const body=document.createElement('span');body.textContent=String(msg.body||'');const date=document.createElement('time');date.textContent=dateFmt.format(new Date(msg.timestamp||Date.now()));card.append(title,body,date);
 const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='user-notification-dismiss';dismiss.textContent='×';dismiss.setAttribute('aria-label','Eliminar aquesta notificació');dismiss.title='Eliminar notificació';
 dismiss.dataset.notificationId=String(msg.id);
 dismiss.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();dismissNotification(msg.id,card);});
 dismiss.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();dismissNotification(msg.id,card);}});
 card.append(dismiss);
 const open=async()=>{
   const destination=new URL(safeUrl(msg.url),location.origin);
   if(msg.eventDate && /^\d{4}-\d{2}-\d{2}$/.test(msg.eventDate)){
     destination.searchParams.set('view','calendar');destination.searchParams.set('date',msg.eventDate);
     if(msg.eventId)destination.searchParams.set('event',msg.eventId);
   }
   await remove(msg.id);location.assign(destination.href);
  };card.addEventListener('click',ev=>{if(ev.target.closest('.user-notification-dismiss'))return;open()});card.addEventListener('keydown',ev=>{if(ev.target.closest('.user-notification-dismiss'))return;if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();open()}});
 let startX=null,startY=null;card.addEventListener('touchstart',ev=>{startX=ev.touches[0].clientX;startY=ev.touches[0].clientY},{passive:true});card.addEventListener('touchend',async ev=>{if(startX===null)return;const dx=ev.changedTouches[0].clientX-startX,dy=ev.changedTouches[0].clientY-startY;startX=null;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.35){ev.preventDefault();card.style.transform=`translateX(${dx>0?110:-110}%)`;card.style.opacity='0';await dismissNotification(msg.id,card)}},{passive:false});list.append(card)}
 }catch(err){list.textContent='No s’ha pogut carregar l’historial d’aquest dispositiu.';console.warn('INBOX_READ_ERROR',err)}}
 function openInbox(scrollBlock='nearest'){const box=$('userNotificationsBox');if(!box)return;box.open=true;box.setAttribute('aria-expanded','true');render();box.scrollIntoView({behavior:'smooth',block:scrollBlock})}
 function closeInbox(){const box=$('userNotificationsBox');if(!box)return;box.open=false;box.setAttribute('aria-expanded','false')}
 document.addEventListener('DOMContentLoaded',()=>{
   const box=$('userNotificationsBox');
   if(box){
     box.addEventListener('toggle',()=>{box.setAttribute('aria-expanded',box.open?'true':'false'); if(box.open) render()});
     box.setAttribute('aria-expanded',box.open?'true':'false');
   }
   navigator.serviceWorker?.addEventListener('message',event=>{
     if(event.data?.type==='BANDA_PUSH_RECEIVED'&&$('userNotificationsBox')?.open)render();
     if(event.data?.type==='BANDA_OPEN_INBOX')openInbox('start');
   });
   document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&$('userNotificationsBox')?.open)render()});
   const params=new URLSearchParams(location.search);
   if(params.get('view')==='user'&&params.get('inbox')==='1')setTimeout(()=>openInbox('start'),350);
 });
 window.BandaNotificationsInbox={render,openInbox,closeInbox};
})();
