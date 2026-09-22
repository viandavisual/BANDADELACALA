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

  async function loadContent(){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const {data,error}=await c.from('app_content').select('content,updated_at').eq('id','main').maybeSingle();
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

  function subscribeContent(callback){
    const c=getClient(); if(!c) return null;
    if(contentChannel) c.removeChannel(contentChannel).catch?.(()=>{});
    contentChannel = c.channel('banda-app-content')
      .on('postgres_changes',{event:'*',schema:'public',table:'app_content',filter:'id=eq.main'},payload=>{
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

  function onAuthChange(callback){
    const c=getClient(); if(!c) return null;
    return c.auth.onAuthStateChange((_event,s)=>callback(s));
  }

  window.BandaSupabase={
    enabled,getClient,session,signIn,signOut,loadContent,saveContent,subscribeContent,
    uploadFile,uploadDataUrl,listPublicFiles,onAuthChange,dataUrlToFile
  };
})();
