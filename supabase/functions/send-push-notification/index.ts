// BANDA DE LA CALA v0.139 — self, broadcast i recordatoris 24h/9h.
// Deploy with Verify JWT OFF. All user requests validated internally.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
const cors={'Access-Control-Allow-Origin':'https://bandadelacala.viandavisual.com','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-api-version','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json'}});
const env=(key:string)=>Deno.env.get(key)||'';
const admin=()=>createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});
function parseMadrid(date:string,time:string){
 if(!/^\d{4}-\d\d-\d\d$/.test(date)||!/^\d\d:\d\d$/.test(time))return NaN;
 const guess=Date.parse(date+'T'+time+':00Z'); if(!Number.isFinite(guess))return NaN;
 let result=guess;
 for(let i=0;i<3;i++){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(result));
  const obj=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  const shown=Date.UTC(+obj.year,+obj.month-1,+obj.day,+obj.hour,+obj.minute);
  result+=guess-shown;
 }
 return result;
}
async function deliver(client:ReturnType<typeof admin>,subs:Array<{id:string;user_id:string;endpoint:string;p256dh:string;auth:string}>,title:string,body:string,tag:string){
 const payload=JSON.stringify({title,body,url:'/app/',tag});let sent=0,failed=0;
 // Sequential delivery avoids excessive simultaneous outgoing connections.
 for(const sub of subs){try{
  await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},payload,{TTL:3600});sent++;
 }catch(err){failed++;
  const code=Number((err as {statusCode?:number}).statusCode);
  if(code===404||code===410)await client.from('push_subscriptions').delete().eq('id',sub.id);
  console.error('PUSH_DELIVERY_ERROR',code,String((err as Error).message).slice(0,180));
 }}return {total:subs.length,sent,failed};
}
async function subscriptions(client:ReturnType<typeof admin>,userId?:string){
 const all:Array<{id:string;user_id:string;endpoint:string;p256dh:string;auth:string}>=[];
 for(let start=0;start<5000;start+=500){let query=client.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').range(start,start+499);if(userId)query=query.eq('user_id',userId);
  const {data,error}=await query;if(error)throw error;all.push(...(data||[]));if((data||[]).length<500)break;}
 return all;
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
 try{
  const a=admin();const input=await req.json();
  let mode=String(input.mode||'');
  const isCron=mode==='cron' && !!env('PUSH_CRON_SECRET') && req.headers.get('x-cron-secret')===env('PUSH_CRON_SECRET');
  let userId='';
  if(!isCron){
   const auth=req.headers.get('Authorization')||'';
   if(!auth.startsWith('Bearer '))return json({error:'UNAUTHORIZED'},401);
   const caller=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
   const {data:{user},error}=await caller.auth.getUser();if(error||!user)return json({error:'UNAUTHORIZED'},401);
   const {data:profile,error:profileError}=await a.from('profiles').select('role').eq('user_id',user.id).maybeSingle();
   if(profileError||!['admin','gestor'].includes(profile?.role))return json({error:'FORBIDDEN'},403);
   userId=user.id;
  }
  const publicKey=env('VAPID_PUBLIC_KEY'),privateKey=env('VAPID_PRIVATE_KEY'),subject=env('VAPID_SUBJECT');
  if(!publicKey||!privateKey||!subject)return json({error:'MISSING_VAPID_CONFIGURATION'},503);
  webpush.setVapidDetails(subject,publicKey,privateKey);
  if(isCron){
   const {data:record,error}=await a.from('app_content').select('content').eq('id','main').single();if(error)throw error;
   const events=Array.isArray(record?.content?.events)?record.content.events:[];
   const now=Date.now();let due=0,sent=0,failed=0;
   const allSubs=await subscriptions(a);
   for(const e of events){
    const at=parseMadrid(String(e.date||''),String(e.time||''));if(!Number.isFinite(at))continue;
    for(const hours of [24,9]){
     const when=at-hours*3600000;
     // A missed schedule older than 15 min must not send an obsolete reminder.
     if(when>now||now-when>15*60000)continue;
     const eventId=String(e.id||'');if(!eventId)continue;
     const jobKey=[eventId,e.date,e.time,hours].join('|');
     const {data:claimed,error:claimError}=await a.from('push_reminder_deliveries').insert({job_key:jobKey,event_id:eventId,hours_before:hours,status:'processing'}).select('job_key').maybeSingle();
     if(claimError){if(claimError.code==='23505')continue;throw claimError;}
     if(!claimed)continue;
     due++;
     const title=hours===24?'🎼 Recordatori: demà':'🎼 Recordatori: avui';
     const body=`${String(e.title||'Esdeveniment').slice(0,120)} · ${e.time} h · ${String(e.place||'').slice(0,90)}`;
     const outcome=await deliver(a,allSubs,title,body,'banda-'+jobKey);sent+=outcome.sent;failed+=outcome.failed;
     await a.from('push_reminder_deliveries').update({status:outcome.failed?'partial':'sent',sent_count:outcome.sent,failed_count:outcome.failed,finished_at:new Date().toISOString()}).eq('job_key',jobKey);
    }
   }
   return json({due,sent,failed});
  }
  if(!['self','broadcast'].includes(mode))return json({error:'INVALID_MODE'},400);
  const title=String(input.title||'').trim().slice(0,120),body=String(input.body||'').trim().slice(0,300);
  if(!title||!body)return json({error:'MISSING_TEXT'},400);
  const list=await subscriptions(a,mode==='self'?userId:undefined);
  const result=await deliver(a,list,title,body,'banda-'+mode+'-'+Date.now());return json(result);
 }catch(err){console.error('PUSH_SERVER_ERROR',String((err as Error).message).slice(0,300));return json({error:'PUSH_SERVER_ERROR'},500)}
});
