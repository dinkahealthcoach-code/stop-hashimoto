import { useState, useReducer, useRef, useEffect } from "react";
import { Leaf, ShoppingBag, ChefHat, User, Camera, CheckCircle, XCircle,
  ChevronRight, ChevronLeft, Flame, AlertCircle, RefreshCw, Sparkles,
  Clock, Heart, Trash2, BookOpen, Soup } from "lucide-react";

const T = {
  sage:"#4E7153", sageMid:"#6B9470", sageLight:"#B8D4BB", sagePale:"#EBF3EC",
  terra:"#B8603A", terraLight:"#E8A882", terraPale:"#FAF0EA",
  cream:"#FAF7F2", warmWhite:"#FFFFFF", stone:"#8A7968", stoneMid:"#BFB3A4",
  stonePale:"#F0EBE3", brown:"#4A3728", brownMid:"#7A6050", ink:"#2C2018",
  error:"#C0392B", ok:"#3A7D55",
};
const FD = `'Palatino Linotype', Georgia, serif`;
const FB = `'Trebuchet MS', 'Century Gothic', sans-serif`;

// ── STORAGE ──────────────────────────────────────────────────────────────────
const init = { profile:null, pantry:[], recipesHistory:[], ticketsHistory:[] };
function reducer(state, action) {
  switch(action.type) {
    case "LOAD": return {...state,...action.p};
    case "SET_PROFILE": return {...state,profile:action.p};
    case "MERGE_PANTRY": {
      const next=[...state.pantry];
      action.p.forEach(ni=>{
        const idx=next.findIndex(i=>i.name.toLowerCase()===ni.name.toLowerCase());
        idx>=0?(next[idx]={...next[idx],quantity:(next[idx].quantity||0)+(ni.quantity||0)}):next.push(ni);
      });
      return {...state,pantry:next};
    }
    case "REMOVE_ITEM": return {...state,pantry:state.pantry.filter((_,i)=>i!==action.p)};
    case "COOK_RECIPE": {
      const next=state.pantry.map(item=>{
        const u=action.p.find(u=>u.name.toLowerCase()===item.name.toLowerCase());
        return u?{...item,quantity:Math.max(0,(item.quantity||0)-(u.quantity||0))}:item;
      }).filter(i=>i.quantity>0);
      return {...state,pantry:next};
    }
    case "ADD_RH": return {...state,recipesHistory:[action.p,...state.recipesHistory].slice(0,30)};
    default: return state;
  }
}
async function dbGet(k){try{const r=await window.storage.get(k,false);return r?JSON.parse(r.value):null;}catch{return null;}}
async function dbSet(k,v){try{await window.storage.set(k,JSON.stringify(v),false);}catch{}}

// ── API ───────────────────────────────────────────────────────────────────────
function pj(text){return JSON.parse(text.replace(/```json\s*/gi,"").replace(/```\s*/g,"").trim());}
async function callClaude(messages,system,maxTokens=2000){
  const apiKey=import.meta.env.VITE_ANTHROPIC_API_KEY;
  if(!apiKey)throw new Error("API key no configurada. Contacta a tu coach.");
  const body={model:"claude-sonnet-4-20250514",max_tokens:maxTokens,messages};
  if(system)body.system=system;
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify(body)});
  const data=await res.json();
  if(data.error)throw new Error(data.error.message);
  return data.content.filter(b=>b.type==="text").map(b=>b.text).join("\n");
}

// ── CATEGORÍAS ────────────────────────────────────────────────────────────────
const CATS={
  proteina:{label:"Proteína",emoji:" ",color:T.terra},
  carbohidrato:{label:"Carbohidrato",emoji:" ",color:T.sage},
  verdura:{label:"Verdura",emoji:" ",color:T.ok},
  fruta:{label:"Fruta",emoji:" ",color:T.terraLight},
  grasa:{label:"Grasa saludable",emoji:" ",color:T.brownMid},
  otro:{label:"Otro",emoji:" ",color:T.stone},
};

// ── REGLAS POR FASE ───────────────────────────────────────────────────────────
const FASES={
  "Eliminación":{color:T.terra,colorPale:T.terraPale,emoji:" ",
    permitidos:["Carnes de res, cordero, pollo, pavo","Pescado y mariscos salvajes","Verduras de hoja verde (espinaca, kale, rúcula)","Tubérculos: camote, yuca, remolacha, nabo","Brócoli, coliflor, repollo, coles de Bruselas","Cebolla, ajo, zucchini, pepino, champiñones","Frutas: manzana, pera, arándanos, coco, palta/aguacate","Aceite de coco, aceite de oliva, aceite de aguacate","Leche y crema de coco","Hierbas frescas, vinagre de manzana, sal marina","Caldo de huesos casero"],
    prohibidos:["Gluten y todos los granos (trigo, avena, arroz, quinoa, maíz)","Lácteos (leche, queso, yogur, mantequilla, ghee)","Huevos","Legumbres (lentejas, garbanzos, frijoles, soya, maní)","Solanáceas (tomate, pimiento, papa, berenjena, páprika)","Nueces y semillas","Azúcar, miel, endulzantes artificiales","Alcohol, café, té negro"],
    desc:"Fase más estricta. Elimina todos los alimentos inflamatorios para calmar el sistema inmune.",
  },
  "Reintroducción":{color:T.sage,colorPale:T.sagePale,emoji:" ",
    permitidos:["Todo lo de Eliminación (base permanente)","Yemas de huevo (primero, separadas de la clara)","Legumbres bien remojadas y cocidas (de a una)","Frutos secos activados remojados 12h (de a uno)","Semillas activadas (de a una)","Ghee si se tolera","Arroz blanco si se tolera","Tomate maduro sin piel ni semillas si se tolera","Cacao puro ≥85% si se tolera"],
    prohibidos:["Gluten (SIEMPRE prohibido)","Lácteos convencionales","Azúcar refinada y edulcorantes artificiales","Aceites de semillas refinados","Aditivos y conservantes","Alimentos que generaron síntomas en eliminación"],
    desc:"Reintroduces un alimento a la vez, con 5–7 días de observación entre cada uno.",
  },
  "Mantenimiento":{color:T.ok,colorPale:"#E8F5EE",emoji:" ",
    permitidos:["Todo lo de Eliminación (base permanente)","Todos los alimentos reintroducidos y bien tolerados","Huevos si se toleraron","Legumbres preparadas si se toleraron","Frutos secos y semillas activados si se toleraron","Arroz, quinoa, mijo sin gluten si se toleraron","Chocolate negro ≥85% si se toleró","Café ocasional si se toleró","Lácteos fermentados (kéfir de cabra, yogur de coco)"],
    prohibidos:["Gluten (SIEMPRE prohibido en Hashimoto)","Lácteos convencionales de vaca","Azúcar refinada y ultraprocesados","Aceites de semillas refinados","Cualquier alimento que generó síntomas"],
    desc:"Alimentación antiinflamatoria de largo plazo. El gluten se excluye siempre.",
  },
};

