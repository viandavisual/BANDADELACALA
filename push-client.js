/* BANDA DE LA CALA v0.134 · APP Web Push. No inicia permisos sense un gest. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const status = () => $('pushSetupStatus');
  const say = message => {if (status()) status().textContent = message;};
  const button = () => $('pushEnableButton');
  const trial = () => $('pushTestButton');
  const closeBtn = () => $('pushCloseButton');
  const reopenBtn = () => $('pushReopenButton');
  const activatedUI = isActive => {
    button().hidden = !!isActive;
    if (closeBtn()) closeBtn().hidden = !isActive;
    if (trial()) trial().hidden = !isActive;
  };
  const supported = () => ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext);
  const key = String(window.BANDA_CONFIG?.push?.vapidPublicKey || '').trim();
  function decodeKey(k) {
    const pad = '='.repeat((4-k.length%4)%4);
    const raw = atob((k+pad).replace(/-/g,'+').replace(/_/g,'/'));
    return Uint8Array.from([...raw].map(x=>x.charCodeAt(0)));
  }
  async function sessionUser() {
    const client = window.BandaSupabase?.getClient?.();
    if (!client) return null;
    const {data,error} = await client.auth.getUser();
    if (error) return null;
    return data?.user || null;
  }
  async function registration() {
    const root = new URL('app/',document.baseURI);
    return navigator.serviceWorker.register(new URL('sw.js',root),{scope:root.pathname,updateViaCache:'none'});
  }
  async function syncSubscription(subscription, user) {
    const client = window.BandaSupabase?.getClient?.();
    if (!client || !user) throw new Error('Cal iniciar sessió.');
    const json = subscription.toJSON();
    const {error} = await client.from('push_subscriptions').upsert({
      user_id:user.id, endpoint:json.endpoint,
      p256dh:json.keys?.p256dh, auth:json.keys?.auth,
      user_agent:navigator.userAgent.slice(0,300),updated_at:new Date().toISOString()
    },{onConflict:'endpoint'});
    if(error) throw error;
  }
  async function refresh() {
    const box=$('pushSetupBox'); if(!box || box.closest('[hidden]')) return;
    if(!supported()){say('Aquest navegador no admet notificacions PUSH. Pots seguir utilitzant l’APP.');button().hidden=true;return;}
    const user=await sessionUser(); if(!user){say('Inicia sessió per activar els avisos.');button().hidden=true;trial().hidden=true;return;}
    button().hidden=false;
    const permission=Notification.permission;
    if(permission==='denied'){say('Notificacions bloquejades. Activa-les des dels ajustos del navegador o dispositiu.');button().hidden=true;return;}
    if(permission!=='granted'){say('Pendent d’autoritzar al dispositiu.');button().textContent='ACTIVAR NOTIFICACIONS';activatedUI(false);return;}
    activatedUI(false);
    button().textContent='REGISTRAR DISPOSITIU';
    if(!key){say('Permís concedit. Falta configurar la clau pública VAPID per activar els avisos remots.');return;}
    try {
      const reg=await registration(); const sub=await reg.pushManager.getSubscription();
      if(sub){await syncSubscription(sub,user);say('Notificacions PUSH activades en aquest dispositiu.');activatedUI(true);}
      else say('Permís concedit. Prem REGISTRAR DISPOSITIU per activar PUSH.');
    } catch(err){say('No s’ha pogut sincronitzar el dispositiu: '+err.message);}
  }
  async function activate() {
    if(!supported())return;
    const user=await sessionUser();if(!user){say('Cal iniciar sessió.');return;}
    try {
      const permission=Notification.permission==='default'?await Notification.requestPermission():Notification.permission;
      if(permission!=='granted'){await refresh();return;}
      const reg=await registration();
      if(!key){say('Permís concedit. Cal configurar la clau VAPID per rebre PUSH remotes.');await refresh();return;}
      let sub=await reg.pushManager.getSubscription();
      if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(key)});
      await syncSubscription(sub,user);
      say('Notificacions PUSH activades en aquest dispositiu.');await refresh();
    } catch(err){say('No s’ha pogut activar: '+err.message);}
  }
  async function test() {
    if(Notification.permission!=='granted')return;
    try {
      const reg=await registration();
      await reg.showNotification('🎼 BANDA DE LA CALA · PROVA',{
        body:'Aquesta és una notificació de prova local.',
        icon:new URL('app/icons/icon-192.png',document.baseURI).href,
        data:{url:new URL('app/',document.baseURI).href},
        actions:[{action:'info',title:'+INFO'}]
      });
      say('Notificació local enviada. La prova PUSH remota necessita configurar el servidor.');
    } catch(err){say('Error en la prova local: '+err.message);}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    button()?.addEventListener('click',activate);
    trial()?.addEventListener('click',test);
    closeBtn()?.addEventListener('click',()=>{
      const box=$('pushSetupBox'), reopen=reopenBtn();
      if(box) box.style.display='none';
      if(reopen){reopen.hidden=false;reopen.style.display='block';}
    });
    reopenBtn()?.addEventListener('click',()=>{
      const box=$('pushSetupBox'), reopen=reopenBtn();
      if(box) box.style.display='grid';
      if(reopen){reopen.hidden=true;reopen.style.display='none';}
      refresh();
    });
    const box=$('pushSetupBox');
    if(box && 'MutationObserver' in window){new MutationObserver(()=>{if(!box.closest('[hidden]'))refresh();}).observe($('userProfileCard'),{attributes:true,attributeFilter:['hidden']});}
    refresh();
  });
})();
