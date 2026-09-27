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

  async function requestPasswordReset(email,redirectTo){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const clean=String(email||'').trim().toLowerCase();
    if(!clean) throw new Error('EMAIL_REQUIRED');
    const options=redirectTo?{redirectTo}:undefined;
    const {data,error}=await c.auth.resetPasswordForEmail(clean,options);
    if(error) throw error;
    return data || {};
  }

  async function getMyProfile(){
    const c=getClient(); if(!c) return null;
    const currentSession=await session();
    if(!currentSession) return null;
    let result=await c.from('profiles')
      .select('user_id,email,name,role,avatar_key,must_change_password,quina_nota_last_played_date,quina_nota_last_result_correct,quina_nota_points_total,created_at')
      .eq('user_id',currentSession.user.id)
      .maybeSingle();
    if(result.error && /(avatar_key|quina_nota_)/i.test(result.error.message||'')){
      result=await c.from('profiles')
        .select('user_id,email,name,role,must_change_password,created_at')
        .eq('user_id',currentSession.user.id)
        .maybeSingle();
    }
    if(result.error) throw result.error;
    return result.data ? {...result.data,avatar_key:result.data.avatar_key||'',quina_nota_points_total:Number(result.data.quina_nota_points_total||0)} : null;
  }

  async function listProfiles(){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    let result=await c.from('profiles')
      .select('user_id,email,name,role,avatar_key,must_change_password,quina_nota_last_played_date,quina_nota_last_result_correct,quina_nota_points_total,created_at')
      .order('created_at',{ascending:false});
    if(result.error && /(avatar_key|quina_nota_)/i.test(result.error.message||'')){
      result=await c.from('profiles')
        .select('user_id,email,name,role,must_change_password,created_at')
        .order('created_at',{ascending:false});
    }
    if(result.error) throw result.error;
    return (result.data||[]).map(row=>({...row,avatar_key:row.avatar_key||'',quina_nota_points_total:Number(row.quina_nota_points_total||0)}));
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
    name=String(name||'').trim().toLocaleUpperCase('ca-ES');
    if(!['gestor','standard'].includes(role)) throw new Error('ROLE_NOT_ALLOWED');
    const {data,error}=await c.functions.invoke('create-band-user',{body:{name,email,role}});
    if(error) throw new Error(await functionsErrorMessage(error));
    if(data?.error) throw new Error(String(data.error));
    if(!data?.ok) throw new Error('USER_NOT_CREATED');
    return data;
  }

  async function deleteManagedUser(userId){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const id=String(userId||'').trim();
    if(!id) throw new Error('USER_ID_REQUIRED');
    const {data,error}=await c.functions.invoke('create-band-user',{body:{action:'delete',userId:id}});
    if(error) throw new Error(await functionsErrorMessage(error));
    if(data?.error) throw new Error(String(data.error));
    if(!data?.ok) throw new Error('USER_NOT_DELETED');
    return data;
  }

  async function updateOwnProfile({name,avatarKey}){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const cleanName=String(name||'').trim().toLocaleUpperCase('ca-ES');
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

  async function updateOwnGender(gender){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const clean=String(gender||'').trim().toLowerCase();
    if(!['male','female'].includes(clean)) throw new Error('INVALID_GENDER');
    const currentSession=await session();
    if(!currentSession) throw new Error('AUTH_REQUIRED');
    const {data,error}=await c.auth.updateUser({data:{gender:clean}});
    if(error) throw error;
    return data?.user || null;
  }

  async function getQuinaNotaPublicChallenge(){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const {data,error}=await c.rpc('get_quina_nota_public_challenge');
    if(error) throw error;
    return data || null;
  }

  async function getQuinaNotaState(){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const currentSession=await session();
    if(!currentSession) throw new Error('AUTH_REQUIRED');
    const {data,error}=await c.rpc('get_quina_nota_state');
    if(error) throw error;
    return data || null;
  }

  async function submitQuinaNotaAnswer(answer){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const currentSession=await session();
    if(!currentSession) throw new Error('AUTH_REQUIRED');
    const clean=String(answer||'').trim().toUpperCase();
    if(!['DO','RE','MI','FA','SOL','LA','SI'].includes(clean)) throw new Error('INVALID_NOTE');
    const {data,error}=await c.rpc('submit_quina_nota_answer',{p_answer:clean});
    if(error) throw error;
    return data || null;
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

  function extensionForDataUrl(dataUrl){
    const mime=(String(dataUrl||'').match(/^data:([^;,]+)/i)||[])[1]?.toLowerCase()||'';
    if(mime==='image/png') return 'png';
    if(mime==='image/webp') return 'webp';
    if(mime==='image/gif') return 'gif';
    if(mime==='image/svg+xml') return 'svg';
    return 'jpg';
  }

  async function uploadDataUrl(bucket,dataUrl,folder='misc',preferredName='image'){
    const ext=extensionForDataUrl(dataUrl);
    return uploadFile(bucket,dataUrlToFile(dataUrl,`${preferredName}.${ext}`),folder,preferredName);
  }

  function isStorageAlreadyExistsError(error){
    const status=Number(error?.statusCode||error?.status||0);
    const message=String(error?.message||error?.error||'');
    return status===409 || /already exists|duplicate|resource.*exists/i.test(message);
  }

  async function backupOriginalMedia(file,githubPath){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const currentSession=await session();
    if(!currentSession) throw new Error('AUTH_REQUIRED');
    if(!(file instanceof Blob)) throw new Error('BACKUP_FILE_REQUIRED');

    const cleanGithubPath=String(githubPath||'').replace(/^\/+/, '').trim();
    if(!cleanGithubPath) throw new Error('BACKUP_PATH_REQUIRED');

    // Ruta determinista: si una petició falla després de pujar al staging,
    // un nou intent pot reutilitzar exactament el mateix temporal.
    const stagingPath=`pending/${currentSession.user.id}/${cleanGithubPath}`;
    const contentType=file.type || 'application/octet-stream';
    const {error:stagingError}=await c.storage
      .from('media-backup-staging')
      .upload(stagingPath,file,{cacheControl:'3600',upsert:false,contentType});

    if(stagingError && !isStorageAlreadyExistsError(stagingError)) throw stagingError;

    const {data,error}=await c.functions.invoke('backup-band-media',{
      body:{
        bucket:'media-backup-staging',
        objectPath:stagingPath,
        githubPath:cleanGithubPath
      }
    });
    if(error) throw new Error(await functionsErrorMessage(error));
    if(data?.error) throw new Error(String(data.error));
    if(!data?.ok) throw new Error('MEDIA_BACKUP_NOT_CONFIRMED');
    return data;
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


  function archiveSafeFilename(name='image.jpg'){
    const raw=String(name||'image.jpg');
    const dot=raw.lastIndexOf('.');
    const ext=(dot>=0?raw.slice(dot+1):'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
    const base=(dot>=0?raw.slice(0,dot):raw).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'image';
    return `${base}.${ext}`;
  }

  async function createArchiveSubmission(file,meta={}){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const currentSession=await session(); if(!currentSession) throw new Error('AUTH_REQUIRED');
    if(!(file instanceof Blob)) throw new Error('FILE_REQUIRED');
    if(!String(file.type||'').startsWith('image/')) throw new Error('IMAGE_REQUIRED');
    if(Number(file.size||0)>20*1024*1024) throw new Error('FILE_TOO_LARGE');
    const year=Number.parseInt(meta.year,10);
    if(!Number.isInteger(year)) throw new Error('YEAR_REQUIRED');
    const type=String(meta.mediaType||'photo').toLowerCase();
    if(!['photo','cartell'].includes(type)) throw new Error('INVALID_MEDIA_TYPE');
    const id=(globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const filename=archiveSafeFilename(file.name||'image.jpg');
    const storagePath=`pending/${currentSession.user.id}/${id}/${filename}`;
    const {error:uploadError}=await c.storage.from('archive-submissions').upload(storagePath,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
    if(uploadError) throw uploadError;
    const profile=await getMyProfile().catch(()=>null);
    const row={
      id,user_id:currentSession.user.id,
      submitter_name:String(profile?.name||currentSession.user.user_metadata?.name||currentSession.user.email||'USER').trim().toLocaleUpperCase('ca-ES'),
      submitter_email:String(currentSession.user.email||'').trim(),
      media_type:type,year,
      month:Number.parseInt(meta.month,10)||null,
      day:Number.parseInt(meta.day,10)||null,
      title:String(meta.title||'').trim(),
      description:String(meta.description||'').trim(),
      author_source:String(meta.authorSource||'').trim(),
      storage_path:storagePath,
      original_filename:String(file.name||filename),
      mime_type:String(file.type||''),
      file_size:Number(file.size||0),
      status:'pending'
    };
    const {data,error}=await c.from('archive_submissions').insert(row).select('*').single();
    if(error){ try{await c.storage.from('archive-submissions').remove([storagePath]);}catch(_error){} throw error; }
    return data;
  }

  async function listArchiveSubmissions(status='pending'){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const clean=String(status||'pending').toLowerCase();
    const {data,error}=await c.from('archive_submissions').select('*').eq('status',clean).order('created_at',{ascending:clean!=='rejected'});
    if(error) throw error;
    const rows=data||[];
    for(const row of rows){
      const {data:signed,error:signedError}=await c.storage.from('archive-submissions').createSignedUrl(row.storage_path,3600);
      row.preview_url=signedError?'':(signed?.signedUrl||'');
    }
    return rows;
  }

  async function countArchiveSubmissions(status='pending'){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const clean=String(status||'pending').toLowerCase();
    const {count,error}=await c.from('archive_submissions').select('id',{count:'exact',head:true}).eq('status',clean);
    if(error) throw error;
    return Number(count)||0;
  }

  async function updateArchiveSubmission(id,patch={}){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const clean={};
    for(const key of ['media_type','year','month','day','title','description','author_source','status','rejection_note','published_item_id','published_url','storage_path','crop_left','crop_right','crop_top','crop_bottom']){
      if(Object.prototype.hasOwnProperty.call(patch,key)) clean[key]=patch[key];
    }
    if(Object.prototype.hasOwnProperty.call(clean,'year')) clean.year=Number.parseInt(clean.year,10);
    if(Object.prototype.hasOwnProperty.call(clean,'month')) clean.month=Number.parseInt(clean.month,10)||null;
    if(Object.prototype.hasOwnProperty.call(clean,'day')) clean.day=Number.parseInt(clean.day,10)||null;
    for(const key of ['crop_left','crop_right','crop_top','crop_bottom']) if(Object.prototype.hasOwnProperty.call(clean,key)) clean[key]=Math.max(0,Math.min(45,Number(clean[key])||0));
    const currentSession=await session(); if(!currentSession) throw new Error('AUTH_REQUIRED');
    if(['validated','rejected'].includes(clean.status)){ clean.reviewed_at=new Date().toISOString(); clean.reviewed_by=currentSession.user.id; }
    if(clean.status==='pending'){ clean.reviewed_at=null; clean.reviewed_by=null; }
    const {data,error}=await c.from('archive_submissions').update(clean).eq('id',id).select('*').single();
    if(error) throw error;
    return data;
  }

  async function downloadArchiveSubmission(path){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const {data,error}=await c.storage.from('archive-submissions').download(path);
    if(error) throw error;
    return data;
  }

  async function moveArchiveSubmission(fromPath,toPath){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    if(fromPath===toPath) return toPath;
    const {error}=await c.storage.from('archive-submissions').move(fromPath,toPath);
    if(error) throw error;
    return toPath;
  }

  async function deleteArchiveSubmission(id,storagePath=''){
    const c=getClient(); if(!c) throw new Error('SUPABASE_NOT_READY');
    const currentSession=await session(); if(!currentSession) throw new Error('AUTH_REQUIRED');
    if(storagePath){
      const {error:storageError}=await c.storage.from('archive-submissions').remove([storagePath]);
      if(storageError) throw storageError;
    }
    const {error}=await c.from('archive_submissions').delete().eq('id',id);
    if(error) throw error;
    return true;
  }

  function onAuthChange(callback){
    const c=getClient(); if(!c) return null;
    return c.auth.onAuthStateChange((_event,s)=>callback(s));
  }

  window.BandaSupabase={
    enabled,getClient,session,signIn,signOut,requestPasswordReset,getMyProfile,listProfiles,createManagedUser,deleteManagedUser,updateOwnProfile,updateOwnGender,getQuinaNotaPublicChallenge,getQuinaNotaState,submitQuinaNotaAnswer,updatePassword,
    loadContent,saveContent,subscribeContent,uploadFile,uploadDataUrl,backupOriginalMedia,listPublicFiles,deletePublicFile,storagePathFromPublicUrl,createArchiveSubmission,listArchiveSubmissions,countArchiveSubmissions,updateArchiveSubmission,downloadArchiveSubmission,moveArchiveSubmission,deleteArchiveSubmission,onAuthChange,dataUrlToFile
  };
})();
