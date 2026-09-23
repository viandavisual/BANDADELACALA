(function(){
  'use strict';
  const CFG = window.BANDA_CONFIG?.supabase || {};
  const enabled = !!(CFG.enabled && CFG.url && CFG.publishableKey);
  let client = null;
  let contentChannel = null;

  function getClient(){
    if(!enabled) return null;
    if(client) return client;
    if(!window.supabase?.createClient) return null;
    client = window.supabase.createClient(CFG.url, CFG.publishableKey, {
      auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
    });
    return client;
  }

  function normalizeContent(content){
    return window.BandaStore?.normalize ? BandaStore.normalize(content) : content;
  }

  async function session(){
    const c=getClient(); if(!c) return null;
    const {data,error}=await c.auth.getSession();
    if(error) throw error;
    return data.session || null;
  }

  async function signIn(email,password){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const {data,error}=await c.auth.signInWithPassword({email,password});
    if(error) throw error;
    return data.session;
  }

  async function signOut(){
    const c=getClient(); if(!c) return;
    const {error}=await c.auth.signOut();
    if(error) throw error;
  }

  async function getMyProfile(){
    const c=getClient(); if(!c) return null;
    const currentSession=await session();
    if(!currentSession) return null;
    let result=await c.from('profiles')
      .select('user_id,email,name,role,avatar_key,must_change_password,created_at')
      .eq('user_id',currentSession.user.id)
      .maybeSingle();
    if(result.error && /avatar_key/i.test(result.error.message||'')){
      result=await c.from('profiles')
        .select('user_id,email,name,role,must_change_password,created_at')
        .eq('user_id',currentSession.user.id)
        .maybeSingle();
    }
    if(result.error) throw result.error;
    return result.data ? {...result.data,avatar_key:result.data.avatar_key||''} : null;
  }

  async function listProfiles(){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    let result=await c.from('profiles')
      .select('user_id,email,name,role,avatar_key,must_change_password,created_at')
      .order('created_at',{ascending:false});
    if(result.error && /avatar_key/i.test(result.error.message||'')){
      result=await c.from('profiles')
        .select('user_id,email,name,role,must_change_password,created_at')
        .order('created_at',{ascending:false});
    }
    if(result.error) throw result.error;
    return (result.data||[]).map(row=>({...row,avatar_key:row.avatar_key||''}));
  }

  function temporaryPassword(length=16){
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%';
    const random=new Uint32Array(length);
    crypto.getRandomValues(random);
    return Array.from(random,n=>chars[n%chars.length]).join('');
  }

  async function functionsErrorMessage(error){
    try{
      const response=error?.context;
      if(response?.clone){
        const clone=response.clone();
        const detail=await clone.json().catch(()=>null);
        if(detail?.error) return String(detail.error);
        if(detail?.message) return String(detail.message);
      }
    }catch(_error){}
    return String(error?.message||'EDGE_FUNCTION_ERROR');
  }

  async function createManagedUser({name,email,role}){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    if(!['gestor','standard'].includes(role)) throw new Error('ROLE_NOT_ALLOWED');
    const generatedPassword=temporaryPassword();
    const {data,error}=await c.functions.invoke('create-band-user',{body:{name,email,role,temporaryPassword:generatedPassword}});
    if(error) throw new Error(await functionsErrorMessage(error));
    if(data?.error) throw new Error(String(data.error));
    if(!data?.ok) throw new Error('USER_NOT_CREATED');
    return {...data,temporaryPassword:data.temporaryPassword||generatedPassword};
  }

  async function updateOwnProfile({name,avatarKey}){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const cleanName=String(name||'').trim();
    const cleanAvatar=String(avatarKey||'').trim();
    if(!cleanName) throw new Error('INVALID_NAME');
    const currentSession=await session();
    if(!currentSession) throw new Error('AUTH_REQUIRED');

    // v0.26: actualització directa protegida per RLS + permisos de columna.
    // Això evita dependre d'una RPC antiga/desplegada de forma incompleta.
    const {error}=await c.from('profiles').update({
      name:cleanName,
      avatar_key:cleanAvatar||null
    }).eq('user_id',currentSession.user.id);
    if(error) throw error;

    // Metadades només com a còpia de conveniència; els permisos continuen depenent de profiles.role.
    try{ await c.auth.updateUser({data:{name:cleanName,avatar_key:cleanAvatar||null}}); }catch(_error){}
    return await getMyProfile();
  }

  async function updatePassword(password){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const {data,error}=await c.auth.updateUser({password});
    if(error) throw error;
    try{ await c.rpc('mark_own_password_changed'); }catch(_error){}
    return data;
  }

  async function loadContent({publicOnly=false}={}){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const table=publicOnly?'app_public_content':'app_content';
    const {data,error}=await c.from(table).select('content,updated_at').eq('id','main').maybeSingle();
    if(error) throw error;
    if(!data?.content) return null;
    const normalized=normalizeContent(data.content);
    normalized.updatedAt = data.updated_at || normalized.updatedAt;
    return normalized;
  }

  async function saveContent(content){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const currentSession=await session();
    if(!currentSession) throw new Error('AUTH_REQUIRED');
    const clean=normalizeContent(content);
    const now=new Date().toISOString();
    clean.updatedAt=now;
    const {error}=await c.from('app_content').upsert({
      id:'main',
      content:clean,
      updated_at:now,
      updated_by:currentSession.user.id
    },{onConflict:'id'});
    if(error) throw error;
    return clean;
  }

  function subscribeContent(callback,{publicOnly=false}={}){
    const c=getClient(); if(!c) return null;
    if(contentChannel) c.removeChannel(contentChannel).catch?.(()=>{});
    const table=publicOnly?'app_public_content':'app_content';
    contentChannel = c.channel(`banda-${table}`)
      .on('postgres_changes',{event:'*',schema:'public',table,filter:'id=eq.main'},payload=>{
        const row=payload.new;
        if(row?.content){
          const normalized=normalizeContent(row.content);
          normalized.updatedAt=row.updated_at || normalized.updatedAt;
          callback(normalized,payload);
        }
      })
      .subscribe();
    return contentChannel;
  }

  async function uploadFile(bucket,file,folder='misc',preferredName=''){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const currentSession=await session();
    if(!currentSession) throw new Error('AUTH_REQUIRED');
    const ext=(file.name?.split('.').pop() || file.type?.split('/').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g,'') || 'bin';
    const base=(preferredName || file.name?.replace(/\.[^.]+$/,'') || 'file').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase() || 'file';
    const path=`${folder}/${Date.now()}-${base}.${ext}`;
    const {error}=await c.storage.from(bucket).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type || undefined});
    if(error) throw error;
    const {data}=c.storage.from(bucket).getPublicUrl(path);
    return {path,url:data.publicUrl};
  }

  function dataUrlToFile(dataUrl,name='image.jpg'){
    const parts=dataUrl.split(',');
    const meta=parts[0]||'';
    const mime=(meta.match(/data:([^;]+)/)||[])[1] || 'image/jpeg';
    const binary=atob(parts[1]||'');
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    return new File([bytes],name,{type:mime});
  }

  async function uploadDataUrl(bucket,dataUrl,folder='misc',preferredName='image'){
    return uploadFile(bucket,dataUrlToFile(dataUrl,`${preferredName}.jpg`),folder,preferredName);
  }

  async function listPublicFiles(bucket,folder=''){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const {data,error}=await c.storage.from(bucket).list(folder,{limit:500,sortBy:{column:'name',order:'asc'}});
    if(error) throw error;
    return (data||[]).filter(item=>item.name && item.id).map(item=>{
      const path=folder ? `${folder}/${item.name}` : item.name;
      const {data:pub}=c.storage.from(bucket).getPublicUrl(path);
      return {name:item.name,path,url:pub.publicUrl};
    });
  }


  function storagePathFromPublicUrl(bucket,url){
    try{
      const parsed=new URL(String(url||''),location.href);
      const marker=`/storage/v1/object/public/${bucket}/`;
      const index=parsed.pathname.indexOf(marker);
      if(index<0) return '';
      return decodeURIComponent(parsed.pathname.slice(index+marker.length));
    }catch(_error){ return ''; }
  }

  async function deletePublicFile(bucket,url){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const currentSession=await session();
    if(!currentSession) throw new Error('AUTH_REQUIRED');
    const path=storagePathFromPublicUrl(bucket,url);
    if(!path) return {deleted:false,path:''};
    const {data,error}=await c.storage.from(bucket).remove([path]);
    if(error) throw error;
    return {deleted:true,path,data:data||[]};
  }

  function onAuthChange(callback){
    const c=getClient(); if(!c) return null;
    return c.auth.onAuthStateChange((_event,s)=>callback(s));
  }

  window.BandaSupabase={
    enabled,getClient,session,signIn,signOut,getMyProfile,listProfiles,createManagedUser,updateOwnProfile,updatePassword,
    loadContent,saveContent,subscribeContent,uploadFile,uploadDataUrl,listPublicFiles,deletePublicFile,storagePathFromPublicUrl,onAuthChange,dataUrlToFile
  };
})();
