window.BANDA_CONFIG = {
  version: globalThis.BANDA_VERSION || 'v0.24',
  appName: 'BANDA DE LA CALA',
  shortName: 'LA CALA',
  subtitle: "L’Ametlla de Mar",
  logo: 'assets/brand/logo-banda-de-la-cala.png',
  appIcon: 'assets/brand/app-icon.png',
  introVideo: 'assets/intro.webm',
  introAudio: 'assets/AUDIO/introhimne.mp3',
  introFallbackMs: 6000,
  supabase: {
    url: 'https://ighgvbnsratlektiwrjf.supabase.co',
    publishableKey: 'sb_publishable_tQRAe9SgRhJqj__e3we0uA_qpEE4L13',
    enabled: true
  },
  historicPeriods: [
    { id:'1980-1982-arques', start:1980, end:1982, years:'1980 - 1982', director:'Joaquim Arqués', color:'#5b4a73', textColor:'#ffffff' },
    { id:'1982-1986-cloquell', start:1982, end:1986, years:'1982 - 1986', director:'Adolfo Cloquell', color:'#2f6f78', textColor:'#ffffff' },
    { id:'1986-1990-ramis', start:1986, end:1990, years:'1986 - 1990', director:'José Ramis', color:'#8a5c36', textColor:'#ffffff' },
    { id:'1990-1999-castells-1', start:1990, end:1999, years:'1990 - 1999', director:'Àlex Castells (I)', color:'#393a86', textColor:'#ffffff' },
    { id:'2000-bono', start:2000, end:2000, years:'2000 - 2000', director:'Pere Bono', color:'#d4ac5f', textColor:'#24211f' },
    { id:'2001-2004-castells-2', start:2001, end:2004, years:'2001 - 2004', director:'Àlex Castells (II)', color:'#9b4f62', textColor:'#ffffff' },
    { id:'2005-2011-chorda', start:2005, end:2011, years:'2005 - 2011', director:'Rubén Chordá', color:'#55734f', textColor:'#ffffff' },
    { id:'2012-current-cabello', start:2012, end:null, years:'2012 - Actualitat', director:'Emilio Cabello', color:'#2e5f9a', textColor:'#ffffff' }
  ]
};