// ── RECETARIO ─────────────────────────────────────────────────────────────────
const RECETARIO=[
  {id:1,cat:"desayuno",titulo:"Mousse de coco",mins:10,dif:"fácil",desc:"Dulce y refrescante. Preparar la noche anterior.",
   ing:["1 lata de leche de coco (refrigerar noche anterior)","1 cda de algarroba en polvo","Gotas de stevia natural","Canela en polvo","Berries o chips de coco para servir"],
   pasos:["Refrigerar la lata la noche anterior.","Separar la parte sólida del líquido.","Batir la parte firme hasta textura de mousse.","Agregar algarroba, stevia y canela. Mezclar.","Servir con berries o chips de coco."],nota:"En reintroducción reemplaza la algarroba por cacao ≥85%."},
  {id:2,cat:"desayuno",titulo:"Chip de camote con palta",mins:15,dif:"fácil",desc:"La tostada del Método Eri. Sin gluten, sin granos.",
   ing:["1 camote/boniato mediano","1 palta/aguacate maduro","Sal de mar"],
   pasos:["Pelar el camote y cortar a lo largo (como tostadas).","Llevar al sartén sin aceite, tapar.","Dorar por ambos lados.","Servir con palta machacada y sal."],nota:"Agrega cilantro o limón para más sabor."},
  {id:3,cat:"desayuno",titulo:"Pancakes de camote y plátano",mins:30,dif:"media",desc:"Sin huevo, sin gluten, sin granos. Suaves y saciantes.",
   ing:["1 camote mediano cocido sin cáscara","1 plátano maduro machacado","2 cdas harina de coco o almidón de mandioca","1 cdita bicarbonato","¼ taza leche de coco full fat","1 cdita canela, vainilla, aceite de coco","Miel para servir"],
   pasos:["Licuar todos los ingredientes.","Calentar sartén con aceite de coco a fuego bajo.","Verter por cucharadas. Cocinar hasta que aparezcan burbujas.","Voltear y cocinar 1-2 min más. Servir con miel."],nota:"Fuego bajo — toman más tiempo que los de trigo."},
  {id:4,cat:"desayuno",titulo:"Smoothie verde detox",mins:5,dif:"fácil",desc:"Hidratante y depurativo. Ideal para romper el ayuno.",
   ing:["2 puñados hojas verdes (espinaca, kale, cilantro)","1 taza agua","½ palta/aguacate","½ pepino sin semillas","½ taza manzana verde","Jugo de 1 limón","1 cda aceite de oliva","1 cda vinagre de manzana"],
   pasos:["Poner todos los ingredientes en la licuadora.","Licuar hasta textura suave.","Servir inmediatamente."]},
  {id:5,cat:"desayuno",titulo:"Roiboos Latte",mins:10,dif:"fácil",desc:"Reemplazo del café. Calmante e ideal para la tiroides.",
   ing:["2 cdas de té roiboos","1 taza de agua","¾ taza leche de coco","Canela, miel de maple o abeja","1 cda gelatina/grenetina (opcional)"],
   pasos:["Hervir el agua, agregar roiboos, reposar 6 min.","Calentar leche de coco con gelatina hasta disolver.","Colar el té y licuar con la leche de coco 2-3 min.","Servir con canela encima."],nota:" Tapar bien la licuadora con líquidos calientes."},
  {id:6,cat:"almuerzo",titulo:"Cazuela con caldo de huesos",mins:40,dif:"fácil",desc:"La cazuela más reparadora del protocolo. Rica en colágeno.",
   ing:["1 presa de pollo o carne de res","2 zanahorias, 1 cebolla, 1 rama de apio","1 taza camote o zapallo","1 zucchini en cubos","2 tazas caldo de huesos + 2 tazas agua","Aceite de oliva, cilantro, sal"],
   pasos:["Calentar aceite y sellar la carne.","Agregar verduras, agua y caldo hasta cubrir.","Hervir 20 minutos hasta que estén cocidas.","Servir con cilantro fresco picado encima."]},
  {id:7,cat:"almuerzo",titulo:"Arroz de coliflor con trucha al horno",mins:30,dif:"fácil",desc:"El reemplazo perfecto del arroz. Ligero y versátil.",
   ing:["Filete de trucha o salmón","1 cebolla, orégano, limón","½ cabeza de coliflor","Aceite de oliva o coco, sal"],
   pasos:["Hornear la trucha sobre cama de cebolla con orégano y limón. 20 min a 180°C.","Rallar o procesar la coliflor en trozos pequeños.","Llevar al sartén con aceite unos minutos hasta suavizar.","Servir caliente junto con la trucha."]},
  {id:8,cat:"almuerzo",titulo:"Hamburguesas de salmón y camote",mins:25,dif:"fácil",desc:"Sin gluten, sin huevo, ricas en omega-3.",
   ing:["1 taza camote cocido sin cáscara","½ taza coliflor cocida","1-2 latas salmón salvaje","10-12 aceitunas picadas","1 cda aceite de coco"],
   pasos:["Mezclar todo en un bowl con tenedor.","Dividir en 4 porciones y formar hamburguesas.","Cocinar en sartén con aceite hasta dorar.","Servir con aguacate."]},
  {id:9,cat:"almuerzo",titulo:"Lasaña de zapallo italiano",mins:45,dif:"media",desc:"Comfort food sin gluten ni lácteos. Crema de coliflor como bechamel.",
   ing:["3 zapallos italianos/zucchini","250g carne molida o champiñones","½ coliflor cocida","Cebolla, ajo, aceite de oliva, levadura nutricional, sal"],
   pasos:["Cortar zucchini a lo largo con pelapapas (serán las láminas).","Procesar coliflor cocida hasta crema suave. Salpimentar.","Freír cebolla con carne o champiñones.","Armar capas en fuente: zucchini, carne, crema de coliflor.","Hornear 25-30 min a 180°C."],nota:"Usa la salsa roja sin solanáceas del recetario para más sabor."},
  {id:10,cat:"sopa",titulo:"Crema de champiñones",mins:20,dif:"fácil",desc:"Cremosa y llena de umami. Sin lácteos.",
   ing:["2 bandejas champiñones","½ cebolla, 1 diente ajo","Cilantro fresco","1 vaso agua, sal"],
   pasos:["Freír cebolla, agregar champiñones y cilantro.","Licuar con el agua hasta textura cremosa.","Calentar en olla y servir con champiñones dorados encima."]},
  {id:11,cat:"sopa",titulo:"Crema de apio",mins:30,dif:"fácil",desc:"Depurativa y digestiva. La coliflor da cuerpo sin almidón.",
   ing:["1 cabeza de apio en trozos","1 taza coliflor (para espesar)","½ cebolla, 3 dientes ajo, hoja laurel","1 litro caldo de huesos","Aceite de coco, sal"],
   pasos:["Freír cebolla y ajo.","Agregar apio y coliflor, cocinar 15 min.","Licuar todo con el caldo.","Volver a la olla, sazonar y servir."]},
  {id:12,cat:"ensalada",titulo:"Ensalada con aderezo de jengibre",mins:15,dif:"fácil",desc:"Crujiente y llena de fitoquímicos antiinflamatorios.",
   ing:["1 taza repollo morado, 1 taza repollo blanco","1 taza zanahoria rallada, 1 taza betarraga rallada","Cilantro, cebollín","Aderezo: ¼ taza aceite oliva, jugo limón, jengibre rallado, ajo, sal"],
   pasos:["Mezclar todas las verduras en un bowl.","Batir los ingredientes del aderezo.","Verter sobre la ensalada y servir."]},
  {id:13,cat:"ensalada",titulo:"Salsa roja sin solanáceas",mins:35,dif:"fácil",desc:"La salsa de tomate del Método Eri. Con zanahoria y betarraga.",
   ing:["3 zanahorias, 1 betarraga mediana","1 cebolla, 4 dientes ajo","Albahaca, laurel, sal","4 cdas vinagre de manzana, 3 tazas agua","2 cdas aceite de oliva"],
   pasos:["Saltear cebolla 5 min, agregar ajo, zanahoria y betarraga.","Agregar hierbas, sal, vinagre y agua.","Tapar y hervir a fuego lento 25 min.","Licuar hasta cremoso."],nota:"Perfecta para lasaña, pasta de zucchini o base de guisos."},
  {id:14,cat:"colacion",titulo:"Trufas de vainilla y coco",mins:20,dif:"fácil",desc:"El dulce permitido del Método Eri. Sin azúcar refinada.",
   ing:["½ taza mantequilla de coco","3 cdas aceite de coco","1 cda miel cruda o stevia","1 taza coco rallado + extra para cubrir","½ cdita vainilla en polvo, sal de mar"],
   pasos:["Calentar ligeramente mantequilla y aceite de coco.","Procesar con miel.","Agregar coco rallado, vainilla y sal.","Refrigerar si está suave. Formar bolitas.","Pasar por coco rallado. Guardar en frío."]},
  {id:15,cat:"pan",titulo:"Tortillas de plátano verde",mins:25,dif:"media",desc:"El pan del Método Eri. Sin gluten, sin huevo, sin cereales.",
   ing:["2 plátanos verdes hervidos","1½ cda aceite de coco","1 cdita sal marina","Papel mantequilla"],
   pasos:["Procesar plátanos cocidos con aceite hasta masa manejable.","Separar en porciones.","Aplastar entre papeles mantequilla con rodillo.","Cocinar en sartén sin aceite con tapa."],nota:"Sirve con palta, pollo o guacamole."},
  {id:16,cat:"pan",titulo:"Sopaipillas de yuca",mins:25,dif:"media",desc:"Masa a base de yuca y coco. Antiinflamatoria y reconfortante.",
   ing:["1 taza harina de yuca","½ taza harina de coco","1 cdita sal, cúrcuma, polvos de hornear sin gluten","1 cda vinagre manzana, 3 cdas aceite oliva","½ taza agua hirviendo"],
   pasos:["Mezclar secos. Unir líquidos.","Integrar hasta masa homogénea.","Formar 5 bolitas y aplastar entre papeles.","Freír en sartén con poco aceite o sin aceite con tapa."],nota:"Rellena con palta, pollo o mermelada de fruta."},
  {id:17,cat:"base",titulo:"Caldo de huesos de pollo",mins:480,dif:"fácil",desc:"La base reparadora del intestino. Rico en colágeno y minerales.",
   ing:["1.5 kg huesos de pollo o res (orgánicos)","2 zanahorias sin pelar","2 hojas laurel, cilantro o perejil","2 cditas sal rosada, 2 cdas vinagre de manzana","Agua hasta cubrir (~13 tazas)"],
   pasos:["Poner todo en olla, cubrir con agua.","Olla de presión: 2 horas. Olla normal: 6-8 horas. Slow cooker: 8-10 horas.","Colar y guardar en frascos de vidrio hasta 5 días."],nota:"El vinagre extrae más minerales de los huesos."},
];
const CATS_R=[
  {id:"todos",label:"Todos",emoji:" "},{id:"desayuno",label:"Desayunos",emoji:" "},
  {id:"almuerzo",label:"Almuerzos",emoji:" "},{id:"sopa",label:"Sopas",emoji:" "},
  {id:"ensalada",label:"Ensaladas",emoji:" "},{id:"colacion",label:"Colaciones",emoji:" "},
  {id:"pan",label:"Panes",emoji:" "},{id:"base",label:"Bases",emoji:" "},
];

