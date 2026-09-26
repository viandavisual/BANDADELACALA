(function(){
  'use strict';
  const KEY = 'banda-de-la-cala-content-v4';
  const LEGACY_KEYS = [
    'banda-de-la-cala-content-v3',
    'banda-de-la-cala-content-v2',
    'banda-de-la-cala-content-v1'
  ];
  const CHANNEL = 'banda-de-la-cala-content';
  const REMOTE_CACHE_KEY = 'banda-de-la-cala-remote-cache-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const defaults = () => clone(window.BANDA_PUBLISHED_CONTENT || {version:4,events:[],tracks:[],dresscodes:[],historicItems:[],hemerotecaItems:[],settings:{}});

  function normalize(raw){
    const base = raw && typeof raw === 'object' ? clone(raw) : defaults();
    base.version = 4;
    base.updatedAt = base.updatedAt || new Date().toISOString();
    base.settings = base.settings && typeof base.settings === 'object' ? base.settings : {};
    base.settings.homeHeroImage = typeof base.settings.homeHeroImage === 'string' ? base.settings.homeHeroImage : '';
    base.settings.minigames = base.settings.minigames && typeof base.settings.minigames === 'object' ? base.settings.minigames : {};
    const qne = base.settings.minigames.quinaNota && typeof base.settings.minigames.quinaNota === 'object' ? base.settings.minigames.quinaNota : {};
    base.settings.minigames.quinaNota = {
      active: qne.active !== false,
      visibleName: typeof qne.visibleName === 'string' && qne.visibleName.trim() ? qne.visibleName.trim() : 'QUINA NOTA ÉS?',
      description: typeof qne.description === 'string' && qne.description.trim() ? qne.description.trim() : 'Endevina la nota del dia i suma punts musicals.',
      icon: typeof qne.icon === 'string' ? qne.icon : ''
    };
    base.events = Array.isArray(base.events) ? base.events.map((event,index)=>({
      id: event.id || uid(`evt${index}`),
      date: event.date || '',
      type: event.type || 'ASSAIG',
      title: event.title || 'Sense títol',
      time: event.time || '',
      place: event.place || '',
      notes: event.notes || '',
      dresscodeId: event.dresscodeId || ''
    })) : [];
    base.tracks = Array.isArray(base.tracks) ? base.tracks.map((track,index)=>({
      id: track.id || uid(`trk${index}`),
      title: track.title || 'Pista sense títol',
      meta: track.meta || '',
      src: String(track.src || '').replace(/^assets\/audio\//i,'assets/AUDIO/'),
      visible: track.visible !== false
    })) : [];
    base.dresscodes = Array.isArray(base.dresscodes) ? base.dresscodes.map((item,index)=>({
      id: item.id || uid(`dress${index}`),
      eventId: item.eventId || '',
      title: item.title || 'Dress code',
      subtitle: item.subtitle || 'Uniforme de banda',
      boys: item.boys || '',
      girls: item.girls || '',
      other: item.other || '',
      boysItems: Array.isArray(item.boysItems) ? item.boysItems.map(x=>({key:x.key||'',preset:x.preset||'',text:x.text||'',detail:x.detail||''})) : [],
      girlsItems: Array.isArray(item.girlsItems) ? item.girlsItems.map(x=>({key:x.key||'',preset:x.preset||'',text:x.text||'',detail:x.detail||''})) : []
    })) : [];
    base.historicItems = Array.isArray(base.historicItems) ? base.historicItems.map((item,index)=>{
      const legacyImage = item.imageSrc || item.image || item.src || '';
      const images = Array.isArray(item.images) ? item.images.filter(src=>typeof src==='string' && src.trim()) : [];
      if(!images.length && legacyImage) images.push(legacyImage);
      return {
        id: item.id || uid(`hist${index}`),
        year: Number.parseInt(item.year,10) || '',
        periodId: item.periodId || '',
        title: item.title || '',
        description: item.description || '',
        images,
        imageSrc: images[0] || '',
        createdAt: item.createdAt || ''
      };
    }) : [];
    base.hemerotecaItems = Array.isArray(base.hemerotecaItems) ? base.hemerotecaItems.map((item,index)=>{
      const legacyImage = item.imageSrc || item.image || item.src || '';
      const images = Array.isArray(item.images) ? item.images.filter(src=>typeof src==='string' && src.trim()) : [];
      if(!images.length && legacyImage) images.push(legacyImage);
      const type = ['cartells','noticies','entrevistes'].includes(String(item.type||'').toLowerCase()) ? String(item.type).toLowerCase() : 'cartells';
      return {
        id: item.id || uid(`hemero${index}`),
        type,
        year: Number.parseInt(item.year,10) || '',
        month: Number.parseInt(item.month,10) || '',
        day: Number.parseInt(item.day,10) || '',
        title: item.title || '',
        description: item.description || '',
        url: item.url || '',
        images,
        imageSrc: images[0] || '',
        createdAt: item.createdAt || ''
      };
    }) : [];
    return base;
  }

  function readLocal(){
    try{
      let raw = localStorage.getItem(KEY);
      if(!raw){
        for(const legacy of LEGACY_KEYS){
          raw = localStorage.getItem(legacy);
          if(raw) break;
        }
      }
      return raw ? normalize(JSON.parse(raw)) : null;
    }catch(error){ return null; }
  }

  let channel = null;
  try{ if('BroadcastChannel' in window) channel = new BroadcastChannel(CHANNEL); }catch(error){}

  function emit(content){
    const payload = clone(content);
    window.dispatchEvent(new CustomEvent('banda-content-changed',{detail:payload}));
    try{ channel && channel.postMessage(payload); }catch(error){}
  }

  function isLocalPreview(){
    return location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  }

  function load(){ return readLocal() || normalize(defaults()); }
  function loadPublished(){ return normalize(defaults()); }
  function loadRemoteCache(){
    try{ const raw=localStorage.getItem(REMOTE_CACHE_KEY); return raw ? normalize(JSON.parse(raw)) : null; }catch(error){ return null; }
  }
  function cacheRemote(content){
    const clean=normalize(content);
    try{ localStorage.setItem(REMOTE_CACHE_KEY,JSON.stringify(clean)); }catch(error){}
    return clean;
  }
  function loadApp(){ return isLocalPreview() ? load() : (loadRemoteCache() || loadPublished()); }

  async function fetchPublished(){
    if(isLocalPreview()) return loadApp();
    return await new Promise(resolve=>{
      const script = document.createElement('script');
      script.src = `./data/content-published.js?ts=${Date.now()}`;
      script.async = true;
      script.onload = () => { script.remove(); resolve(loadPublished()); };
      script.onerror = () => { script.remove(); resolve(loadPublished()); };
      document.head.appendChild(script);
    });
  }

  function save(content){
    const clean = normalize(content);
    clean.updatedAt = new Date().toISOString();
    try{ localStorage.setItem(KEY, JSON.stringify(clean)); }
    catch(error){
      const quota = error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
      if(quota) throw new Error('STORAGE_QUOTA');
      throw error;
    }
    emit(clean);
    return clean;
  }

  function clearLocal(){
    try{
      localStorage.removeItem(KEY);
      LEGACY_KEYS.forEach(key=>localStorage.removeItem(key));
    }catch(error){}
    const content = normalize(defaults());
    emit(content);
    return content;
  }

  function makePublishedJs(content){
    const clean = normalize(content);
    clean.updatedAt = new Date().toISOString();
    return `window.BANDA_PUBLISHED_CONTENT = ${JSON.stringify(clean,null,2)};\n`;
  }

  function download(filename,text,type='application/json'){
    const blob = new Blob([text],{type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  }

  window.addEventListener('storage',event=>{
    if(event.key === KEY || LEGACY_KEYS.includes(event.key)) emit(load());
  });
  if(channel){ channel.onmessage = event => window.dispatchEvent(new CustomEvent('banda-content-changed',{detail:normalize(event.data)})); }

  window.BandaStore = {
    key: KEY,
    load,
    loadPublished,
    loadRemoteCache,
    cacheRemote,
    loadApp,
    fetchPublished,
    isLocalPreview,
    save,
    clearLocal,
    normalize,
    defaults,
    uid,
    makePublishedJs,
    exportJson(content){ download('banda-de-la-cala-content.json', JSON.stringify(normalize(content),null,2)); },
    exportPublishedJs(content){ download('content-published.js', makePublishedJs(content), 'text/javascript'); },
    importObject(raw){ return save(normalize(raw)); }
  };
})();
