/* BANDA DE LA CALA v0.137 · APP Web Push. No inicia permisos sense un gest. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const status = () => $('pushSetupStatus');
  const say = message => {if (status()) status().textContent = message;};
  const button = () => $('pushEnableButton');
  const trial = () => $('pushTestButton');
  const closeBtn = () => $('pushCloseButton');
  const visibilityKey = userId => 'banda-push-closed-v0135:'+userId;
  let activeUserId = null;
  const activatedUI = isActive => {
    button().hidden = !!isActive;
    if (closeBtn()) closeBtn().hidden = !isActive;
    if (trial()) trial().hidden = !isActive;
    const box=$('pushSetupBox');
    if(box) box.style.display=(isActive && activeUserId && localStorage.getItem(visibilityKey(activeUserId))==='yes')?'none':'grid';
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
  // El tancament és una preferència local per usuari i dispositiu.
  // La sincronització remota mai no ha de reobrir la caixa per un error temporal.
  async function refresh() {
    const box=$('pushSetupBox'); if(!box || box.closest('[hidden]')) return;
    if(!supported()){
      box.style.display='grid';
      say('Aquest navegador no admet notificacions PUSH. Pots seguir utilitzant l’APP.');
      button().hidden=true; return;
    }
    const user=await sessionUser();
    if(!user){
      activeUserId=null; box.style.display='grid';
      say('Inicia sessió per activar els avisos.');
      button().hidden=true; trial().hidden=true; closeBtn().hidden=true; return;
    }
    activeUserId=user.id;
    const dismissed=localStorage.getItem(visibilityKey(user.id))==='yes';
    const permission=Notification.permission;
    if(permission==='denied'){
      localStorage.removeItem(visibilityKey(user.id));
      box.style.display='grid';
      say('Notificacions bloquejades. Activa-les des dels ajustos del navegador o dispositiu.');
      button().hidden=true;trial().hidden=true;closeBtn().hidden=true;return;
    }
    if(permission!=='granted'){
      localStorage.removeItem(visibilityKey(user.id));
      say('Pendent d’autoritzar al dispositiu.');
      button().textContent='ACTIVAR NOTIFICACIONS'; activatedUI(false); return;
    }
    // Amagar immediatament una caixa ja tancada sense esperar la xarxa.
    if(dismissed) box.style.display='none';
    button().textContent='REGISTRAR DISPOSITIU';
    if(!key){
      // Un canvi de configuració no anul·la el permís concedit ni el tancament.
      if(!dismissed){activatedUI(false);say('Permís concedit. Falta configurar la clau pública VAPID per activar els avisos remots.');}
      return;
    }
    try {
      const reg=await registration();
      const sub=await reg.pushManager.getSubscription();
      if(!sub){
        // La baixa d'una subscripció antiga no ha de reobrir el formulari.
        // Amb permís concedit, intentem renovar-la silenciosament.
        try {
          const renewed=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(key)});
          await syncSubscription(renewed,user);
          localStorage.setItem(visibilityKey(user.id),'yes');
          say('Notificacions PUSH activades en aquest dispositiu.');
          activatedUI(true);
        } catch (renewError) {
          console.warn('PUSH_SILENT_RENEW_PENDING',renewError?.message||renewError);
          if(!dismissed){
            say('Prem REGISTRAR DISPOSITIU per completar les notificacions.');
            activatedUI(false);
          }
        }
        return;
      }
      // La subscripció del navegador segueix vigent. Sincronització best-effort.
      say('Notificacions PUSH activades en aquest dispositiu.');
      activatedUI(true);
      try { await syncSubscription(sub,user); }
      catch(err){ console.warn('PUSH_SYNC_RETRY_LATER',err?.message||err); }
    } catch(err) {
      if(!dismissed){activatedUI(false);say('No s’ha pogut comprovar el dispositiu: '+err.message);}
      else console.warn('PUSH_CHECK_RETRY_LATER',err?.message||err);
    }
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
      activeUserId=user.id;
      localStorage.setItem(visibilityKey(user.id),'yes');
      say('Notificacions PUSH activades en aquest dispositiu.');
      activatedUI(true);
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
      if(activeUserId && button()?.hidden){
        localStorage.setItem(visibilityKey(activeUserId),'yes');
        $('pushSetupBox').style.display='none';
      }
    });
    const box=$('pushSetupBox');
    if(box && 'MutationObserver' in window){new MutationObserver(()=>{if(!box.closest('[hidden]'))refresh();}).observe($('userProfileCard'),{attributes:true,attributeFilter:['hidden']});}
    refresh();
  });
})();