// ── ATOMS ─────────────────────────────────────────────────────────────────────
function Spin({msg}){
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 0",gap:16}}>
      <div style={{position:"relative",width:52,height:52}}>
        <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`3px solid ${T.stonePale}`}}/>
        <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"3px solid transparent",borderTopColor:T.sage,animation:"spin 1s linear infinite"}}/>
        <div style={{position:"absolute",inset:8,borderRadius:"50%",background:T.sagePale,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Leaf size={14} color={T.sage}/>
        </div>
      </div>
      <p style={{fontSize:13,color:T.stone,fontWeight:600,animation:"pulse 2s ease-in-out infinite",fontFamily:FB}}>{msg}</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
function Empty({Icon,title,sub}){
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 24px",gap:12,textAlign:"center"}}>
      <div style={{width:64,height:64,borderRadius:"50%",background:T.stonePale,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Icon size={26} color={T.stoneMid}/>
      </div>
      <p style={{fontSize:15,fontWeight:700,color:T.brownMid,fontFamily:FD}}>{title}</p>
      <p style={{fontSize:13,color:T.stone,lineHeight:1.6,maxWidth:260}}>{sub}</p>
    </div>
  );
}
function Err({msg,onRetry,onClose}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",borderRadius:16,background:"#FDECEA",border:`1px solid ${T.error}33`,marginBottom:16}}>
      <AlertCircle size={16} color={T.error} style={{flexShrink:0}}/>
      <p style={{flex:1,fontSize:13,color:T.error,fontFamily:FB}}>{msg}</p>
      {onRetry&&<button onClick={onRetry} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:T.terra,fontWeight:700}}><RefreshCw size={12}/></button>}
      <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}><XCircle size={16} color={T.stone}/></button>
    </div>
  );
}

