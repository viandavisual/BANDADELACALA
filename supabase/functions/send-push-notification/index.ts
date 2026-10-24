// BANDA DE LA CALA v0.135 · Push de prova a dispositius propis.
// IMPORTANT: desplegar com a Edge Function amb Verify JWT activat.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
const cors={'Access-Control-Allow-Origin':'https://bandadelacala.viandavisual.com','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
 try{
  const auth=req.headers.get('Authorization')||'';
  if(!auth.startsWith('Bearer '))return json({error:'UNAUTHORIZED'},401);
  const url=Deno.env.get('SUPABASE_URL')||'';
  const anon=Deno.env.get('SUPABASE_ANON_KEY')||'';
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  if(!url||!anon||!service)return json({error:'SERVER_NOT_CONFIGURED'},503);
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data:{user},error:userError}=await userClient.auth.getUser();
  if(userError||!user)return json({error:'UNAUTHORIZED'},401);
  const admin=createClient(url,service,{auth:{persistSession:false}});
  const {data:profile,error:profileError}=await admin.from('profiles').select('role').eq('user_id',user.id).maybeSingle();
  if(profileError||!['admin','gestor'].includes(profile?.role))return json({error:'FORBIDDEN'},403);
  const input=await req.json();
  if(input.mode!=='self')return json({error:'ONLY_SELF_TEST_ENABLED'},400);
  const title=String(input.title||'').trim().slice(0,120),body=String(input.body||'').trim().slice(0,300);
  if(!title||!body)return json({error:'MISSING_TEXT'},400);
  const publicKey=Deno.env.get('VAPID_PUBLIC_KEY')||'';
  const privateKey=Deno.env.get('VAPID_PRIVATE_KEY')||'';
  const subject=Deno.env.get('VAPID_SUBJECT')||'';
  if(!publicKey||!privateKey||!/^mailto:[^@ ]+@[^@ ]+\.[^@ ]+$|^https:\/\//.test(subject))return json({error:'MISSING_VAPID_CONFIGURATION'},503);
  webpush.setVapidDetails(subject,publicKey,privateKey);
  const {data:subs,error:subsError}=await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id',user.id).limit(30);
  if(subsError)throw subsError;
  const payload=JSON.stringify({title,body,url:'/app/',tag:'banda-manual-'+Date.now()});
  let sent=0,failed=0;
  for(const sub of subs||[]){
    try{
      await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},payload,{TTL:300});sent++;
    }catch(err){failed++;
      if([404,410].includes(Number((err as {statusCode?:number}).statusCode)))await admin.from('push_subscriptions').delete().eq('id',sub.id).eq('user_id',user.id);
      console.error('PUSH_DELIVERY_ERROR',String((err as Error).message).slice(0,200));
    }
  }
  return json({total:(subs||[]).length,sent,failed});
 }catch(err){console.error('PUSH_ERROR',String((err as Error).message).slice(0,200));return json({error:'PUSH_SERVER_ERROR'},500);}
});
