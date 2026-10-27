/* v0.143 · Local inbox, registered users only, device specific. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const DB='banda-notifications-v1';const STORE='messages';
 function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
 async function all(){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);tx.oncomplete=()=>db.close()})}
 async function remove(id){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>{db.close();res()};tx.onerror=()=>rej(tx.error)})}
 function safeUrl(raw){try{const url=new URL(raw||'/app/',location.origin);return url.origin===location.origin&&url.pathname.startsWith('/app/')?url.href:'/app/'}catch{return '/app/'}}
 const dateFmt=new Intl.DateTimeFormat('ca-ES',{dateStyle:'medium',timeStyle:'short'});
 async function render(){const list=$('userNotificationsList');if(!list)return;try{const messages=(await all()).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));list.replaceChildren();if(!messages.length){const empty=document.createElement('p');empty.className='user-notifications-empty';empty.textContent='No tens notificacions pendents.';list.append(empty);return}
 for(const msg of messages){const card=document.createElement('div');card.className='user-notification-item';card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','Obrir notificació: '+String(msg.title||''));const title=document.createElement('strong');title.textContent=String(msg.title||'BANDA DE LA CALA');const body=document.createElement('span');body.textContent=String(msg.body||'');const date=document.createElement('time');date.textContent=dateFmt.format(new Date(msg.timestamp||Date.now()));card.append(title,body,date);
 const open=async()=>{
   const destination=new URL(safeUrl(msg.url),location.origin);
   if(msg.eventDate && /^\d{4}-\d{2}-\d{2}$/.test(msg.eventDate)){
     destination.searchParams.set('view','calendar');destination.searchParams.set('date',msg.eventDate);
     if(msg.eventId)destination.searchParams.set('event',msg.eventId);
   }
   await remove(msg.id);location.assign(destination.href);
  };card.addEventListener('click',open);card.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();open()}});
 let startX=null,startY=null;card.addEventListener('touchstart',ev=>{startX=ev.touches[0].clientX;startY=ev.touches[0].clientY},{passive:true});card.addEventListener('touchend',async ev=>{if(startX===null)return;const dx=ev.changedTouches[0].clientX-startX,dy=ev.changedTouches[0].clientY-startY;startX=null;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.35){ev.preventDefault();card.style.transform=`translateX(${dx>0?110:-110}%)`;card.style.opacity='0';await remove(msg.id);setTimeout(render,165)}},{passive:false});list.append(card)}
 }catch(err){list.textContent='No s’ha pogut carregar l’historial d’aquest dispositiu.';console.warn('INBOX_READ_ERROR',err)}}
 document.addEventListener('DOMContentLoaded',()=>{$('openNotificationsHubBtn')?.addEventListener('click',()=>{const panel=$('userNotificationsPanel');const btn=$('openNotificationsHubBtn');if(!panel)return;panel.hidden=!panel.hidden;btn?.setAttribute('aria-expanded',panel.hidden?'false':'true');if(!panel.hidden){render();panel.scrollIntoView({behavior:'smooth',block:'nearest'})}});$('closeUserNotificationsBtn')?.addEventListener('click',()=>{$('userNotificationsPanel').hidden=true;$('openNotificationsHubBtn')?.setAttribute('aria-expanded','false')});navigator.serviceWorker?.addEventListener('message',event=>{
 if(event.data?.type==='BANDA_PUSH_RECEIVED'&&!$('userNotificationsPanel')?.hidden)render();
 if(event.data?.type==='BANDA_OPEN_INBOX'){const p=$('userNotificationsPanel');if(p){p.hidden=false;$('openNotificationsHubBtn')?.setAttribute('aria-expanded','true');render();p.scrollIntoView({behavior:'smooth',block:'start'})}}
})});
})();