// ── ONBOARDING ────────────────────────────────────────────────────────────────
const STEPS=[
  {id:"bienvenida",title:"Bienvenida a\nStop Hashimoto™",sub:"Tu coach de nutrición con el Método Eri personalizada. Juntas vamos a ordenar tu alimentación para calmar tu sistema inmune y apoyar tu tiroides.",fields:[]},
  {id:"basicos",title:"Cuéntame\nsobre ti",fields:[
    {key:"nombre",label:"¿Cómo te llamas?",type:"text",ph:"Tu nombre"},
    {key:"edad",label:"Edad",type:"number",ph:"ej. 35"},
    {key:"peso",label:"Peso (kg)",type:"number",ph:"ej. 65"},
    {key:"altura",label:"Altura (cm)",type:"number",ph:"ej. 163"},
  ]},
  {id:"estilo",title:"Tu estilo\nde vida",fields:[
    {key:"actividad",label:"Nivel de actividad",type:"pills",opts:["Sedentaria","Ligera","Moderada","Intensa"]},
    {key:"sueno",label:"Horas de sueño",type:"number",ph:"ej. 7"},
    {key:"estres",label:"Nivel de estrés",type:"pills",opts:["Bajo","Moderado","Alto","Muy alto"]},
  ]},
  {id:"hashimoto",title:"Tu situación\nautoinmune",fields:[
    {key:"tiempo_dx",label:"¿Cuánto llevas con Hashimoto?",type:"pills",opts:["Recién diagnosticada","Menos de 1 año","1–3 años","Más de 3 años"]},
    {key:"fase_eri",label:"Fase Método Eri actual",type:"pills",opts:["Quiero empezar","Eliminación","Reintroducción","Mantenimiento"]},
    {key:"sintomas",label:"Síntomas principales (varios)",type:"multi",opts:["Fatiga crónica","Niebla mental","Caída de cabello","Hinchazón abdominal","Estreñimiento","Ansiedad","Problemas de sueño","Sensibilidad al frío","Piel seca"]},
  ]},
  {id:"objetivos",title:"¿Qué quieres\nlograr?",fields:[
    {key:"objetivo",label:"Objetivo principal",type:"pills",opts:["Reducir inflamación","Perder peso","Más energía","Mejorar digestión","Equilibrar hormonas","Todo lo anterior"]},
    {key:"notas",label:"Alergias, intolerancias u otras condiciones",type:"area",ph:"ej. Tengo SIBO, no tolero mariscos..."},
  ]},
];
function Onboarding({onDone}){
  const [step,setStep]=useState(0);
  const [data,setData]=useState({});
  const [multi,setMulti]=useState({});
  const s=STEPS[step];
  const pct=step/(STEPS.length-1)*100;
  const sf=(k,v)=>setData(d=>({...d,[k]:v}));
  const tm=(k,v)=>setMulti(m=>({...m,[k]:(m[k]||[]).includes(v)?(m[k]||[]).filter(x=>x!==v):[...(m[k]||[]),v]}));
  const next=()=>{
    if(step<STEPS.length-1){setStep(s=>s+1);return;}
    const p={...data};Object.keys(multi).forEach(k=>{p[k]=multi[k];});onDone(p);
  };
  const btn={width:"100%",padding:"17px",borderRadius:24,border:"none",background:`linear-gradient(135deg,${T.sage},${T.sageMid})`,color:"white",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:FB,display:"flex",alignItems:"center",justifyContent:"center",gap:8};
  return(
    <div style={{minHeight:"100svh",background:T.cream,fontFamily:FB,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"52px 24px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
          <Leaf size={16} color={T.sage}/>
          <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.18em",color:T.sage,textTransform:"uppercase"}}>Stop Hashimoto</span>
        </div>
        {step>0&&<div style={{height:3,borderRadius:99,background:T.stonePale,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${T.sage},${T.sageMid})`,borderRadius:99,transition:"width .5s"}}/>
        </div>}
      </div>
      <div style={{flex:1,padding:"0 24px 24px",overflowY:"auto"}}>
        <h1 style={{fontFamily:FD,fontSize:32,fontWeight:700,color:T.brown,lineHeight:1.15,whiteSpace:"pre-line",marginBottom:12}}>{s.title}</h1>
        {s.sub&&<p style={{fontSize:14,color:T.stone,lineHeight:1.6,marginBottom:32}}>{s.sub}</p>}
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          {s.fields.map(f=>{
            const inp={width:"100%",padding:"14px 16px",borderRadius:16,border:`1.5px solid ${T.stoneMid}`,background:T.warmWhite,fontSize:15,color:T.ink,outline:"none",boxSizing:"border-box",fontFamily:FB};
            if(f.type==="text"||f.type==="number")return(<div key={f.key}><label style={{display:"block",fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>{f.label}</label><input type={f.type} placeholder={f.ph} value={data[f.key]||""} onChange={e=>sf(f.key,e.target.value)} style={inp}/></div>);
            if(f.type==="area")return(<div key={f.key}><label style={{display:"block",fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>{f.label}</label><textarea rows={3} placeholder={f.ph} value={data[f.key]||""} onChange={e=>sf(f.key,e.target.value)} style={{...inp,resize:"none",fontSize:14}}/></div>);
            if(f.type==="pills")return(<div key={f.key}><label style={{display:"block",fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>{f.label}</label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{f.opts.map(o=>{const sel=data[f.key]===o;return<button key={o} onClick={()=>sf(f.key,o)} style={{padding:"12px 10px",borderRadius:14,border:`1.5px solid ${sel?T.sage:T.stoneMid}`,background:sel?T.sage:T.warmWhite,color:sel?"white":T.brown,fontSize:13,fontWeight:sel?700:500,cursor:"pointer",textAlign:"left",fontFamily:FB}}>{o}</button>;})}</div></div>);
            if(f.type==="multi")return(<div key={f.key}><label style={{display:"block",fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>{f.label}</label><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{f.opts.map(o=>{const sel=(multi[f.key]||[]).includes(o);return<button key={o} onClick={()=>tm(f.key,o)} style={{padding:"9px 14px",borderRadius:20,border:`1.5px solid ${sel?T.terra:T.stoneMid}`,background:sel?T.terra:T.warmWhite,color:sel?"white":T.brown,fontSize:12,fontWeight:sel?700:500,cursor:"pointer",fontFamily:FB}}>{o}</button>;})}</div></div>);
            return null;
          })}
        </div>
      </div>
      <div style={{padding:"12px 24px 48px"}}>
        <button onClick={next} style={btn}>{step===0?<><Sparkles size={16}/>Comenzar mi Método Eri</>:step===STEPS.length-1?<><CheckCircle size={16}/>Crear mi perfil</>:<>Siguiente <ChevronRight size={16}/></>}</button>
        {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{width:"100%",padding:"13px",marginTop:8,border:"none",background:"transparent",color:T.stone,fontSize:13,cursor:"pointer",fontFamily:FB}}>← Atrás</button>}
      </div>
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function HomeTab({state,goTo}){
  const {profile,pantry,recipesHistory}=state;
  const hr=new Date().getHours();
  const greet=hr<12?"Buenos días":hr<20?"Buenas tardes":"Buenas noches";
  return(
    <div style={{padding:"56px 20px 96px",fontFamily:FB}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <p style={{fontSize:13,color:T.stone,marginBottom:2}}>{greet},</p>
          <h1 style={{fontFamily:FD,fontSize:28,color:T.brown,fontWeight:700}}>{profile?.nombre||"Coach"}</h1>
        </div>
        <div style={{width:48,height:48,borderRadius:16,background:`linear-gradient(135deg,${T.sage},${T.sageMid})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Leaf size={20} color="white"/>
        </div>
      </div>
      <div style={{borderRadius:24,background:`linear-gradient(135deg,${T.sage},${T.sageMid})`,padding:"22px 24px",marginBottom:16,boxShadow:`0 10px 32px ${T.sage}44`,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:-20,top:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}}/>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
          <Sparkles size={12} color="rgba(255,255,255,0.75)"/>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.75)",fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase"}}>Método Eri · Stop Hashimoto</span>
        </div>
        <p style={{fontFamily:FD,fontSize:22,color:"white",fontWeight:700,marginBottom:4}}>{profile?.fase_eri||"Eliminación"}</p>
        <p style={{fontSize:12,color:"rgba(255,255,255,0.65)"}}>Sin gluten · Sin lácteos · Sin azúcar · Sin solanáceas</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {[{icon:ShoppingBag,n:pantry.length,label:"en despensa",color:T.terra},{icon:ChefHat,n:recipesHistory.length,label:"recetas cocinadas",color:T.sage}].map(({icon:I,n,label,color})=>(
          <div key={label} style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"18px 16px"}}>
            <I size={18} color={color} style={{marginBottom:8}}/><p style={{fontFamily:FD,fontSize:28,fontWeight:700,color:T.brown,lineHeight:1}}>{n}</p><p style={{fontSize:11,color:T.stone,marginTop:4}}>{label}</p>
          </div>
        ))}
      </div>
      {profile?.sintomas?.length>0&&<div style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"16px",marginBottom:20}}>
        <p style={{fontSize:10,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Síntomas en seguimiento</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{profile.sintomas.map(s=><span key={s} style={{fontSize:11,padding:"5px 10px",borderRadius:12,background:T.terraPale,color:T.terra,fontWeight:600}}>{s}</span>)}</div>
      </div>}
      <button onClick={()=>goTo("pantry")} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px",borderRadius:22,background:`linear-gradient(135deg,${T.terra},${T.terraLight})`,border:"none",cursor:"pointer",marginBottom:10,boxShadow:`0 6px 20px ${T.terra}44`}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}><Camera size={20} color="white"/><div style={{textAlign:"left"}}><p style={{fontSize:14,fontWeight:700,color:"white",fontFamily:FB}}>Subir ticket de compra</p><p style={{fontSize:11,color:"rgba(255,255,255,0.75)",marginTop:2}}>Actualiza tu despensa Método Eri</p></div></div>
        <ChevronRight size={18} color="rgba(255,255,255,0.8)"/>
      </button>
      <button onClick={()=>goTo("recipes")} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px",borderRadius:22,background:T.warmWhite,border:`1px solid ${T.stonePale}`,cursor:"pointer"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}><ChefHat size={20} color={T.sage}/><div style={{textAlign:"left"}}><p style={{fontSize:14,fontWeight:700,color:T.brown,fontFamily:FB}}>¿Qué cocino hoy?</p><p style={{fontSize:11,color:T.stone,marginTop:2}}>Recetas Método Eri con tu despensa</p></div></div>
        <ChevronRight size={18} color={T.stoneMid}/>
      </button>
    </div>
  );
}

// ── DESPENSA ──────────────────────────────────────────────────────────────────
function PantryTab({state,dispatch}){
  const {pantry}=state;
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState(null);
  const [filter,setFilter]=useState("all");
  const fileRef=useRef();
  async function handleFile(e){
    const file=e.target.files?.[0];if(!file)return;
    setLoading(true);setErr(null);
    try{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
      const sys=`Eres asistente de nutrición del Método Eri para Hashimoto. Responde SOLO con JSON válido.`;
      const txt=await callClaude([{role:"user",content:[
        {type:"image",source:{type:"base64",media_type:file.type,data:b64}},
        {type:"text",text:`Analiza este ticket y extrae todos los alimentos. Clasifica cada uno en: proteina, carbohidrato, verdura, fruta, grasa, otro.\n\nResponde SOLO con este JSON:\n{"items":[{"name":"string","quantity":1,"unit":"string","category":"proteina|carbohidrato|verdura|fruta|grasa|otro"}]}`}
      ]}],sys,1500);
      const parsed=pj(txt);
      dispatch({type:"MERGE_PANTRY",p:parsed.items});
      const next=[...pantry];parsed.items.forEach(ni=>{const idx=next.findIndex(i=>i.name.toLowerCase()===ni.name.toLowerCase());idx>=0?(next[idx]={...next[idx],quantity:(next[idx].quantity||0)+(ni.quantity||0)}):next.push(ni);});
      await dbSet("pantry:items",next);
    }catch{setErr("No pude leer el ticket. Intenta con mejor iluminación.");}
    finally{setLoading(false);if(fileRef.current)fileRef.current.value="";}
  }
  const visible=filter==="all"?pantry:pantry.filter(i=>i.category===filter);
  return(
    <div style={{padding:"56px 20px 96px",fontFamily:FB}}>
      <h2 style={{fontFamily:FD,fontSize:26,color:T.brown,fontWeight:700,marginBottom:4}}>Despensa Método Eri</h2>
      <p style={{fontSize:12,color:T.stone,marginBottom:20}}>{pantry.length} ingredientes disponibles</p>
      <label style={{display:"block",marginBottom:20}}>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleFile}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"17px",borderRadius:22,background:`linear-gradient(135deg,${T.terra},${T.terraLight})`,cursor:"pointer",boxShadow:`0 8px 24px ${T.terra}44`}}>
          <Camera size={20} color="white"/><span style={{fontSize:14,fontWeight:700,color:"white"}}>Subir ticket de compra</span>
        </div>
      </label>
      {loading&&<Spin msg="Leyendo tu ticket y clasificando ingredientes…"/>}
      {err&&<Err msg={err} onClose={()=>setErr(null)}/>}
      {pantry.length>0&&<div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8,marginBottom:14}}>
        {[["all","Todos"," "],...Object.entries(CATS).map(([k,v])=>[k,v.label,v.emoji])].map(([k,l,em])=>(
          <button key={k} onClick={()=>setFilter(k)} style={{flexShrink:0,padding:"7px 14px",borderRadius:20,border:`1.5px solid ${filter===k?(CATS[k]?.color||T.sage):T.stoneMid}`,background:filter===k?(CATS[k]?.color||T.sage):"white",color:filter===k?"white":T.brown,fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:FB}}>
            {em} {l}
          </button>
        ))}
      </div>}
      {pantry.length===0?<Empty Icon={ShoppingBag} title="Tu despensa está vacía" sub="Sube una foto de tu ticket y registraré todos tus ingredientes automáticamente."/>
       :visible.length===0?<Empty Icon={Soup} title="Nada en esta categoría" sub="Prueba otro filtro."/>
       :visible.map((item,i)=>{
        const c=CATS[item.category]||CATS.otro;
        return(
          <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderRadius:18,background:T.warmWhite,border:`1px solid ${T.stonePale}`,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:20}}>{c.emoji}</span>
              <div><p style={{fontSize:14,fontWeight:600,color:T.brown}}>{item.name}</p><span style={{fontSize:10,padding:"3px 8px",borderRadius:8,background:c.color+"22",color:c.color,fontWeight:700}}>{c.label}</span></div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <p style={{fontSize:14,fontWeight:700,color:T.sage}}>{item.quantity} {item.unit}</p>
              <button onClick={async()=>{const idx=pantry.indexOf(item);dispatch({type:"REMOVE_ITEM",p:idx});await dbSet("pantry:items",pantry.filter((_,j)=>j!==idx));}} style={{background:"none",border:"none",cursor:"pointer"}}><Trash2 size={14} color={T.stoneMid}/></button>
            </div>
          </div>
        );
       })}
    </div>
  );
}

