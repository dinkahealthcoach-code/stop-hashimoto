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

// ── HOTMART CONFIG ───────────────────────────────────────────────────────────
const HOTMART_PREMIUM_URL = "https://pay.hotmart.com/O106388703S";
const HOTMART_COMUNIDAD_URL = "https://pay.hotmart.com/H106388301Y";
const FREE_RECIPES_LIMIT = 3; // 3 recetas de almuerzo solamente
const PREMIUM_RECIPES_PER_CAT = 2; // 2 recetas por categoría

// ── MEMBERSHIP HELPERS ────────────────────────────────────────────────────────
async function getMembership(email){
  if(!email){
    // Fallback: leer email guardado localmente
    try{const cached=localStorage.getItem("membership:status");if(cached){const p=JSON.parse(cached);if(p?.email)return getMembership(p.email);}return null;}catch{return null;}
  }
  try{
    const r=await fetch("/api/verify-membership",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
    const data=await r.json();
    const mem={type:data?.membership==="premium"?"premium":"free",plan_type:data?.plan_type||"general",email,checkedAt:Date.now()};
    localStorage.setItem("membership:status",JSON.stringify(mem));
    return mem;
  }catch{
    // Si falla la red, usar caché local
    try{const cached=localStorage.getItem("membership:status");return cached?JSON.parse(cached):null;}catch{return null;}
  }
}
async function setMembership(data){try{localStorage.setItem("membership:status",JSON.stringify(data));}catch{}}

// ── SUPABASE HELPERS ──────────────────────────────────────────────────────────
async function saveToDB(table,email,data){
  try{await fetch("/api/db",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({table,email,data})});}catch(e){console.error("saveToDB error:",e);}
}
async function getFromDB(table,email){
  try{const r=await fetch("/api/db",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({table,email,action:"get"})});return r.json();}catch{return null;}
}

