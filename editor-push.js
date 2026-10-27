/* v0.137 · Prova PUSH remota exclusivament als dispositius de l'usuari emissor. */
(()=>{'use strict';
const form=document.getElementById('manualPushForm');if(!form)return;
form.addEventListener('submit',async event=>{
  event.preventDefault();
  const status=document.getElementById('manualPushStatus'),send=document.getElementById('manualPushSend');
  const title=document.getElementById('manualPushTitle').value.trim(),body=document.getElementById('manualPushBody').value.trim();
  if(!title||!body)return;
  if(!window.confirm('Enviar una notificació PUSH real als dispositius del teu usuari?'))return;
  send.disabled=true;status.textContent='Enviant…';
  try{
    const client=window.BandaSupabase?.getClient?.();if(!client)throw new Error('Supabase no disponible');
    const {data:{session},error:authError}=await client.auth.getSession();
    if(authError||!session)throw new Error('Cal iniciar sessió.');
    const endpoint=String(window.BANDA_CONFIG?.supabase?.url||'').replace(/\/$/,'')+'/functions/v1/send-push-notification';
    let res;
    try {
      res=await fetch(endpoint,{method:'POST',mode:'cors',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':window.BANDA_CONFIG.supabase.publishableKey},body:JSON.stringify({mode:'self',title,body,url:'/app/'})});
    } catch (networkError) {
      throw new Error('Connexió bloquejada (CORS o xarxa). Comprova que send-push-notification està desplegada i té Verify JWT desactivat; la funció valida l’usuari i el rol internament.');
    }
    const response=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(response.error||('HTTP '+res.status));
    status.textContent=`Resultat: ${response.sent||0} enviades, ${response.failed||0} fallides, ${response.total||0} dispositius.`;
  }catch(error){status.textContent='No s’ha pogut enviar: '+error.message;}
  finally{send.disabled=false;}
});
})();