// ── RECETA CARD ───────────────────────────────────────────────────────────────
function RecipeCard({recipe,onCook,cooked}){
  const [exp,setExp]=useState(false);
  const diffC={fácil:T.ok,media:T.terra,alta:T.error}[recipe.dificultad]||T.stone;
  return(
    <div style={{borderRadius:24,background:T.warmWhite,border:`1px solid ${T.stonePale}`,marginBottom:16,overflow:"hidden",boxShadow:cooked?"none":"0 4px 18px rgba(0,0,0,0.07)",opacity:cooked?0.7:1}}>
      <div style={{padding:"20px 18px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
          <div style={{flex:1,paddingRight:10}}>
            <h3 style={{fontFamily:FD,fontSize:17,fontWeight:700,color:T.brown,marginBottom:4}}>{recipe.titulo}</h3>
            <p style={{fontSize:12,color:T.sage,fontStyle:"italic",lineHeight:1.5}}>{recipe.encaje_objetivo}</p>
          </div>
          {cooked&&<CheckCircle size={20} color={T.ok}/>}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
          <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,padding:"5px 10px",borderRadius:12,background:T.sagePale,color:T.sage,fontWeight:700}}><Clock size={10}/>{recipe.tiempo_min} min</span>
          <span style={{fontSize:11,padding:"5px 10px",borderRadius:12,background:diffC+"22",color:diffC,fontWeight:700}}>{recipe.dificultad}</span>
          <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,padding:"5px 10px",borderRadius:12,background:T.terraPale,color:T.terra,fontWeight:700}}><Flame size={10}/>{recipe.macros?.kcal} kcal</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,padding:"12px",borderRadius:16,background:T.cream,marginBottom:12}}>
          {[["Proteína",recipe.macros?.proteina_g+"g"],["Carbos",recipe.macros?.carbos_g+"g"],["Grasas",recipe.macros?.grasas_g+"g"]].map(([l,v])=>(
            <div key={l} style={{textAlign:"center"}}><p style={{fontFamily:FD,fontSize:15,fontWeight:700,color:T.brown}}>{v}</p><p style={{fontSize:10,color:T.stone}}>{l}</p></div>
          ))}
        </div>
        <button onClick={()=>setExp(!exp)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",fontSize:12,color:T.sage,fontWeight:700,marginBottom:exp?12:0,fontFamily:FB}}>
          <BookOpen size={12}/>{exp?"Ocultar":"Ver preparación"}{exp?<ChevronLeft size={12}/>:<ChevronRight size={12}/>}
        </button>
        {exp&&<div style={{marginBottom:12}}>{recipe.pasos?.map((p,i)=>(
          <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
            <span style={{width:22,height:22,borderRadius:"50%",background:T.sage,color:"white",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
            <p style={{fontSize:13,color:T.brown,lineHeight:1.6}}>{p}</p>
          </div>
        ))}</div>}
        {recipe.ingredientes_faltan?.length>0&&<div style={{padding:"10px 12px",borderRadius:14,background:T.terraPale,marginBottom:12}}>
          <p style={{fontSize:11,fontWeight:700,color:T.terra,marginBottom:4}}> Ingredientes que te faltan:</p>
          <p style={{fontSize:12,color:T.brownMid}}>{recipe.ingredientes_faltan.map(i=>`${i.name} (${i.quantity} ${i.unit})`).join(" · ")}</p>
        </div>}
        {!cooked&&<button onClick={()=>onCook(recipe)} style={{width:"100%",padding:"13px",borderRadius:18,border:"none",background:T.sage,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FB}}>✓ Marcar como cocinada</button>}
      </div>
    </div>
  );
}

// ── RECETARIO MODAL ───────────────────────────────────────────────────────────
function RecetaModal({receta,onClose}){
  if(!receta)return null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(44,32,24,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:480,maxHeight:"90svh",borderRadius:"28px 28px 0 0",background:T.cream,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 0"}}><div style={{width:40,height:4,borderRadius:2,background:T.stoneMid}}/></div>
        <div style={{overflowY:"auto",padding:"16px 22px 48px"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
            <div style={{flex:1,paddingRight:12}}>
              <h2 style={{fontFamily:FD,fontSize:22,fontWeight:700,color:T.brown,lineHeight:1.2}}>{receta.titulo}</h2>
              <p style={{fontSize:13,color:T.sage,fontStyle:"italic",marginTop:4}}>{receta.desc}</p>
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}><XCircle size={22} color={T.stoneMid}/></button>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
            <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,padding:"5px 10px",borderRadius:12,background:T.sagePale,color:T.sage,fontWeight:700}}><Clock size={10}/>{receta.mins} min</span>
            <span style={{fontSize:11,padding:"5px 10px",borderRadius:12,background:T.terraPale,color:T.terra,fontWeight:700}}>{receta.dif}</span>
          </div>
          <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Ingredientes</p>
          {receta.ing.map((ing,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:7}}><span style={{width:6,height:6,borderRadius:"50%",background:T.sage,flexShrink:0,marginTop:6}}/><p style={{fontSize:13,color:T.brown,lineHeight:1.5}}>{ing}</p></div>)}
          <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",margin:"18px 0 10px"}}>Preparación</p>
          {receta.pasos.map((paso,i)=><div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}><span style={{width:24,height:24,borderRadius:"50%",background:T.sage,color:"white",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span><p style={{fontSize:13,color:T.brown,lineHeight:1.6}}>{paso}</p></div>)}
          {receta.nota&&<div style={{marginTop:16,padding:"12px 14px",borderRadius:14,background:T.sagePale,border:`1px solid ${T.sageLight}`}}><p style={{fontSize:11,fontWeight:700,color:T.sage,marginBottom:4}}> Nota</p><p style={{fontSize:12,color:T.sage,lineHeight:1.6}}>{receta.nota}</p></div>}
        </div>
      </div>
    </div>
  );
}