// ── PAYWALL SCREEN ────────────────────────────────────────────────────────────
function PaywallScreen({onActivate}){
  const [code,setCode]=useState("");
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState(null);
  const [tab,setTab]=useState("planes"); // planes | codigo
  const [showAlumnaCheck,setShowAlumnaCheck]=useState(false);
  const [alumnaEmail,setAlumnaEmail]=useState("");
  const [alumnaLoading,setAlumnaLoading]=useState(false);
  const [alumnaErr,setAlumnaErr]=useState(null);

  async function handleAlumnaCheck(){
    if(!alumnaEmail.trim()||!alumnaEmail.includes("@")){setAlumnaErr("Ingresa un email válido.");return;}
    setAlumnaLoading(true);setAlumnaErr(null);
    // Abrir ventana ANTES del await para evitar bloqueo de popup del navegador
    const win=window.open("","_blank");
    try{
      const r=await fetch("/api/verify-alumna",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:alumnaEmail.toLowerCase().trim()})});
      const data=await r.json();
      if(data?.autorizada){
        win.location.href=HOTMART_COMUNIDAD_URL;
      } else {
        win.close();
        setAlumnaErr("No encontramos ese email entre nuestras alumnas. Si crees que es un error, escríbenos a dinkahealthcoach@gmail.com");
      }
    }catch{
      win.close();
      setAlumnaErr("Error de conexión. Intenta de nuevo en unos segundos.");
    }
    setAlumnaLoading(false);
  }

  async function handleCode(){
    if(!code.trim()){setErr("Ingresa tu email de compra.");return;}
    if(!code.includes("@")){setErr("Ingresa un email válido.");return;}
    setLoading(true);setErr(null);
    try{
      const r=await fetch("/api/verify-membership",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:code.toLowerCase().trim()})});
      const data=await r.json();
      if(data?.membership==="premium"){
        const mem={type:"premium",plan_type:data?.plan_type||"general",email:code.toLowerCase().trim(),activatedAt:Date.now()};
        await setMembership(mem);
        onActivate("premium");
      } else {
        setErr("Email no encontrado. Verifica que sea el mismo con el que realizaste tu compra.");
      }
    }catch{
      setErr("Error de conexión. Intenta de nuevo en unos segundos.");
    }
    setLoading(false);
  }

  return(
    <div style={{minHeight:"100svh",background:`linear-gradient(160deg,#EBF3EC 0%,#FAF7F2 45%,#FDF0EA 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",fontFamily:FB}}>
      <div style={{width:64,height:64,borderRadius:20,background:`linear-gradient(135deg,${T.sage},${T.sageMid})`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16,boxShadow:`0 8px 24px ${T.sage}44`}}>
        <Leaf size={28} color="white"/>
      </div>
      <p style={{fontSize:11,color:T.sage,letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:6,fontWeight:700}}>Proyecto Stop Hashimoto®</p>
      <h1 style={{fontFamily:FD,fontSize:28,color:T.ink,fontWeight:700,textAlign:"center",marginBottom:6,lineHeight:1.2}}>Tu app para sanar{"\n"}desde la raíz</h1>
      <p style={{fontSize:13,color:T.stone,textAlign:"center",marginBottom:32,lineHeight:1.6}}>Nutrición · Estilo de vida · Método Eri</p>

      {/* TABS */}
      <div style={{display:"flex",background:"rgba(0,0,0,0.06)",borderRadius:16,padding:4,marginBottom:24,width:"100%",maxWidth:340}}>
        {[["planes","Ver planes"],["codigo","Ya tengo acceso"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"10px",borderRadius:12,border:"none",background:tab===id?"white":"transparent",color:tab===id?T.brown:T.stone,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FB,transition:"all .2s",boxShadow:tab===id?"0 2px 8px rgba(0,0,0,0.1)":"none"}}>{label}</button>
        ))}
      </div>

      {tab==="planes"&&(
        <div style={{width:"100%",maxWidth:340,display:"flex",flexDirection:"column",gap:12}}>
          {/* PLAN GRATUITO */}
          <div style={{borderRadius:20,background:"white",border:`1px solid ${T.stonePale}`,padding:"20px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div><p style={{fontSize:14,fontWeight:700,color:T.ink,marginBottom:2}}>Plan Gratuito</p><p style={{fontSize:11,color:T.stone}}>Sin tarjeta requerida</p></div>
              <span style={{fontSize:20,fontWeight:800,color:T.stoneMid}}>$0</span>
            </div>
            {["Acceso a la guía de fases del Método Eri","Agrega ingredientes a tu despensa","Guía de suplementos y hábitos saludables"].map(f=>(
              <div key={f} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <CheckCircle size={12} color={T.stoneMid}/>
                <span style={{fontSize:12,color:T.stone}}>{f}</span>
              </div>
            ))}
            <button onClick={()=>onActivate("free")} style={{width:"100%",marginTop:14,padding:"12px",borderRadius:14,border:`1px solid ${T.stoneMid}`,background:"transparent",color:T.brownMid,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FB}}>
              Continuar gratis
            </button>
          </div>

          {/* PLAN PREMIUM */}
          <div style={{borderRadius:20,background:`linear-gradient(135deg,${T.terra},${T.terraLight})`,padding:"20px",boxShadow:`0 12px 40px ${T.terra}66`,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.08)"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div>
                <span style={{fontSize:9,fontWeight:800,color:"white",letterSpacing:"0.15em",textTransform:"uppercase",background:"rgba(255,255,255,0.2)",padding:"3px 8px",borderRadius:8}}>MÁS POPULAR</span>
                <p style={{fontSize:14,fontWeight:700,color:"white",marginTop:6,marginBottom:2}}>Plan Premium</p>
                <p style={{fontSize:11,color:"rgba(255,255,255,0.75)"}}>Acceso completo</p>
              </div>
              <div style={{textAlign:"right"}}>
                <span style={{fontSize:10,fontWeight:800,color:"white",background:"rgba(255,255,255,0.25)",padding:"3px 9px",borderRadius:8,display:"inline-block",marginBottom:6}}>14 días gratis</span>
                <div><span style={{fontSize:22,fontWeight:800,color:"white"}}>$12.90</span></div>
                <p style={{fontSize:10,color:"rgba(255,255,255,0.7)"}}>/mes después</p>
              </div>
            </div>
            {["Generador de recetas personalizadas con IA","IA identificadora de alimentos y etiquetas","Seguimiento de síntomas y energía","Plan semanal + contador de macros","Acceso ilimitado a todas las funciones","Suplementos y hábitos del Método Eri"].map(f=>(
              <div key={f} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <CheckCircle size={12} color="white"/>
                <span style={{fontSize:12,color:"white"}}>{f}</span>
              </div>
            ))}
            <button onClick={()=>window.open(HOTMART_PREMIUM_URL,"_blank")} style={{width:"100%",marginTop:16,padding:"14px",borderRadius:14,border:"none",background:"white",color:T.terra,fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:FB,boxShadow:"0 4px 16px rgba(0,0,0,0.15)"}}>
              Empezar 14 días gratis →
            </button>
          </div>

          {/* PLAN COMUNIDAD — ALUMNAS */}
          <div style={{borderRadius:20,background:`linear-gradient(135deg,${T.sage},${T.sageMid})`,padding:"20px",boxShadow:`0 12px 40px ${T.sage}66`,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.08)"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div>
                <span style={{fontSize:9,fontWeight:800,color:"white",letterSpacing:"0.15em",textTransform:"uppercase",background:"rgba(255,255,255,0.2)",padding:"3px 8px",borderRadius:8}}>SOLO ALUMNAS</span>
                <p style={{fontSize:14,fontWeight:700,color:"white",marginTop:6,marginBottom:2}}>Plan Comunidad</p>
                <p style={{fontSize:11,color:"rgba(255,255,255,0.75)"}}>Para alumnas del Proyecto Stop Hashimoto®</p>
              </div>
              <div style={{textAlign:"right"}}>
                <span style={{fontSize:10,fontWeight:800,color:"white",background:"rgba(255,255,255,0.25)",padding:"3px 9px",borderRadius:8,display:"inline-block",marginBottom:6}}>30 días gratis</span>
                <div><span style={{fontSize:22,fontWeight:800,color:"white"}}>$8.90</span></div>
                <p style={{fontSize:10,color:"rgba(255,255,255,0.7)"}}>/mes después</p>
              </div>
            </div>
            {["Acceso completo al Método Eri","Recetas, despensa y seguimiento","Acceso completo a todas las funciones","Precio exclusivo de por vida"].map(f=>(
              <div key={f} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <CheckCircle size={12} color="white"/>
                <span style={{fontSize:12,color:"white"}}>{f}</span>
              </div>
            ))}
            {!showAlumnaCheck?(
              <>
                <button onClick={()=>setShowAlumnaCheck(true)} style={{width:"100%",marginTop:14,padding:"14px",borderRadius:14,border:"none",background:"white",color:T.sage,fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:FB,boxShadow:"0 4px 16px rgba(0,0,0,0.15)"}}>
                  Soy alumna, empezar →
                </button>
                <p style={{fontSize:11,color:"rgba(255,255,255,0.6)",textAlign:"center",marginTop:10,lineHeight:1.6}}>
                  Ya compraste el Proyecto Stop Hashimoto®. Verificaremos tu email antes de llevarte al pago.
                </p>
              </>
            ):(
              <div style={{marginTop:14}}>
                <p style={{fontSize:11,color:"rgba(255,255,255,0.85)",marginBottom:8,lineHeight:1.5}}>Ingresa el email con el que compraste el Proyecto Stop Hashimoto®:</p>
                <input value={alumnaEmail} onChange={e=>setAlumnaEmail(e.target.value)} placeholder="tu@email.com" style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.15)",color:"white",fontSize:13,fontFamily:FB,boxSizing:"border-box",outline:"none"}}/>
                {alumnaErr&&<p style={{fontSize:11,color:"#FFE4E1",marginTop:8,lineHeight:1.5}}>{alumnaErr}</p>}
                <button onClick={handleAlumnaCheck} disabled={alumnaLoading} style={{width:"100%",marginTop:10,padding:"14px",borderRadius:14,border:"none",background:alumnaLoading?"rgba(255,255,255,0.2)":"white",color:alumnaLoading?"rgba(255,255,255,0.6)":T.sage,fontSize:14,fontWeight:800,cursor:alumnaLoading?"not-allowed":"pointer",fontFamily:FB}}>
                  {alumnaLoading?"Verificando…":"Verificar y continuar →"}
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {tab==="codigo"&&(
        <div style={{width:"100%",maxWidth:340}}>
          <div style={{borderRadius:20,background:"white",border:`1px solid ${T.stonePale}`,padding:"24px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <p style={{fontSize:14,fontWeight:700,color:T.ink,marginBottom:4}}>Activar acceso</p>
            <p style={{fontSize:12,color:T.stone,marginBottom:20,lineHeight:1.6}}>Ingresa el email con el que realizaste tu compra.</p>
            <input value={code} onChange={e=>setCode(e.target.value)} placeholder="tu@email.com" style={{width:"100%",padding:"14px 16px",borderRadius:14,border:`1.5px solid ${T.stoneMid}`,background:T.cream,color:T.ink,fontSize:14,fontFamily:FB,boxSizing:"border-box",outline:"none"}}/>
            {err&&<p style={{fontSize:12,color:T.terra,marginTop:8}}>{err}</p>}
            <button onClick={handleCode} disabled={loading} style={{width:"100%",marginTop:14,padding:"14px",borderRadius:14,border:"none",background:loading?T.stonePale:`linear-gradient(135deg,${T.terra},${T.terraLight})`,color:loading?T.stone:"white",fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",fontFamily:FB}}>
              {loading?"Verificando…":"Activar acceso →"}
            </button>
          </div>
          <p style={{fontSize:11,color:T.stone,textAlign:"center",marginTop:16,lineHeight:1.6}}>¿Problemas? Escríbenos a dinkahealthcoach@gmail.com</p>
        </div>
      )}
    </div>
  );
}

// ── PREMIUM LOCK BANNER ───────────────────────────────────────────────────────
function PremiumLock({onUpgrade}){
  return(
    <div style={{margin:"16px 0",borderRadius:20,background:`linear-gradient(135deg,${T.terra}22,${T.terraLight}22)`,border:`1.5px solid ${T.terra}44`,padding:"20px",textAlign:"center"}}>
      <p style={{fontSize:24,marginBottom:8}}>🔒</p>
      <p style={{fontFamily:FD,fontSize:16,fontWeight:700,color:T.brown,marginBottom:4}}>Función exclusiva</p>
      <p style={{fontSize:12,color:T.stone,lineHeight:1.6,marginBottom:14}}>Desbloquea el acceso completo al Método Eri con IA por $12.90/mes</p>
      <button onClick={onUpgrade} style={{padding:"12px 24px",borderRadius:14,border:"none",background:`linear-gradient(135deg,${T.terra},${T.terraLight})`,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FB,boxShadow:`0 4px 16px ${T.terra}44`}}>
        Ver planes →
      </button>
    </div>
  );
}

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
async function dbGet(k){try{const r=localStorage.getItem(k);return r?JSON.parse(r):null;}catch{return null;}}
async function dbSet(k,v){
  try{
    localStorage.setItem(k,JSON.stringify(v));
    const mem=localStorage.getItem("membership:status");
    const email=mem?JSON.parse(mem)?.email:null;
    if(email){
      const tableMap={"pantry:items":"pantry","history:recipes":"recipes_history","sintomas:registros":"symptoms","macros:hoy":"macros","profile:user":"profiles"};
      const dataKeyMap={"pantry:items":"items","history:recipes":"items","sintomas:registros":"registros","macros:hoy":"data","profile:user":"profile_data"};
      const table=tableMap[k];
      if(table){await saveToDB(table,email,{[dataKeyMap[k]]:v});}
    }
  }catch(e){console.error("dbSet error:",e);}
}

// ── API ───────────────────────────────────────────────────────────────────────
function pj(text){
  try{
    // Limpiar markdown y caracteres extraños
    let clean=text.replace(/```json\s*/gi,"").replace(/```\s*/g,"").trim();
    // Extraer solo el JSON si hay texto extra
    const match=clean.match(/\{[\s\S]*\}/);
    if(match)clean=match[0];
    return JSON.parse(clean);
  }catch(e){
    console.error("Error parseando JSON:",text);
    throw new Error("Error al interpretar la respuesta de la IA.");
  }
}
async function callClaude(messages,system,maxTokens=2000){
  const body={model:"claude-haiku-4-5-20251001",max_tokens:maxTokens,messages};
  if(system)body.system=system;
  const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json();
  if(data.error)throw new Error(data.error.message);
  return data.content.filter(b=>b.type==="text").map(b=>b.text).join("\n");
}

// ── CATEGORÍAS ────────────────────────────────────────────────────────────────
const CATS={
  proteina:{label:"Proteína",emoji:"🥩",color:T.terra},
  carbohidrato:{label:"Carbohidrato",emoji:"🍠",color:T.sage},
  verdura:{label:"Verdura",emoji:"🥬",color:T.ok},
  fruta:{label:"Fruta",emoji:"🍓",color:T.terraLight},
  grasa:{label:"Grasa saludable",emoji:"🥑",color:T.brownMid},
  otro:{label:"Otro",emoji:"🫙",color:T.stone},
};

// ── REGLAS POR FASE ───────────────────────────────────────────────────────────
const FASES={
  "Eliminación":{color:T.terra,colorPale:T.terraPale,emoji:"🔴",
    permitidos:["Carnes de res, cordero, pollo, pavo","Pescado y mariscos salvajes","Verduras de hoja verde (espinaca, kale, rúcula)","Tubérculos: camote, yuca, remolacha, nabo","Brócoli, coliflor, repollo, coles de Bruselas","Cebolla, ajo, zucchini, pepino, champiñones","Frutas: manzana, pera, arándanos, kiwi, coco, palta/aguacate","Aceite de coco, aceite de oliva, aceite de aguacate","Leche y crema de coco","Hierbas frescas, vinagre de manzana, sal marina","Caldo de huesos casero"],
    prohibidos:["Gluten y todos los granos (trigo, avena, arroz, quinoa, maíz)","Lácteos (leche, queso, yogur, mantequilla, ghee)","Huevos","Legumbres (lentejas, garbanzos, frijoles, soya, maní)","Solanáceas (tomate, pimiento, papa, berenjena, páprika)","Nueces y semillas","Azúcar, miel, endulzantes artificiales","Alcohol, café, té negro"],
    desc:"Fase más estricta. Elimina todos los alimentos inflamatorios para calmar el sistema inmune.",
  },
  "Reintroducción":{color:T.sage,colorPale:T.sagePale,emoji:"🟡",
    permitidos:["Todo lo de Eliminación (base permanente)","Yemas de huevo (primero, separadas de la clara)","Legumbres bien remojadas y cocidas (de a una)","Frutos secos activados remojados 12h (de a uno)","Semillas activadas (de a una)","Ghee si se tolera","Arroz blanco si se tolera","Tomate maduro sin piel ni semillas si se tolera","Cacao puro ≥85% si se tolera","Linaza y chía (semillas activadas, de a una)","Pudín de chía si se toleró","Harina de almendras y harina de linaza/lino si se toleraron","Pan, queque y galletas con harina de almendras o linaza si se toleraron","Queque keto si se toleró","Proteína en polvo y batidos de proteína si se toleraron","Barra de proteína si se toleró"],
    prohibidos:["Gluten (SIEMPRE prohibido)","Lácteos convencionales","Azúcar refinada y edulcorantes artificiales","Aceites de semillas refinados","Aditivos y conservantes","Alimentos que generaron síntomas en eliminación"],
    desc:"Reintroduces un alimento a la vez, con 5–7 días de observación entre cada uno.",
  },
  "Mantenimiento":{color:T.ok,colorPale:"#E8F5EE",emoji:"🟢",
    permitidos:["Todo lo de Eliminación (base permanente)","Todos los alimentos reintroducidos y bien tolerados","Huevos si se toleraron","Legumbres preparadas si se toleraron","Frutos secos y semillas activados si se toleraron","Arroz, quinoa, mijo sin gluten si se toleraron","Chocolate negro ≥85% si se toleró","Café ocasional si se toleró","Lácteos fermentados (kéfir de cabra, yogur de coco)","Linaza y chía (pudín de chía)","Harina de almendras y harina de linaza/lino","Pan, queque y galletas con harina de almendras o linaza","Queque keto","Proteína en polvo, batidos de proteína y barras de proteína"],
    prohibidos:["Gluten (SIEMPRE prohibido en Hashimoto)","Lácteos convencionales de vaca","Azúcar refinada y ultraprocesados","Aceites de semillas refinados","Cualquier alimento que generó síntomas"],
    desc:"Alimentación antiinflamatoria de largo plazo. El gluten se excluye siempre.",
  },
};

// ── RECETARIO ─────────────────────────────────────────────────────────────────
const RECETARIO=[
  {id:1,cat:"desayuno",fases:["Eliminación","Reintroducción","Mantenimiento"],titulo:"Mousse de coco",mins:10,dif:"fácil",desc:"Dulce y refrescante. Preparar la noche anterior.",
   ing:["1 lata de leche de coco (refrigerar noche anterior)","1 cda de algarroba en polvo","Gotas de stevia natural","Canela en polvo","Berries o chips de coco para servir"],
   pasos:["Refrigerar la lata la noche anterior.","Separar la parte sólida del líquido.","Batir la parte firme hasta textura de mousse.","Agregar algarroba, stevia y canela. Mezclar.","Servir con berries o chips de coco."],nota:"En reintroducción reemplaza la algarroba por cacao ≥85%."},
  {id:2,cat:"desayuno",fases:["Eliminación","Reintroducción","Mantenimiento"],titulo:"Chip de camote con palta",mins:15,dif:"fácil",desc:"La tostada del Método Eri. Sin gluten, sin granos.",
   ing:["1 camote/boniato mediano","1 palta/aguacate maduro","Sal de mar"],
   pasos:["Pelar el camote y cortar a lo largo (como tostadas).","Llevar al sartén sin aceite, tapar.","Dorar por ambos lados.","Servir con palta machacada y sal."],nota:"Agrega cilantro o limón para más sabor."},
  {id:3,cat:"desayuno",fases:["Eliminación","Reintroducción","Mantenimiento"],titulo:"Pancakes de camote y plátano",mins:30,dif:"media",desc:"Sin huevo, sin gluten, sin granos. Suaves y saciantes.",
   ing:["1 camote mediano cocido sin cáscara","1 plátano maduro machacado","2 cdas harina de coco o almidón de mandioca","1 cdita bicarbonato","¼ taza leche de coco full fat","1 cdita canela, vainilla, aceite de coco","Miel para servir"],
   pasos:["Licuar todos los ingredientes.","Calentar sartén con aceite de coco a fuego bajo.","Verter por cucharadas. Cocinar hasta que aparezcan burbujas.","Voltear y cocinar 1-2 min más. Servir con miel."],nota:"Fuego bajo — toman más tiempo que los de trigo."},
  {id:4,cat:"desayuno",fases:["Eliminación","Reintroducción","Mantenimiento"],titulo:"Smoothie verde detox",mins:5,dif:"fácil",desc:"Hidratante y depurativo. Ideal para romper el ayuno.",
   ing:["2 puñados hojas verdes (espinaca, kale, cilantro)","1 taza agua","½ palta/aguacate","½ pepino sin semillas","½ taza manzana verde","Jugo de 1 limón","1 cda aceite de oliva","1 cda vinagre de manzana"],
   pasos:["Poner todos los ingredientes en la licuadora.","Licuar hasta textura suave.","Servir inmediatamente."]},
  {id:5,cat:"desayuno",fases:["Eliminación","Reintroducción","Mantenimiento"],titulo:"Roiboos Latte",mins:10,dif:"fácil",desc:"Reemplazo del café. Calmante e ideal para la tiroides.",
   ing:["2 cdas de té roiboos","1 taza de agua","¾ taza leche de coco","Canela, miel de maple o abeja","1 cda gelatina/grenetina (opcional)"],
   pasos:["Hervir el agua, agregar roiboos, reposar 6 min.","Calentar leche de coco con gelatina hasta disolver.","Colar el té y licuar con la leche de coco 2-3 min.","Servir con canela encima."],nota:"⚠️ Tapar bien la licuadora con líquidos calientes."},
  {id:6,cat:"almuerzo",fases:["Eliminación","Reintroducción","Mantenimiento"],titulo:"Cazuela con caldo de huesos",mins:40,dif:"fácil",desc:"La cazuela más reparadora del protocolo. Rica en colágeno.",
   ing:["1 presa de pollo o carne de res","2 zanahorias, 1 cebolla, 1 rama de apio","1 taza camote o zapallo","1 zucchini en cubos","2 tazas caldo de huesos + 2 tazas agua","Aceite de oliva, cilantro, sal"],
   pasos:["Calentar aceite y sellar la carne.","Agregar verduras, agua y caldo hasta cubrir.","Hervir 20 minutos hasta que estén cocidas.","Servir con cilantro fresco picado encima."]},
  {id:7,cat:"almuerzo",fases:["Eliminación","Reintroducción","Mantenimiento"],titulo:"Arroz de coliflor con trucha al horno",mins:30,dif:"fácil",desc:"El reemplazo perfecto del arroz. Ligero y versátil.",
   ing:["Filete de trucha o salmón","1 cebolla, orégano, limón","½ cabeza de coliflor","Aceite de oliva o coco, sal"],
   pasos:["Hornear la trucha sobre cama de cebolla con orégano y limón. 20 min a 180°C.","Rallar o procesar la coliflor en trozos pequeños.","Llevar al sartén con aceite unos minutos hasta suavizar.","Servir caliente junto con la trucha."]},
  {id:8,cat:"almuerzo",fases:["Eliminación","Reintroducción","Mantenimiento"],titulo:"Hamburguesas de salmón y camote",mins:25,dif:"fácil",desc:"Sin gluten, sin huevo, ricas en omega-3.",
   ing:["1 taza camote cocido sin cáscara","½ taza coliflor cocida","1-2 latas salmón salvaje","10-12 aceitunas picadas","1 cda aceite de coco"],
   pasos:["Mezclar todo en un bowl con tenedor.","Dividir en 4 porciones y formar hamburguesas.","Cocinar en sartén con aceite hasta dorar.","Servir con aguacate."]},
  {id:9,cat:"almuerzo",fases:["Eliminación","Reintroducción","Mantenimiento"],titulo:"Lasaña de zapallo italiano",mins:45,dif:"media",desc:"Comfort food sin gluten ni lácteos. Crema de coliflor como bechamel.",
   ing:["3 zapallos italianos/zucchini","250g carne molida o champiñones","½ coliflor cocida","Cebolla, ajo, aceite de oliva, levadura nutricional, sal"],
   pasos:["Cortar zucchini a lo largo con pelapapas (serán las láminas).","Procesar coliflor cocida hasta crema suave. Salpimentar.","Freír cebolla con carne o champiñones.","Armar capas en fuente: zucchini, carne, crema de coliflor.","Hornear 25-30 min a 180°C."],nota:"Usa la salsa roja sin solanáceas del recetario para más sabor."},
  {id:10,cat:"sopa",fases:["Eliminación","Reintroducción","Mantenimiento"],titulo:"Crema de champiñones",mins:20,dif:"fácil",desc:"Cremosa y llena de umami. Sin lácteos.",
   ing:["2 bandejas champiñones","½ cebolla, 1 diente ajo","Cilantro fresco","1 vaso agua, sal"],
   pasos:["Freír cebolla, agregar champiñones y cilantro.","Licuar con el agua hasta textura cremosa.","Calentar en olla y servir con champiñones dorados encima."]},
  {id:11,cat:"sopa",fases:["Eliminación","Reintroducción","Mantenimiento"],titulo:"Crema de apio",mins:30,dif:"fácil",desc:"Depurativa y digestiva. La coliflor da cuerpo sin almidón.",
   ing:["1 cabeza de apio en trozos","1 taza coliflor (para espesar)","½ cebolla, 3 dientes ajo, hoja laurel","1 litro caldo de huesos","Aceite de coco, sal"],
   pasos:["Freír cebolla y ajo.","Agregar apio y coliflor, cocinar 15 min.","Licuar todo con el caldo.","Volver a la olla, sazonar y servir."]},
  {id:12,cat:"ensalada",fases:["Eliminación","Reintroducción","Mantenimiento"],titulo:"Ensalada con aderezo de jengibre",mins:15,dif:"fácil",desc:"Crujiente y llena de fitoquímicos antiinflamatorios.",
   ing:["1 taza repollo morado, 1 taza repollo blanco","1 taza zanahoria rallada, 1 taza betarraga rallada","Cilantro, cebollín","Aderezo: ¼ taza aceite oliva, jugo limón, jengibre rallado, ajo, sal"],
   pasos:["Mezclar todas las verduras en un bowl.","Batir los ingredientes del aderezo.","Verter sobre la ensalada y servir."]},
  {id:13,cat:"ensalada",fases:["Eliminación","Reintroducción","Mantenimiento"],titulo:"Salsa roja sin solanáceas",mins:35,dif:"fácil",desc:"La salsa de tomate del Método Eri. Con zanahoria y betarraga.",
   ing:["3 zanahorias, 1 betarraga mediana","1 cebolla, 4 dientes ajo","Albahaca, laurel, sal","4 cdas vinagre de manzana, 3 tazas agua","2 cdas aceite de oliva"],
   pasos:["Saltear cebolla 5 min, agregar ajo, zanahoria y betarraga.","Agregar hierbas, sal, vinagre y agua.","Tapar y hervir a fuego lento 25 min.","Licuar hasta cremoso."],nota:"Perfecta para lasaña, pasta de zucchini o base de guisos."},
  {id:14,cat:"colacion",fases:["Eliminación","Reintroducción","Mantenimiento"],titulo:"Trufas de vainilla y coco",mins:20,dif:"fácil",desc:"El dulce permitido del Método Eri. Sin azúcar refinada.",
   ing:["½ taza mantequilla de coco","3 cdas aceite de coco","1 cda miel cruda o stevia","1 taza coco rallado + extra para cubrir","½ cdita vainilla en polvo, sal de mar"],
   pasos:["Calentar ligeramente mantequilla y aceite de coco.","Procesar con miel.","Agregar coco rallado, vainilla y sal.","Refrigerar si está suave. Formar bolitas.","Pasar por coco rallado. Guardar en frío."]},
  {id:15,cat:"pan",fases:["Eliminación","Reintroducción","Mantenimiento"],titulo:"Tortillas de plátano verde",mins:25,dif:"media",desc:"El pan del Método Eri. Sin gluten, sin huevo, sin cereales.",
   ing:["2 plátanos verdes hervidos","1½ cda aceite de coco","1 cdita sal marina","Papel mantequilla"],
   pasos:["Procesar plátanos cocidos con aceite hasta masa manejable.","Separar en porciones.","Aplastar entre papeles mantequilla con rodillo.","Cocinar en sartén sin aceite con tapa."],nota:"Sirve con palta, pollo o guacamole."},
  {id:16,cat:"pan",fases:["Eliminación","Reintroducción","Mantenimiento"],titulo:"Sopaipillas de yuca",mins:25,dif:"media",desc:"Masa a base de yuca y coco. Antiinflamatoria y reconfortante.",
   ing:["1 taza harina de yuca","½ taza harina de coco","1 cdita sal, cúrcuma, polvos de hornear sin gluten","1 cda vinagre manzana, 3 cdas aceite oliva","½ taza agua hirviendo"],
   pasos:["Mezclar secos. Unir líquidos.","Integrar hasta masa homogénea.","Formar 5 bolitas y aplastar entre papeles.","Freír en sartén con poco aceite o sin aceite con tapa."],nota:"Rellena con palta, pollo o mermelada de fruta."},
  {id:17,cat:"base",fases:["Eliminación","Reintroducción","Mantenimiento"],titulo:"Caldo de huesos de pollo",mins:480,dif:"fácil",desc:"La base reparadora del intestino. Rico en colágeno y minerales.",
   ing:["1.5 kg huesos de pollo o res (orgánicos)","2 zanahorias sin pelar","2 hojas laurel, cilantro o perejil","2 cditas sal rosada, 2 cdas vinagre de manzana","Agua hasta cubrir (~13 tazas)"],
   pasos:["Poner todo en olla, cubrir con agua.","Olla de presión: 2 horas. Olla normal: 6-8 horas. Slow cooker: 8-10 horas.","Colar y guardar en frascos de vidrio hasta 5 días."],nota:"El vinagre extrae más minerales de los huesos."},
  // ── REINTRODUCCIÓN ────────────────────────────────────────────────────────
  {id:18,cat:"pan",fases:["Reintroducción","Mantenimiento"],titulo:"Pan rápido de almendras",mins:10,dif:"fácil",desc:"Con solo 2 ingredientes. Versión salada o tipo postre. Te saca de apuros en minutos.",
   ing:["1 huevo","3 cdas de harina de almendras","Aceite de coco u oliva para el sartén"],
   pasos:["Mezclar el huevo con la harina de almendras hasta integrar.","Porcionar en dos partes y llevar al sartén engrasado, dando forma redonda. Tapar.","Dar vuelta y cocinar del otro lado.","Abrir por la mitad y rellenar a gusto."],
   nota:"Salado: con palta, rúcula y queso de cabra. Postre: con berries calentados con stevia y crema de coco."},
  {id:19,cat:"pan",fases:["Reintroducción","Mantenimiento"],titulo:"Pan esponjoso de almendras",mins:60,dif:"media",desc:"Queda súper esponjoso. Ideal para hamburguesas caseras sin gluten.",
   ing:["1 clara de huevo","1½ taza harina de almendras","40g psyllium en polvo (o harina de linaza)","2 cditas polvo de hornear o 1 cda vinagre de manzana + 1 cdita bicarbonato","1 cdita sal","225ml agua hirviendo","1 cda semillas de sésamo para decorar"],
   pasos:["Precalentar el horno a 180°C.","Mezclar en un bol la harina de almendras, psyllium, polvo de hornear y sal.","Hervir el agua y agregarla a la mezcla junto con la clara. Batir 30 segundos con tenedor.","Humedecerse las manos y separar en 6 bollos. Ubicar en bandeja con papel mantequilla.","Espolvorear sésamo encima. Hornear 50–60 minutos. Crecen en el horno — ponerlos separados."],
   nota:"Ideal para untar con palta o usar como pan de hamburguesa. ⚠️ Usar psyllium de buena calidad para mejor textura."},
  {id:20,cat:"desayuno",fases:["Reintroducción","Mantenimiento"],titulo:"Omelette fácil",mins:15,dif:"fácil",desc:"Desayuno proteico que te dejará saciada y con energía sostenida.",
   ing:["2 huevos de la mejor calidad","¼ taza leche de almendras o de coco sin azúcar","Sal rosada o marina","Aceite de oliva","1 taza de rúcula o espinaca baby","Queso de cabra a gusto","1 diente de ajo picado finito"],
   pasos:["Mezclar bien los huevos con la leche y sazonar con sal.","Calentar sartén con aceite de oliva. Saltear el ajo y la rúcula.","Extender la rúcula sobre el sartén y verter la mezcla de huevo.","Agregar el queso en trozos pequeños y bajar el fuego. Tapar.","Cocinar hasta que esté cuajado. Voltear y dorar del otro lado."]},
  {id:21,cat:"almuerzo",fases:["Reintroducción","Mantenimiento"],titulo:"Lasaña de zapallo Plus",mins:50,dif:"media",desc:"Versión Reintroducción de la lasaña clásica. Con ghee y queso de cabra.",
   ing:["3 zapallos italianos/zucchini","250g carne molida o champiñones","½ coliflor cocida","½ cebolla, ajo en polvo","2 cdas aceite de coco, oliva o ghee","Queso de cabra a gusto","Levadura nutricional opcional","Sal marina"],
   pasos:["Cortar el zucchini a lo largo con pelapapas (serán las láminas). Reservar.","Procesar la coliflor cocida hasta crema suave. Salpimentar. Esta es la 'bechamel'.","Saltear en ghee la cebolla picada, agregar carne o champiñones. Salpimentar.","Armar capas en fuente: zucchini, pino, crema de coliflor, queso de cabra.","Hornear 25–30 min a 180°C hasta gratinar."],
   nota:"El ghee y el queso de cabra son los ingredientes nuevos de la versión Reintroducción. Introducirlos uno a la vez si recién los estás probando."},
  {id:22,cat:"base",fases:["Reintroducción","Mantenimiento"],titulo:"Puré de coliflor",mins:20,dif:"fácil",desc:"Cremoso y sin papa. Reemplaza el puré tradicional o sirve como base de pastel de papa.",
   ing:["1 coliflor grande en trozos","1 cebolla pequeña en juliana","1 cdita aceite de oliva","1 cdita ajo en polvo (opcional)","1 cdita sal de mar","½ cdita pimienta"],
   pasos:["Hervir la coliflor en agua por 10 minutos hasta que esté tierna.","Mientras, saltear la cebolla en juliana fina con aceite de oliva, 5 minutos hasta que esté traslúcida.","Colar la coliflor y llevar al procesador junto con la cebolla dorada y el resto de los ingredientes.","Procesar 3 minutos hasta obtener un puré homogéneo y cremoso. Rectificar sal."],
   nota:"La cebolla dorada es el secreto del sabor. Queda tan cremoso que no necesita crema ni mantequilla."},
  {id:23,cat:"colacion",fases:["Reintroducción","Mantenimiento"],titulo:"Granola sin avena (Coconola)",mins:20,dif:"fácil",desc:"Energía sostenida sin granos. Con frutos secos activados, semillas y coco.",
   ing:["1 taza almendras, nueces o castañas cajú (idealmente activadas/remojadas)","3 cdas coco laminado","2 cdas semillas de sésamo, chía o linaza","2 cdas semillas de zapallo","1 cdita canela en polvo","1 pizca jengibre en polvo","1 pizca sal","1 cdita miel cruda"],
   pasos:["Secar y picar los frutos secos. Hornear en bandeja 10 minutos a 180°C hasta dorar.","Agregar las semillas y hornear 5 minutos más con cuidado de no quemar.","Agregar el coco laminado, revolver y sacar del horno.","Trasladar a un bol y mezclar con miel, canela, jengibre y sal.","Enfriar completamente antes de guardar en frasco hermético."],
   nota:"⭐ Activar los frutos secos (remojar toda la noche) reduce los antinutrientes. Acompañar con pudín de chía o yogurt de coco."},
  {id:24,cat:"desayuno",fases:["Reintroducción","Mantenimiento"],titulo:"Pudín de chía",mins:5,dif:"fácil",desc:"Preparar la noche anterior. En reemplazo del yogurt, ideal como desayuno o colación.",
   ing:["2 cdas semillas de chía","1 vaso de leche de almendras o de coco sin azúcar","Cacao en polvo sin azúcar (opcional)","Gotas de stevia (opcional)"],
   pasos:["Mezclar bien la chía con la leche elegida. Revolver para que no se agrupe.","Llevar al refrigerador toda la noche (mínimo 6 horas).","Al servir, agregar los toppings: berries, coconola, nibs de cacao."],
   nota:"💡 Cuanto más reposa, más cremoso queda. Ideal preparar varios frascos para la semana."},
  // ── PLAN COMUNIDAD — Recetario Eliminación Semanas 3 y 4 ─────────────────
  {id:25,cat:"desayuno",fases:["Eliminación","Reintroducción","Mantenimiento"],comunidad:true,titulo:"Smoothie de Fresa",mins:5,dif:"fácil",desc:"Energizante y antiinflamatorio. Perfecto para empezar el día en fase de Eliminación.",
   ing:["1 taza de fresas congeladas o frescas","½ plátano congelado","2 cdas de colágeno hidrolizado","⅓ taza de leche de coco full fat (lata, sin endulzar)","⅓ taza de agua","1 puñado de espinacas o mix de lechugas"],
   pasos:["Poner todos los ingredientes en la licuadora.","Licuar hasta obtener consistencia cremosa.","Servir frío. Opción caliente: calentar y servir como bowl tibio con coco deshidratado y fruta picada."],nota:"Puedes añadir una cucharada de aceite de coco para mayor saciedad."},
  {id:26,cat:"desayuno",fases:["Eliminación","Reintroducción","Mantenimiento"],comunidad:true,titulo:"Green Smoothie",mins:5,dif:"fácil",desc:"Detox y alcalinizante. Cargado de clorofila y grasas saludables.",
   ing:["2 puñados grandes de espinacas o lechugas","1 taza de agua","½ aguacate","½ pepino sin semillas ni cáscara","½ taza de manzana verde","Jugo de 1 limón","1 cda de aceite de oliva extra virgen","1 cda de vinagre de manzana"],
   pasos:["Poner todos los ingredientes en la licuadora.","Licuar hasta obtener consistencia suave.","Servir de inmediato."],nota:"El vinagre de manzana potencia la digestión y el aceite de oliva mejora la absorción de nutrientes."},
  {id:27,cat:"desayuno",fases:["Eliminación","Reintroducción","Mantenimiento"],comunidad:true,titulo:"Pancakes de Camote y Plátano",mins:25,dif:"fácil",desc:"Sin gluten ni huevo. El camote da textura suave y nutritiva.",
   ing:["1 camote mediano cocido sin cáscara","1 plátano maduro machacado","2 cdas de harina de coco","1 cdita de bicarbonato de sodio","¼ taza leche de coco full fat","1 cda de aceite de coco","1 cdita de canela molida","Chorrito de extracto de vainilla","Miel de abeja o maple para servir"],
   pasos:["Licuar todos los ingredientes hasta integrar.","Calentar sartén con aceite de coco a fuego bajo.","Vaciar la mezcla en porciones y cocinar hasta que se formen burbujas.","Voltear y cocinar 1-2 minutos más del otro lado.","Servir con miel."],nota:"Tardan más que los pancakes de trigo. Mantén el fuego bajo para que se cocinen bien por dentro."},
  {id:28,cat:"desayuno",fases:["Eliminación","Reintroducción","Mantenimiento"],comunidad:true,titulo:"Roiboos Latte",mins:15,dif:"fácil",desc:"Reconfortante y libre de cafeína. Ideal para reemplazar el café en Eliminación.",
   ing:["2 cdas de té roiboos","¼ taza de agua","¾ taza de leche de coco","1 pizca de canela en polvo","Miel de maple o abeja para endulzar","1 cda de gelatina/grenetina"],
   pasos:["En una ollita hervir 1 taza de agua con las hojas de roiboos. Apagar el fuego y dejar reposar 5-6 minutos.","Calentar la leche de coco y disolver la grenetina removiendo bien.","Colar el té y ponerlo junto con la leche de coco en la licuadora.","Licuar 2-3 minutos y servir."],nota:"⚠️ Tapar bien la licuadora con líquidos calientes."},
  {id:29,cat:"desayuno",fases:["Eliminación","Reintroducción","Mantenimiento"],comunidad:true,titulo:"Yogurt de Coco",mins:10,dif:"fácil",desc:"Probiótico natural sin lácteos. Repara la microbiota intestinal.",
   ing:["1 lata de leche de coco full fat","2 cápsulas de probióticos sin prebióticos"],
   pasos:["En un bowl mezclar la leche de coco con el contenido de las cápsulas probióticas.","Revolver muy bien.","Colocar en recipiente de vidrio y tapar con una servilleta ajustada con liga.","Dejar a temperatura ambiente 24-48 horas.","Refrigerar 4-6 horas antes de consumir.","Acompañar con frutas y miel."],nota:"24 horas de fermentación suele ser lo ideal. Más tiempo = más ácido."},
  {id:30,cat:"desayuno",fases:["Eliminación","Reintroducción","Mantenimiento"],comunidad:true,titulo:"Avena de Coliflor",mins:25,dif:"fácil",desc:"Sin granos. La coliflor imita la textura de la avena perfectamente.",
   ing:["1 coliflor mediana en floretes","Fruta picada (fresas, blueberries, manzana)","2 cdas de miel de abeja o maple","⅓ taza de leche de coco full fat","1 rajita de canela o 1 cdita de canela molida"],
   pasos:["Poner la coliflor y la fruta con la canela en una olla y cubrir apenas con agua.","Tapar y cocinar 20 minutos.","Retirar la canela, escurrir y moler con batidora de inmersión dejando grumos.","Regresar a la olla, agregar la leche de coco y la miel. Mezclar y servir caliente."],nota:"La coliflor no tiene sabor propio. La fruta y la miel son los protagonistas."},
  {id:31,cat:"sopa",fases:["Eliminación","Reintroducción","Mantenimiento"],comunidad:true,titulo:"Crema de Apio",mins:35,dif:"fácil",desc:"Depurativa y antiinflamatoria. La coliflor da textura cremosa sin lácteos.",
   ing:["1 cda de aceite de coco","½ cebolla picada","3 dientes de ajo picados","1 hoja de laurel seca","1 cabeza de apio en trozos","1 taza de coliflor picada","1 litro de caldo de pollo o caldo de huesos","Sal al gusto"],
   pasos:["Freír la cebolla y el ajo en aceite hasta que estén blandos.","Agregar el apio y la coliflor. Cocinar 15 minutos.","Licuar todo con el laurel y el caldo hasta hacer puré.","Verter en olla, sazonar con sal y servir."],nota:"Puedes usar leche de coco en lata para una versión más cremosa y saciante."},
  {id:32,cat:"almuerzo",fases:["Eliminación","Reintroducción","Mantenimiento"],comunidad:true,titulo:"Hamburguesas de Carne con Calabaza",mins:25,dif:"fácil",desc:"Jugosas y sin relleno inflamatorio. La calabaza añade humedad y nutrientes.",
   ing:["1 calabacita rayada","½ kg de carne molida de res","1 cdita de sal de mar","¼ cdita de coco aminos","1 ajo machacado","Cebollita cambray picada","Opcional: tocino y lechuga para envolver"],
   pasos:["Mezclar todos los ingredientes en un bowl.","Formar hamburguesas y poner sal encima.","Cocinar en sartén con aceite de aguacate o coco.","Servir con aguacate."],nota:"Acompañar con camote en bastones horneados con aceite de coco y sal."},
  {id:33,cat:"almuerzo",fases:["Eliminación","Reintroducción","Mantenimiento"],comunidad:true,titulo:"Hamburguesas de Salmón y Camote",mins:20,dif:"fácil",desc:"Ricas en omega-3. Antiinflamatorias y muy saciantes.",
   ing:["1 taza de camote cocido sin cáscara","½ taza de coliflor cocida","1-2 latas de salmón salvaje","10-12 aceitunas picadas","1 cda de aceite de coco o aguacate"],
   pasos:["Mezclar todos los ingredientes en un bowl con tenedor hasta integrar.","Dividir en 4 partes y formar hamburguesas.","Cocinar en sartén con aceite hasta dorar de ambos lados.","Servir con aguacate."],nota:"El salmón salvaje (wild salmon) es superior al de cultivo en omega-3."},
  {id:34,cat:"almuerzo",fases:["Eliminación","Reintroducción","Mantenimiento"],comunidad:true,titulo:"Estofado de Cola de Res",mins:105,dif:"media",desc:"Reconfortante y rico en colágeno. Perfecto para reparar el intestino.",
   ing:["1 kg de cola de res en trozos","1 cebolla grande picada","6 dientes de ajo picados","¼ taza de aceite de oliva","2 cdas de vinagre de manzana","Sal marina al gusto","1 cda de romero fresco","1 cda de tomillo fresco","2 tazas de caldo de res o agua","2 zanahorias en rodajas","1 camote en cubos","1 rama de apio en trozos"],
   pasos:["Hacer sofrito de ajo y cebolla con aceite de oliva.","Agregar la cola de res y dorar de ambos lados.","Añadir el vinagre y cocinar en olla de presión 1 hora.","Agregar las verduras, romero, tomillo y caldo.","Cocinar a fuego medio sin tapa 45 minutos hasta que las verduras estén blandas."],nota:"Para caldo más espeso añadir harina de yuca o arrowroot al final."},
  {id:35,cat:"almuerzo",fases:["Eliminación","Reintroducción","Mantenimiento"],comunidad:true,titulo:"Caldo de Res",mins:90,dif:"fácil",desc:"Nutritivo y reconfortante. Puede ser desayuno, almuerzo o cena.",
   ing:["1 kg chamberete o falda de res","3½ litros de agua","2 dientes de ajo","1 trozo de cebolla","2 ramas de cilantro","2 zanahorias en rodajas","1 calabacita en rodajas","1 chayote en cubos","¼ col o repollo","Sal, limón y aguacate para servir"],
   pasos:["Colocar carne, ajo y cebolla en olla con el agua. Llevar a ebullición y retirar espuma.","Bajar a fuego medio-bajo y cocinar 60 minutos.","Agregar sal y cocinar 40 minutos más.","Retirar cebolla y ajo. Agregar zanahoria, col, chayote y cilantro. Cocinar 20-25 minutos.","Agregar la calabacita y cocinar 10 minutos más. Servir con limón y aguacate."],nota:"En olla de presión: carne 35 min, verduras duras 5 min, blandas 1 min más."},
  {id:36,cat:"almuerzo",fases:["Eliminación","Reintroducción","Mantenimiento"],comunidad:true,titulo:"Hash de Repollo con Tocino",mins:20,dif:"fácil",desc:"Versátil y rápido. Excelente guarnición para cualquier proteína.",
   ing:["½ cabeza de repollo en tiras","¼ cebolla blanca picada","3-4 tiras de tocino sin nitritos","1 diente de ajo","1 pulgada de jengibre fresco","Sal al gusto"],
   pasos:["Dorar el tocino en trozos en el sartén hasta que suelte su grasa.","Agregar el ajo, cebolla y jengibre picados.","Agregar el repollo en tiras y saltear.","Sazonar con sal al gusto."],nota:"Omitir el huevo como proteína en Eliminación. Es válido desayunar pollo, pescado o carne roja."},
  {id:37,cat:"almuerzo",fases:["Eliminación","Reintroducción","Mantenimiento"],comunidad:true,titulo:"Hash de Jícama",mins:20,dif:"fácil",desc:"Crujiente y nutritivo. La jícama es prebiótica y excelente para la microbiota.",
   ing:["1 cda de aceite de oliva o coco","1 cebolla blanca picada","4 tiras de tocino sin nitritos en cuadritos","4 dientes de ajo picados","2 tazas de jícama en cubos o rayada","2 tazas de kale o espinacas","½ cda de sal de mar"],
   pasos:["Calentar el aceite y freír la cebolla 5 minutos.","Agregar el tocino y el ajo. Cocinar 2-3 minutos.","Agregar la jícama y el kale o espinacas.","Saltear hasta que estén tiernos. Sazonar."],nota:"Sin jícama puedes usar repollo verde o morado con excelentes resultados."},
  {id:38,cat:"almuerzo",fases:["Eliminación","Reintroducción","Mantenimiento"],comunidad:true,titulo:"Coles de Bruselas con Tocino",mins:35,dif:"fácil",desc:"El tocino transforma las coles. Rico en fibra y antioxidantes.",
   ing:["50g de tocino sin nitritos","1 cebolla pequeña picada","500g de coles de Bruselas a la mitad","1 ramita de tomillo fresco","¼ vasito de caldo de pollo","Sal al gusto","1-2 cdas de miel de maple"],
   pasos:["Precalentar el horno a 220°C.","Dorar el tocino en sartén apta para horno ~8 min.","Añadir cebolla y sofreír 2 minutos.","Subir el fuego, añadir coles, tomillo y caldo. Sazonar.","Meter al horno 25 minutos, removiendo a media cocción."],nota:"Sin horno: blanquear las coles 5 min en agua hirviendo y saltear con el resto."},
  {id:39,cat:"almuerzo",fases:["Eliminación","Reintroducción","Mantenimiento"],comunidad:true,titulo:"Hígado Encebollado",mins:25,dif:"fácil",desc:"El superalimento más subestimado. Densidad nutricional extraordinaria.",
   ing:["5-6 hígados de pollo en trozos pequeños","1 cebolla blanca en rodajas","3-4 dientes de ajo","Sal al gusto","2 cdas de vinagre balsámico","1 cda de aceite de coco","Opcional: tocino picado finamente"],
   pasos:["Calentar el aceite en sartén a fuego medio.","Agregar el ajo y la cebolla en rodajas. Sofreír ~10 minutos.","Hacer a un lado las cebollas y agregar el hígado de pollo.","Cocinar 2-3 minutos de cada lado.","Revolver con las cebollas, sazonar y finalizar con el vinagre balsámico."],nota:"El tocino picado muy fino ayuda a disfrazar el sabor del hígado. Muy recomendado."},
];
const CATS_R=[
  {id:"todos",label:"Todos",emoji:"🌿"},{id:"desayuno",label:"Desayunos",emoji:"🌅"},
  {id:"almuerzo",label:"Almuerzos",emoji:"🍽️"},{id:"sopa",label:"Sopas",emoji:"🍲"},
  {id:"ensalada",label:"Ensaladas",emoji:"🥗"},{id:"colacion",label:"Colaciones",emoji:"🥥"},
  {id:"pan",label:"Panes",emoji:"🫓"},{id:"base",label:"Bases",emoji:"🫙"},
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
  {id:"bienvenida",title:"Bienvenida a\nProyecto Stop Hashimoto®",sub:"Tu coach de nutrición con el Método Eri personalizada. Juntas vamos a ordenar tu alimentación y estilo de vida para calmar tu sistema inmune y apoyar tu tiroides.",fields:[]},
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
    {key:"condiciones",label:"¿Qué condición(es) autoinmune tienes?",type:"multi",opts:["Hashimoto","Vitiligo","Artritis reumatoide","Lupus","Psoriasis","Enfermedad celíaca","Enfermedad de Crohn","Colitis ulcerosa","Esclerosis múltiple","Síndrome de Sjögren","Diabetes tipo 1","Espondilitis anquilosante","Otra"]},
    {key:"tiempo_dx",label:"¿Cuánto llevas con tu diagnóstico?",type:"pills",opts:["Recién diagnosticada","Menos de 1 año","1–3 años","Más de 3 años"]},
    {key:"fase_eri",label:"Fase Método Eri actual",type:"pills",opts:["Quiero empezar","Eliminación","Reintroducción","Mantenimiento"]},
    {key:"sintomas",label:"Síntomas principales (varios)",type:"multi",opts:["Fatiga crónica","Niebla mental","Caída de cabello","Hinchazón abdominal","Estreñimiento","Ansiedad","Problemas de sueño","Sensibilidad al frío","Piel seca"]},
  ]},
  {id:"objetivos",title:"¿Qué quieres\nlograr?",fields:[
    {key:"objetivo",label:"Objetivo principal",type:"pills",opts:["Reducir inflamación","Perder peso","Más energía","Mejorar digestión","Equilibrar hormonas","Todo lo anterior"]},
    {key:"notas",label:"Alergias, intolerancias u otras condiciones",type:"area",ph:"ej. Tengo SIBO, no tolero mariscos..."},
  ]},
];
function Onboarding({onDone, existingProfile}){
  const [step,setStep]=useState(0);
  const [data,setData]=useState(existingProfile||{});
  const [multi,setMulti]=useState(existingProfile?.sintomas?{sintomas:existingProfile.sintomas}:{});
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
          <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.18em",color:T.sage,textTransform:"uppercase"}}>Proyecto Stop Hashimoto®</span>
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

// ── BIENESTAR DATA ────────────────────────────────────────────────────────────
const CONSEJOS_ERI = [
  "Mastica cada bocado al menos 20 veces. La digestión empieza en la boca y un intestino sano es la base de tu sistema inmune.",
  "Elimina el gluten por completo — no hay 'poquito'. Una sola exposición puede activar anticuerpos por 3 a 6 meses.",
  "Duerme entre 7 y 9 horas. El cortisol nocturno alto agrava la inflamación tiroidea más que cualquier alimento.",
  "Come en un ambiente tranquilo, sin pantallas. El estrés activa el sistema nervioso simpático e inhibe la digestión.",
  "Incluye caldo de huesos 3 veces por semana. El colágeno repara el intestino permeable que alimenta la autoinmunidad.",
  "Prioriza proteína en el desayuno. Estabiliza el azúcar en sangre y reduce el cortisol de la mañana.",
  "Saca el aceite de girasol, maíz y canola de tu cocina. Son proinflamatorios y dañan la membrana de tus células.",
  "El selenio es tu mejor aliado. Reduce los anticuerpos TPO y mejora la conversión de T4 a T3.",
  "Muévete, pero no en exceso. El ejercicio intenso sin recuperación eleva el cortisol y empeora la autoinmunidad.",
  "Exponte al sol 15 minutos al día. La vitamina D3 regula directamente el sistema inmune y reduce la inflamación.",
  "Hidratate con agua filtrada. El cloro del agua del grifo puede interferir con la absorción del yodo tiroideo.",
  "Come con el ritmo de tu cuerpo. Los ayunos prolongados sin preparación estresan las glándulas suprarrenales.",
  "Reduce el azúcar al mínimo. Alimenta las bacterias dañinas del intestino y activa cascadas inflamatorias.",
  "Practica la gratitud cada mañana. Modula el eje HPA (estrés-cortisol-tiroides) de forma directa.",
  "El magnesio por la noche mejora el sueño, relaja los músculos y apoya más de 300 reacciones enzimáticas.",
  "El té de jengibre con limón en ayunas activa la digestión, reduce la inflamación y apoya la detoxificación hepática.",
  "Reintroduce alimentos de uno en uno. Espera 5 días entre cada uno para identificar reacciones sin confusión.",
  "La conexión social reduce la inflamación. El aislamiento crónico eleva las citoquinas proinflamatorias.",
  "Lava bien las frutas y verduras. Los pesticidas actúan como disruptores endocrinos y afectan la tiroides.",
  "Cocina con cúrcuma y aceite de coco. La grasa aumenta la absorción de curcumina y potencia su efecto antiinflamatorio.",
  "Evita comer frente a pantallas. El sistema nervioso debe estar en modo 'descanso y digestión', no en alerta.",
  "El aceite de coco en ayunas nutre el intestino y aporta energía sin subir el azúcar en sangre.",
  "Cuida tus dientes — la salud bucal está directamente conectada con la inflamación sistémica.",
  "Descansa activamente: caminar en la naturaleza baja el cortisol más eficazmente que el ejercicio intenso.",
  "La respiración profunda activa el nervio vago y apaga la respuesta inflamatoria en minutos.",
  "Baña con agua fría los últimos 30 segundos. Activa el sistema linfático y reduce la inflamación.",
  "Planifica tus comidas con anticipación. Las decisiones de alimentos bajo estrés siempre son las peores.",
  "El zinc con comida evita náuseas y mejora la función tiroidea e inmune a la vez.",
  "Respira antes de comer. 3 respiraciones profundas activan las enzimas digestivas y calman el sistema nervioso.",
  "Tu microbioma influye en tus anticuerpos tiroideos. Cuida tu intestino como tu órgano inmune principal.",
];

const AFIRMACIONES = [
  "Mi cuerpo sana cada día con cada decisión consciente que tomo.",
  "Escojo alimentos que me nutren y me acercan a mi mejor versión.",
  "Mi sistema inmune vuelve al equilibrio. Estoy en el camino correcto.",
  "Confío en el proceso de sanación. Cada día es un paso adelante.",
  "Merezco salud, energía y bienestar. Lo estoy construyendo hoy.",
  "Mi cuerpo no es mi enemigo — es mi aliado que pide atención y amor.",
  "Cada comida es una oportunidad de reducir la inflamación y sanar.",
  "La paciencia es parte de mi protocolo. La salud profunda toma tiempo.",
  "Soy más fuerte que cualquier diagnóstico. Estoy a cargo de mi salud.",
  "Mi intestino sana, mis anticuerpos bajan, mi energía regresa.",
  "Elijo el descanso sin culpa — es parte esencial de mi recuperación.",
  "Agradezco a mi cuerpo por seguir funcionando mientras sana.",
  "Cada síntoma que mejora es evidencia de que el Método Eri funciona.",
  "Estoy presente en mi proceso de sanación, sin prisa ni comparaciones.",
  "Me permito descansar, nutrirme y cuidarme — es mi trabajo más importante.",
  "La inflamación disminuye cada vez que elijo alimentos que me respetan.",
  "Tengo la información, la guía y la voluntad para sanar desde la raíz.",
  "Mi tiroides recibe apoyo hoy — a través del alimento, el sueño y la calma.",
  "Soy una persona que se cuida. Eso es suficiente y es poderoso.",
  "Cada pequeña mejora cuenta. No necesito ser perfecta para sanar.",
];

const INTENCIONES = [
  "Hoy me enfoco en masticar despacio y comer con consciencia.",
  "Hoy elijo descansar sin culpa cuando mi cuerpo lo necesite.",
  "Hoy preparo mis comidas con amor y atención.",
  "Hoy bebo suficiente agua y agradezco a mi cuerpo.",
  "Hoy me muevo con suavidad y escucho mis límites.",
  "Hoy evito el gluten con convicción, sabiendo que me sana.",
  "Hoy practico la paciencia con mi proceso de recuperación.",
  "Hoy me permito pedir ayuda si la necesito.",
  "Hoy observo mis síntomas sin juicio y con curiosidad.",
  "Hoy incluyo un alimento antiinflamatorio en cada comida.",
  "Hoy me alejo de lo que me genera estrés innecesario.",
  "Hoy celebro un pequeño avance en mi salud.",
  "Hoy me conecto con personas que me nutren emocionalmente.",
  "Hoy duermo a tiempo para apoyar mi tiroides y suprarrenales.",
  "Hoy recuerdo que sanar no es lineal — los altibajos son parte del proceso.",
];

const HABITOS_ERI = [
  {id:"agua", emoji:"💧", texto:"Tomé 8 vasos de agua"},
  {id:"gluten", emoji:"🚫", texto:"Sin gluten hoy"},
  {id:"proteina", emoji:"🥩", texto:"Proteína en el desayuno"},
  {id:"suplementos", emoji:"💊", texto:"Tomé mis suplementos"},
  {id:"movimiento", emoji:"🚶‍♀️", texto:"Me moví suavemente (caminata, yoga, stretching)"},
  {id:"sueno", emoji:"😴", texto:"Dormí más de 7 horas"},
  {id:"estres", emoji:"🧘‍♀️", texto:"Practiqué algo para el estrés (respiración, meditación)"},
  {id:"procesados", emoji:"🍫", texto:"Evité ultraprocesados y azúcar"},
  {id:"sol", emoji:"☀️", texto:"Me expuse al sol al menos 15 minutos"},
  {id:"gratitud", emoji:"🌸", texto:"Practiqué gratitud o escribí en mi diario"},
];

// ── RESPIRACIÓN 4-7-8 ─────────────────────────────────────────────────────────
function Respiracion478(){
  const [fase, setFase] = useState(null); // null | "inhala" | "sostén" | "exhala" | "fin"
  const [cuenta, setCuenta] = useState(0);
  const [ciclo, setCiclo] = useState(0);
  const CICLOS = 3;

  useEffect(()=>{
    if(!fase||fase==="fin")return;
    const duraciones = {"inhala":4,"sostén":7,"exhala":8};
    const dur = duraciones[fase];
    if(cuenta>=dur){
      if(fase==="inhala") setFase("sostén");
      else if(fase==="sostén") setFase("exhala");
      else if(fase==="exhala"){
        const nuevoCiclo = ciclo+1;
        if(nuevoCiclo>=CICLOS){setFase("fin");setCiclo(0);}
        else{setCiclo(nuevoCiclo);setFase("inhala");}
      }
      setCuenta(0);
      return;
    }
    const t=setTimeout(()=>setCuenta(c=>c+1),1000);
    return()=>clearTimeout(t);
  },[fase,cuenta]);

  const config={
    "inhala":{label:"Inhala",color:T.sage,dur:4,desc:"Por la nariz, lento y profundo"},
    "sostén":{label:"Sostén",color:T.terra,dur:7,desc:"Retén el aire suavemente"},
    "exhala":{label:"Exhala",color:"#5B8DB8",dur:8,desc:"Por la boca, completamente"},
  };
  const actual = fase&&fase!=="fin"?config[fase]:null;
  const pct = actual?Math.round((cuenta/actual.dur)*100):0;

  if(!fase) return(
    <div style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"20px",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <span style={{fontSize:20}}>🌬️</span>
        <div>
          <p style={{fontSize:13,fontWeight:700,color:T.brown,fontFamily:FB}}>Respiración 4-7-8</p>
          <p style={{fontSize:11,color:T.stone}}>Calma el sistema nervioso en 3 ciclos</p>
        </div>
      </div>
      <button onClick={()=>{setFase("inhala");setCuenta(0);setCiclo(0);}} style={{width:"100%",padding:"12px",borderRadius:14,border:"none",background:`linear-gradient(135deg,${T.sage},${T.sageMid})`,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FB}}>
        Iniciar respiración →
      </button>
    </div>
  );

  if(fase==="fin") return(
    <div style={{borderRadius:20,background:T.sagePale,border:`1px solid ${T.sageLight}`,padding:"20px",marginBottom:12,textAlign:"center"}}>
      <p style={{fontSize:28,marginBottom:8}}>✨</p>
      <p style={{fontFamily:FD,fontSize:16,fontWeight:700,color:T.sage,marginBottom:4}}>Completado</p>
      <p style={{fontSize:12,color:T.sage,marginBottom:14}}>Tu sistema nervioso está más calmado. Bien hecho.</p>
      <button onClick={()=>setFase(null)} style={{padding:"10px 24px",borderRadius:14,border:`1px solid ${T.sage}`,background:"transparent",color:T.sage,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FB}}>Repetir</button>
    </div>
  );

  return(
    <div style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"20px",marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontSize:12,fontWeight:700,color:T.stone,fontFamily:FB}}>🌬️ Respiración 4-7-8</span>
        <span style={{fontSize:11,color:T.stone}}>Ciclo {ciclo+1}/{CICLOS}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:16}}>
        <div style={{width:120,height:120,borderRadius:"50%",background:`${actual.color}15`,border:`4px solid ${actual.color}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",marginBottom:12,position:"relative"}}>
          <div style={{position:"absolute",inset:4,borderRadius:"50%",background:`conic-gradient(${actual.color} ${pct*3.6}deg, transparent 0deg)`,opacity:0.2}}/>
          <p style={{fontFamily:FD,fontSize:32,fontWeight:700,color:actual.color,lineHeight:1}}>{actual.dur-cuenta}</p>
          <p style={{fontSize:11,color:actual.color,fontWeight:700}}>{actual.label}</p>
        </div>
        <p style={{fontSize:12,color:T.stone,textAlign:"center"}}>{actual.desc}</p>
      </div>
      <div style={{display:"flex",gap:6,justifyContent:"center"}}>
        {["inhala","sostén","exhala"].map(f=>(
          <div key={f} style={{flex:1,height:4,borderRadius:2,background:fase===f?actual.color:T.stonePale,transition:"background .3s"}}/>
        ))}
      </div>
      <button onClick={()=>setFase(null)} style={{width:"100%",marginTop:14,padding:"10px",borderRadius:12,border:`1px solid ${T.stoneMid}`,background:"transparent",color:T.stone,fontSize:12,cursor:"pointer",fontFamily:FB}}>Detener</button>
    </div>
  );
}

// ── HOME BIENESTAR SECTION ────────────────────────────────────────────────────
function BienestarSection(){
  const hoy = new Date();
  const diaDelAno = Math.floor((hoy - new Date(hoy.getFullYear(),0,0))/(1000*60*60*24));
  const consejo = CONSEJOS_ERI[diaDelAno % CONSEJOS_ERI.length];
  const afirmacion = AFIRMACIONES[diaDelAno % AFIRMACIONES.length];
  const intencion = INTENCIONES[diaDelAno % INTENCIONES.length];
  const fechaKey = hoy.toISOString().split("T")[0];

  const [habitos, setHabitos] = useState({});
  const [showRespiracion, setShowRespiracion] = useState(false);
  const [expandConsejo, setExpandConsejo] = useState(false);

  useEffect(()=>{
    try{
      const h=JSON.parse(localStorage.getItem("habitos:hoy")||"{}");
      if(h.fecha===fechaKey) setHabitos(h.checks||{});
    }catch{}
  },[]);

  function toggleHabito(id){
    const nuevo={...habitos,[id]:!habitos[id]};
    setHabitos(nuevo);
    localStorage.setItem("habitos:hoy",JSON.stringify({fecha:fechaKey,checks:nuevo}));
  }

  const completados=Object.values(habitos).filter(Boolean).length;

  return(
    <>
      {/* INTENCIÓN DEL DÍA */}
      <div style={{borderRadius:20,background:`linear-gradient(135deg,${T.terra}22,${T.terraLight}22)`,border:`1px solid ${T.terra}33`,padding:"18px",marginBottom:12}}>
        <p style={{fontSize:10,fontWeight:700,color:T.terra,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:6}}>🌸 Mi intención de hoy</p>
        <p style={{fontFamily:FD,fontSize:15,color:T.brown,fontWeight:600,lineHeight:1.6,marginBottom:10}}>{intencion}</p>
        <div style={{borderTop:`1px solid ${T.terra}22`,paddingTop:10}}>
          <p style={{fontSize:10,fontWeight:700,color:T.sage,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>✨ Afirmación</p>
          <p style={{fontSize:13,color:T.sage,fontStyle:"italic",lineHeight:1.6}}>{afirmacion}</p>
        </div>
      </div>

      {/* CONSEJO DEL DÍA */}
      <div style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"18px",marginBottom:12}}>
        <p style={{fontSize:10,fontWeight:700,color:T.brown,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:6}}>💡 Consejo Método Eri</p>
        <p style={{fontSize:13,color:T.brown,lineHeight:1.7,maxHeight:expandConsejo?"none":"60px",overflow:"hidden"}}>{consejo}</p>
        <button onClick={()=>setExpandConsejo(!expandConsejo)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:T.sage,fontWeight:700,marginTop:6,padding:0,fontFamily:FB}}>
          {expandConsejo?"Ver menos ▲":"Ver más ▼"}
        </button>
      </div>

      {/* RESPIRACIÓN 4-7-8 */}
      {showRespiracion?<Respiracion478/>:(
        <button onClick={()=>setShowRespiracion(true)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 18px",borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,cursor:"pointer",marginBottom:12,fontFamily:FB}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>🌬️</span>
            <div style={{textAlign:"left"}}>
              <p style={{fontSize:13,fontWeight:700,color:T.brown}}>Respiración 4-7-8</p>
              <p style={{fontSize:11,color:T.stone}}>Calma el sistema nervioso en 3 ciclos</p>
            </div>
          </div>
          <ChevronRight size={16} color={T.stoneMid}/>
        </button>
      )}

      {/* HÁBITOS DIARIOS */}
      <div style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"18px",marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase"}}>✅ Hábitos de hoy</p>
          <span style={{fontSize:11,padding:"4px 10px",borderRadius:10,background:completados===HABITOS_ERI.length?T.sage:T.stonePale,color:completados===HABITOS_ERI.length?"white":T.stone,fontWeight:700,transition:"all .3s"}}>{completados}/{HABITOS_ERI.length}</span>
        </div>
        {/* BARRA DE PROGRESO */}
        <div style={{height:6,borderRadius:4,background:T.stonePale,marginBottom:14,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(completados/HABITOS_ERI.length)*100}%`,borderRadius:4,background:`linear-gradient(90deg,${T.sage},${T.sageMid})`,transition:"width .4s"}}/>
        </div>
        {HABITOS_ERI.map(h=>(
          <button key={h.id} onClick={()=>toggleHabito(h.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"10px 0",background:"none",border:"none",cursor:"pointer",borderBottom:`1px solid ${T.stonePale}`,fontFamily:FB}}>
            <div style={{width:24,height:24,borderRadius:8,border:`2px solid ${habitos[h.id]?T.sage:T.stoneMid}`,background:habitos[h.id]?T.sage:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
              {habitos[h.id]&&<span style={{fontSize:12,color:"white"}}>✓</span>}
            </div>
            <span style={{fontSize:13,color:habitos[h.id]?T.sage:T.brown,fontWeight:habitos[h.id]?700:400,textDecoration:habitos[h.id]?"line-through":"none",transition:"all .2s",textAlign:"left"}}>{h.emoji} {h.texto}</span>
          </button>
        ))}
        {completados===HABITOS_ERI.length&&(
          <div style={{textAlign:"center",padding:"14px 0 4px"}}>
            <p style={{fontSize:20,marginBottom:4}}>🎉</p>
            <p style={{fontSize:12,fontWeight:700,color:T.sage}}>¡Completaste todos tus hábitos hoy!</p>
          </div>
        )}
      </div>
    </>
  );
}

// ── PROFILE AVATAR ─────────────────────────────────────────────────────────
function ProfileAvatar({size=48,profile,onGoProfile}){
  const [photoURL,setPhotoURL]=useState(null);
  useEffect(()=>{
    try{const p=localStorage.getItem("profile:photo");if(p)setPhotoURL(p);}catch{}
  },[]);
  const r=size/2;const br=Math.round(size*0.33);
  return(
    <button onClick={onGoProfile} style={{width:size,height:size,borderRadius:br,background:`linear-gradient(135deg,${T.sage},${T.sageMid})`,display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer",overflow:"hidden",padding:0,flexShrink:0,boxShadow:`0 4px 12px ${T.sage}44`}}>
      {photoURL
        ?<img src={photoURL} alt="perfil" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        :<span style={{fontFamily:FD,fontSize:Math.round(size*0.4),fontWeight:700,color:"white"}}>{profile?.nombre?profile.nombre[0].toUpperCase():"?"}</span>
      }
    </button>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function HomeTab({state,goTo,isPremium,onUpgrade}){
  const {profile,pantry,recipesHistory}=state;
  const hr=new Date().getHours();
  const greet=hr<12?"Buenos días":hr<20?"Buenas tardes":"Buenas noches";
  return(
    <div style={{padding:"56px 20px 96px",fontFamily:FB,background:`linear-gradient(180deg,${T.sagePale} 0%,${T.cream} 200px)`}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <p style={{fontSize:13,color:T.stone,marginBottom:2}}>{greet},</p>
          <h1 style={{fontFamily:FD,fontSize:28,color:T.brown,fontWeight:700}}>{profile?.nombre||"Coach"}</h1>
        </div>
        <ProfileAvatar size={48} profile={profile} onGoProfile={()=>goTo("profile")}/>
      </div>

      {/* FASE ACTUAL */}
      <div style={{borderRadius:24,background:`linear-gradient(135deg,${T.sage},${T.sageMid})`,padding:"22px 24px",marginBottom:16,boxShadow:`0 10px 32px ${T.sage}44`,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:-20,top:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}}/>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
          <Sparkles size={12} color="rgba(255,255,255,0.75)"/>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.75)",fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase"}}>Método Eri · Proyecto Stop Hashimoto®</span>
        </div>
        <p style={{fontFamily:FD,fontSize:22,color:"white",fontWeight:700,marginBottom:4}}>{profile?.fase_eri||"Eliminación"}</p>
        <p style={{fontSize:12,color:"rgba(255,255,255,0.65)"}}>Nutrición · Estilo de vida · Sin gluten siempre</p>
      </div>

      {/* ESTADÍSTICAS */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {[{icon:ShoppingBag,n:pantry.length,label:"en despensa",color:T.terra},{icon:ChefHat,n:recipesHistory.length,label:"recetas cocinadas",color:T.sage}].map(({icon:I,n,label,color})=>(
          <div key={label} style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"18px 16px"}}>
            <I size={18} color={color} style={{marginBottom:8}}/><p style={{fontFamily:FD,fontSize:28,fontWeight:700,color:T.brown,lineHeight:1}}>{n}</p><p style={{fontSize:11,color:T.stone,marginTop:4}}>{label}</p>
          </div>
        ))}
      </div>

      {/* BIENESTAR DEL DÍA */}
      <BienestarSection/>

      {/* ACCESOS RÁPIDOS */}
      <button onClick={()=>goTo("recipes")} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px",borderRadius:22,background:T.warmWhite,border:`1px solid ${T.stonePale}`,cursor:"pointer"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}><ChefHat size={20} color={T.sage}/><div style={{textAlign:"left"}}><p style={{fontSize:14,fontWeight:700,color:T.brown,fontFamily:FB}}>¿Qué cocino hoy?</p><p style={{fontSize:11,color:T.stone,marginTop:2}}>Recetas Método Eri</p></div></div>
        <ChevronRight size={18} color={T.stoneMid}/>
      </button>
    </div>
  );
}

// ── VERIFICAR ETIQUETA ────────────────────────────────────────────────────────
function VerificarEtiqueta({fase,onClose}){
  const [loading,setLoading]=useState(false);
  const [resultado,setResultado]=useState(null);
  const [err,setErr]=useState(null);
  const fileRef=useRef();
  const faseActual=fase||"Eliminación";
  const r=FASES[faseActual]||FASES["Eliminación"];

  async function handleFile(e){
    const file=e.target.files?.[0];if(!file)return;
    setLoading(true);setErr(null);setResultado(null);
    try{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
      const sys=`Eres experta en el protocolo AIP (Autoimmune Protocol) y el Método Eri del programa Stop Hashimoto. Analiza etiquetas de alimentos y suplementos con criterio clínico estricto. Responde SOLO con JSON válido sin markdown.`;
      const prompt=`Analiza esta etiqueta de alimento o suplemento para una persona con Hashimoto en fase ${faseActual} del Método Eri.

PROHIBIDO en ${faseActual} (NUNCA apto): ${r.prohibidos.join("; ")}
PERMITIDO en ${faseActual}: ${r.permitidos.slice(0,10).join("; ")}

Lee TODOS los ingredientes de la etiqueta con atención especial a: gluten, lácteos, solanáceas, legumbres, huevos, granos, aditivos, conservantes, endulzantes artificiales, aceites de semillas refinados.

Responde SOLO con este JSON:
{
  "producto": "nombre del producto",
  "apto": true o false,
  "nivel": "verde|amarillo|rojo",
  "veredicto": "frase corta contundente (máx 10 palabras)",
  "ingredientes_problema": ["ingrediente 1", "ingrediente 2"],
  "ingredientes_ok": ["ingrediente 1", "ingrediente 2"],
  "fundamento": "explicación clínica en 2-3 oraciones por qué es o no es apto para Hashimoto y fase ${faseActual}",
  "recomendacion": "qué hacer o qué buscar como alternativa"
}`;
      const txt=await callClaude([{role:"user",content:[
        {type:"image",source:{type:"base64",media_type:file.type,data:b64}},
        {type:"text",text:prompt}
      ]}],sys,1500);
      setResultado(pj(txt));
    }catch{setErr("No pude leer la etiqueta. Intenta con mejor iluminación y que los ingredientes sean visibles.");}
    finally{setLoading(false);if(fileRef.current)fileRef.current.value="";}
  }

  const colores={verde:{bg:"#E8F5EE",border:"#3A7D55",text:"#3A7D55",emoji:"✅"},amarillo:{bg:"#FFF8E7",border:"#C8932A",text:"#C8932A",emoji:"⚠️"},rojo:{bg:"#FDECEA",border:T.error,text:T.error,emoji:"🚫"}};
  const nivel=resultado?.nivel||"rojo";
  const c=colores[nivel]||colores.rojo;

  return(
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(44,32,24,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:480,maxHeight:"92svh",borderRadius:"28px 28px 0 0",background:T.cream,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 0"}}><div style={{width:40,height:4,borderRadius:2,background:T.stoneMid}}/></div>
        <div style={{padding:"14px 22px 10px",borderBottom:`1px solid ${T.stonePale}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <h3 style={{fontFamily:FD,fontSize:18,fontWeight:700,color:T.brown}}>Verificar Etiqueta</h3>
            <p style={{fontSize:11,color:T.stone,marginTop:2}}>Fase actual: <strong style={{color:FASES[faseActual]?.color}}>{faseActual}</strong></p>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}><XCircle size={22} color={T.stoneMid}/></button>
        </div>
        <div style={{overflowY:"auto",padding:"16px 22px 40px"}}>
          <label style={{display:"block",marginBottom:16}}>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleFile}/>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"16px",borderRadius:20,background:`linear-gradient(135deg,${T.brown},${T.brownMid})`,cursor:"pointer",boxShadow:`0 6px 20px ${T.brown}44`}}>
              <Camera size={18} color="white"/><span style={{fontSize:14,fontWeight:700,color:"white"}}>Fotografiar etiqueta</span>
            </div>
          </label>
          <p style={{fontSize:11,color:T.stone,textAlign:"center",marginBottom:16}}>Apunta la cámara a la lista de ingredientes del producto o suplemento</p>
          {loading&&<Spin msg="Analizando ingredientes con criterio AIP…"/>}
          {err&&<Err msg={err} onClose={()=>setErr(null)}/>}
          {resultado&&(
            <div>
              <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>{resultado.producto}</p>
              <div style={{borderRadius:20,background:c.bg,border:`2px solid ${c.border}`,padding:"16px 18px",marginBottom:14,textAlign:"center"}}>
                <p style={{fontSize:28,marginBottom:4}}>{c.emoji}</p>
                <p style={{fontFamily:FD,fontSize:18,fontWeight:700,color:c.text,marginBottom:4}}>{resultado.veredicto}</p>
                <p style={{fontSize:12,color:c.text,lineHeight:1.6}}>{resultado.fundamento}</p>
              </div>
              {resultado.ingredientes_problema?.length>0&&(
                <div style={{borderRadius:16,background:"#FDECEA",border:`1px solid ${T.error}33`,padding:"12px 14px",marginBottom:10}}>
                  <p style={{fontSize:11,fontWeight:700,color:T.error,marginBottom:6}}>🚫 Ingredientes problemáticos:</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {resultado.ingredientes_problema.map((ing,i)=><span key={i} style={{fontSize:11,padding:"4px 10px",borderRadius:10,background:T.error+"22",color:T.error,fontWeight:600}}>{ing}</span>)}
                  </div>
                </div>
              )}
              {resultado.ingredientes_ok?.length>0&&(
                <div style={{borderRadius:16,background:"#E8F5EE",border:"1px solid #3A7D5533",padding:"12px 14px",marginBottom:10}}>
                  <p style={{fontSize:11,fontWeight:700,color:T.ok,marginBottom:6}}>✅ Ingredientes ok:</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {resultado.ingredientes_ok.map((ing,i)=><span key={i} style={{fontSize:11,padding:"4px 10px",borderRadius:10,background:T.ok+"22",color:T.ok,fontWeight:600}}>{ing}</span>)}
                  </div>
                </div>
              )}
              {resultado.recomendacion&&(
                <div style={{borderRadius:16,background:T.sagePale,border:`1px solid ${T.sageLight}`,padding:"12px 14px"}}>
                  <p style={{fontSize:11,fontWeight:700,color:T.sage,marginBottom:4}}>💡 Recomendación</p>
                  <p style={{fontSize:12,color:T.sage,lineHeight:1.6}}>{resultado.recomendacion}</p>
                </div>
              )}
              <button onClick={()=>{setResultado(null);if(fileRef.current)fileRef.current.value="";}} style={{width:"100%",marginTop:14,padding:"13px",borderRadius:16,border:`1.5px solid ${T.stoneMid}`,background:"transparent",color:T.stone,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FB}}>Analizar otro producto</button>
            </div>
          )}
          {!resultado&&!loading&&!err&&(
            <div style={{textAlign:"center",padding:"24px 16px",color:T.stone}}>
              <p style={{fontSize:32,marginBottom:8}}>🏷️</p>
              <p style={{fontSize:13,lineHeight:1.6}}>Fotografía la lista de ingredientes de cualquier alimento o suplemento y te diré si es apto para tu fase del Método Eri.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DESPENSA ──────────────────────────────────────────────────────────────────
function PantryTab({state,dispatch,isPremium,onUpgrade}){
  const {pantry,profile}=state;
  const [err,setErr]=useState(null);
  const [filter,setFilter]=useState("all");
  const [showEtiqueta,setShowEtiqueta]=useState(false);
  const [showManual,setShowManual]=useState(false);
  const [manualName,setManualName]=useState("");
  const [manualQty,setManualQty]=useState("1");
  const [manualUnit,setManualUnit]=useState("unidad");
  const [manualCat,setManualCat]=useState("otro");

  // Límite 5 fotos de etiqueta por día
  const fechaHoy = new Date().toISOString().split("T")[0];
  function getEtiquetasHoy(){try{const d=JSON.parse(localStorage.getItem("etiquetas:limite")||"{}");return d.fecha===fechaHoy?d.count:0;}catch{return 0;}}
  function incrementEtiquetas(){try{const c=getEtiquetasHoy();localStorage.setItem("etiquetas:limite",JSON.stringify({fecha:fechaHoy,count:c+1}));}catch{}}
  const etiquetasHoy = getEtiquetasHoy();
  const LIMITE_ETIQUETAS = 5;

  async function handleManualAdd(){
    if(!manualName.trim()){return;}
    const item={name:manualName.trim(),quantity:parseFloat(manualQty)||1,unit:manualUnit,category:manualCat};
    dispatch({type:"MERGE_PANTRY",p:[item]});
    const next=[...pantry];
    const idx=next.findIndex(i=>i.name.toLowerCase()===item.name.toLowerCase());
    idx>=0?(next[idx]={...next[idx],quantity:(next[idx].quantity||0)+item.quantity}):next.push(item);
    await dbSet("pantry:items",next);
    setManualName("");setManualQty("1");setManualUnit("unidad");setManualCat("otro");
    setShowManual(false);
  }
  const visible=filter==="all"?pantry:pantry.filter(i=>i.category===filter);
  return(
    <div style={{padding:"56px 20px 96px",fontFamily:FB}}>
      <h2 style={{fontFamily:FD,fontSize:26,color:T.brown,fontWeight:700,marginBottom:4}}>Despensa Método Eri</h2>
      <p style={{fontSize:12,color:T.stone,marginBottom:16}}>{pantry.length} ingredientes disponibles</p>

      {/* VERIFICAR ETIQUETA con límite diario */}
      <button onClick={()=>{
        if(!isPremium){onUpgrade();return;}
        if(etiquetasHoy>=LIMITE_ETIQUETAS){setErr(`Límite diario alcanzado (${LIMITE_ETIQUETAS} fotos/día). Vuelve mañana.`);return;}
        incrementEtiquetas();
        setShowEtiqueta(true);
      }} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderRadius:20,background:isPremium?`linear-gradient(135deg,${T.brown},${T.brownMid})`:`linear-gradient(135deg,${T.stoneMid},${T.stone})`,border:"none",cursor:"pointer",marginBottom:10,boxShadow:isPremium?`0 6px 20px ${T.brown}44`:"none",position:"relative"}}>
        {!isPremium&&<span style={{position:"absolute",top:8,right:8,fontSize:10}}>🔒</span>}
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>🏷️</span>
          <div style={{textAlign:"left"}}>
            <p style={{fontSize:13,fontWeight:700,color:"white",fontFamily:FB}}>Verificar etiqueta Método Eri</p>
            <p style={{fontSize:11,color:"rgba(255,255,255,0.75)"}}>{isPremium?`${etiquetasHoy}/${LIMITE_ETIQUETAS} fotos usadas hoy`:"Premium"}</p>
          </div>
        </div>
        {isPremium&&<div style={{display:"flex",gap:2}}>{Array.from({length:LIMITE_ETIQUETAS},(_,i)=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:i<etiquetasHoy?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.9)"}}/>)}</div>}
      </button>

      {/* BOTÓN AGREGAR A MANO — disponible para todos */}
      <button onClick={()=>setShowManual(true)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"13px",borderRadius:20,border:`1.5px dashed ${T.sage}`,background:T.sagePale,cursor:"pointer",marginBottom:16,fontFamily:FB}}>
        <span style={{fontSize:16}}>✏️</span>
        <span style={{fontSize:13,fontWeight:700,color:T.sage}}>Agregar ingrediente a mano</span>
      </button>

      {/* MODAL AGREGAR A MANO */}
      {showManual&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(44,32,24,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowManual(false)}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:480,borderRadius:"28px 28px 0 0",background:T.cream,padding:"24px 20px 40px",fontFamily:FB}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:16}}><div style={{width:40,height:4,borderRadius:2,background:T.stoneMid}}/></div>
            <h3 style={{fontFamily:FD,fontSize:18,color:T.brown,fontWeight:700,marginBottom:16}}>Agregar ingrediente</h3>
            <input value={manualName} onChange={e=>setManualName(e.target.value)} placeholder="Nombre del ingrediente..." style={{width:"100%",padding:"13px 16px",borderRadius:14,border:`1.5px solid ${T.stoneMid}`,background:T.warmWhite,fontSize:14,color:T.ink,outline:"none",boxSizing:"border-box",fontFamily:FB,marginBottom:10}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <input value={manualQty} onChange={e=>setManualQty(e.target.value)} type="number" min="0.1" step="0.1" placeholder="Cantidad" style={{padding:"13px 16px",borderRadius:14,border:`1.5px solid ${T.stoneMid}`,background:T.warmWhite,fontSize:14,color:T.ink,outline:"none",fontFamily:FB}}/>
              <select value={manualUnit} onChange={e=>setManualUnit(e.target.value)} style={{padding:"13px 16px",borderRadius:14,border:`1.5px solid ${T.stoneMid}`,background:T.warmWhite,fontSize:14,color:T.ink,outline:"none",fontFamily:FB}}>
                {["unidad","g","kg","ml","l","taza","cda","cdita"].map(u=><option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <select value={manualCat} onChange={e=>setManualCat(e.target.value)} style={{width:"100%",padding:"13px 16px",borderRadius:14,border:`1.5px solid ${T.stoneMid}`,background:T.warmWhite,fontSize:14,color:T.ink,outline:"none",fontFamily:FB,marginBottom:16,boxSizing:"border-box"}}>
              {Object.entries(CATS).map(([k,v])=><option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </select>
            <button onClick={handleManualAdd} disabled={!manualName.trim()} style={{width:"100%",padding:"14px",borderRadius:16,border:"none",background:manualName.trim()?`linear-gradient(135deg,${T.sage},${T.sageMid})`:`${T.stoneMid}`,color:"white",fontSize:14,fontWeight:700,cursor:manualName.trim()?"pointer":"not-allowed",fontFamily:FB}}>
              Agregar a despensa ✓
            </button>
          </div>
        </div>
      )}

      {err&&<Err msg={err} onClose={()=>setErr(null)}/>}
      {pantry.length>0&&<div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8,marginBottom:14}}>
        {[["all","Todos","🌿"],...Object.entries(CATS).map(([k,v])=>[k,v.label,v.emoji])].map(([k,l,em])=>(
          <button key={k} onClick={()=>setFilter(k)} style={{flexShrink:0,padding:"7px 14px",borderRadius:20,border:`1.5px solid ${filter===k?(CATS[k]?.color||T.sage):T.stoneMid}`,background:filter===k?(CATS[k]?.color||T.sage):"white",color:filter===k?"white":T.brown,fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:FB}}>
            {em} {l}
          </button>
        ))}
      </div>}
      {pantry.length===0?<Empty Icon={ShoppingBag} title="Tu despensa está vacía" sub="Agrega ingredientes a mano con el botón de arriba."/>
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
      {showEtiqueta&&<VerificarEtiqueta fase={profile?.fase_eri} onClose={()=>setShowEtiqueta(false)}/>}
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
          <p style={{fontSize:11,fontWeight:700,color:T.terra,marginBottom:4}}>⚠️ Ingredientes que te faltan:</p>
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
          {receta.nota&&<div style={{marginTop:16,padding:"12px 14px",borderRadius:14,background:T.sagePale,border:`1px solid ${T.sageLight}`}}><p style={{fontSize:11,fontWeight:700,color:T.sage,marginBottom:4}}>💡 Nota</p><p style={{fontSize:12,color:T.sage,lineHeight:1.6}}>{receta.nota}</p></div>}
        </div>
      </div>
    </div>
  );
}

// ── RECETARIO ─────────────────────────────────────────────────────────────────
function RecetarioSH({onBack,perfilFase,isPremium,planType,onUpgrade}){
  const fasesDisp=["Eliminación","Reintroducción","Mantenimiento"];
  const faseInicial=perfilFase&&fasesDisp.includes(perfilFase)?perfilFase:"Eliminación";
  const [fase,setFase]=useState(faseInicial);
  const [cat,setCat]=useState("todos");
  const [q,setQ]=useState("");
  const [abierta,setAbierta]=useState(null);
  const rFase=FASES[fase];

  // Categorías permitidas por plan
  const CATS_GENERAL=["almuerzo","sopa"]; // Plan General/Premium: solo almuerzo y sopas
  const LIMITE_GENERAL=14;
  const LIMITE_COMUNIDAD=39;

  const todasFiltradas=RECETARIO.filter(r=>
    r.fases.includes(fase)&&
    (cat==="todos"||r.cat===cat)&&
    (q===""||r.titulo.toLowerCase().includes(q.toLowerCase())||r.ing.some(i=>i.toLowerCase().includes(q.toLowerCase())))&&
    (planType==="community"||!r.comunidad) // recetas comunidad:true solo para Plan Comunidad
  );

  let filtradas;
  if(!isPremium){
    // Plan Gratuito: sin recetas del Método Eri
    filtradas=[];
  } else if(planType==="community"){
    // Plan Comunidad: todas las recetas, máx 39
    filtradas=todasFiltradas.slice(0,LIMITE_COMUNIDAD);
  } else {
    // Plan General/Premium: sin recetas del Método Eri (solo IA)
    filtradas=[];
  }

  const planLabel=!isPremium?"plan gratuito: sin recetas":planType==="community"?`plan comunidad: hasta ${LIMITE_COMUNIDAD} recetas`:`plan general: usa la IA para generar recetas`;
  return(
    <div style={{padding:"20px 20px 96px",fontFamily:FB}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",fontSize:13,color:T.stone,fontWeight:600,marginBottom:16,padding:0}}><ChevronLeft size={16}/> Volver</button>
      <h2 style={{fontFamily:FD,fontSize:22,color:T.brown,fontWeight:700,marginBottom:2}}>Recetario Método Eri</h2>
      <p style={{fontSize:12,color:T.stone,marginBottom:16}}>Stop Hashimoto · {RECETARIO.length} recetas originales</p>
      <div style={{marginBottom:16}}>
        <p style={{fontSize:10,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>Ver recetas de la fase:</p>
        <div style={{display:"flex",gap:8}}>
          {fasesDisp.map(f=>{
            const r=FASES[f];const sel=fase===f;
            return(
              <button key={f} onClick={()=>{setFase(f);setCat("todos");}} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"10px 6px",borderRadius:16,border:`2px solid ${sel?r.color:T.stonePale}`,background:sel?r.colorPale:T.warmWhite,cursor:"pointer"}}>
                <span style={{fontSize:16}}>{r.emoji}</span>
                <span style={{fontSize:10,fontWeight:700,color:sel?r.color:T.stone,fontFamily:FB,lineHeight:1.2,textAlign:"center"}}>{f}</span>
              </button>
            );
          })}
        </div>
        <div style={{marginTop:10,padding:"8px 12px",borderRadius:12,background:rFase.colorPale,border:`1px solid ${rFase.color}33`}}>
          <p style={{fontSize:11,color:rFase.color,fontWeight:600,lineHeight:1.5}}>{rFase.emoji} {rFase.desc}</p>
        </div>
      </div>
      <input type="text" placeholder="🔍 Buscar receta o ingrediente..." value={q} onChange={e=>setQ(e.target.value)} style={{width:"100%",padding:"12px 16px",borderRadius:16,border:`1.5px solid ${T.stoneMid}`,background:T.warmWhite,fontSize:14,color:T.ink,outline:"none",boxSizing:"border-box",fontFamily:FB,marginBottom:14}}/>
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:10,marginBottom:16}}>
        {CATS_R.map(c=><button key={c.id} onClick={()=>setCat(c.id)} style={{flexShrink:0,padding:"7px 14px",borderRadius:20,border:`1.5px solid ${cat===c.id?T.sage:T.stoneMid}`,background:cat===c.id?T.sage:"white",color:cat===c.id?"white":T.brown,fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:FB}}>{c.emoji} {c.label}</button>)}
      </div>
      <p style={{fontSize:11,color:T.stone,marginBottom:12}}>{filtradas.length} receta{filtradas.length!==1?"s":""} · {planLabel}</p>
      {!isPremium&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:14,background:T.terraPale,border:`1px solid ${T.terra}33`}}><p style={{fontSize:12,color:T.terra,lineHeight:1.5}}>🔒 El recetario del Método Eri es exclusivo del Plan Comunidad. Suscríbete para acceder a las 39 recetas.</p></div>}
      {isPremium&&planType!=="community"&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:14,background:T.terraPale,border:`1px solid ${T.terra}33`}}><p style={{fontSize:12,color:T.terra,lineHeight:1.5}}>🔒 El recetario del Método Eri es exclusivo del Plan Comunidad. Usa el generador de IA para crear tus propias recetas personalizadas.</p></div>}
      {filtradas.length===0?<div style={{textAlign:"center",padding:"40px 16px",color:T.stone,fontSize:13}}>No encontré recetas con ese término 🌿</div>
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
      {!isPremium&&<PremiumLock onUpgrade={onUpgrade}/>}
      {isPremium&&planType==="community"&&<div style={{margin:"16px 0",padding:"14px",borderRadius:16,background:T.sagePale,border:`1px solid ${T.sageLight}`,textAlign:"center"}}><p style={{fontSize:12,color:T.sage}}>Plan Comunidad · Acceso completo al recetario 🌿</p></div>}
      {isPremium&&planType!=="community"&&<div style={{margin:"16px 0",padding:"14px",borderRadius:16,background:T.terraPale,border:`1px solid ${T.terra}`,textAlign:"center"}}><p style={{fontSize:12,color:T.terra}}>Usa el generador de IA ✨ para crear recetas personalizadas según tu fase y síntomas.</p></div>}
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
          {[["permitidos","✅ Permitidos"],["prohibidos","🚫 Prohibidos"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"12px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB,color:tab===k?rules.color:T.stone,borderBottom:tab===k?`2.5px solid ${rules.color}`:"2.5px solid transparent"}}>{l}</button>
          ))}
        </div>
        <div style={{overflowY:"auto",padding:"16px 20px 32px"}}>
          {rules[tab].map((item,i)=><div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}><span style={{fontSize:16,flexShrink:0}}>{tab==="permitidos"?"✅":"🚫"}</span><p style={{fontSize:13,color:T.brown,lineHeight:1.5}}>{item}</p></div>)}
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
      {recipes.length===0&&!loading&&!err&&<div style={{textAlign:"center",padding:"32px 16px",color:T.stone,fontSize:13}}><p>Selecciona una fase y presiona el botón 🌿</p></div>}
      {guia&&<FaseGuide fase={guia} onClose={()=>setGuia(null)}/>}
    </div>
  );
}

