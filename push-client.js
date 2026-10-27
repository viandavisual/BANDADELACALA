/* BANDA DE LA CALA v0.138 · APP Web Push. No inicia permisos sense un gest. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const status = () => $('pushSetupStatus');
  const say = message => {if (status()) status().textContent = message;};
  const button = () => $('pushEnableButton');
  const trial = () => $('pushTestButton');
  const closeBtn = () => $('pushCloseButton');
  // La decisió de tancar la caixa és independent de la sincronització PUSH.
  const visibilityKey = userId => 'banda-push-closed-v0135:'+userId; // Compatible amb les versions anteriors.
  let activeUserId = null;
  const box = () => $('pushSetupBox');
  const closed = userId => {
    try { return localStorage.getItem(visibilityKey(userId)) === 'yes'; }
    catch (_) { return false; }
  };
  const rememberClosed = userId => {
    try { localStorage.setItem(visibilityKey(userId), 'yes'); } catch (_) {}
  };
  const showBox = () => { if(box()) { box().hidden=false; box().style.display='grid'; } };
  const hideBox = () => { if(box()) { box().hidden=true; box().style.display='none'; } };
  const activatedUI = isActive => {
    if(button()) button().hidden = !!isActive;
    if(closeBtn()) closeBtn().hidden = !isActive;
    if(trial()) trial().hidden = !isActive;
    if(activeUserId && closed(activeUserId)) hideBox();
    else showBox();
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
  // Només la comprovació explícita dels permisos pot obrir una caixa ja tancada.
  // Ni els errors de xarxa, ni el canvi de sessió, ni l'absència temporal de
  // subscripció revoquen la preferència de l'usuari.
  async function refresh() {
    if(!box() || box().closest('#userProfileCard[hidden]')) return;
    hideBox(); // Evita qualsevol flaix visual mentre comprovem la sessió.
    const user=await sessionUser();
    if(!user) { activeUserId=null; return; }
    activeUserId=user.id;
    const wasClosed=closed(user.id);
    if(!supported()) {
      if(!wasClosed) { showBox(); say('Aquest navegador no admet notificacions PUSH. Pots seguir utilitzant l’APP.');button().hidden=true;trial().hidden=true;closeBtn().hidden=true; }
      return;
    }
    const permission=Notification.permission;
    if(permission==='denied') {
      // Denegació explícita: cal avisar perquè no podem lliurar PUSH.
      showBox(); say('Notificacions bloquejades. Activa-les des dels ajustos del navegador o dispositiu.');
      button().hidden=true;trial().hidden=true;closeBtn().hidden=true;return;
    }
    if(wasClosed) {
      hideBox();
      if(permission==='granted' && key) {
        // Renovació opcional sense alterar la interfície.
        try {
          const reg=await registration();
          let sub=await reg.pushManager.getSubscription();
          if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(key)});
          await syncSubscription(sub,user);
        } catch(err) { console.warn('PUSH_BACKGROUND_SYNC_RETRY',err?.message||err); }
      }
      return;
    }
    if(permission!=='granted') {
      button().textContent='ACTIVAR NOTIFICACIONS';
      say('Pendent d’autoritzar al dispositiu.');activatedUI(false);return;
    }
    if(!key) {
      button().textContent='REGISTRAR DISPOSITIU';
      say('Permís concedit. Falta configurar la clau pública VAPID per activar els avisos remots.');activatedUI(false);return;
    }
    try {
      const reg=await registration();
      let sub=await reg.pushManager.getSubscription();
      if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(key)});
      try { await syncSubscription(sub,user); }
      catch(err) { console.warn('PUSH_SYNC_RETRY_LATER',err?.message||err); }
      // Una subscripció funcional ja existia. No cal mostrar una caixa d'alta.
      rememberClosed(user.id);
      say('Notificacions PUSH activades en aquest dispositiu.');
      hideBox();
    } catch(err) {
      button().textContent='REGISTRAR DISPOSITIU';activatedUI(false);
      say('No s’ha pogut comprovar el dispositiu: '+(err?.message||err));
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
        rememberClosed(activeUserId);
        hideBox();
      }
    });
    hideBox();
    const profile=$('userProfileCard');
    if(profile && 'MutationObserver' in window){new MutationObserver(()=>{if(!profile.hidden)refresh();}).observe(profile,{attributes:true,attributeFilter:['hidden']});}
    refresh();
  });
})();