// ── RECETARIO ─────────────────────────────────────────────────────────────────
function RecetarioSH({onBack}){
  const [cat,setCat]=useState("todos");
  const [q,setQ]=useState("");
  const [abierta,setAbierta]=useState(null);
  const filtradas=RECETARIO.filter(r=>(cat==="todos"||r.cat===cat)&&(q===""||r.titulo.toLowerCase().includes(q.toLowerCase())||r.ing.some(i=>i.toLowerCase().includes(q.toLowerCase()))));
  return(
    <div style={{padding:"20px 20px 96px",fontFamily:FB}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",fontSize:13,color:T.stone,fontWeight:600,marginBottom:16,padding:0}}><ChevronLeft size={16}/> Volver</button>
      <h2 style={{fontFamily:FD,fontSize:22,color:T.brown,fontWeight:700,marginBottom:4}}>Recetario Método Eri</h2>
      <p style={{fontSize:12,color:T.stone,marginBottom:16}}>Stop Hashimoto · {RECETARIO.length} recetas originales</p>
      <input type="text" placeholder=" Buscar receta o ingrediente..." value={q} onChange={e=>setQ(e.target.value)} style={{width:"100%",padding:"12px 16px",borderRadius:16,border:`1.5px solid ${T.stoneMid}`,background:T.warmWhite,fontSize:14,color:T.ink,outline:"none",boxSizing:"border-box",fontFamily:FB,marginBottom:14}}/>
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:10,marginBottom:16}}>
        {CATS_R.map(c=><button key={c.id} onClick={()=>setCat(c.id)} style={{flexShrink:0,padding:"7px 14px",borderRadius:20,border:`1.5px solid ${cat===c.id?T.sage:T.stoneMid}`,background:cat===c.id?T.sage:"white",color:cat===c.id?"white":T.brown,fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:FB}}>{c.emoji} {c.label}</button>)}
      </div>
      <p style={{fontSize:11,color:T.stone,marginBottom:12}}>{filtradas.length} receta{filtradas.length!==1?"s":""}</p>
      {filtradas.length===0?<div style={{textAlign:"center",padding:"40px 16px",color:T.stone,fontSize:13}}>No encontré recetas con ese término </div>
       :filtradas.map(r=>(
        <button key={r.id} onClick={()=>setAbierta(r)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,marginBottom:10,cursor:"pointer",textAlign:"left"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <span style={{fontSize:14}}>{CATS_R.find(c=>c.id===r.cat)?.emoji}</span>
              <p style={{fontSize:14,fontWeight:700,color:T.brown,fontFamily:FB}}>{r.titulo}</p>
            </div>
            <div style={{display:"flex",gap:6}}>
              <span style={{fontSize:11,color:T.stone}}><Clock size={10} style={{display:"inline",verticalAlign:"middle"}}/> {r.mins} min</span>
              <span style={{width:3,height:3,borderRadius:"50%",background:T.stoneMid,display:"inline-block",marginTop:6}}/>
              <span style={{fontSize:11,color:T.stone}}>{r.dif}</span>
            </div>
          </div>
          <ChevronRight size={16} color={T.stoneMid}/>
        </button>
       ))}
      {abierta&&<RecetaModal receta={abierta} onClose={()=>setAbierta(null)}/>}
    </div>
  );
}