// ── RECETAS TAB ───────────────────────────────────────────────────────────────
function RecipesTab({state,dispatch,isPremium,planType,onUpgrade}){
  const {pantry,profile,recipesHistory}=state;
  const [modo,setModo]=useState("inicio");
  const [recipes,setRecipes]=useState([]);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState(null);
  const [cooked,setCooked]=useState([]);
  useEffect(()=>{if(modo==="despensa")gen();},[modo]);
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
  if(modo==="fase")return isPremium?<CreateByFase profile={profile} state={state} dispatch={dispatch} onBack={()=>{setModo("inicio");setRecipes([]);}}/>:<div style={{padding:"56px 20px 96px"}}><button onClick={()=>setModo("inicio")} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",fontSize:13,color:T.stone,fontWeight:600,marginBottom:20,padding:0,fontFamily:FB}}><ChevronLeft size={16}/> Volver</button><PremiumLock onUpgrade={onUpgrade}/></div>;
  if(modo==="recetario")return<RecetarioSH onBack={()=>setModo("inicio")} perfilFase={profile?.fase_eri} isPremium={isPremium} planType={planType} onUpgrade={onUpgrade}/>;
  return(
    <div style={{padding:"56px 20px 96px",fontFamily:FB}}>
      <h2 style={{fontFamily:FD,fontSize:26,color:T.brown,fontWeight:700,marginBottom:4}}>Recetas Método Eri</h2>
      <p style={{fontSize:12,color:T.stone,marginBottom:20}}>Personalizadas para Hashimoto</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <button onClick={()=>isPremium?setModo("despensa"):onUpgrade()} style={{display:"flex",flexDirection:"column",alignItems:"flex-start",padding:"16px",borderRadius:20,border:`2px solid ${modo==="despensa"?T.sage:T.stonePale}`,background:modo==="despensa"?T.sagePale:T.warmWhite,cursor:"pointer",textAlign:"left",position:"relative"}}>
          {!isPremium&&<span style={{position:"absolute",top:8,right:8,fontSize:10}}>🔒</span>}
          <ShoppingBag size={20} color={T.sage} style={{marginBottom:8}}/><p style={{fontSize:13,fontWeight:700,color:T.brown,fontFamily:FB}}>Con mi despensa</p><p style={{fontSize:11,color:T.stone,marginTop:3,lineHeight:1.4}}>{isPremium?"Recetas con lo que ya tienes":"Premium"}</p>
        </button>
        <button onClick={()=>isPremium?setModo("fase"):onUpgrade()} style={{display:"flex",flexDirection:"column",alignItems:"flex-start",padding:"16px",borderRadius:20,border:`2px solid ${T.stonePale}`,background:T.warmWhite,cursor:"pointer",textAlign:"left",position:"relative"}}>
          {!isPremium&&<span style={{position:"absolute",top:8,right:8,fontSize:10}}>🔒</span>}
          <Sparkles size={20} color={T.terra} style={{marginBottom:8}}/><p style={{fontSize:13,fontWeight:700,color:T.brown,fontFamily:FB}}>Por fase</p><p style={{fontSize:11,color:T.stone,marginTop:3,lineHeight:1.4}}>{isPremium?"Según etapa del Método Eri":"Premium"}</p>
        </button>
      </div>
      <button onClick={()=>setModo("recetario")} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 18px",borderRadius:20,border:`2px solid ${T.sageLight}`,background:T.sagePale,cursor:"pointer",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <BookOpen size={20} color={T.sage}/>
          <div style={{textAlign:"left"}}><p style={{fontSize:13,fontWeight:700,color:T.sage,fontFamily:FB}}>📖 Recetario Stop Hashimoto</p><p style={{fontSize:11,color:T.stone,marginTop:2}}>{RECETARIO.length} recetas originales del programa</p></div>
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
function ProfileTab({state,dispatch,isPremium,planType,onUpgrade}){
  const {profile}=state;
  const [confirm,setConfirm]=useState(false);
  const [photoURL,setPhotoURL]=useState(null);
  const photoRef=useRef();
  useEffect(()=>{try{const p=localStorage.getItem("profile:photo");if(p)setPhotoURL(p);}catch{}});
  function handlePhoto(e){
    const file=e.target.files?.[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const url=ev.target.result;
      localStorage.setItem("profile:photo",url);
      setPhotoURL(url);
    };
    reader.readAsDataURL(file);
  }
  if(!profile)return null;
  const rows=[["Edad",profile.edad?`${profile.edad} años`:"—"],["Peso",profile.peso?`${profile.peso} kg`:"—"],["Altura",profile.altura?`${profile.altura} cm`:"—"],["Actividad",profile.actividad||"—"],["Sueño",profile.sueno?`${profile.sueno} h`:"—"],["Estrés",profile.estres||"—"],["Diagnóstico",profile.tiempo_dx||"—"],["Fase Método Eri",profile.fase_eri||"—"],["Objetivo",profile.objetivo||"—"]];
  return(
    <div style={{padding:"56px 20px 96px",fontFamily:FB}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:28}}>
        <div style={{position:"relative",marginBottom:12}}>
          <div style={{width:88,height:88,borderRadius:26,background:`linear-gradient(135deg,${T.sage},${T.sageMid})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 8px 24px ${T.sage}44`,overflow:"hidden"}}>
            {photoURL
              ?<img src={photoURL} alt="perfil" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              :<span style={{fontFamily:FD,fontSize:36,fontWeight:700,color:"white"}}>{profile?.nombre?profile.nombre[0].toUpperCase():"?"}</span>
            }
          </div>
          <input ref={photoRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhoto}/>
          <button onClick={()=>photoRef.current?.click()} style={{position:"absolute",bottom:-4,right:-4,width:28,height:28,borderRadius:10,background:T.terra,border:"2px solid white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Camera size={12} color="white"/>
          </button>
        </div>
        <h2 style={{fontFamily:FD,fontSize:22,fontWeight:700,color:T.brown}}>{profile.nombre||"Tu perfil"}</h2>
        <span style={{fontSize:11,padding:"5px 14px",borderRadius:20,background:T.sagePale,color:T.sage,fontWeight:700,marginTop:6}}>Proyecto Stop Hashimoto® · Método Eri</span>
      </div>

      {/* MEMBRESÍA */}
      <div style={{borderRadius:20,background:isPremium?(planType==="community"?`linear-gradient(135deg,${T.sage}22,${T.sageLight}22)`:`linear-gradient(135deg,${T.terra}22,${T.terraLight}22)`):`linear-gradient(135deg,${T.stonePale},${T.cream})`,border:`1.5px solid ${isPremium?(planType==="community"?T.sage:T.terra):T.stoneMid}`,padding:"16px",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <p style={{fontSize:11,fontWeight:700,color:isPremium?(planType==="community"?T.sage:T.terra):T.stone,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>{isPremium?(planType==="community"?"🌿 Plan Comunidad":"✨ Plan General"):"Plan Gratuito"}</p>
            <p style={{fontSize:12,color:T.brownMid,lineHeight:1.5}}>{isPremium?(planType==="community"?"Acceso completo · Recetario exclusivo de alumnas":"Acceso al Método Eri con IA"):"Acceso limitado · Empieza a sanar hoy"}</p>
          </div>
          {!isPremium&&<button onClick={onUpgrade} style={{padding:"9px 16px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${T.terra},${T.terraLight})`,color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FB,flexShrink:0,marginLeft:12}}>Upgrade →</button>}
        </div>
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
      <div style={{borderRadius:20,background:T.sagePale,border:`1px solid ${T.sageLight}`,padding:"16px",marginBottom:16}}>
        <p style={{fontSize:11,fontWeight:700,color:T.sage,marginBottom:4}}>🌿 Proyecto Stop Hashimoto®</p>
        <p style={{fontSize:12,color:T.sage,lineHeight:1.6}}>Coach certificada · Instituto IIN Nueva York · Especialista en enfermedades autoinmunes y Método Eri</p>
      </div>
      {isPremium&&<SuplementosSection/>}
      {!isPremium&&<div style={{borderRadius:20,background:`linear-gradient(135deg,${T.terra}11,${T.terraLight}11)`,border:`1.5px solid ${T.terra}33`,padding:"16px",marginBottom:16,textAlign:"center"}}>
        <p style={{fontSize:20,marginBottom:6}}>💊</p>
        <p style={{fontFamily:FD,fontSize:14,fontWeight:700,color:T.brown,marginBottom:4}}>Protocolo de Suplementos</p>
        <p style={{fontSize:12,color:T.stone,lineHeight:1.6,marginBottom:12}}>Accede al protocolo completo de suplementos para Hashimoto con dosis, horarios e interacciones.</p>
        <button onClick={onUpgrade} style={{padding:"10px 20px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${T.terra},${T.terraLight})`,color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FB}}>Desbloquear con Premium →</button>
      </div>}

      {/* DARSE DE BAJA */}
      <div style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"16px",marginBottom:12}}>
        <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>Gestión de cuenta</p>
        <p style={{fontSize:12,color:T.stone,lineHeight:1.6}}>¿Deseas cancelar tu suscripción? Puedes gestionarlo directamente desde tu cuenta en <b>Hotmart</b> en cualquier momento, sin necesidad de contactarnos.</p>
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

// ── SUPLEMENTOS DATA ──────────────────────────────────────────────────────────
const SUPLEMENTOS_DATA = [
  {
    nombre:"Vitamina D3",emoji:"☀️",
    cuando:"Mañana con desayuno (con grasa)",
    dosis:"2.000–5.000 UI/día según niveles",
    notas:"Tomar siempre con vitamina K2 para mejor absorción y proteger arterias. Tomar con comida que contenga grasa.",
    interacciones:["No tomar con calcio en la misma toma si es dosis alta","Tomar junto con K2"],
    color:"#E8A000"
  },
  {
    nombre:"Magnesio (glicinato o malato)",emoji:"🌙",
    cuando:"Noche antes de dormir",
    dosis:"200–400 mg/día",
    notas:"El glicinato es el mejor para Hashimoto: calma el sistema nervioso, mejora el sueño y reduce la inflamación. Evitar el óxido de magnesio (poco absorbible).",
    interacciones:["No tomar con zinc en la misma toma","Separar del hierro al menos 2 horas"],
    color:"#6B9470"
  },
  {
    nombre:"Selenio",emoji:"🔬",
    cuando:"Mañana con desayuno",
    dosis:"100–200 mcg/día",
    notas:"Esencial para convertir T4 en T3 activa y reducir anticuerpos TPO. No superar 400 mcg/día. Preferir selenometionina.",
    interacciones:["Separar de la levotiroxina al menos 4 horas","No combinar con yodo en dosis altas sin supervisión médica"],
    color:"#B8603A"
  },
  {
    nombre:"Zinc",emoji:"⚡",
    cuando:"Almuerzo o cena (con comida)",
    dosis:"15–30 mg/día",
    notas:"Regula la función tiroidea y el sistema inmune. Tomar siempre con comida para evitar náuseas. Equilibrar con cobre si se toma más de 3 meses.",
    interacciones:["No tomar con magnesio en la misma toma","No tomar en ayunas","Separar del hierro 2 horas"],
    color:"#4A3728"
  },
  {
    nombre:"Omega 3",emoji:"🐟",
    cuando:"Almuerzo o cena (con comida grasa)",
    dosis:"1.000–3.000 mg EPA+DHA/día",
    notas:"Antiinflamatorio clave para autoinmunidad. Tomar con la comida más grande del día. Refrigerar una vez abierto. Preferir EPA alto para inflamación.",
    interacciones:["Puede potenciar anticoagulantes — consultar médico","Separar de la vitamina E si es en dosis alta"],
    color:"#2C7BB6"
  },
  {
    nombre:"Hierro (bisglicinato)",emoji:"🔴",
    cuando:"Mañana en ayunas (o con vitamina C)",
    dosis:"Según ferritina — solo si hay deficiencia confirmada",
    notas:"Tomar en ayunas para máxima absorción o con vitamina C. El bisglicinato es el más tolerable para el estómago. Confirmar niveles antes de suplementar.",
    interacciones:["NO tomar con calcio","NO tomar con té, café o lácteos","Separar de la levotiroxina al menos 4 horas","Separar del magnesio y zinc al menos 2 horas"],
    color:"#C0392B"
  },
  {
    nombre:"L-Glutamina",emoji:"🌱",
    cuando:"Mañana en ayunas o antes de dormir",
    dosis:"5–10 g/día",
    notas:"Repara el intestino permeable (leaky gut), clave en autoinmunidad. Disolver en agua fría — el calor la destruye. Ciclos de 1–3 meses.",
    interacciones:["Evitar en personas con epilepsia o sensibilidad al glutamato","No mezclar con bebidas calientes"],
    color:"#3A7D55"
  },
  {
    nombre:"Vitamina B12",emoji:"💊",
    cuando:"Mañana con desayuno",
    dosis:"500–1.000 mcg/día (metilcobalamina)",
    notas:"Muy deficiente en Hashimoto. Preferir metilcobalamina (no cianocobalamina). Sublingual para mejor absorción. Esencial para energía y sistema nervioso.",
    interacciones:["Separar de la levotiroxina al menos 4 horas","Potencia el efecto del folato"],
    color:"#8E44AD"
  },
  {
    nombre:"Vitamina C",emoji:"🍊",
    cuando:"Con cada comida o en ayunas",
    dosis:"500–1.000 mg/día",
    notas:"Antioxidante, mejora absorción del hierro y apoya las glándulas suprarrenales. Dividir en 2 tomas si se usan dosis altas para mejor tolerancia.",
    interacciones:["Potencia absorción del hierro — tomar juntos","Separar del cobre en dosis altas"],
    color:"#E67E22"
  },
  {
    nombre:"Probióticos",emoji:"🦠",
    cuando:"Mañana en ayunas o noche antes de dormir",
    dosis:"10–50 billones UFC/día",
    notas:"Fundamental para el eje intestino-tiroides. Rotar cepas cada 2–3 meses. Refrigerar. Buscar cepas Lactobacillus y Bifidobacterium.",
    interacciones:["Separar de antibióticos al menos 2 horas","No tomar al mismo tiempo que el hierro"],
    color:"#16A085"
  },
  {
    nombre:"Cúrcuma + Pimienta negra",emoji:"🟡",
    cuando:"Almuerzo o cena (con comida y grasa)",
    dosis:"500–1.000 mg curcumina/día",
    notas:"Potente antiinflamatorio. La pimienta negra (piperina) aumenta la absorción de curcumina hasta un 2.000%. Siempre tomar con grasa y pimienta.",
    interacciones:["Puede potenciar anticoagulantes","Separar de medicamentos que procesa el hígado"],
    color:"#F39C12"
  },
  {
    nombre:"Ashwagandha",emoji:"🌿",
    cuando:"Noche antes de dormir",
    dosis:"300–600 mg/día (extracto KSM-66)",
    notas:"Adaptógeno que regula el cortisol y apoya la tiroides. Solo recomendado a partir de la fase de Reintroducción — no usar en Eliminación. Iniciar con dosis baja. Ciclos de 2–3 meses con descanso de 1 mes. Consultar si hay hipertiroidismo.",
    interacciones:["Precaución con medicamentos para tiroides — puede potenciar su efecto","Evitar en embarazo","No usar en fase de Eliminación"],
    color:"#27AE60"
  },
];

function SuplementosSection(){
  const [abierto, setAbierto] = useState(false);
  const [misSuplementos, setMisSuplementos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [detalle, setDetalle] = useState(null);

  useEffect(()=>{
    try{const s=JSON.parse(localStorage.getItem("suplementos:lista")||"[]");setMisSuplementos(s);}catch{}
  },[]);

  function toggleSuplemento(nombre){
    const nuevo=misSuplementos.includes(nombre)
      ?misSuplementos.filter(s=>s!==nombre)
      :[...misSuplementos,nombre];
    setMisSuplementos(nuevo);
    localStorage.setItem("suplementos:lista",JSON.stringify(nuevo));
  }

  const filtrados=SUPLEMENTOS_DATA.filter(s=>
    busqueda.length<2||s.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  const misData=SUPLEMENTOS_DATA.filter(s=>misSuplementos.includes(s.nombre));

  return(
    <div style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,marginBottom:16,overflow:"hidden"}}>
      {/* HEADER ACORDEÓN */}
      <button onClick={()=>setAbierto(!abierto)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px",background:"none",border:"none",cursor:"pointer",fontFamily:FB}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>💊</span>
          <div style={{textAlign:"left"}}>
            <p style={{fontSize:13,fontWeight:700,color:T.brown}}>Mis Suplementos</p>
            <p style={{fontSize:11,color:T.stone}}>{misSuplementos.length>0?`${misSuplementos.length} suplemento${misSuplementos.length>1?"s":""} activo${misSuplementos.length>1?"s":""}` :"Agregar y ver cuándo tomarlos"}</p>
          </div>
        </div>
        <span style={{fontSize:12,color:T.stone}}>{abierto?"▲":"▼"}</span>
      </button>

      {abierto&&(
        <div style={{padding:"0 16px 16px"}}>
          {/* MIS SUPLEMENTOS ACTIVOS */}
          {misData.length>0&&(
            <div style={{marginBottom:16}}>
              <p style={{fontSize:10,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>📋 Mi protocolo diario</p>
              {/* Organizar por momento del día */}
              {[
                ["🌅 Mañana en ayunas", misData.filter(s=>s.cuando.toLowerCase().includes("ayunas"))],
                ["🍳 Con desayuno", misData.filter(s=>s.cuando.toLowerCase().includes("desayuno"))],
                ["☀️ Con almuerzo/cena", misData.filter(s=>s.cuando.toLowerCase().includes("almuerzo")||s.cuando.toLowerCase().includes("cena"))],
                ["🌙 Noche", misData.filter(s=>s.cuando.toLowerCase().includes("noche"))],
              ].filter(([_,items])=>items.length>0).map(([momento,items])=>(
                <div key={momento} style={{marginBottom:12}}>
                  <p style={{fontSize:11,fontWeight:700,color:T.brownMid,marginBottom:6}}>{momento}</p>
                  {items.map(s=>(
                    <button key={s.nombre} onClick={()=>setDetalle(detalle?.nombre===s.nombre?null:s)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderRadius:14,border:`1.5px solid ${s.color}33`,background:`${s.color}11`,cursor:"pointer",marginBottom:6,fontFamily:FB}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:16}}>{s.emoji}</span>
                        <div style={{textAlign:"left"}}>
                          <p style={{fontSize:13,fontWeight:700,color:T.brown}}>{s.nombre}</p>
                          <p style={{fontSize:11,color:T.stone}}>{s.dosis}</p>
                        </div>
                      </div>
                      <span style={{fontSize:11,color:s.color,fontWeight:700}}>{detalle?.nombre===s.nombre?"▲":"▼"}</span>
                    </button>
                  ))}
                  {/* DETALLE EXPANDIDO */}
                  {items.filter(s=>detalle?.nombre===s.nombre).map(s=>(
                    <div key={s.nombre+"det"} style={{borderRadius:14,background:T.cream,border:`1px solid ${s.color}33`,padding:"14px",marginBottom:8}}>
                      <p style={{fontSize:12,color:T.brown,lineHeight:1.7,marginBottom:10}}>{s.notas}</p>
                      {s.interacciones.length>0&&(
                        <div style={{borderRadius:10,background:"#FFF8E7",border:"1px solid #C8932A33",padding:"10px 12px"}}>
                          <p style={{fontSize:11,fontWeight:700,color:"#C8932A",marginBottom:6}}>⚠️ Interacciones importantes:</p>
                          {s.interacciones.map((int,i)=>(
                            <p key={i} style={{fontSize:11,color:T.brown,marginBottom:4,lineHeight:1.5}}>• {int}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* BUSCADOR */}
          <p style={{fontSize:10,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>Agregar suplemento</p>
          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar suplemento..." style={{width:"100%",padding:"11px 14px",borderRadius:14,border:`1.5px solid ${T.stoneMid}`,background:T.cream,fontSize:13,color:T.ink,outline:"none",fontFamily:FB,boxSizing:"border-box",marginBottom:10}}/>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {filtrados.map(s=>{
              const activo=misSuplementos.includes(s.nombre);
              return(
                <button key={s.nombre} onClick={()=>toggleSuplemento(s.nombre)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px",borderRadius:14,border:`1.5px solid ${activo?s.color:T.stonePale}`,background:activo?`${s.color}11`:T.warmWhite,cursor:"pointer",fontFamily:FB}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:16}}>{s.emoji}</span>
                    <div style={{textAlign:"left"}}>
                      <p style={{fontSize:13,fontWeight:activo?700:400,color:activo?s.color:T.brown}}>{s.nombre}</p>
                      <p style={{fontSize:10,color:T.stone}}>{s.cuando}</p>
                    </div>
                  </div>
                  <span style={{fontSize:16,color:activo?s.color:T.stoneMid}}>{activo?"✓":"+"}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {detalle&&!abierto&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(44,32,24,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setDetalle(null)}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:480,borderRadius:"28px 28px 0 0",background:T.cream,padding:"24px 20px 48px"}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:16}}><div style={{width:40,height:4,borderRadius:2,background:T.stoneMid}}/></div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <span style={{fontSize:28}}>{detalle.emoji}</span>
              <div><h3 style={{fontFamily:FD,fontSize:20,color:T.brown,fontWeight:700}}>{detalle.nombre}</h3><p style={{fontSize:12,color:detalle.color,fontWeight:700}}>{detalle.cuando}</p></div>
            </div>
            <p style={{fontSize:12,fontWeight:700,color:T.stone,marginBottom:4}}>Dosis sugerida</p>
            <p style={{fontSize:13,color:T.brown,marginBottom:12}}>{detalle.dosis}</p>
            <p style={{fontSize:13,color:T.brown,lineHeight:1.7,marginBottom:12}}>{detalle.notas}</p>
            {detalle.interacciones.length>0&&<div style={{borderRadius:14,background:"#FFF8E7",border:"1px solid #C8932A44",padding:"14px"}}>
              <p style={{fontSize:11,fontWeight:700,color:"#C8932A",marginBottom:8}}>⚠️ Interacciones importantes</p>
              {detalle.interacciones.map((int,i)=><p key={i} style={{fontSize:12,color:T.brown,marginBottom:6,lineHeight:1.5}}>• {int}</p>)}
            </div>}
          </div>
        </div>
      )}
    </div>
  );
}
const SINTOMAS_GRUPOS = [
  {
    grupo: "Tiroides & Hashimoto",
    emoji: "🦋",
    color: T.terra,
    items: ["Fatiga extrema","Niebla mental","Caída de cabello","Sensación de frío","Aumento de peso","Estreñimiento","Piel seca","Voz ronca","Bradicardia","Depresión"]
  },
  {
    grupo: "Autoinmunidad general",
    emoji: "🛡️",
    color: T.sage,
    items: ["Dolor articular","Inflamación articular","Dolor muscular","Rigidez matutina","Erupciones cutáneas","Ojos secos","Boca seca","Sensibilidad al sol","Ganglios inflamados","Fiebre baja recurrente"]
  },
  {
    grupo: "Digestión & Intestino",
    emoji: "🌱",
    color: T.ok,
    items: ["Hinchazón abdominal","Gases","Diarrea","Reflujo","Náuseas","Intolerancia alimentaria","Dolor abdominal","Intestino irritable"]
  },
  {
    grupo: "Energía & Sueño",
    emoji: "⚡",
    color: T.brownMid,
    items: ["Insomnio","Sueño no reparador","Somnolencia diurna","Fatiga post-esfuerzo","Agotamiento mental","Falta de motivación"]
  },
  {
    grupo: "Emocional & Cognitivo",
    emoji: "🧠",
    color: "#7B68EE",
    items: ["Ansiedad","Irritabilidad","Pérdida de memoria","Dificultad de concentración","Cambios de humor","Sensación de despersonalización"]
  }
];

const TODOS_SINTOMAS = SINTOMAS_GRUPOS.flatMap(g=>g.items);

// ── SÍNTOMAS TAB ──────────────────────────────────────────────────────────────
function SintomasTab({isPremium, onUpgrade}){
  const [registros, setRegistros] = useState({});
  const [hoy, setHoy] = useState(null);
  const [selSintomas, setSelSintomas] = useState([]);
  const [energia, setEnergia] = useState(5);
  const [animo, setAnimo] = useState(5);
  const [digestion, setDigestion] = useState(5);
  const [notas, setNotas] = useState("");
  const [vista, setVista] = useState("registro"); // registro | historial
  const [guardado, setGuardado] = useState(false);
  const [grupoAbierto, setGrupoAbierto] = useState(null);

  const fechaHoy = new Date().toISOString().split("T")[0];

  useEffect(()=>{
    (async()=>{
      try{
        const data = await dbGet("sintomas:registros");
        if(data){
          setRegistros(data);
          if(data[fechaHoy]){
            const r = data[fechaHoy];
            setHoy(r);
            setSelSintomas(r.sintomas||[]);
            setEnergia(r.energia||5);
            setAnimo(r.animo||5);
            setDigestion(r.digestion||5);
            setNotas(r.notas||"");
          }
        }
      }catch{}
    })();
  },[]);

  async function guardar(){
    const registro = {
      fecha: fechaHoy,
      sintomas: selSintomas,
      energia, animo, digestion,
      notas,
      timestamp: Date.now()
    };
    const nuevo = {...registros, [fechaHoy]: registro};
    setRegistros(nuevo);
    setHoy(registro);
    await dbSet("sintomas:registros", nuevo);
    setGuardado(true);
    setTimeout(()=>setGuardado(false), 2000);
  }

  function toggleSintoma(s){
    setSelSintomas(prev=>prev.includes(s)?prev.filter(x=>x!==s):[...prev,s]);
  }

  // Últimos 7 días para el gráfico
  const ultimos7 = Array.from({length:7},(_,i)=>{
    const d = new Date();
    d.setDate(d.getDate()-6+i);
    const key = d.toISOString().split("T")[0];
    const dia = d.toLocaleDateString("es-CL",{weekday:"short"}).slice(0,3);
    return {key, dia, r: registros[key]||null};
  });

  const ScaleBtn = ({val, setVal, label, color})=>(
    <div style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:12,fontWeight:700,color:T.brown,fontFamily:FB}}>{label}</span>
        <span style={{fontSize:16,fontWeight:800,color:color,fontFamily:FB}}>{val}/10</span>
      </div>
      <div style={{display:"flex",gap:4}}>
        {Array.from({length:10},(_,i)=>i+1).map(n=>(
          <button key={n} onClick={()=>setVal(n)} style={{flex:1,height:32,borderRadius:8,border:"none",background:n<=val?color:T.stonePale,cursor:"pointer",transition:"all .15s"}}/>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
        <span style={{fontSize:10,color:T.stone}}>Muy bajo</span>
        <span style={{fontSize:10,color:T.stone}}>Excelente</span>
      </div>
    </div>
  );

  if(!isPremium) return(
    <div style={{padding:"56px 20px 96px",fontFamily:FB}}>
      <h2 style={{fontFamily:FD,fontSize:26,color:T.brown,fontWeight:700,marginBottom:4}}>Seguimiento de Síntomas</h2>
      <p style={{fontSize:12,color:T.stone,marginBottom:24}}>Registra y visualiza tu evolución semana a semana</p>
      <PremiumLock onUpgrade={onUpgrade}/>
    </div>
  );

  return(
    <div style={{padding:"56px 20px 96px",fontFamily:FB}}>
      <h2 style={{fontFamily:FD,fontSize:26,color:T.brown,fontWeight:700,marginBottom:4}}>Seguimiento de Síntomas</h2>
      <p style={{fontSize:12,color:T.stone,marginBottom:16}}>Registra cómo te sientes hoy</p>

      {/* TABS */}
      <div style={{display:"flex",background:T.stonePale,borderRadius:16,padding:4,marginBottom:20}}>
        {[["registro","📝 Hoy"],["historial","📊 Mi semana"]].map(([id,label])=>(
          <button key={id} onClick={()=>setVista(id)} style={{flex:1,padding:"10px",borderRadius:12,border:"none",background:vista===id?T.warmWhite:"transparent",color:vista===id?T.brown:T.stone,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FB}}>{label}</button>
        ))}
      </div>

      {vista==="registro"&&(
        <>
          {/* ESCALAS */}
          <div style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"20px",marginBottom:16}}>
            <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:16}}>¿Cómo te sientes hoy?</p>
            <ScaleBtn val={energia} setVal={setEnergia} label="⚡ Energía" color={T.sage}/>
            <ScaleBtn val={animo} setVal={setAnimo} label="😊 Ánimo" color={T.terra}/>
            <ScaleBtn val={digestion} setVal={setDigestion} label="🌱 Digestión" color={T.ok}/>
          </div>

          {/* SÍNTOMAS */}
          <div style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"20px",marginBottom:16}}>
            <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>Síntomas de hoy</p>
            <p style={{fontSize:11,color:T.stone,marginBottom:14}}>{selSintomas.length} seleccionados</p>
            {SINTOMAS_GRUPOS.map(g=>(
              <div key={g.grupo} style={{marginBottom:10}}>
                <button onClick={()=>setGrupoAbierto(grupoAbierto===g.grupo?null:g.grupo)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderRadius:14,border:`1.5px solid ${grupoAbierto===g.grupo?g.color:T.stonePale}`,background:grupoAbierto===g.grupo?g.color+"11":T.cream,cursor:"pointer",fontFamily:FB}}>
                  <span style={{fontSize:13,fontWeight:700,color:g.color}}>{g.emoji} {g.grupo}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    {g.items.filter(s=>selSintomas.includes(s)).length>0&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:g.color,color:"white",fontWeight:700}}>{g.items.filter(s=>selSintomas.includes(s)).length}</span>}
                    <span style={{fontSize:12,color:T.stone}}>{grupoAbierto===g.grupo?"▲":"▼"}</span>
                  </div>
                </button>
                {grupoAbierto===g.grupo&&(
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,padding:"12px 4px 4px"}}>
                    {g.items.map(s=>{
                      const sel=selSintomas.includes(s);
                      return(
                        <button key={s} onClick={()=>toggleSintoma(s)} style={{padding:"7px 12px",borderRadius:20,border:`1.5px solid ${sel?g.color:T.stoneMid}`,background:sel?g.color:T.warmWhite,color:sel?"white":T.brown,fontSize:12,fontWeight:sel?700:400,cursor:"pointer",fontFamily:FB,transition:"all .15s"}}>
                          {sel?"✓ ":""}{s}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* NOTAS */}
          <div style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"20px",marginBottom:16}}>
            <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Notas del día (opcional)</p>
            <textarea value={notas} onChange={e=>setNotas(e.target.value)} placeholder="¿Algo especial hoy? ¿Comiste algo diferente? ¿Dormiste mal?..." style={{width:"100%",padding:"12px",borderRadius:14,border:`1.5px solid ${T.stoneMid}`,background:T.cream,fontSize:13,color:T.ink,outline:"none",fontFamily:FB,resize:"none",minHeight:80,boxSizing:"border-box",lineHeight:1.6}}/>
          </div>

          <button onClick={guardar} style={{width:"100%",padding:"15px",borderRadius:20,border:"none",background:guardado?T.ok:`linear-gradient(135deg,${T.sage},${T.sageMid})`,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FB,boxShadow:`0 8px 24px ${T.sage}44`,transition:"all .3s"}}>
            {guardado?"✓ Guardado":"Guardar registro de hoy"}
          </button>
        </>
      )}

      {vista==="historial"&&(
        <>
          {/* GRÁFICO SEMANAL */}
          <div style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"20px",marginBottom:16}}>
            <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:16}}>Últimos 7 días</p>
            <div style={{display:"flex",gap:6,alignItems:"flex-end",height:120,marginBottom:12}}>
              {ultimos7.map(({key,dia,r})=>{
                const promedio=r?Math.round((r.energia+r.animo+r.digestion)/3):0;
                const alto=promedio>0?(promedio/10)*100:0;
                const esHoy=key===fechaHoy;
                return(
                  <div key={key} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    {r&&<span style={{fontSize:9,color:T.stone,fontWeight:700}}>{promedio}</span>}
                    <div style={{width:"100%",borderRadius:8,background:r?(esHoy?T.terra:T.sage):T.stonePale,height:`${Math.max(alto,r?8:4)}%`,minHeight:r?8:4,transition:"height .3s"}}/>
                    <span style={{fontSize:10,color:esHoy?T.terra:T.stone,fontWeight:esHoy?700:400,fontFamily:FB}}>{dia}</span>
                    {r&&<span style={{fontSize:8,color:T.stone}}>{r.sintomas?.length||0}s</span>}
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",gap:12,justifyContent:"center"}}>
              {[["Energía",T.sage],[" Ánimo",T.terra],["Digestión",T.ok]].map(([l,c])=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:"50%",background:c}}/><span style={{fontSize:10,color:T.stone}}>{l}</span></div>
              ))}
            </div>
          </div>

          {/* HISTORIAL DE REGISTROS */}
          {ultimos7.filter(d=>d.r).length===0?(
            <div style={{textAlign:"center",padding:"40px 16px",color:T.stone}}>
              <p style={{fontSize:32,marginBottom:8}}>📋</p>
              <p style={{fontSize:13}}>Aún no hay registros esta semana. ¡Empieza hoy!</p>
            </div>
          ):ultimos7.filter(d=>d.r).reverse().map(({key,dia,r})=>(
            <div key={key} style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"16px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <p style={{fontSize:13,fontWeight:700,color:T.brown}}>{key===fechaHoy?"Hoy":new Date(key+"T12:00:00").toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"short"})}</p>
                <span style={{fontSize:11,padding:"4px 10px",borderRadius:10,background:T.sagePale,color:T.sage,fontWeight:700}}>Prom: {Math.round((r.energia+r.animo+r.digestion)/3)}/10</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                {[["⚡",r.energia,T.sage],["😊",r.animo,T.terra],["🌱",r.digestion,T.ok]].map(([em,val,c])=>(
                  <div key={em} style={{textAlign:"center",padding:"8px",borderRadius:12,background:c+"11"}}>
                    <p style={{fontSize:16}}>{em}</p>
                    <p style={{fontSize:16,fontWeight:800,color:c,fontFamily:FD}}>{val}</p>
                  </div>
                ))}
              </div>
              {r.sintomas?.length>0&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:r.notas?8:0}}>
                  {r.sintomas.slice(0,5).map(s=><span key={s} style={{fontSize:10,padding:"3px 8px",borderRadius:8,background:T.terraPale,color:T.terra,fontWeight:600}}>{s}</span>)}
                  {r.sintomas.length>5&&<span style={{fontSize:10,padding:"3px 8px",borderRadius:8,background:T.stonePale,color:T.stone}}>+{r.sintomas.length-5} más</span>}
                </div>
              )}
              {r.notas&&<p style={{fontSize:11,color:T.stone,fontStyle:"italic",lineHeight:1.5}}>"{r.notas}"</p>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── MACROS DATA ───────────────────────────────────────────────────────────────
const ALIMENTOS_MACROS = [
  // ── PROTEÍNAS ─────────────────────────────────────────────────────────────
  {nombre:"Pollo a la plancha (100g)",kcal:165,prot:31,carbs:0,grasas:3.6,fibra:0,cat:"proteina"},
  {nombre:"Pechuga de pollo cocida (100g)",kcal:165,prot:31,carbs:0,grasas:3.6,fibra:0,cat:"proteina"},
  {nombre:"Muslo de pollo sin piel (100g)",kcal:177,prot:24,carbs:0,grasas:8.2,fibra:0,cat:"proteina"},
  {nombre:"Salmón a la plancha (100g)",kcal:208,prot:20,carbs:0,grasas:13,fibra:0,cat:"proteina"},
  {nombre:"Salmón al horno (100g)",kcal:208,prot:20,carbs:0,grasas:13,fibra:0,cat:"proteina"},
  {nombre:"Atún en agua (100g)",kcal:116,prot:26,carbs:0,grasas:1,fibra:0,cat:"proteina"},
  {nombre:"Atún en aceite de oliva (100g)",kcal:198,prot:29,carbs:0,grasas:9,fibra:0,cat:"proteina"},
  {nombre:"Sardinas en aceite (100g)",kcal:208,prot:25,carbs:0,grasas:12,fibra:0,cat:"proteina"},
  {nombre:"Carne de res magra (100g)",kcal:218,prot:26,carbs:0,grasas:12,fibra:0,cat:"proteina"},
  {nombre:"Pavo molido (100g)",kcal:189,prot:29,carbs:0,grasas:7,fibra:0,cat:"proteina"},
  {nombre:"Cordero (100g)",kcal:294,prot:25,carbs:0,grasas:21,fibra:0,cat:"proteina"},
  {nombre:"Cerdo magro (100g)",kcal:242,prot:27,carbs:0,grasas:14,fibra:0,cat:"proteina"},
  {nombre:"Jamón serrano (100g)",kcal:241,prot:31,carbs:0,grasas:13,fibra:0,cat:"proteina"},
  {nombre:"Huevo entero (1 unidad)",kcal:72,prot:6,carbs:0.4,grasas:5,fibra:0,cat:"proteina"},
  {nombre:"Clara de huevo (1 unidad)",kcal:17,prot:3.6,carbs:0.2,grasas:0,fibra:0,cat:"proteina"},
  {nombre:"Camarones cocidos (100g)",kcal:99,prot:24,carbs:0,grasas:0.3,fibra:0,cat:"proteina"},
  {nombre:"Pulpo cocido (100g)",kcal:82,prot:15,carbs:2.2,grasas:1,fibra:0,cat:"proteina"},
  // ── MARISCOS AIP ──────────────────────────────────────────────────────────
  {nombre:"Langostinos cocidos (100g)",kcal:99,prot:24,carbs:0.2,grasas:0.3,fibra:0,cat:"proteina"},
  {nombre:"Mejillones cocidos (100g)",kcal:172,prot:24,carbs:7.4,grasas:4.5,fibra:0,cat:"proteina"},
  {nombre:"Almejas cocidas (100g)",kcal:148,prot:25.6,carbs:5.1,grasas:1.9,fibra:0,cat:"proteina"},
  {nombre:"Ostras (100g)",kcal:68,prot:7,carbs:3.9,grasas:2.5,fibra:0,cat:"proteina"},
  {nombre:"Langosta cocida (100g)",kcal:89,prot:19,carbs:0.5,grasas:0.9,fibra:0,cat:"proteina"},
  {nombre:"Cangrejo/Jaiba cocido (100g)",kcal:97,prot:20,carbs:0,grasas:1.5,fibra:0,cat:"proteina"},
  {nombre:"Ostiones/Vieiras (100g)",kcal:88,prot:16.8,carbs:2.4,grasas:0.8,fibra:0,cat:"proteina"},
  {nombre:"Calamar cocido (100g)",kcal:92,prot:15.6,carbs:3.1,grasas:1.4,fibra:0,cat:"proteina"},
  {nombre:"Merluza cocida (100g)",kcal:90,prot:18.6,carbs:0,grasas:1.3,fibra:0,cat:"proteina"},
  {nombre:"Congrio cocido (100g)",kcal:105,prot:19,carbs:0,grasas:2.5,fibra:0,cat:"proteina"},
  {nombre:"Corvina/Reineta cocida (100g)",kcal:97,prot:20,carbs:0,grasas:1.7,fibra:0,cat:"proteina"},
  {nombre:"Anchoas (5 filetes)",kcal:42,prot:5.8,carbs:0,grasas:1.9,fibra:0,cat:"proteina"},
  // ── CARBOHIDRATOS AIP ─────────────────────────────────────────────────────
  {nombre:"Camote/Boniato cocido (100g)",kcal:86,prot:1.6,carbs:20,grasas:0.1,fibra:3,cat:"carbs"},
  {nombre:"Yuca cocida (100g)",kcal:112,prot:0.9,carbs:27,grasas:0.3,fibra:1,cat:"carbs"},
  {nombre:"Plátano verde cocido (100g)",kcal:89,prot:1.1,carbs:23,grasas:0.3,fibra:2,cat:"carbs"},
  {nombre:"Plátano verde (1 unidad med.)",kcal:89,prot:1.1,carbs:23,grasas:0.3,fibra:2,cat:"carbs"},
  {nombre:"Pan de yuca (1 unidad)",kcal:120,prot:1.5,carbs:22,grasas:3,fibra:0.5,cat:"carbs"},
  {nombre:"Tortilla de plátano verde (1u)",kcal:95,prot:1,carbs:22,grasas:1.5,fibra:1.5,cat:"carbs"},
  {nombre:"Sopaipilla de yuca (1 unidad)",kcal:110,prot:1.2,carbs:20,grasas:3,fibra:0.5,cat:"carbs"},
  {nombre:"Nabo cocido (100g)",kcal:28,prot:0.9,carbs:6.4,grasas:0.1,fibra:1.8,cat:"carbs"},
  {nombre:"Remolacha cocida (100g)",kcal:44,prot:1.7,carbs:10,grasas:0.2,fibra:2,cat:"carbs"},
  {nombre:"Betarraga cocida (100g)",kcal:44,prot:1.7,carbs:10,grasas:0.2,fibra:2,cat:"carbs"},
  {nombre:"Banana/Plátano maduro (100g)",kcal:89,prot:1.1,carbs:23,grasas:0.3,fibra:2.6,cat:"carbs"},
  // ── VERDURAS ──────────────────────────────────────────────────────────────
  {nombre:"Espinaca (100g)",kcal:23,prot:2.9,carbs:3.6,grasas:0.4,fibra:2.2,cat:"verdura"},
  {nombre:"Rúcula/Rúgula (100g)",kcal:25,prot:2.6,carbs:3.7,grasas:0.7,fibra:1.6,cat:"verdura"},
  {nombre:"Kale/Col rizada (100g)",kcal:49,prot:4.3,carbs:8.8,grasas:0.9,fibra:3.6,cat:"verdura"},
  {nombre:"Lechuga (100g)",kcal:15,prot:1.4,carbs:2.9,grasas:0.2,fibra:1.3,cat:"verdura"},
  {nombre:"Brócoli (100g)",kcal:34,prot:2.8,carbs:7,grasas:0.4,fibra:2.6,cat:"verdura"},
  {nombre:"Coliflor (100g)",kcal:25,prot:1.9,carbs:5,grasas:0.3,fibra:2,cat:"verdura"},
  {nombre:"Repollo/Col (100g)",kcal:25,prot:1.3,carbs:5.8,grasas:0.1,fibra:2.5,cat:"verdura"},
  {nombre:"Repollo morado (100g)",kcal:31,prot:1.4,carbs:7,grasas:0.2,fibra:2.1,cat:"verdura"},
  {nombre:"Zucchini/Zapallo italiano (100g)",kcal:17,prot:1.2,carbs:3.1,grasas:0.3,fibra:1,cat:"verdura"},
  {nombre:"Champiñones (100g)",kcal:22,prot:3.1,carbs:3.3,grasas:0.3,fibra:1,cat:"verdura"},
  {nombre:"Zanahoria (100g)",kcal:41,prot:0.9,carbs:10,grasas:0.2,fibra:2.8,cat:"verdura"},
  {nombre:"Cebolla (100g)",kcal:40,prot:1.1,carbs:9.3,grasas:0.1,fibra:1.7,cat:"verdura"},
  {nombre:"Ajo (1 diente)",kcal:4,prot:0.2,carbs:1,grasas:0,fibra:0.1,cat:"verdura"},
  {nombre:"Apio (100g)",kcal:16,prot:0.7,carbs:3,grasas:0.2,fibra:1.6,cat:"verdura"},
  {nombre:"Pepino (100g)",kcal:15,prot:0.6,carbs:3.6,grasas:0.1,fibra:0.5,cat:"verdura"},
  {nombre:"Puerro/Ajo porro (100g)",kcal:61,prot:1.5,carbs:14,grasas:0.3,fibra:1.8,cat:"verdura"},
  {nombre:"Alcachofa cocida (1 mediana)",kcal:60,prot:4.2,carbs:13,grasas:0.4,fibra:6.9,cat:"verdura"},
  {nombre:"Espárragos (100g)",kcal:20,prot:2.2,carbs:3.9,grasas:0.1,fibra:2.1,cat:"verdura"},
  {nombre:"Acelga (100g)",kcal:19,prot:1.8,carbs:3.7,grasas:0.2,fibra:1.6,cat:"verdura"},
  {nombre:"Coles de Bruselas (100g)",kcal:43,prot:3.4,carbs:9,grasas:0.3,fibra:3.8,cat:"verdura"},
  {nombre:"Rábanos (100g)",kcal:16,prot:0.7,carbs:3.4,grasas:0.1,fibra:1.6,cat:"verdura"},
  {nombre:"Hinojo (100g)",kcal:31,prot:1.2,carbs:7.3,grasas:0.2,fibra:3.1,cat:"verdura"},
  {nombre:"Berro (100g)",kcal:11,prot:2.3,carbs:1.3,grasas:0.1,fibra:0.5,cat:"verdura"},
  {nombre:"Endivia/Escarola (100g)",kcal:17,prot:1.3,carbs:3.4,grasas:0.2,fibra:3.1,cat:"verdura"},
  {nombre:"Zapallo/Calabaza (100g)",kcal:26,prot:1,carbs:6.5,grasas:0.1,fibra:0.5,cat:"verdura"},
  {nombre:"Palmitos (100g)",kcal:28,prot:2.5,carbs:4.5,grasas:0.5,fibra:2,cat:"verdura"},
  {nombre:"Jengibre fresco (10g)",kcal:8,prot:0.2,carbs:1.8,grasas:0.1,fibra:0.2,cat:"verdura"},
  {nombre:"Cúrcuma fresca (10g)",kcal:9,prot:0.2,carbs:2,grasas:0.1,fibra:0.2,cat:"verdura"},
  // ── FRUTAS ────────────────────────────────────────────────────────────────
  {nombre:"Arándanos (100g)",kcal:57,prot:0.7,carbs:14,grasas:0.3,fibra:2.4,cat:"fruta"},
  {nombre:"Frambuesas (100g)",kcal:52,prot:1.2,carbs:12,grasas:0.7,fibra:6.5,cat:"fruta"},
  {nombre:"Frutillas/Fresas (100g)",kcal:32,prot:0.7,carbs:7.7,grasas:0.3,fibra:2,cat:"fruta"},
  {nombre:"Moras (100g)",kcal:43,prot:1.4,carbs:10,grasas:0.5,fibra:5.3,cat:"fruta"},
  {nombre:"Manzana (1 mediana)",kcal:95,prot:0.5,carbs:25,grasas:0.3,fibra:4.4,cat:"fruta"},
  {nombre:"Pera (1 mediana)",kcal:101,prot:0.6,carbs:27,grasas:0.2,fibra:5.5,cat:"fruta"},
  {nombre:"Durazno/Melocotón (1 mediano)",kcal:58,prot:1.4,carbs:14,grasas:0.4,fibra:2.3,cat:"fruta"},
  {nombre:"Cerezas (100g)",kcal:63,prot:1.1,carbs:16,grasas:0.2,fibra:2.1,cat:"fruta"},
  {nombre:"Kiwi (1 unidad mediana)",kcal:42,prot:0.8,carbs:10,grasas:0.4,fibra:2.1,cat:"fruta"},
  {nombre:"Coco rallado (30g)",kcal:99,prot:0.9,carbs:4.3,grasas:9.4,fibra:2.6,cat:"fruta"},
  {nombre:"Coco fresco (100g)",kcal:354,prot:3.3,carbs:15,grasas:33,fibra:9,cat:"fruta"},
  {nombre:"Papaya (100g)",kcal:43,prot:0.5,carbs:11,grasas:0.3,fibra:1.7,cat:"fruta"},
  {nombre:"Mango (100g)",kcal:60,prot:0.8,carbs:15,grasas:0.4,fibra:1.6,cat:"fruta"},
  {nombre:"Piña/Ananá (100g)",kcal:50,prot:0.5,carbs:13,grasas:0.1,fibra:1.4,cat:"fruta"},
  {nombre:"Maracuyá/Parchita (100g)",kcal:97,prot:2.2,carbs:23,grasas:0.7,fibra:10.4,cat:"fruta"},
  {nombre:"Granada (100g)",kcal:83,prot:1.7,carbs:19,grasas:1.2,fibra:4,cat:"fruta"},
  {nombre:"Ciruela (1 mediana)",kcal:30,prot:0.5,carbs:7.5,grasas:0.2,fibra:0.9,cat:"fruta"},
  {nombre:"Damasco/Albaricoque (100g)",kcal:48,prot:1.4,carbs:11,grasas:0.4,fibra:2,cat:"fruta"},
  {nombre:"Higos frescos (2 unidades)",kcal:74,prot:0.8,carbs:19,grasas:0.3,fibra:2.9,cat:"fruta"},
  {nombre:"Sandía (100g)",kcal:30,prot:0.6,carbs:8,grasas:0.2,fibra:0.4,cat:"fruta"},
  {nombre:"Melón (100g)",kcal:34,prot:0.8,carbs:8,grasas:0.2,fibra:0.9,cat:"fruta"},
  {nombre:"Guayaba (100g)",kcal:68,prot:2.6,carbs:14,grasas:1,fibra:5.4,cat:"fruta"},
  {nombre:"Naranja (1 mediana)",kcal:62,prot:1.2,carbs:15.4,grasas:0.2,fibra:3.1,cat:"fruta"},
  {nombre:"Mandarina (1 unidad)",kcal:47,prot:0.7,carbs:12,grasas:0.3,fibra:1.6,cat:"fruta"},
  {nombre:"Pomelo/Toronja (½ unidad)",kcal:52,prot:1,carbs:13,grasas:0.2,fibra:2,cat:"fruta"},
  {nombre:"Uvas (100g)",kcal:69,prot:0.7,carbs:18,grasas:0.2,fibra:0.9,cat:"fruta"},
  {nombre:"Chirimoya (100g)",kcal:75,prot:1.6,carbs:18,grasas:0.3,fibra:3,cat:"fruta"},
  // ── GRASAS SALUDABLES ─────────────────────────────────────────────────────
  {nombre:"Palta/Aguacate (100g)",kcal:160,prot:2,carbs:9,grasas:15,fibra:7,cat:"grasa"},
  {nombre:"Palta/Aguacate (½ unidad)",kcal:120,prot:1.5,carbs:6.7,grasas:11,fibra:5.2,cat:"grasa"},
  {nombre:"Aceite de oliva (1 cda)",kcal:119,prot:0,carbs:0,grasas:13.5,fibra:0,cat:"grasa"},
  {nombre:"Aceite de coco (1 cda)",kcal:117,prot:0,carbs:0,grasas:14,fibra:0,cat:"grasa"},
  {nombre:"Aceite de aguacate (1 cda)",kcal:124,prot:0,carbs:0,grasas:14,fibra:0,cat:"grasa"},
  {nombre:"Leche de coco (100ml)",kcal:230,prot:2.3,carbs:5.5,grasas:23,fibra:0,cat:"grasa"},
  {nombre:"Crema de coco (2 cdas)",kcal:100,prot:1,carbs:2,grasas:10,fibra:0,cat:"grasa"},
  {nombre:"Mantequilla de coco (1 cda)",kcal:105,prot:1,carbs:4,grasas:10,fibra:2,cat:"grasa"},
  {nombre:"Aceitunas (10 unidades)",kcal:59,prot:0.4,carbs:1.6,grasas:6,fibra:1.5,cat:"grasa"},
  // ── PREPARACIONES DEL MÉTODO ERI ──────────────────────────────────────────
  {nombre:"Caldo de huesos (1 taza)",kcal:40,prot:6,carbs:0,grasas:1,fibra:0,cat:"proteina"},
  {nombre:"Mousse de coco (1 porción)",kcal:180,prot:1.5,carbs:8,grasas:16,fibra:2,cat:"grasa"},
  {nombre:"Pancake de camote (1 unidad)",kcal:95,prot:1.5,carbs:19,grasas:2,fibra:2,cat:"carbs"},
  {nombre:"Trufa de coco (1 unidad)",kcal:85,prot:0.8,carbs:4,grasas:7.5,fibra:1.5,cat:"grasa"},
  {nombre:"Chip de camote (1 rebanada)",kcal:35,prot:0.6,carbs:8,grasas:0.1,fibra:1,cat:"carbs"},
  // ── REINTRODUCCIÓN/MANTENIMIENTO: harinas de almendra y linaza, semillas ──
  {nombre:"Pan de harina de almendras (1 rebanada)",kcal:130,prot:5,carbs:3,grasas:11,fibra:2,cat:"carbs"},
  {nombre:"Pan de harina de linaza (1 rebanada)",kcal:110,prot:5,carbs:4,grasas:8,fibra:4,cat:"carbs"},
  {nombre:"Queque keto (1 porción)",kcal:220,prot:6,carbs:6,grasas:19,fibra:3,cat:"carbs"},
  {nombre:"Queque con harina de almendras (1 porción)",kcal:210,prot:6,carbs:8,grasas:17,fibra:2.5,cat:"carbs"},
  {nombre:"Galleta con harina de almendras (1 unidad)",kcal:90,prot:3,carbs:4,grasas:7,fibra:1.5,cat:"carbs"},
  {nombre:"Pudín de chía (1 porción)",kcal:220,prot:5,carbs:12,grasas:16,fibra:8,cat:"carbs"},
  {nombre:"Linaza (1 cda)",kcal:55,prot:1.9,carbs:3,grasas:4.3,fibra:2.7,cat:"grasa"},
  {nombre:"Chía (1 cda)",kcal:49,prot:1.7,carbs:4.2,grasas:3.1,fibra:3.4,cat:"grasa"},
  {nombre:"Harina de almendras (30g)",kcal:180,prot:6.5,carbs:6,grasas:15.5,fibra:3.5,cat:"grasa"},
  {nombre:"Harina de linaza/lino (30g)",kcal:150,prot:5.5,carbs:9,grasas:12,fibra:8.1,cat:"grasa"},
  {nombre:"Proteína en polvo (1 scoop, 30g)",kcal:120,prot:24,carbs:3,grasas:1.5,fibra:0,cat:"proteina"},
  {nombre:"Batido con proteína (1 porción)",kcal:180,prot:25,carbs:8,grasas:4,fibra:2,cat:"proteina"},
  {nombre:"Barra de proteína (1 unidad)",kcal:200,prot:20,carbs:15,grasas:8,fibra:3,cat:"proteina"},
];


const MINUTA_SEMANAL = [
  {dia:"Lunes",desayuno:"Mousse de coco con berries",almuerzo:"Hamburguesas de salmón y camote",cena:"Crema de champiñones + pollo a la plancha",colacion:"Trufas de vainilla y coco"},
  {dia:"Martes",desayuno:"Chip de camote con palta",almuerzo:"Lasaña de zapallo italiano",cena:"Caldo de huesos con verduras",colacion:"Palta con sal de mar"},
  {dia:"Miércoles",desayuno:"Pancakes de camote y plátano",almuerzo:"Pollo al horno con camote y brócoli",cena:"Crema de apio",colacion:"Arándanos con coco rallado"},
  {dia:"Jueves",desayuno:"Mousse de coco con berries",almuerzo:"Salmón al horno con espinaca salteada",cena:"Hamburguesas de salmón y camote",colacion:"Tortilla de plátano verde con palta"},
  {dia:"Viernes",desayuno:"Chip de camote con palta",almuerzo:"Carne de res con zucchini y zanahoria",cena:"Crema de champiñones + atún",colacion:"Trufas de vainilla y coco"},
  {dia:"Sábado",desayuno:"Pancakes de camote y plátano",almuerzo:"Lasaña de zapallo italiano",cena:"Pollo al horno con ensalada de betarraga",colacion:"Manzana con coco"},
  {dia:"Domingo",desayuno:"Mousse de coco con berries",almuerzo:"Caldo de huesos con pollo y verduras",cena:"Salmón con camote y espinaca",colacion:"Palta con sal de mar"},
];

// ── MACROS TAB ────────────────────────────────────────────────────────────────
function MacrosTab({isPremium, onUpgrade, email}){
  const [vista, setVista] = useState("macros"); // macros | minuta
  const [historial, setHistorial] = useState({}); // { "2026-07-11": {items:[...]} }
  const [busqueda, setBusqueda] = useState("");
  const [metaProt, setMetaProt] = useState(80);
  const [metaCarbs, setMetaCarbs] = useState(120);
  const [metaGrasas, setMetaGrasas] = useState(60);
  const [metaFibra, setMetaFibra] = useState(35);
  const [showMetas, setShowMetas] = useState(false);
  const fechaHoy = new Date().toISOString().split("T")[0];
  const registroMacros = historial[fechaHoy]?.items || [];

  useEffect(()=>{
    (async()=>{
      // 1) Cargar rápido desde localStorage (offline-first)
      let local={};
      try{
        local=JSON.parse(localStorage.getItem("macros:historial")||"{}");
        // Migrar formato viejo de un solo día si existía
        const legacy=JSON.parse(localStorage.getItem("macros:hoy")||"null");
        if(legacy?.fecha&&legacy.items?.length&&!local[legacy.fecha])local[legacy.fecha]={items:legacy.items};
        setHistorial(local);
      }catch{}
      try{
        const m=JSON.parse(localStorage.getItem("macros:metas")||"{}");
        if(m.prot)setMetaProt(m.prot);
        if(m.carbs)setMetaCarbs(m.carbs);
        if(m.grasas)setMetaGrasas(m.grasas);
        setMetaFibra(m.fibra||35);
      }catch{}
      // 2) Traer desde Supabase y fusionar (por si el dispositivo perdió el cache local)
      if(email){
        try{
          const remote=await getFromDB("macros",email);
          const remoteHist=remote?.data||{};
          setHistorial(prev=>{
            const merged={...remoteHist,...prev};
            // Para hoy, nos quedamos con el que tenga más ítems registrados
            const hoyLocal=prev[fechaHoy]?.items?.length||0;
            const hoyRemoto=remoteHist[fechaHoy]?.items?.length||0;
            if(hoyRemoto>hoyLocal)merged[fechaHoy]=remoteHist[fechaHoy];
            localStorage.setItem("macros:historial",JSON.stringify(merged));
            return merged;
          });
        }catch(e){console.error("Error cargando macros desde Supabase:",e);}
      }
    })();
  },[email]);

  function podar(hist){
    // Conservar solo los últimos 30 días para no crecer indefinidamente
    const dias=Object.keys(hist).sort().reverse();
    if(dias.length<=30)return hist;
    const limitado={};
    dias.slice(0,30).forEach(d=>limitado[d]=hist[d]);
    return limitado;
  }

  async function guardarMacros(items){
    const nuevoHist=podar({...historial,[fechaHoy]:{items}});
    setHistorial(nuevoHist);
    localStorage.setItem("macros:historial",JSON.stringify(nuevoHist));
    if(email){try{await saveToDB("macros",email,{data:nuevoHist});}catch(e){console.error("Error guardando macros:",e);}}
  }

  function saveMetas(){
    localStorage.setItem("macros:metas",JSON.stringify({prot:metaProt,carbs:metaCarbs,grasas:metaGrasas,fibra:metaFibra}));
    setShowMetas(false);
  }

  function agregarAlimento(a){
    const nuevo=[...registroMacros,{...a,id:Date.now()}];
    guardarMacros(nuevo);
    setBusqueda("");
  }

  function quitarAlimento(id){
    guardarMacros(registroMacros.filter(r=>r.id!==id));
  }

  const totales=registroMacros.reduce((acc,a)=>({
    kcal:acc.kcal+(a.kcal||0),
    prot:acc.prot+(a.prot||0),
    carbs:acc.carbs+(a.carbs||0),
    grasas:acc.grasas+(a.grasas||0),
    fibra:acc.fibra+(a.fibra||0),
  }),{kcal:0,prot:0,carbs:0,grasas:0,fibra:0});

  // ── RESUMEN SEMANAL: últimos 7 días (hoy incluido) ──
  const diasSemana=Array.from({length:7},(_,i)=>{
    const d=new Date();
    d.setDate(d.getDate()-(6-i));
    return d.toISOString().split("T")[0];
  });
  function totalesDia(fecha){
    const items=historial[fecha]?.items||[];
    return items.reduce((acc,a)=>({
      prot:acc.prot+(a.prot||0),carbs:acc.carbs+(a.carbs||0),
      grasas:acc.grasas+(a.grasas||0),fibra:acc.fibra+(a.fibra||0),
    }),{prot:0,carbs:0,grasas:0,fibra:0});
  }
  function cumplioDia(fecha){
    const t=totalesDia(fecha);
    const tieneRegistro=(historial[fecha]?.items||[]).length>0;
    return{
      registro:tieneRegistro,
      prot:t.prot>=metaProt, carbs:t.carbs>=metaCarbs,
      grasas:t.grasas>=metaGrasas, fibra:t.fibra>=metaFibra,
    };
  }

  const filtrados=busqueda.length>1?ALIMENTOS_MACROS.filter(a=>a.nombre.toLowerCase().includes(busqueda.toLowerCase())):[];

  const BarraMacro=({label,val,meta,color})=>{
    const pct=Math.min((val/meta)*100,100);
    return(
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:12,fontWeight:700,color:T.brown,fontFamily:FB}}>{label}</span>
          <span style={{fontSize:12,color:T.stone}}><b style={{color}}>{Math.round(val)}g</b> / {meta}g</span>
        </div>
        <div style={{height:10,borderRadius:6,background:T.stonePale,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,borderRadius:6,background:color,transition:"width .4s"}}/>
        </div>
      </div>
    );
  };

  if(!isPremium) return(
    <div style={{padding:"56px 20px 96px",fontFamily:FB}}>
      <h2 style={{fontFamily:FD,fontSize:26,color:T.brown,fontWeight:700,marginBottom:4}}>Macros & Minuta</h2>
      <p style={{fontSize:12,color:T.stone,marginBottom:24}}>Contador de macros diarios y plan semanal Método Eri</p>
      <PremiumLock onUpgrade={onUpgrade}/>
    </div>
  );

  return(
    <div style={{padding:"56px 20px 96px",fontFamily:FB}}>
      <h2 style={{fontFamily:FD,fontSize:26,color:T.brown,fontWeight:700,marginBottom:4}}>Macros & Minuta</h2>
      <p style={{fontSize:12,color:T.stone,marginBottom:16}}>Plan semanal y seguimiento diario</p>

      {/* TABS */}
      <div style={{display:"flex",background:T.stonePale,borderRadius:16,padding:4,marginBottom:20}}>
        {[["macros","🥗 Macros del día"],["minuta","📅 Minuta semanal"]].map(([id,label])=>(
          <button key={id} onClick={()=>setVista(id)} style={{flex:1,padding:"10px",borderRadius:12,border:"none",background:vista===id?T.warmWhite:"transparent",color:vista===id?T.brown:T.stone,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FB}}>{label}</button>
        ))}
      </div>

      {vista==="macros"&&(
        <>
          {/* RESUMEN KCAL */}
          <div style={{borderRadius:20,background:`linear-gradient(135deg,${T.sage},${T.sageMid})`,padding:"20px",marginBottom:16,boxShadow:`0 8px 24px ${T.sage}44`}}>
            <p style={{fontSize:11,color:"rgba(255,255,255,0.7)",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>Calorías del día</p>
            <p style={{fontFamily:FD,fontSize:36,fontWeight:700,color:"white"}}>{Math.round(totales.kcal)} <span style={{fontSize:16,fontWeight:400}}>kcal</span></p>
            <p style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:4}}>{registroMacros.length} alimentos registrados hoy</p>
          </div>

          {/* BARRAS DE MACROS */}
          <div style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"20px",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase"}}>Macronutrientes</p>
              <button onClick={()=>setShowMetas(true)} style={{fontSize:11,color:T.sage,fontWeight:700,background:"none",border:`1px solid ${T.sage}`,borderRadius:10,padding:"4px 10px",cursor:"pointer",fontFamily:FB}}>⚙️ Metas</button>
            </div>
            <BarraMacro label="🥩 Proteína" val={totales.prot} meta={metaProt} color={T.terra}/>
            <BarraMacro label="🍠 Carbohidratos" val={totales.carbs} meta={metaCarbs} color={T.sage}/>
            <BarraMacro label="🥑 Grasas saludables" val={totales.grasas} meta={metaGrasas} color={T.brownMid}/>
            <BarraMacro label="🌾 Fibra" val={totales.fibra} meta={metaFibra} color={T.ok}/>
          </div>

          {/* RESUMEN SEMANAL */}
          <div style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"20px",marginBottom:16}}>
            <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:14}}>Resumen semanal · ¿Cumpliste tus metas?</p>
            <div style={{display:"flex",justifyContent:"space-between",gap:4}}>
              {diasSemana.map(fecha=>{
                const c=cumplioDia(fecha);
                const esHoy=fecha===fechaHoy;
                const d=new Date(fecha+"T12:00:00");
                const letra=d.toLocaleDateString("es-CL",{weekday:"short"}).slice(0,1).toUpperCase();
                const puntos=[["P",c.prot,T.terra],["C",c.carbs,T.sage],["G",c.grasas,T.brownMid],["F",c.fibra,T.ok]];
                return(
                  <div key={fecha} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,flex:1}}>
                    <span style={{fontSize:10,fontWeight:700,color:esHoy?T.sage:T.stone}}>{letra}</span>
                    <div style={{display:"flex",flexDirection:"column",gap:3}}>
                      {puntos.map(([k,ok,color])=>(
                        <div key={k} title={k} style={{width:9,height:9,borderRadius:"50%",background:!c.registro?T.stonePale:(ok?color:T.stonePale),border:!c.registro?`1px solid ${T.stoneMid}`:"none"}}/>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{fontSize:10,color:T.stone,marginTop:14,textAlign:"center"}}>P Proteína · C Carbohidratos · G Grasas · F Fibra — punto de color = meta cumplida ese día</p>
          </div>

          {/* BUSCADOR DE ALIMENTOS */}
          <div style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"20px",marginBottom:16}}>
            <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Agregar alimento</p>
            <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar alimento AIP..." style={{width:"100%",padding:"12px 16px",borderRadius:14,border:`1.5px solid ${T.stoneMid}`,background:T.cream,fontSize:14,color:T.ink,outline:"none",fontFamily:FB,boxSizing:"border-box",marginBottom:busqueda.length>1?10:0}}/>
            {filtrados.length>0&&(
              <div style={{maxHeight:200,overflowY:"auto"}}>
                {filtrados.map((a,i)=>(
                  <button key={i} onClick={()=>agregarAlimento(a)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderRadius:12,border:"none",background:i%2===0?T.cream:T.warmWhite,cursor:"pointer",fontFamily:FB,marginBottom:2}}>
                    <span style={{fontSize:13,color:T.brown,textAlign:"left"}}>{a.nombre}</span>
                    <span style={{fontSize:11,color:T.stone,flexShrink:0,marginLeft:8}}>{a.kcal}kcal · P:{a.prot}g</span>
                  </button>
                ))}
              </div>
            )}
            {busqueda.length>1&&filtrados.length===0&&<p style={{fontSize:12,color:T.stone,textAlign:"center",padding:"10px 0"}}>No encontrado. Prueba otro término.</p>}
          </div>

          {/* LISTA DE LO COMIDO */}
          {registroMacros.length>0&&(
            <div style={{borderRadius:20,background:T.warmWhite,border:`1px solid ${T.stonePale}`,padding:"16px",marginBottom:16}}>
              <p style={{fontSize:11,fontWeight:700,color:T.stone,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Registrado hoy</p>
              {registroMacros.map((a)=>(
                <div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.stonePale}`}}>
                  <div>
                    <p style={{fontSize:13,fontWeight:600,color:T.brown}}>{a.nombre}</p>
                    <p style={{fontSize:11,color:T.stone}}>P:{a.prot}g · C:{a.carbs}g · G:{a.grasas}g</p>
                  </div>
                  <button onClick={()=>quitarAlimento(a.id)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px"}}><Trash2 size={14} color={T.stoneMid}/></button>
                </div>
              ))}
            </div>
          )}

          {/* MODAL METAS */}
          {showMetas&&(
            <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(44,32,24,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowMetas(false)}>
              <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:480,borderRadius:"28px 28px 0 0",background:T.cream,padding:"24px 20px 40px",fontFamily:FB}}>
                <div style={{display:"flex",justifyContent:"center",marginBottom:16}}><div style={{width:40,height:4,borderRadius:2,background:T.stoneMid}}/></div>
                <h3 style={{fontFamily:FD,fontSize:18,color:T.brown,fontWeight:700,marginBottom:16}}>Personalizar metas</h3>
                {[["🥩 Proteína (g)",metaProt,setMetaProt],[" 🍠 Carbohidratos (g)",metaCarbs,setMetaCarbs],["🥑 Grasas (g)",metaGrasas,setMetaGrasas],["🌾 Fibra (g)",metaFibra,setMetaFibra]].map(([label,val,setVal])=>(
                  <div key={label} style={{marginBottom:14}}>
                    <p style={{fontSize:12,fontWeight:700,color:T.brown,marginBottom:6}}>{label}</p>
                    <input type="number" value={val} onChange={e=>setVal(Number(e.target.value))} style={{width:"100%",padding:"12px 16px",borderRadius:14,border:`1.5px solid ${T.stoneMid}`,background:T.warmWhite,fontSize:16,color:T.ink,outline:"none",fontFamily:FB,boxSizing:"border-box"}}/>
                  </div>
                ))}
                <button onClick={saveMetas} style={{width:"100%",padding:"14px",borderRadius:16,border:"none",background:`linear-gradient(135deg,${T.sage},${T.sageMid})`,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FB,marginTop:8}}>Guardar metas</button>
              </div>
            </div>
          )}
        </>
      )}

      {vista==="minuta"&&(
        <div>
          <div style={{borderRadius:16,background:T.sagePale,border:`1px solid ${T.sageLight}`,padding:"12px 16px",marginBottom:16}}>
            <p style={{fontSize:12,color:T.sage,lineHeight:1.6}}>🌿 Minuta semanal diseñada según el Método Eri · Fase Eliminación. Todas las comidas son del protocolo.</p>
          </div>
          {MINUTA_SEMANAL.map((d,i)=>{
            const esHoy=new Date().toLocaleDateString("es-CL",{weekday:"long"}).toLowerCase().includes(d.dia.toLowerCase());
            return(
              <div key={i} style={{borderRadius:20,background:T.warmWhite,border:`2px solid ${esHoy?T.sage:T.stonePale}`,padding:"16px",marginBottom:12,boxShadow:esHoy?`0 4px 16px ${T.sage}33`:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  {esHoy&&<span style={{fontSize:9,fontWeight:800,color:"white",background:T.sage,padding:"3px 8px",borderRadius:8,letterSpacing:"0.1em"}}>HOY</span>}
                  <p style={{fontFamily:FD,fontSize:16,fontWeight:700,color:esHoy?T.sage:T.brown}}>{d.dia}</p>
                </div>
                {[["🌅 Desayuno",d.desayuno],["☀️ Almuerzo",d.almuerzo],["🌙 Cena",d.cena],["🍎 Colación",d.colacion]].map(([tipo,comida])=>(
                  <div key={tipo} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
                    <span style={{fontSize:11,color:T.stone,fontWeight:700,minWidth:72,flexShrink:0}}>{tipo}</span>
                    <span style={{fontSize:12,color:T.brown,lineHeight:1.5}}>{comida}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TAB BAR ───────────────────────────────────────────────────────────────────
function TabBar({active,setActive}){
  const tabs=[{id:"home",Icon:Heart,label:"Inicio"},{id:"pantry",Icon:ShoppingBag,label:"Despensa"},{id:"recipes",Icon:ChefHat,label:"Recetas"},{id:"macros",Icon:Flame,label:"Macros"},{id:"sintomas",Icon:AlertCircle,label:"Síntomas"},{id:"profile",Icon:User,label:"Perfil"}];
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
  const [membership,setMembershipState]=useState(null); // null=loading, {type:"free"|"premium"}
  const [showPaywall,setShowPaywall]=useState(false);

  useEffect(()=>{
    (async()=>{
      try{
        const cachedMem=localStorage.getItem("membership:status");
        const cachedEmail=cachedMem?JSON.parse(cachedMem)?.email:null;
        const [profile,pantry,recipes,mem]=await Promise.all([
          dbGet("profile:user"),dbGet("pantry:items"),dbGet("history:recipes"),getMembership(cachedEmail)
        ]);
        const email=mem?.email||cachedEmail;
        if(email){
          const [dbProfile,dbPantry,dbRecipes]=await Promise.all([
            getFromDB("profiles",email),
            getFromDB("pantry",email),
            getFromDB("recipes_history",email),
          ]);
          dispatch({type:"LOAD",p:{
            profile:dbProfile?.profile_data||profile||null,
            pantry:dbPantry?.items||pantry||[],
            recipesHistory:dbRecipes?.items||recipes||[],
            ticketsHistory:[]
          }});
        } else {
          dispatch({type:"LOAD",p:{profile:profile||null,pantry:pantry||[],recipesHistory:recipes||[],ticketsHistory:[]}});
        }
        setMembershipState(mem||null);
      }catch{}
      setReady(true);
    })();
  },[]);

  async function onboard(p){dispatch({type:"SET_PROFILE",p});await dbSet("profile:user",p);}

  async function handleActivate(type){
    // Leer el membership completo que ya guardó handleCode (con plan_type correcto)
    try{
      const saved=localStorage.getItem("membership:status");
      const savedMem=saved?JSON.parse(saved):null;
      // Si ya hay un membership guardado con el tipo correcto, usarlo
      if(savedMem&&savedMem.type===type){
        setMembershipState(savedMem);
        setShowPaywall(false);
        // Recuperar despensa/perfil/recetas desde Supabase — necesario cuando el
        // dispositivo perdió el cache local (ej: actualización de celular, reinstalo
        // la app, cambió de navegador) y el usuario vuelve a entrar con "Ya tengo acceso".
        if(savedMem.email){
          setReady(false);
          try{
            const [dbProfile,dbPantry,dbRecipes]=await Promise.all([
              getFromDB("profiles",savedMem.email),
              getFromDB("pantry",savedMem.email),
              getFromDB("recipes_history",savedMem.email),
            ]);
            dispatch({type:"LOAD",p:{
              profile:dbProfile?.profile_data||state.profile||null,
              pantry:dbPantry?.items||state.pantry||[],
              recipesHistory:dbRecipes?.items||state.recipesHistory||[],
              ticketsHistory:[]
            }});
          }catch(e){console.error("Error recuperando datos desde Supabase:",e);}
          setReady(true);
        }
        return;
      }
    }catch{}
    // Fallback: crear membership básico
    const mem={type,activatedAt:Date.now()};
    await setMembership(mem);
    setMembershipState(mem);
    setShowPaywall(false);
  }

  const isPremium=membership?.type==="premium";
  const planType=membership?.plan_type||"general"; // "general" | "community"

  if(!ready)return<div style={{minHeight:"100svh",background:`linear-gradient(160deg,${T.sagePale} 0%,${T.cream} 100%)`,display:"flex",alignItems:"center",justifyContent:"center"}}><Spin msg="Cargando Stop Hashimoto®…"/></div>;

  // Mostrar paywall si no tiene membresía aún
  if(!membership)return<PaywallScreen onActivate={handleActivate}/>;

  if(!state.profile)return<Onboarding onDone={onboard} existingProfile={state.profile}/>;

  // Overlay de upgrade
  if(showPaywall)return<PaywallScreen onActivate={handleActivate}/>;

  return(
    <div style={{minHeight:"100svh",background:T.cream,maxWidth:480,margin:"0 auto",position:"relative"}}>
      {tab==="home"&&<HomeTab state={state} dispatch={dispatch} goTo={setTab} isPremium={isPremium} onUpgrade={()=>setShowPaywall(true)}/>}
      {tab==="pantry"&&<PantryTab state={state} dispatch={dispatch} isPremium={isPremium} onUpgrade={()=>setShowPaywall(true)}/>}
      {tab==="recipes"&&<RecipesTab state={state} dispatch={dispatch} isPremium={isPremium} planType={planType} onUpgrade={()=>setShowPaywall(true)}/>}
      {tab==="macros"&&<MacrosTab isPremium={isPremium} onUpgrade={()=>setShowPaywall(true)} email={membership?.email}/>}
      {tab==="sintomas"&&<SintomasTab isPremium={isPremium} onUpgrade={()=>setShowPaywall(true)}/>}
      {tab==="profile"&&<ProfileTab state={state} dispatch={dispatch} isPremium={isPremium} planType={planType} onUpgrade={()=>setShowPaywall(true)}/>}
      <TabBar active={tab} setActive={setTab}/>
    </div>
  );
}
