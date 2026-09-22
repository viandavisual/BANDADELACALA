window.BANDA_PUBLISHED_CONTENT = {
  version: 3,
  updatedAt: "2026-09-22T15:34:00.000Z",
  settings: {
    homeHeroImage: ""
  },
  events: [
    { id:"evt-20260924-assaig", date:"2026-09-24", type:"ASSAIG", title:"ASSAIG GENERAL", time:"21:30", place:"LOCAL SOCIAL", notes:"Assaig complet del repertori.", dresscodeId:"" },
    { id:"evt-20260927-concert", date:"2026-09-27", type:"CONCERT", title:"Concert de tardor", time:"18:30", place:"Plaça Major", notes:"Concentració 45 minuts abans.", dresscodeId:"dress-diada" },
    { id:"evt-20261002-seccions", date:"2026-10-02", type:"ASSAIG", title:"ASSAIG PARCIAL FUSTA", time:"19:30", place:"LOCAL SOCIAL", notes:"Treball per famílies instrumentals.", dresscodeId:"" }
  ],
  tracks: [
    { id:"trk-demo-1", title:"Demo · Fanfara", meta:"Pista de prova", src:"assets/AUDIO/demo-1.wav", visible:true },
    { id:"trk-demo-2", title:"Demo · Marxa", meta:"Pista de prova", src:"assets/AUDIO/demo-2.wav", visible:true },
    { id:"trk-demo-3", title:"Demo · Final", meta:"Pista de prova", src:"assets/AUDIO/demo-3.wav", visible:true }
  ],
  dresscodes: [
    {
      id:"dress-diada",
      eventId:"evt-20260927-concert",
      title:"Dress code - diada",
      subtitle:"Uniforme de banda",
      boysItems:[
        {key:"shirt",preset:"white_short",text:"Camisa blanca màniga curta ⚪️"},
        {key:"bottom",preset:"suit_trousers",text:"Pantalons del tratge 👖"},
        {key:"footwear",preset:"black",text:"Calçat negre, no esportiu, no Converse ⚫️⛔"},
        {key:"socks",preset:"black",text:"Mitjons negres ⚫️"},
        {key:"tie",preset:"tie",text:"Corbata i pinza 👔"}
      ],
      girlsItems:[
        {key:"shirt",preset:"white_short",text:"Camisa blanca màniga curta ⚪️"},
        {key:"bottom",preset:"skirt",text:"Faldilla del tratge ⚫️"},
        {key:"footwear",preset:"black",text:"Calçat negre, no esportiu, no Converse ⚫️⛔"},
        {key:"socks",preset:"none",text:""},
        {key:"tie",preset:"tie",text:"Corbata i pinza 👔"}
      ],
      boys:"Camisa blanca màniga curta ⚪️\nPantalons del tratge 👖\nCalçat negre, no esportiu, no Converse ⚫️⛔\nMitjons negres ⚫️\nCorbata i pinza 👔",
      girls:"Camisa blanca màniga curta ⚪️\nFaldilla del tratge ⚫️\nCalçat negre, no esportiu, no Converse ⚫️⛔\nCorbata i pinza 👔"
    }
  ]
};