// ── GUÍA DE FASE ──────────────────────────────────────────────────────────────
function FaseGuide({fase,onClose}){
  const [tab,setTab]=useState("permitidos");
  const rules=FASES[fase];
  if(!rules)return null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(44,32,24,0.55)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:480,maxHeight:"85svh",borderRadius:"28px 28px 0 0",background:T.cream,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 0"}}><div style={{width:40,height:4,borderRadius:2,background:T.stoneMid}}/></div>
        <div style={{padding:"16px 20px 12px",borderBottom:`1px solid ${T.stonePale}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:20}}>{rules.emoji}</span>
              <div><h3 style={{fontFamily:FD,fontSize:18,fontWeight:700,color:T.brown}}>{fase}</h3><p style={{fontSize:11,color:T.stone,marginTop:2}}>Método Eri · Stop Hashimoto</p></div>
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}><XCircle size={20} color={T.stoneMid}/></button>
          </div>
          <p style={{fontSize:12,color:T.stone,lineHeight:1.6,marginTop:10,padding:"10px 12px",borderRadius:12,background:rules.colorPale}}>{rules.desc}</p>
        </div>
        <div style={{display:"flex",borderBottom:`1px solid ${T.stonePale}`}}>
          {[["permitidos"," Permitidos"],["prohibidos"," Prohibidos"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"12px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB,color:tab===k?rules.color:T.stone,borderBottom:tab===k?`2.5px solid ${rules.color}`:"2.5px solid transparent"}}>{l}</button>
          ))}
        </div>
        <div style={{overflowY:"auto",padding:"16px 20px 32px"}}>
          {rules[tab].map((item,i)=><div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}><span style={{fontSize:16,flexShrink:0}}>{tab==="permitidos"?" ":" "}</span><p style={{fontSize:13,color:T.brown,lineHeight:1.5}}>{item}</p></div>)}
        </div>
      </div>
    </div>
  );
}

// ── CREAR POR FASE ────────────────────────────────────────────────────────────
function CreateByFase({profile,state,dispatch,onBack}){
  const [fase,setFase]=useState(profile?.fase_eri&&FASES[profile.fase_eri]?profile.fase_eri:"Eliminación");
  const [tipo,setTipo]=useState("cualquiera");
  const [pref,setPref]=useState("");
  const [recipes,setRecipes]=useState([]);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState(null);
  const [cooked,setCooked]=useState([]);
  const [guia,setGuia]=useState(null);
  const fases=["Eliminación","Reintroducción","Mantenimiento"];
  const tipos=["cualquiera","desayuno","almuerzo","cena","colación"];
  async function generar(){
    setLoading(true);setErr(null);setRecipes([]);setCooked([]);
    const r=FASES[fase];
    const pantryStr=state.pantry.length>0?`Despensa: ${state.pantry.map(i=>i.name).join(", ")}.`:"Sin despensa — usa ingredientes típicos.";
    const sys=`Eres coach de nutrición del programa Stop Hashimoto experta en el Método Eri. Responde SOLO con JSON válido sin markdown.`;
    const prompt=`Usuaria: ${profile?.nombre||"sin nombre"}, objetivo: ${profile?.objetivo||"salud"}, notas: ${profile?.notas||"ninguna"}.\n${pantryStr}\nFase: ${fase}\nTipo: ${tipo}\nPreferencia: ${pref||"ninguna"}\nPERMITIDO: ${r.permitidos.slice(0,8).join("; ")}\nPROHIBIDO (NUNCA usar): ${r.prohibidos.slice(0,6).join("; ")}\nCrea 3 recetas Método Eri para fase ${fase}. SOLO ingredientes permitidos.\nJSON: {"recetas":[{"titulo":"string","tiempo_min":20,"dificultad":"fácil","macros":{"kcal":300,"proteina_g":25,"carbos_g":20,"grasas_g":12},"ingredientes_usados":[{"name":"pollo","quantity":200,"unit":"g"}],"ingredientes_faltan":[],"pasos":["paso 1","paso 2"],"encaje_objetivo":"razón"}]}`;
    try{
      const txt=await callClaude([{role:"user",content:prompt}],sys,3000);
      const parsed=pj(txt);
      if(!parsed.recetas||parsed.recetas.length===0)throw new Error("Sin recetas");
      setRecipes(parsed.recetas);
    }catch(e){setErr("No pude generar las recetas. Verifica tu conexión e intenta de nuevo.");console.error(e);}
    finally{setLoading(false);}
  }
  async function handleCook(recipe,idx){
    setCooked(c=>[...c,idx]);
    if(state.pantry.length>0){
      dispatch({type:"COOK_RECIPE",p:recipe.ingredientes_usados||[]});
      const newP=state.pantry.map(item=>{const u=(recipe.ingredientes_usados||[]).find(u=>u.name.toLowerCase()===item.name.toLowerCase());return u?{...item,quantity:Math.max(0,(item.quantity||0)-(u.quantity||0))}:item;}).filter(i=>i.quantity>0);
      await dbSet("pantry:items",newP);
    }
    const entry={...recipe,fecha:new Date().toLocaleDateString("es-CL"),fase};
    dispatch({type:"ADD_RH",p:entry});
    await dbSet("history:recipes",[entry,...state.recipesHistory].slice(0,30));
  }
  return(
    <div style={{padding:"20px 20px 96px",fontFamily:FB}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",fontSize:13,color:T.stone,fontWeight:600,marginBottom:20,padding:0}}><ChevronLeft size={16}/> Volver</button>
      <h2 style={{fontFamily:FD,fontSize:22,color:T.brown,fontWeight:700,marginBottom:4}}>Crear recetas por fase</h2>
      <p style={{fontSize:12,color:T.stone,marginBottom:20}}>Recetas respetando exactamente los alimentos de cada etapa del Método Eri.</p>
      <div style={{marginBottom:18}}>
        <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Fase del Método Eri</p>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {fases.map(f=>{
            const r=FASES[f];const sel=fase===f;
            return(
              <button key={f} onClick={()=>setFase(f)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderRadius:18,border:`2px solid ${sel?r.color:T.stonePale}`,background:sel?r.colorPale:T.warmWhite,cursor:"pointer",textAlign:"left"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18}}>{r.emoji}</span>
                  <div><p style={{fontSize:14,fontWeight:700,color:sel?r.color:T.brown}}>{f}</p><p style={{fontSize:11,color:T.stone,marginTop:2,maxWidth:200,lineHeight:1.4}}>{r.desc.slice(0,55)}…</p></div>
                </div>
                <button onClick={e=>{e.stopPropagation();setGuia(f);}} style={{background:r.color+"22",border:"none",borderRadius:10,padding:"5px 10px",cursor:"pointer",fontSize:11,color:r.color,fontWeight:700,fontFamily:FB,flexShrink:0}}>Ver guía</button>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{marginBottom:18}}>
        <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Tipo de comida</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {tipos.map(t=>{const sel=tipo===t;return<button key={t} onClick={()=>setTipo(t)} style={{padding:"9px 14px",borderRadius:20,border:`1.5px solid ${sel?T.sage:T.stoneMid}`,background:sel?T.sage:T.warmWhite,color:sel?"white":T.brown,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FB,textTransform:"capitalize"}}>{t}</button>;})}
        </div>
      </div>
      <div style={{marginBottom:20}}>
        <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>Preferencia adicional (opcional)</p>
        <input type="text" placeholder="ej. algo rápido, con salmón, sin cebolla..." value={pref} onChange={e=>setPref(e.target.value)} style={{width:"100%",padding:"12px 16px",borderRadius:14,border:`1.5px solid ${T.stoneMid}`,background:T.warmWhite,fontSize:14,color:T.ink,outline:"none",boxSizing:"border-box",fontFamily:FB}}/>
      </div>
      <button onClick={generar} disabled={loading} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"17px",borderRadius:22,border:"none",background:`linear-gradient(135deg,${FASES[fase].color},${T.sage})`,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:20,boxShadow:`0 8px 24px ${FASES[fase].color}55`,opacity:loading?0.7:1,fontFamily:FB}}>
        <Sparkles size={18}/>{loading?"Creando recetas…":`Crear recetas para ${fase}`}
      </button>
      {loading&&<Spin msg={`Creando recetas para la fase ${fase}…`}/>}
      {err&&<Err msg={err} onRetry={generar} onClose={()=>setErr(null)}/>}
      {recipes.length>0&&<div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
          <span style={{fontSize:14}}>{FASES[fase].emoji}</span>
          <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.12em",textTransform:"uppercase"}}>{recipes.length} recetas · Fase {fase}</p>
        </div>
        {recipes.map((r,i)=><RecipeCard key={i} recipe={r} cooked={cooked.includes(i)} onCook={()=>handleCook(r,i)}/>)}
      </div>}
      {recipes.length===0&&!loading&&!err&&<div style={{textAlign:"center",padding:"32px 16px",color:T.stone,fontSize:13}}><p>Selecciona una fase y presiona el botón </p></div>}
      {guia&&<FaseGuide fase={guia} onClose={()=>setGuia(null)}/>}
    </div>
  );
}

// ── RECETAS TAB ───────────────────────────────────────────────────────────────
function RecipesTab({state,dispatch}){
  const {pantry,profile,recipesHistory}=state;
  const [modo,setModo]=useState("inicio");
  const [recipes,setRecipes]=useState([]);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState(null);
  const [cooked,setCooked]=useState([]);
  async function gen(){
    if(pantry.length===0){setErr("Primero agrega ingredientes a tu despensa.");return;}
    setLoading(true);setErr(null);setRecipes([]);setCooked([]);
    try{
      const fase=profile?.fase_eri||"Eliminación";
      const r=FASES[fase]||FASES["Eliminación"];
      const pantryStr=pantry.map(i=>i.name).join(", ");
      const sys=`Eres coach de nutrición del programa Stop Hashimoto experta en el Método Eri. Responde SOLO con JSON válido sin markdown.`;
      const txt=await callClaude([{role:"user",content:`Usuaria: ${profile?.nombre}, fase ${fase}, objetivo: ${profile?.objetivo||"salud"}, notas: ${profile?.notas||"ninguna"}.\nDespensa: ${pantryStr}\nPERMITIDO en ${fase}: ${r.permitidos.slice(0,8).join("; ")}\nPROHIBIDO (NUNCA usar): ${r.prohibidos.slice(0,6).join("; ")}\nCrea 3 recetas Método Eri para fase ${fase} priorizando ingredientes de la despensa.\nJSON: {"recetas":[{"titulo":"string","tiempo_min":20,"dificultad":"fácil","macros":{"kcal":300,"proteina_g":25,"carbos_g":20,"grasas_g":12},"ingredientes_usados":[{"name":"pollo","quantity":200,"unit":"g"}],"ingredientes_faltan":[],"pasos":["paso 1"],"encaje_objetivo":"razón"}]}`}],sys,3000);
      const parsed=pj(txt);
      if(!parsed.recetas||parsed.recetas.length===0)throw new Error("Sin recetas");
      setRecipes(parsed.recetas);
    }catch(e){setErr("No pude generar recetas. Verifica tu conexión e intenta de nuevo.");console.error(e);}
    finally{setLoading(false);}
  }
  async function handleCook(recipe,idx){
    setCooked(c=>[...c,idx]);
    dispatch({type:"COOK_RECIPE",p:recipe.ingredientes_usados||[]});
    const newP=state.pantry.map(item=>{const u=(recipe.ingredientes_usados||[]).find(u=>u.name.toLowerCase()===item.name.toLowerCase());return u?{...item,quantity:Math.max(0,(item.quantity||0)-(u.quantity||0))}:item;}).filter(i=>i.quantity>0);
    await dbSet("pantry:items",newP);
    const entry={...recipe,fecha:new Date().toLocaleDateString("es-CL")};
    dispatch({type:"ADD_RH",p:entry});
    await dbSet("history:recipes",[entry,...state.recipesHistory].slice(0,30));
  }
  if(modo==="fase")return<CreateByFase profile={profile} state={state} dispatch={dispatch} onBack={()=>{setModo("inicio");setRecipes([]);}}/>;
  if(modo==="recetario")return<RecetarioSH onBack={()=>setModo("inicio")}/>;
  return(
    <div style={{padding:"56px 20px 96px",fontFamily:FB}}>
      <h2 style={{fontFamily:FD,fontSize:26,color:T.brown,fontWeight:700,marginBottom:4}}>Recetas Método Eri</h2>
      <p style={{fontSize:12,color:T.stone,marginBottom:20}}>Personalizadas para Hashimoto</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <button onClick={()=>{setModo("despensa");gen();}} style={{display:"flex",flexDirection:"column",alignItems:"flex-start",padding:"16px",borderRadius:20,border:`2px solid ${modo==="despensa"?T.sage:T.stonePale}`,background:modo==="despensa"?T.sagePale:T.warmWhite,cursor:"pointer",textAlign:"left"}}>
          <ShoppingBag size={20} color={T.sage} style={{marginBottom:8}}/><p style={{fontSize:13,fontWeight:700,color:T.brown,fontFamily:FB}}>Con mi despensa</p><p style={{fontSize:11,color:T.stone,marginTop:3,lineHeight:1.4}}>Recetas con lo que ya tienes</p>
        </button>
        <button onClick={()=>setModo("fase")} style={{display:"flex",flexDirection:"column",alignItems:"flex-start",padding:"16px",borderRadius:20,border:`2px solid ${T.stonePale}`,background:T.warmWhite,cursor:"pointer",textAlign:"left"}}>
          <Sparkles size={20} color={T.terra} style={{marginBottom:8}}/><p style={{fontSize:13,fontWeight:700,color:T.brown,fontFamily:FB}}>Por fase</p><p style={{fontSize:11,color:T.stone,marginTop:3,lineHeight:1.4}}>Según etapa del Método Eri</p>
        </button>
      </div>
      <button onClick={()=>setModo("recetario")} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 18px",borderRadius:20,border:`2px solid ${T.sageLight}`,background:T.sagePale,cursor:"pointer",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <BookOpen size={20} color={T.sage}/>
          <div style={{textAlign:"left"}}><p style={{fontSize:13,fontWeight:700,color:T.sage,fontFamily:FB}}> Recetario Stop Hashimoto</p><p style={{fontSize:11,color:T.stone,marginTop:2}}>{RECETARIO.length} recetas originales del programa</p></div>
        </div>
        <ChevronRight size={16} color={T.sage}/>
      </button>
      {modo==="despensa"&&<button onClick={gen} disabled={loading} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"15px",borderRadius:22,border:"none",background:`linear-gradient(135deg,${T.sage},${T.sageMid})`,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:20,boxShadow:`0 8px 24px ${T.sage}44`,opacity:loading?0.7:1,fontFamily:FB}}>
        <ChefHat size={18}/>{loading?"Buscando recetas…":"¿Qué cocino hoy?"}
      </button>}
      {loading&&<Spin msg="Buscando recetas que encajen con tu despensa y tu tiroides…"/>}
      {err&&<Err msg={err} onRetry={gen} onClose={()=>setErr(null)}/>}
      {recipes.length>0&&recipes.map((r,i)=><RecipeCard key={i} recipe={r} cooked={cooked.includes(i)} onCook={()=>handleCook(r,i)}/>)}
      {modo==="inicio"&&recipes.length===0&&!loading&&!err&&<Empty Icon={ChefHat} title="¿Qué recetas necesitas?" sub="Elige 'Con mi despensa', 'Por fase', o explora el Recetario completo del programa."/>}
      {recipesHistory.length>0&&recipes.length===0&&!loading&&<div style={{marginTop:16}}>
        <p style={{fontSize:10,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Últimas cocinadas</p>
        {recipesHistory.slice(0,3).map((r,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderRadius:18,background:T.warmWhite,border:`1px solid ${T.stonePale}`,marginBottom:8}}>
          <div><p style={{fontSize:14,fontWeight:600,color:T.brown}}>{r.titulo}</p><p style={{fontSize:11,color:T.stone}}>{r.fecha}</p></div>
          <CheckCircle size={16} color={T.ok}/>
        </div>)}
      </div>}
    </div>
  );
}

// ── PERFIL ────────────────────────────────────────────────────────────────────
function ProfileTab({state,dispatch}){
  const {profile}=state;
  const [confirm,setConfirm]=useState(false);
  if(!profile)return null;
  const rows=[["Edad",profile.edad?`${profile.edad} años`:"—"],["Peso",profile.peso?`${profile.peso} kg`:"—"],["Altura",profile.altura?`${profile.altura} cm`:"—"],["Actividad",profile.actividad||"—"],["Sueño",profile.sueno?`${profile.sueno} h`:"—"],["Estrés",profile.estres||"—"],["Diagnóstico",profile.tiempo_dx||"—"],["Fase Método Eri",profile.fase_eri||"—"],["Objetivo",profile.objetivo||"—"]];
  return(
    <div style={{padding:"56px 20px 96px",fontFamily:FB}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:28}}>
        <div style={{width:72,height:72,borderRadius:22,background:`linear-gradient(135deg,${T.sage},${T.sageMid})`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12,boxShadow:`0 8px 24px ${T.sage}44`}}><Leaf size={30} color="white"/></div>
        <h2 style={{fontFamily:FD,fontSize:22,fontWeight:700,color:T.brown}}>{profile.nombre||"Tu perfil"}</h2>
        <span style={{fontSize:11,padding:"5px 14px",borderRadius:20,background:T.sagePale,color:T.sage,fontWeight:700,marginTop:6}}>Stop Hashimoto · Método Eri</span>
      </div>
      <div style={{borderRadius:20,overflow:"hidden",border:`1px solid ${T.stonePale}`,marginBottom:16}}>
        {rows.map(([k,v],i)=><div key={k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px",background:T.warmWhite,borderBottom:i<rows.length-1?`1px solid ${T.stonePale}`:"none"}}>
          <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.1em",textTransform:"uppercase"}}>{k}</p>
          <p style={{fontSize:13,fontWeight:600,color:T.brown}}>{v}</p>
        </div>)}
      </div>
      {profile.sintomas?.length>0&&<div style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"16px",marginBottom:16}}>
        <p style={{fontSize:10,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Síntomas en seguimiento</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{profile.sintomas.map(s=><span key={s} style={{fontSize:11,padding:"5px 10px",borderRadius:12,background:T.terraPale,color:T.terra,fontWeight:600}}>{s}</span>)}</div>
      </div>}
      {profile.notas&&<div style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"16px",marginBottom:16}}>
        <p style={{fontSize:10,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:6}}>Notas personales</p>
        <p style={{fontSize:13,color:T.brown,lineHeight:1.6}}>{profile.notas}</p>
      </div>}
      <div style={{borderRadius:20,background:T.sagePale,border:`1px solid ${T.sageLight}`,padding:"16px",marginBottom:24}}>
        <p style={{fontSize:11,fontWeight:700,color:T.sage,marginBottom:4}}> Stop Hashimoto Program</p>
        <p style={{fontSize:12,color:T.sage,lineHeight:1.6}}>Coach certificada · Instituto IIN Nueva York · Especialista en enfermedades autoinmunes y Método Eri</p>
      </div>
      {confirm?<div style={{borderRadius:18,background:"#FDECEA",border:`1px solid ${T.error}33`,padding:"16px"}}>
        <p style={{fontSize:13,fontWeight:700,color:T.error,marginBottom:12}}>¿Estás segura de reiniciar todo tu perfil y despensa?</p>
        <div style={{display:"flex",gap:8}}>
          <button onClick={async()=>{await dbSet("profile:user",null);await dbSet("pantry:items",[]);await dbSet("history:recipes",[]);window.location.reload();}} style={{flex:1,padding:"11px",borderRadius:14,border:"none",background:T.error,color:"white",fontSize:13,fontWeight:700,cursor:"pointer"}}>Sí, reiniciar</button>
          <button onClick={()=>setConfirm(false)} style={{flex:1,padding:"11px",borderRadius:14,border:"none",background:T.stonePale,color:T.brown,fontSize:13,fontWeight:700,cursor:"pointer"}}>Cancelar</button>
        </div>
      </div>:<button onClick={()=>setConfirm(true)} style={{width:"100%",padding:"13px",borderRadius:18,border:`1px solid ${T.stoneMid}`,background:"transparent",color:T.stone,fontSize:13,cursor:"pointer",fontFamily:FB}}>Reiniciar perfil</button>}
    </div>
  );
}

// ── TAB BAR ───────────────────────────────────────────────────────────────────
function TabBar({active,setActive}){
  const tabs=[{id:"home",Icon:Heart,label:"Inicio"},{id:"pantry",Icon:ShoppingBag,label:"Despensa"},{id:"recipes",Icon:ChefHat,label:"Recetas"},{id:"profile",Icon:User,label:"Perfil"}];
  return(
    <nav style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:T.warmWhite,borderTop:`1px solid ${T.stonePale}`,display:"flex",justifyContent:"space-around",paddingTop:10,paddingBottom:"max(env(safe-area-inset-bottom),14px)"}}>
      {tabs.map(({id,Icon,label})=>{
        const on=active===id;
        return(
          <button key={id} onClick={()=>setActive(id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",padding:"0 12px"}}>
            <div style={{width:40,height:40,borderRadius:14,background:on?T.sage:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",transform:on?"scale(1.05)":"scale(1)"}}>
              <Icon size={18} color={on?"white":T.stoneMid}/>
            </div>
            <span style={{fontSize:10,fontWeight:700,color:on?T.sage:T.stoneMid,fontFamily:FB}}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function StopHashimoto(){
  const [state,dispatch]=useReducer(reducer,init);
  const [tab,setTab]=useState("home");
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    (async()=>{
      try{
        const [profile,pantry,recipes]=await Promise.all([dbGet("profile:user"),dbGet("pantry:items"),dbGet("history:recipes")]);
        dispatch({type:"LOAD",p:{profile:profile||null,pantry:pantry||[],recipesHistory:recipes||[],ticketsHistory:[]}});
      }catch{}
      setReady(true);
    })();
  },[]);
  async function onboard(p){dispatch({type:"SET_PROFILE",p});await dbSet("profile:user",p);}
  if(!ready)return<div style={{minHeight:"100svh",background:T.cream,display:"flex",alignItems:"center",justifyContent:"center"}}><Spin msg="Cargando Stop Hashimoto…"/></div>;
  if(!state.profile)return<Onboarding onDone={onboard}/>;
  return(
    <div style={{minHeight:"100svh",background:T.cream,maxWidth:480,margin:"0 auto",position:"relative"}}>
      {tab==="home"&&<HomeTab state={state} dispatch={dispatch} goTo={setTab}/>}
      {tab==="pantry"&&<PantryTab state={state} dispatch={dispatch}/>}
      {tab==="recipes"&&<RecipesTab state={state} dispatch={dispatch}/>}
      {tab==="profile"&&<ProfileTab state={state} dispatch={dispatch}/>}
      <TabBar active={tab} setActive={setTab}/>
    </div>
  );
}
