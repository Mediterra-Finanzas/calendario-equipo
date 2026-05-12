/* eslint-disable */
// ═══════════════════════════════════════════════════════════════════
// FriskuModule.jsx — Frisku Foods · Connecting Quality
// Persistencia independiente: fila "frisku" en Supabase
// ═══════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

const SUPA_URL = "https://bywovqayuzodbzwsriet.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5d292cWF5dXpvZGJ6d3NyaWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2ODU1MDgsImV4cCI6MjA5MTI2MTUwOH0.s2x2O_CxE6rl8dBqFuyfQdMyRqSyjJQWXJXesmVGXtk";

// ── Persistencia ──
async function dbLoadFrisku() {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/calendario_data?id=eq.frisku&select=value`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
    });
    const rows = await res.json();
    if(rows?.[0]?.value) {
      const v = typeof rows[0].value === "string" ? JSON.parse(rows[0].value) : rows[0].value;
      return v;
    }
    return null;
  } catch(e) { console.error("[Frisku] Error cargando:", e); return null; }
}

async function dbSaveFrisku(value) {
  try {
    // Protección anti-pérdida
    if(value) {
      const protectedKeys = ["clientes","exportadoras","contratos","programasComerciales","embarques","liquidaciones"];
      let caidas = 0;
      for(const k of protectedKeys) {
        const nc = Array.isArray(value[k]) ? value[k].length : -1;
        const pc = window._lastSavedFrisku?.[k] || 0;
        if(nc >= 0 && pc > 0 && nc < pc) caidas++;
      }
      if(caidas >= 3) { console.warn(`[dbSaveFrisku] ⚠️ BLOQUEADO: ${caidas} arrays cayeron.`); return; }
      if(!window._lastSavedFrisku) window._lastSavedFrisku = {};
      for(const k of protectedKeys) { if(Array.isArray(value[k])) window._lastSavedFrisku[k] = value[k].length; }
    }
    await fetch(`${SUPA_URL}/rest/v1/calendario_data`, {
      method: "POST",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ id: "frisku", value, updated_at: new Date().toISOString() })
    });
    const keys = value ? Object.keys(value).filter(k=>Array.isArray(value[k])&&value[k].length>0).map(k=>`${k}:${value[k].length}`).join(", ") : "VACÍO";
    console.log(`[Frisku] ✅ Guardado: ${keys||"sin arrays"}`);
  } catch(e) { console.error("[Frisku] Error guardando:", e); }
}

// ── DateInput ──
function DateInput({value, onChange, disabled, style}) {
  const [local, setLocal] = useState(value||"");
  useEffect(()=>{ setLocal(value||""); },[value]);
  return <input type="date" disabled={disabled} value={local} onChange={e=>setLocal(e.target.value)} onBlur={()=>onChange(local)} style={style}/>;
}

// ── Paleta ──
const C = {
  bg:"#0d1117", bg2:"#161b22", card:"#1c2333", card2:"#21283b", border:"#30363d",
  text:"#e6edf3", muted:"#8b949e", muted2:"#484f58",
  blue:"#2563eb", green:"#16a34a", yellow:"#d97706", accent:"#b91c1c",
  teal:"#0f766e", purple:"#7c3aed",
};

// ── Logo Frisku ──
function FriskuLogo({height=52}) {
  return (
    <img src="/frisku.png" alt="Frisku Foods"
      style={{height, objectFit:"contain", display:"block"}}
      onError={e=>{e.target.style.display="none";}}/>
  );
}

function Card({children}) {
  return <div style={{background:C.card,borderRadius:14,padding:20,border:`1px solid ${C.border}`}}>{children}</div>;
}

function KPI({label,value,color}) {
  return (
    <div style={{background:`${color}15`,borderRadius:10,padding:"10px 16px",minWidth:100,flex:1}}>
      <div style={{fontSize:10,color:C.muted}}>{label}</div>
      <div style={{fontSize:20,fontWeight:800,color}}>{value}</div>
    </div>
  );
}

// Helpers
const inputSt={width:"100%",padding:"7px 10px",borderRadius:8,border:"1px solid #30363d",background:"#21283b",color:"#e6edf3",fontSize:12,boxSizing:"border-box"};
const lblSt={fontSize:10,color:"#8b949e",fontWeight:600,marginBottom:3};
const PAISES_IMPORT=["China","USA","UK","Países Bajos","Alemania","India","Canadá","Corea del Sur","Japón","Taiwán","Hong Kong","Singapur","Malasia","Tailandia","Vietnam","Emiratos Árabes","Arabia Saudita","Brasil","Colombia","México","Otro"];
const ESPECIES_BASE=["Arándanos","Cerezas","Uvas","Ciruelas","Kiwi","Paltas","Manzanas","Peras","Cítricos"];
// Combina especies base + custom + "Otro" al final. Elimina duplicados y ordena base primero, luego custom alfabéticas.
function getEspecies(customList){
  const custom=(customList||[]).map(s=>String(s).trim()).filter(Boolean);
  const base=[...ESPECIES_BASE];
  const extra=custom.filter(s=>!base.includes(s)).sort((a,b)=>a.localeCompare(b));
  return [...base, ...extra, "Otro"];
}
// Compatibilidad con código que usaba ESPECIES_FRISKU (lista base + Otro)
const ESPECIES_FRISKU=[...ESPECIES_BASE,"Otro"];

// ═══════════════════════════════════════════════════════════════════
// CLIENTES (Importadores)
// ═══════════════════════════════════════════════════════════════════
function ClientesModule({data, setData, can, especies=ESPECIES_FRISKU}) {
  const [busq, setBusq] = useState("");
  const [modal, setModal] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [tab, setTab] = useState("ficha");
  const EMPTY={nombre:"",pais:"",ciudad:"",contacto:"",email:"",telefono:"",especies:[],procedimientos:"",requisitos:"",lmr:"",etiquetas:"",formatosEspeciales:"",notas:"",activo:true};
  const [form, setForm] = useState(EMPTY);

  const filtrado = data.filter(c=>!busq||c.nombre?.toLowerCase().includes(busq.toLowerCase())||c.pais?.toLowerCase().includes(busq.toLowerCase()));
  const cl = detalle ? data.find(c=>c.id===detalle) : null;
  const upd = (f,v) => setData(prev=>prev.map(c=>c.id===detalle?{...c,[f]:v}:c));

  function guardar(){
    if(!form.nombre){alert("Nombre obligatorio.");return;}
    setData(prev=>[...prev,{...form,id:`fcl_${Date.now()}`}]);
    setForm(EMPTY);setModal(false);
  }

  if(cl) {
    const TABS=[{id:"ficha",label:"📋 Ficha"},{id:"procedimientos",label:"📄 Procedimientos"},{id:"requisitos",label:"🔍 Requisitos"}];
    return(
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>{setDetalle(null);setTab("ficha");}} style={{background:"#21283b",border:"1px solid #30363d",borderRadius:8,padding:"6px 14px",cursor:"pointer",color:"#8b949e",fontSize:12}}>← Volver</button>
            <h3 style={{margin:0,color:"#e6edf3",fontSize:18}}>{cl.nombre}</h3>
            <span style={{fontSize:10,padding:"4px 12px",borderRadius:20,background:"#2563eb22",color:"#2563eb",fontWeight:700}}>{cl.pais}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
          {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 16px",borderRadius:8,border:tab===t.id?"2px solid #0ea5e9":"1px solid #30363d",background:tab===t.id?"#0ea5e9":"transparent",color:tab===t.id?"#fff":"#8b949e",cursor:"pointer",fontSize:12,fontWeight:700}}>{t.label}</button>)}
        </div>
        {tab==="ficha"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {[["Nombre empresa","nombre"],["País","pais"],["Ciudad","ciudad"],["Contacto principal","contacto"],["Email","email"],["Teléfono","telefono"]].map(([l,f])=>(
              <div key={f}><div style={lblSt}>{l}</div><input disabled={!can} value={cl[f]||""} onChange={e=>upd(f,e.target.value)} style={inputSt}/></div>))}
            <div style={{gridColumn:"1/-1"}}><div style={lblSt}>Especies</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{especies.map(e=>(
                <button key={e} disabled={!can} onClick={()=>{const cur=cl.especies||[];upd("especies",cur.includes(e)?cur.filter(x=>x!==e):[...cur,e]);}}
                  style={{padding:"4px 12px",borderRadius:20,border:`1px solid ${(cl.especies||[]).includes(e)?"#0ea5e9":"#30363d"}`,background:(cl.especies||[]).includes(e)?"#0ea5e922":"transparent",color:(cl.especies||[]).includes(e)?"#0ea5e9":"#8b949e",cursor:can?"pointer":"default",fontSize:11,fontWeight:600}}>{e}</button>
              ))}</div></div>
            <div style={{gridColumn:"1/-1"}}><div style={lblSt}>Notas</div><textarea disabled={!can} value={cl.notas||""} onChange={e=>upd("notas",e.target.value)} style={{...inputSt,minHeight:50}}/></div>
          </div>
        )}
        {tab==="procedimientos"&&(
          <div>
            <div style={lblSt}>Procedimientos del cliente</div>
            <textarea disabled={!can} value={cl.procedimientos||""} onChange={e=>upd("procedimientos",e.target.value)} placeholder="Etiquetas, formatos, instrucciones de empaque, condiciones de envío..." style={{...inputSt,minHeight:100}} />
            <div style={{height:12}}/>
            <div style={lblSt}>Etiquetas y formatos especiales</div>
            <textarea disabled={!can} value={cl.etiquetas||""} onChange={e=>upd("etiquetas",e.target.value)} placeholder="Descripción de etiquetas, links a archivos..." style={{...inputSt,minHeight:60}} />
            <div style={{height:12}}/>
            <div style={lblSt}>Formatos especiales</div>
            <textarea disabled={!can} value={cl.formatosEspeciales||""} onChange={e=>upd("formatosEspeciales",e.target.value)} style={{...inputSt,minHeight:60}} />
          </div>
        )}
        {tab==="requisitos"&&(
          <div>
            <div style={lblSt}>Requisitos específicos del cliente</div>
            <textarea disabled={!can} value={cl.requisitos||""} onChange={e=>upd("requisitos",e.target.value)} placeholder="Cert. Grower, Cert. Pack House, Client Approval, Análisis de Residuos, PPUL, Spray Records..." style={{...inputSt,minHeight:80}} />
            <div style={{height:12}}/>
            <div style={lblSt}>Verificación de cumplimiento LMR</div>
            <textarea disabled={!can} value={cl.lmr||""} onChange={e=>upd("lmr",e.target.value)} placeholder="Límites máximos de residuos, país destino, regulaciones específicas..." style={{...inputSt,minHeight:60}} />
          </div>
        )}
      </div>
    );
  }

  return(
    <div>
      <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input value={busq} onChange={e=>setBusq(e.target.value)} placeholder="🔍 Buscar cliente..." style={{...inputSt,flex:1,minWidth:200}}/>
        {can&&<button onClick={()=>{setForm(EMPTY);setModal(true);}} style={{background:"#b91c1c",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:700,fontSize:12}}>+ Nuevo Cliente</button>}
      </div>
      <div style={{overflowX:"auto",borderRadius:10,border:"1px solid #30363d"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:"#161b22"}}>{["Cliente","País","Contacto","Email","Especies",""].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#8b949e",fontWeight:700,fontSize:10}}>{h}</th>)}</tr></thead>
          <tbody>{filtrado.map((c,i)=>(
            <tr key={c.id} onClick={()=>setDetalle(c.id)} style={{borderBottom:"1px solid #30363d22",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#0ea5e911"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <td style={{padding:"6px 10px",fontWeight:600,color:"#e6edf3"}}>{c.nombre}</td>
              <td style={{padding:"6px 10px"}}><span style={{fontSize:9,background:"#2563eb22",color:"#2563eb",padding:"1px 6px",borderRadius:10,fontWeight:600}}>{c.pais}</span></td>
              <td style={{padding:"6px 10px",color:"#8b949e"}}>{c.contacto||"—"}</td>
              <td style={{padding:"6px 10px",color:"#8b949e",fontSize:10}}>{c.email||"—"}</td>
              <td style={{padding:"6px 10px"}}>{(c.especies||[]).map(e=><span key={e} style={{fontSize:8,background:"#0ea5e922",color:"#0ea5e9",padding:"1px 5px",borderRadius:8,marginRight:3}}>{e}</span>)}</td>
              <td style={{padding:"6px 10px",color:"#0ea5e9",fontWeight:700}}>Ver →</td>
            </tr>))}
            {filtrado.length===0&&<tr><td colSpan={6} style={{padding:30,textAlign:"center",color:"#484f58"}}>Sin clientes</td></tr>}
          </tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"#000a",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"#1c2333",borderRadius:14,padding:24,maxWidth:520,width:"100%",border:"1px solid #30363d",maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <h3 style={{margin:"0 0 16px",color:"#e6edf3"}}>Nuevo Cliente Importador</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["Nombre *","nombre"],["País","pais"],["Ciudad","ciudad"],["Contacto","contacto"],["Email","email"],["Teléfono","telefono"]].map(([l,f])=>(
                <div key={f}><div style={lblSt}>{l}</div>
                  {f==="pais"?<select value={form[f]||""} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))} style={inputSt}><option value="">—</option>{PAISES_IMPORT.map(p=><option key={p}>{p}</option>)}</select>
                  :<input value={form[f]||""} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))} style={inputSt}/>}</div>))}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button onClick={()=>setModal(false)} style={{padding:"8px 18px",borderRadius:8,border:"1px solid #30363d",background:"transparent",color:"#8b949e",cursor:"pointer"}}>Cancelar</button>
              <button onClick={guardar} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#b91c1c",color:"#fff",cursor:"pointer",fontWeight:700}}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTADORAS (Proveedores de fruta)
// ═══════════════════════════════════════════════════════════════════
function ExportadorasModule({data, setData, can, especies=ESPECIES_FRISKU}) {
  const [busq, setBusq] = useState("");
  const [modal, setModal] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [tab, setTab] = useState("ficha");
  const EMPTY={nombre:"",pais:"Chile",region:"",contacto:"",email:"",telefono:"",especies:[],variedades:"",packingHouse:"",certificaciones:"",notas:"",activo:true};
  const [form, setForm] = useState(EMPTY);

  const filtrado = data.filter(e=>!busq||e.nombre?.toLowerCase().includes(busq.toLowerCase()));
  const exp = detalle ? data.find(e=>e.id===detalle) : null;
  const upd = (f,v) => setData(prev=>prev.map(e=>e.id===detalle?{...e,[f]:v}:e));

  function guardar(){
    if(!form.nombre){alert("Nombre obligatorio.");return;}
    setData(prev=>[...prev,{...form,id:`fex_${Date.now()}`}]);
    setForm(EMPTY);setModal(false);
  }

  if(exp) {
    const TABS=[{id:"ficha",label:"📋 Ficha"},{id:"produccion",label:"🌱 Producción"},{id:"homologacion",label:"✅ Homologación"}];
    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <button onClick={()=>{setDetalle(null);setTab("ficha");}} style={{background:"#21283b",border:"1px solid #30363d",borderRadius:8,padding:"6px 14px",cursor:"pointer",color:"#8b949e",fontSize:12}}>← Volver</button>
          <h3 style={{margin:0,color:"#e6edf3",fontSize:18}}>{exp.nombre}</h3>
          <span style={{fontSize:10,padding:"4px 12px",borderRadius:20,background:"#0f766e22",color:"#0f766e",fontWeight:700}}>{exp.pais}</span>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
          {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 16px",borderRadius:8,border:tab===t.id?"2px solid #0f766e":"1px solid #30363d",background:tab===t.id?"#0f766e":"transparent",color:tab===t.id?"#fff":"#8b949e",cursor:"pointer",fontSize:12,fontWeight:700}}>{t.label}</button>)}
        </div>
        {tab==="ficha"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {[["Nombre empresa","nombre"],["País","pais"],["Región","region"],["Contacto","contacto"],["Email","email"],["Teléfono","telefono"],["Packing House","packingHouse"]].map(([l,f])=>(
              <div key={f}><div style={lblSt}>{l}</div><input disabled={!can} value={exp[f]||""} onChange={e=>upd(f,e.target.value)} style={inputSt}/></div>))}
            <div style={{gridColumn:"1/-1"}}><div style={lblSt}>Especies</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{especies.map(e=>(
                <button key={e} disabled={!can} onClick={()=>{const cur=exp.especies||[];upd("especies",cur.includes(e)?cur.filter(x=>x!==e):[...cur,e]);}}
                  style={{padding:"4px 12px",borderRadius:20,border:`1px solid ${(exp.especies||[]).includes(e)?"#0f766e":"#30363d"}`,background:(exp.especies||[]).includes(e)?"#0f766e22":"transparent",color:(exp.especies||[]).includes(e)?"#0f766e":"#8b949e",cursor:can?"pointer":"default",fontSize:11,fontWeight:600}}>{e}</button>
              ))}</div></div>
            <div style={{gridColumn:"1/-1"}}><div style={lblSt}>Notas</div><textarea disabled={!can} value={exp.notas||""} onChange={e=>upd("notas",e.target.value)} style={{...inputSt,minHeight:50}}/></div>
          </div>
        )}
        {tab==="produccion"&&(
          <div>
            <div style={lblSt}>Variedades disponibles</div>
            <textarea disabled={!can} value={exp.variedades||""} onChange={e=>upd("variedades",e.target.value)} placeholder="Variedades por especie, volúmenes estimados..." style={{...inputSt,minHeight:80}} />
            <div style={{height:12}}/>
            <div style={lblSt}>Certificaciones (GlobalGAP, BRC, etc.)</div>
            <textarea disabled={!can} value={exp.certificaciones||""} onChange={e=>upd("certificaciones",e.target.value)} style={{...inputSt,minHeight:60}} />
          </div>
        )}
        {tab==="homologacion"&&(
          <div>
            <div style={lblSt}>Homologación de productores (Producer Agreement)</div>
            <textarea disabled={!can} value={exp.homologacion||""} onChange={e=>upd("homologacion",e.target.value)} placeholder="Estado de homologación, productores aprobados, pendientes..." style={{...inputSt,minHeight:80}} />
            <div style={{height:12}}/>
            <div style={lblSt}>Control de productores</div>
            <textarea disabled={!can} value={exp.controlProductores||""} onChange={e=>upd("controlProductores",e.target.value)} style={{...inputSt,minHeight:60}} />
          </div>
        )}
      </div>
    );
  }

  return(
    <div>
      <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input value={busq} onChange={e=>setBusq(e.target.value)} placeholder="🔍 Buscar exportadora..." style={{...inputSt,flex:1,minWidth:200}}/>
        {can&&<button onClick={()=>{setForm(EMPTY);setModal(true);}} style={{background:"#0f766e",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:700,fontSize:12}}>+ Nueva Exportadora</button>}
      </div>
      <div style={{overflowX:"auto",borderRadius:10,border:"1px solid #30363d"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:"#161b22"}}>{["Exportadora","País","Contacto","Email","Especies",""].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#8b949e",fontWeight:700,fontSize:10}}>{h}</th>)}</tr></thead>
          <tbody>{filtrado.map(e=>(
            <tr key={e.id} onClick={()=>setDetalle(e.id)} style={{borderBottom:"1px solid #30363d22",cursor:"pointer"}} onMouseEnter={ev=>ev.currentTarget.style.background="#0f766e11"} onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
              <td style={{padding:"6px 10px",fontWeight:600,color:"#e6edf3"}}>{e.nombre}</td>
              <td style={{padding:"6px 10px"}}><span style={{fontSize:9,background:"#0f766e22",color:"#0f766e",padding:"1px 6px",borderRadius:10,fontWeight:600}}>{e.pais}</span></td>
              <td style={{padding:"6px 10px",color:"#8b949e"}}>{e.contacto||"—"}</td>
              <td style={{padding:"6px 10px",color:"#8b949e",fontSize:10}}>{e.email||"—"}</td>
              <td style={{padding:"6px 10px"}}>{(e.especies||[]).map(s=><span key={s} style={{fontSize:8,background:"#0f766e22",color:"#0f766e",padding:"1px 5px",borderRadius:8,marginRight:3}}>{s}</span>)}</td>
              <td style={{padding:"6px 10px",color:"#0f766e",fontWeight:700}}>Ver →</td>
            </tr>))}
            {filtrado.length===0&&<tr><td colSpan={6} style={{padding:30,textAlign:"center",color:"#484f58"}}>Sin exportadoras</td></tr>}
          </tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"#000a",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"#1c2333",borderRadius:14,padding:24,maxWidth:520,width:"100%",border:"1px solid #30363d",maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <h3 style={{margin:"0 0 16px",color:"#e6edf3"}}>Nueva Exportadora</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["Nombre *","nombre"],["País","pais"],["Región","region"],["Contacto","contacto"],["Email","email"],["Teléfono","telefono"]].map(([l,f])=>(
                <div key={f}><div style={lblSt}>{l}</div><input value={form[f]||""} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))} style={inputSt}/></div>))}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button onClick={()=>setModal(false)} style={{padding:"8px 18px",borderRadius:8,border:"1px solid #30363d",background:"transparent",color:"#8b949e",cursor:"pointer"}}>Cancelar</button>
              <button onClick={guardar} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#0f766e",color:"#fff",cursor:"pointer",fontWeight:700}}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BUSINESS CLOSURE (Contratos cliente ↔ exportadora)
// ═══════════════════════════════════════════════════════════════════
function BusinessClosureModule({data, setData, clientes, exportadoras, can, temporada, especies=ESPECIES_FRISKU}) {
  const [modal, setModal] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const EMPTY={clienteId:"",clienteNombre:"",exportadoraId:"",exportadoraNombre:"",especie:"",variedad:"",presupuesto:0,comisionPct:0,condiciones:"",linkContrato:"",estado:"Negociación",temporada:temporada||""};
  const [form, setForm] = useState(EMPTY);
  const ESTADOS_BC=["Negociación","Propuesta enviada","Firmado","Vigente","Cerrado","Cancelado"];

  const filtrado = data.filter(c=>c.temporada===temporada);
  const ct = detalle ? data.find(c=>c.id===detalle) : null;
  const upd = (f,v) => setData(prev=>prev.map(c=>c.id===detalle?{...c,[f]:v}:c));

  function guardar(){
    if(!form.clienteId||!form.exportadoraId){alert("Cliente y Exportadora obligatorios.");return;}
    const cl=(clientes||[]).find(c=>c.id===form.clienteId);
    const ex=(exportadoras||[]).find(e=>e.id===form.exportadoraId);
    setData(prev=>[...prev,{...form,id:`fbc_${Date.now()}`,clienteNombre:cl?.nombre||"",exportadoraNombre:ex?.nombre||"",temporada}]);
    setForm(EMPTY);setModal(false);
  }

  if(ct) {
    const estCol=ct.estado==="Firmado"||ct.estado==="Vigente"?"#16a34a":ct.estado==="Cancelado"?"#dc2626":"#d97706";
    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <button onClick={()=>setDetalle(null)} style={{background:"#21283b",border:"1px solid #30363d",borderRadius:8,padding:"6px 14px",cursor:"pointer",color:"#8b949e",fontSize:12}}>← Volver</button>
          <h3 style={{margin:0,color:"#e6edf3",fontSize:16}}>📋 {ct.clienteNombre} ↔ {ct.exportadoraNombre}</h3>
          <span style={{fontSize:10,padding:"4px 12px",borderRadius:20,background:`${estCol}22`,color:estCol,fontWeight:700}}>{ct.estado}</span>
        </div>
        <div style={{padding:"10px 14px",background:"#1c2333",borderRadius:8,marginBottom:14,fontSize:11,color:"#8b949e",fontStyle:"italic"}}>
          📝 Acuerdo marco Cliente ↔ Exportadora. El programa comercial específico se define en el módulo <strong style={{color:"#2563eb"}}>Programas Comerciales</strong>.
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div><div style={lblSt}>Cliente</div><div style={{fontSize:14,fontWeight:700,color:"#e6edf3"}}>{ct.clienteNombre}</div></div>
          <div><div style={lblSt}>Exportadora</div><div style={{fontSize:14,fontWeight:700,color:"#e6edf3"}}>{ct.exportadoraNombre}</div></div>
          <div>
            <div style={lblSt}>Especie</div>
            <select disabled={!can} value={ct.especie||""} onChange={e=>upd("especie",e.target.value)} style={inputSt}>
              <option value="">—</option>
              {especies.map(e=><option key={e}>{e}</option>)}
            </select>
          </div>
          <div><div style={lblSt}>Variedad</div><input disabled={!can} value={ct.variedad||""} onChange={e=>upd("variedad",e.target.value)} style={inputSt}/></div>
          <div><div style={lblSt}>Estado</div><select disabled={!can} value={ct.estado||""} onChange={e=>upd("estado",e.target.value)} style={inputSt}>{ESTADOS_BC.map(s=><option key={s}>{s}</option>)}</select></div>
          <div><div style={lblSt}>Comisión Frisku %</div><input type="number" step="0.1" disabled={!can} value={ct.comisionPct||""} onChange={e=>upd("comisionPct",parseFloat(e.target.value)||0)} style={inputSt}/></div>
          <div><div style={lblSt}>Presupuesto temporada (USD)</div><input type="number" disabled={!can} value={ct.presupuesto||""} onChange={e=>upd("presupuesto",parseFloat(e.target.value)||0)} style={inputSt}/></div>
          <div><div style={lblSt}>📎 Link contrato</div>
            <div style={{display:"flex",gap:6}}><input disabled={!can} value={ct.linkContrato||""} onChange={e=>upd("linkContrato",e.target.value)} placeholder="https://..." style={{...inputSt,flex:1}}/>
            {ct.linkContrato&&<a href={ct.linkContrato} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"#0ea5e9"}}>📄</a>}</div></div>
          <div style={{gridColumn:"1/-1"}}><div style={lblSt}>Condiciones generales del acuerdo</div><textarea disabled={!can} value={ct.condiciones||""} onChange={e=>upd("condiciones",e.target.value)} placeholder="Términos, condiciones de pago, exclusividad, plazos, etc..." style={{...inputSt,minHeight:60}}/></div>
        </div>
      </div>
    );
  }

  return(
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
        {can&&<button onClick={()=>{setForm({...EMPTY,temporada});setModal(true);}} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:700,fontSize:12}}>+ Nuevo Business Closure</button>}
      </div>
      <div style={{overflowX:"auto",borderRadius:10,border:"1px solid #30363d"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:"#161b22"}}>{["Cliente","Exportadora","Especie","Variedad","Comisión","Estado",""].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#8b949e",fontWeight:700,fontSize:10}}>{h}</th>)}</tr></thead>
          <tbody>{filtrado.map(c=>{
            const estCol=c.estado==="Firmado"||c.estado==="Vigente"?"#16a34a":c.estado==="Cancelado"?"#dc2626":"#d97706";
            return(
            <tr key={c.id} onClick={()=>setDetalle(c.id)} style={{borderBottom:"1px solid #30363d22",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#7c3aed11"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <td style={{padding:"6px 10px",fontWeight:600,color:"#e6edf3"}}>{c.clienteNombre}</td>
              <td style={{padding:"6px 10px",color:"#8b949e"}}>{c.exportadoraNombre}</td>
              <td style={{padding:"6px 10px"}}><span style={{fontSize:9,background:"#0ea5e922",color:"#0ea5e9",padding:"1px 6px",borderRadius:10,fontWeight:600}}>{c.especie}</span></td>
              <td style={{padding:"6px 10px",color:"#8b949e"}}>{c.variedad||"—"}</td>
              <td style={{padding:"6px 10px",fontWeight:700}}>{c.comisionPct||0}%</td>
              <td style={{padding:"6px 10px"}}><span style={{fontSize:9,padding:"2px 8px",borderRadius:10,fontWeight:700,background:`${estCol}22`,color:estCol}}>{c.estado}</span></td>
              <td style={{padding:"6px 10px",color:"#7c3aed",fontWeight:700}}>Ver →</td>
            </tr>);})}
            {filtrado.length===0&&<tr><td colSpan={7} style={{padding:30,textAlign:"center",color:"#484f58"}}>Sin business closures para esta temporada</td></tr>}
          </tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"#000a",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"#1c2333",borderRadius:14,padding:24,maxWidth:520,width:"100%",border:"1px solid #30363d"}} onClick={e=>e.stopPropagation()}>
            <h3 style={{margin:"0 0 16px",color:"#e6edf3"}}>Nuevo Business Closure</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><div style={lblSt}>Cliente *</div><select value={form.clienteId} onChange={e=>setForm(p=>({...p,clienteId:e.target.value}))} style={inputSt}><option value="">—</option>{(clientes||[]).map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
              <div><div style={lblSt}>Exportadora *</div><select value={form.exportadoraId} onChange={e=>setForm(p=>({...p,exportadoraId:e.target.value}))} style={inputSt}><option value="">—</option>{(exportadoras||[]).map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>
              <div><div style={lblSt}>Especie</div><select value={form.especie} onChange={e=>setForm(p=>({...p,especie:e.target.value}))} style={inputSt}><option value="">—</option>{especies.map(e=><option key={e}>{e}</option>)}</select></div>
              <div><div style={lblSt}>Variedad</div><input value={form.variedad||""} onChange={e=>setForm(p=>({...p,variedad:e.target.value}))} style={inputSt}/></div>
              <div><div style={lblSt}>Comisión %</div><input type="number" step="0.1" value={form.comisionPct||""} onChange={e=>setForm(p=>({...p,comisionPct:parseFloat(e.target.value)||0}))} style={inputSt}/></div>
              <div><div style={lblSt}>Estado</div><select value={form.estado} onChange={e=>setForm(p=>({...p,estado:e.target.value}))} style={inputSt}>{ESTADOS_BC.map(s=><option key={s}>{s}</option>)}</select></div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button onClick={()=>setModal(false)} style={{padding:"8px 18px",borderRadius:8,border:"1px solid #30363d",background:"transparent",color:"#8b949e",cursor:"pointer"}}>Cancelar</button>
              <button onClick={guardar} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#7c3aed",color:"#fff",cursor:"pointer",fontWeight:700}}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EMBARQUES & COMEX (Orden + Docs + Despacho + Alertas)
// ═══════════════════════════════════════════════════════════════════
function EmbarquesCOMEXModule({data, setData, clientes, exportadoras, contratos, programasComerciales=[], can, temporada, especies=ESPECIES_FRISKU}) {
  const [busq, setBusq] = useState("");
  const [modal, setModal] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [tab, setTab] = useState("orden");
  const EMPTY={contenedor:"",exportadoraId:"",exportadora:"",clienteId:"",cliente:"",contratoOrigenId:"",programaComercialId:"",especie:"",destino:"",via:"Marítimo",etd:"",eta:"",estado:"Programado",temporada:temporada||"",notas:""};
  const [form, setForm] = useState(EMPTY);
  const ESTADOS_EMB=["Programado","Orden enviada","En carga","Despachado","En tránsito","Llegado","QC Destino","Liquidado","Cerrado"];
  const DOCS_KEYS=[{key:"bl",label:"BL (Bill of Lading)"},{key:"factura",label:"Factura"},{key:"fitosanitario",label:"Fitosanitario"},{key:"certOrigen",label:"Certificado de Origen"},{key:"packingList",label:"Packing List"},{key:"certGrower",label:"Cert. Grower"},{key:"certPackHouse",label:"Cert. Pack House"},{key:"clientApproval",label:"Client Approval"},{key:"analisisResiduos",label:"Análisis de Residuos"},{key:"ppul",label:"PPUL"},{key:"sprayRecords",label:"Spray Records"}];

  // Filtrar contratos vigentes para el dropdown de selección
  const contratosVigentes = (contratos||[]).filter(c=>c.temporada===temporada && (c.estado==="Firmado"||c.estado==="Vigente"));

  // Programas activos para la temporada (Solicitado, En asignación, Activo)
  const programasActivos = (programasComerciales||[]).filter(p =>
    p.temporada===temporada && p.estado!=="Cerrado" && p.estado!=="Cancelado"
  );

  // BCs filtrados para el select del modal:
  // - Si hay programa elegido: solo BCs cuyo exportadoraId esté asignado a ese programa
  // - Si no: todos los BCs vigentes
  const programaElegido = (programasComerciales||[]).find(p=>p.id===form.programaComercialId);
  const bcsParaSelect = programaElegido
    ? contratosVigentes.filter(c =>
        c.clienteId===programaElegido.clienteId &&
        (programaElegido.asignaciones||[]).some(a=>a.exportadoraId===c.exportadoraId)
      )
    : contratosVigentes;

  // Cuando elige programa, pre-llena cliente/especie y limpia BC/exportadora (porque depende del programa)
  function setProgramaElegido(progId){
    const pg = (programasComerciales||[]).find(p=>p.id===progId);
    if(!pg){
      setForm(p=>({...p,programaComercialId:"",contratoOrigenId:"",exportadoraId:"",exportadora:""}));
      return;
    }
    setForm(p=>({...p,
      programaComercialId: progId,
      clienteId: pg.clienteId, cliente: pg.clienteNombre||"",
      especie: pg.especie||p.especie,
      contratoOrigenId: "",  // resetea para que elija un BC dentro del programa
      exportadoraId: "", exportadora: "",
    }));
  }

  // Cuando elige contrato, pre-llena cliente/exportadora/especie
  function setContratoElegido(contId){
    const ct=(contratos||[]).find(c=>c.id===contId);
    if(!ct){setForm(p=>({...p,contratoOrigenId:""}));return;}
    setForm(p=>({...p,
      contratoOrigenId:contId,
      clienteId:ct.clienteId, cliente:ct.clienteNombre||"",
      exportadoraId:ct.exportadoraId, exportadora:ct.exportadoraNombre||"",
      especie:ct.especie||"",
    }));
  }

  const filtrado = data.filter(e=>{
    if(e.temporada!==temporada) return false;
    if(!busq) return true;
    const cl=(clientes||[]).find(c=>c.id===e.clienteId)?.nombre||e.cliente||"";
    const ex=(exportadoras||[]).find(x=>x.id===e.exportadoraId)?.nombre||e.exportadora||"";
    return e.contenedor?.toLowerCase().includes(busq.toLowerCase())||ex.toLowerCase().includes(busq.toLowerCase())||cl.toLowerCase().includes(busq.toLowerCase());
  });
  const emb = detalle ? data.find(e=>e.id===detalle) : null;
  const upd = (f,v) => setData(prev=>prev.map(e=>e.id===detalle?{...e,[f]:v}:e));

  function guardar(){
    if(!form.contenedor){alert("N° contenedor obligatorio.");return;}
    if(!form.clienteId&&!form.exportadoraId&&!form.contratoOrigenId){
      if(!window.confirm("Este embarque no está asociado a un contrato vigente. ¿Crear igual?")) return;
    }
    setData(prev=>[...prev,{...form,id:`femb_${Date.now()}`,temporada}]);
    setForm(EMPTY);setModal(false);
  }

  if(emb) {
    const docsCompletos = DOCS_KEYS.slice(0,5).filter(d=>emb[d.key]).length;
    const docsTotales = 5;
    const TABS_EMB=[{id:"orden",label:"📋 Orden"},{id:"docs",label:`📄 Docs (${docsCompletos}/${docsTotales})`},{id:"tracking",label:"🚛 Tracking"},{id:"qc",label:"🔍 QC"}];
    return(
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>{setDetalle(null);setTab("orden");}} style={{background:"#21283b",border:"1px solid #30363d",borderRadius:8,padding:"6px 14px",cursor:"pointer",color:"#8b949e",fontSize:12}}>← Volver</button>
            <h3 style={{margin:0,color:"#e6edf3",fontSize:16}}>🚢 {emb.contenedor}</h3>
          </div>
          <div style={{display:"flex",gap:6}}>
            <span style={{fontSize:10,padding:"4px 12px",borderRadius:20,background:"#0ea5e922",color:"#0ea5e9",fontWeight:700}}>{emb.via}</span>
            <span style={{fontSize:10,padding:"4px 12px",borderRadius:20,background:emb.estado==="Llegado"||emb.estado==="Cerrado"?"#16a34a22":"#d9770622",color:emb.estado==="Llegado"||emb.estado==="Cerrado"?"#16a34a":"#d97706",fontWeight:700}}>{emb.estado}</span>
            {docsCompletos<docsTotales&&<span style={{fontSize:10,padding:"4px 12px",borderRadius:20,background:"#fef3c7",color:"#92400e",fontWeight:700}}>⚠️ {docsTotales-docsCompletos} docs faltan</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
          {TABS_EMB.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 16px",borderRadius:8,border:tab===t.id?"2px solid #0ea5e9":"1px solid #30363d",background:tab===t.id?"#0ea5e9":"transparent",color:tab===t.id?"#fff":"#8b949e",cursor:"pointer",fontSize:12,fontWeight:700}}>{t.label}</button>)}
        </div>
        {tab==="orden"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
            <div><div style={lblSt}>N° Contenedor</div><input disabled={!can} value={emb.contenedor||""} onChange={e=>upd("contenedor",e.target.value)} style={inputSt}/></div>
            <div>
              <div style={lblSt}>Cliente</div>
              <select disabled={!can} value={emb.clienteId||""} onChange={e=>{
                const cl=(clientes||[]).find(c=>c.id===e.target.value);
                upd("clienteId",e.target.value); upd("cliente",cl?.nombre||"");
              }} style={inputSt}>
                <option value="">—</option>
                {(clientes||[]).map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <div style={lblSt}>Exportadora</div>
              <select disabled={!can} value={emb.exportadoraId||""} onChange={e=>{
                const ex=(exportadoras||[]).find(x=>x.id===e.target.value);
                upd("exportadoraId",e.target.value); upd("exportadora",ex?.nombre||"");
              }} style={inputSt}>
                <option value="">—</option>
                {(exportadoras||[]).map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}
              </select>
            </div>
            <div>
              <div style={lblSt}>Especie</div>
              <select disabled={!can} value={emb.especie||""} onChange={e=>upd("especie",e.target.value)} style={inputSt}>
                <option value="">—</option>
                {especies.map(e=><option key={e}>{e}</option>)}
              </select>
            </div>
            <div><div style={lblSt}>Destino</div><input disabled={!can} value={emb.destino||""} onChange={e=>upd("destino",e.target.value)} style={inputSt}/></div>
            <div><div style={lblSt}>Naviera</div><input disabled={!can} value={emb.naviera||""} onChange={e=>upd("naviera",e.target.value)} style={inputSt}/></div>
            <div><div style={lblSt}>Booking</div><input disabled={!can} value={emb.booking||""} onChange={e=>upd("booking",e.target.value)} style={inputSt}/></div>
            <div><div style={lblSt}>Vía</div><select disabled={!can} value={emb.via||"Marítimo"} onChange={e=>upd("via",e.target.value)} style={inputSt}><option>Marítimo</option><option>Aéreo</option></select></div>
            <div><div style={lblSt}>Estado</div><select disabled={!can} value={emb.estado} onChange={e=>upd("estado",e.target.value)} style={inputSt}>{ESTADOS_EMB.map(s=><option key={s}>{s}</option>)}</select></div>
            <div><div style={lblSt}>ETD</div><DateInput disabled={!can} value={emb.etd||""} onChange={v=>upd("etd",v)} style={inputSt}/></div>
            <div><div style={lblSt}>ETA</div><DateInput disabled={!can} value={emb.eta||""} onChange={v=>upd("eta",v)} style={inputSt}/></div>
            {emb.programaComercialId&&(()=>{
              const pg=(programasComerciales||[]).find(p=>p.id===emb.programaComercialId);
              if(!pg) return null;
              return <div style={{gridColumn:"1/-1",padding:"8px 12px",background:"#2563eb11",border:"1px solid #2563eb44",borderRadius:8,fontSize:11,color:"#60a5fa"}}>📊 Programa: {pg.clienteNombre} · {pg.especie}{pg.variedad?` (${pg.variedad})`:""} · W{pg.semanaIni}-W{pg.semanaFin}</div>;
            })()}
            {emb.contratoOrigenId&&(()=>{
              const ct=(contratos||[]).find(c=>c.id===emb.contratoOrigenId);
              if(!ct) return null;
              return <div style={{gridColumn:"1/-1",padding:"8px 12px",background:"#7c3aed11",border:"1px solid #7c3aed44",borderRadius:8,fontSize:11,color:"#a78bfa"}}>📋 Contrato origen: {ct.clienteNombre} ↔ {ct.exportadoraNombre} · Comisión {ct.comisionPct}%</div>;
            })()}
            <div style={{gridColumn:"1/-1"}}><div style={lblSt}>Notas</div><textarea disabled={!can} value={emb.notas||""} onChange={e=>upd("notas",e.target.value)} style={{...inputSt,minHeight:50}}/></div>
          </div>
        )}
        {tab==="docs"&&(
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#e6edf3",marginBottom:12}}>📄 Documentos del embarque</div>
            {DOCS_KEYS.map(d=>{
              const tiene = !!emb[d.key];
              return(
                <div key={d.key} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0",borderBottom:"1px solid #30363d22"}}>
                  <span style={{fontSize:14}}>{tiene?"✅":"⬜"}</span>
                  <span style={{fontSize:12,fontWeight:600,color:"#e6edf3",flex:1,minWidth:180}}>{d.label}</span>
                  <input disabled={!can} value={emb[d.key]||""} placeholder="N° o link..." onChange={e=>upd(d.key,e.target.value)}
                    style={{...inputSt,flex:2,maxWidth:300}}/>
                  {emb[d.key]&&emb[d.key].startsWith("http")&&<a href={emb[d.key]} target="_blank" rel="noopener noreferrer" style={{fontSize:12}}>📎</a>}
                </div>);
            })}
          </div>
        )}
        {tab==="tracking"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div><div style={lblSt}>Fecha despacho</div><DateInput disabled={!can} value={emb.fechaDespacho||""} onChange={v=>upd("fechaDespacho",v)} style={inputSt}/></div>
            <div><div style={lblSt}>Puerto embarque</div><input disabled={!can} value={emb.puertoEmbarque||""} onChange={e=>upd("puertoEmbarque",e.target.value)} style={inputSt}/></div>
            <div><div style={lblSt}>Fecha llegada</div><DateInput disabled={!can} value={emb.fechaLlegada||""} onChange={v=>upd("fechaLlegada",v)} style={inputSt}/></div>
            <div><div style={lblSt}>Puerto destino</div><input disabled={!can} value={emb.puertoDestino||""} onChange={e=>upd("puertoDestino",e.target.value)} style={inputSt}/></div>
            <div style={{gridColumn:"1/-1"}}><div style={lblSt}>Loading Update</div><textarea disabled={!can} value={emb.loadingUpdate||""} onChange={e=>upd("loadingUpdate",e.target.value)} placeholder="Actualización de carga para el cliente..." style={{...inputSt,minHeight:60}}/></div>
          </div>
        )}
        {tab==="qc"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div><div style={lblSt}>QC Origen</div><textarea disabled={!can} value={emb.qcOrigen||""} onChange={e=>upd("qcOrigen",e.target.value)} style={{...inputSt,minHeight:60}}/></div>
            <div><div style={lblSt}>QC Destino</div><textarea disabled={!can} value={emb.qcDestino||""} onChange={e=>upd("qcDestino",e.target.value)} style={{...inputSt,minHeight:60}}/></div>
            <div style={{gridColumn:"1/-1"}}><div style={lblSt}>Advance Request</div><textarea disabled={!can} value={emb.advanceRequest||""} onChange={e=>upd("advanceRequest",e.target.value)} placeholder="Solicitud de advance para cliente × exportadora..." style={{...inputSt,minHeight:50}}/></div>
          </div>
        )}
      </div>
    );
  }

  return(
    <div>
      <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input value={busq} onChange={e=>setBusq(e.target.value)} placeholder="🔍 Buscar embarque..." style={{...inputSt,flex:1,minWidth:200}}/>
        {can&&<button onClick={()=>{setForm({...EMPTY,temporada});setModal(true);}} style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:700,fontSize:12}}>+ Nuevo Embarque</button>}
      </div>
      <div style={{overflowX:"auto",borderRadius:10,border:"1px solid #30363d"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:"#161b22"}}>{["Contenedor","Exportadora","Cliente","Especie","Destino","Vía","Estado","Docs",""].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#8b949e",fontWeight:700,fontSize:10}}>{h}</th>)}</tr></thead>
          <tbody>{filtrado.map(e=>{
            const docs=DOCS_KEYS.slice(0,5).filter(d=>e[d.key]).length;
            const clNombre=(clientes||[]).find(c=>c.id===e.clienteId)?.nombre || e.cliente || "—";
            const exNombre=(exportadoras||[]).find(x=>x.id===e.exportadoraId)?.nombre || e.exportadora || "—";
            return(
            <tr key={e.id} onClick={()=>setDetalle(e.id)} style={{borderBottom:"1px solid #30363d22",cursor:"pointer"}} onMouseEnter={ev=>ev.currentTarget.style.background="#0ea5e911"} onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
              <td style={{padding:"6px 10px",fontWeight:700,color:"#e6edf3",fontFamily:"monospace"}}>{e.contenedor}</td>
              <td style={{padding:"6px 10px",color:"#8b949e"}}>{exNombre}</td>
              <td style={{padding:"6px 10px",color:"#8b949e"}}>{clNombre}</td>
              <td style={{padding:"6px 10px"}}><span style={{fontSize:9,background:"#0ea5e922",color:"#0ea5e9",padding:"1px 6px",borderRadius:10,fontWeight:600}}>{e.especie}</span></td>
              <td style={{padding:"6px 10px",color:"#8b949e"}}>{e.destino||"—"}</td>
              <td style={{padding:"6px 10px"}}><span style={{fontSize:9,padding:"2px 6px",borderRadius:8,background:e.via==="Aéreo"?"#d9770622":"#0ea5e922",color:e.via==="Aéreo"?"#d97706":"#0ea5e9"}}>{e.via}</span></td>
              <td style={{padding:"6px 10px"}}><span style={{fontSize:9,padding:"2px 8px",borderRadius:10,fontWeight:700,background:e.estado==="Llegado"||e.estado==="Cerrado"?"#16a34a22":"#d9770622",color:e.estado==="Llegado"||e.estado==="Cerrado"?"#16a34a":"#d97706"}}>{e.estado}</span></td>
              <td style={{padding:"6px 10px"}}><span style={{fontSize:9,fontWeight:700,color:docs===5?"#16a34a":"#d97706"}}>{docs}/5</span></td>
              <td style={{padding:"6px 10px",color:"#0ea5e9",fontWeight:700}}>Ver →</td>
            </tr>);})}
            {filtrado.length===0&&<tr><td colSpan={9} style={{padding:30,textAlign:"center",color:"#484f58"}}>Sin embarques</td></tr>}
          </tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"#000a",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"#1c2333",borderRadius:14,padding:24,maxWidth:560,width:"100%",border:"1px solid #30363d",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <h3 style={{margin:"0 0 16px",color:"#e6edf3"}}>Nuevo Embarque</h3>
            <div style={{display:"grid",gap:12}}>
              <div>
                <div style={lblSt}>Programa Comercial (opcional)</div>
                <select value={form.programaComercialId||""} onChange={e=>setProgramaElegido(e.target.value)} style={inputSt}>
                  <option value="">— Sin programa (carga libre)</option>
                  {programasActivos.map(p=>(
                    <option key={p.id} value={p.id}>
                      {p.clienteNombre} · {p.especie}{p.variedad?` (${p.variedad})`:""} · W{p.semanaIni}-W{p.semanaFin}
                    </option>
                  ))}
                </select>
                {programasActivos.length===0&&<div style={{fontSize:10,color:"#8b949e",marginTop:4,fontStyle:"italic"}}>Sin programas comerciales activos. Puedes crear el embarque sin programa.</div>}
              </div>
              <div>
                <div style={lblSt}>Contrato origen (Business Closure)</div>
                <select value={form.contratoOrigenId||""} onChange={e=>setContratoElegido(e.target.value)} style={inputSt}>
                  <option value="">— Sin contrato (manual)</option>
                  {bcsParaSelect.map(c=><option key={c.id} value={c.id}>{c.clienteNombre} ↔ {c.exportadoraNombre} · {c.especie} · {c.comisionPct}%</option>)}
                </select>
                {form.programaComercialId&&bcsParaSelect.length>0&&<div style={{fontSize:10,color:"#2563eb",marginTop:4,fontStyle:"italic"}}>Mostrando solo BCs de exportadoras asignadas al programa</div>}
                {contratosVigentes.length===0&&<div style={{fontSize:10,color:"#d97706",marginTop:4,fontStyle:"italic"}}>⚠️ Sin contratos vigentes en temporada {temporada}</div>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <div style={lblSt}>N° Contenedor *</div>
                  <input value={form.contenedor||""} onChange={e=>setForm(p=>({...p,contenedor:e.target.value}))} style={inputSt} autoFocus/>
                </div>
                <div>
                  <div style={lblSt}>Vía</div>
                  <select value={form.via||"Marítimo"} onChange={e=>setForm(p=>({...p,via:e.target.value}))} style={inputSt}><option>Marítimo</option><option>Aéreo</option></select>
                </div>
                <div>
                  <div style={lblSt}>Cliente</div>
                  <select disabled={!!form.contratoOrigenId||!!form.programaComercialId} value={form.clienteId||""} onChange={e=>{
                    const cl=(clientes||[]).find(c=>c.id===e.target.value);
                    setForm(p=>({...p,clienteId:e.target.value,cliente:cl?.nombre||""}));
                  }} style={inputSt}>
                    <option value="">—</option>
                    {(clientes||[]).map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <div style={lblSt}>Exportadora</div>
                  <select disabled={!!form.contratoOrigenId} value={form.exportadoraId||""} onChange={e=>{
                    const ex=(exportadoras||[]).find(x=>x.id===e.target.value);
                    setForm(p=>({...p,exportadoraId:e.target.value,exportadora:ex?.nombre||""}));
                  }} style={inputSt}>
                    <option value="">—</option>
                    {(exportadoras||[]).map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <div style={lblSt}>Especie</div>
                  <select disabled={!!form.contratoOrigenId||!!form.programaComercialId} value={form.especie||""} onChange={e=>setForm(p=>({...p,especie:e.target.value}))} style={inputSt}>
                    <option value="">—</option>
                    {especies.map(e=><option key={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <div style={lblSt}>Destino</div>
                  <input value={form.destino||""} onChange={e=>setForm(p=>({...p,destino:e.target.value}))} style={inputSt}/>
                </div>
              </div>
              {form.programaComercialId&&<div style={{fontSize:10,color:"#2563eb",fontStyle:"italic"}}>✓ Vinculado a programa comercial · cliente y especie pre-cargados</div>}
              {form.contratoOrigenId&&<div style={{fontSize:10,color:"#16a34a",fontStyle:"italic"}}>✓ Cliente, exportadora y especie pre-cargados del contrato</div>}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button onClick={()=>setModal(false)} style={{padding:"8px 18px",borderRadius:8,border:"1px solid #30363d",background:"transparent",color:"#8b949e",cursor:"pointer"}}>Cancelar</button>
              <button onClick={guardar} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#0ea5e9",color:"#fff",cursor:"pointer",fontWeight:700}}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LIQUIDACIONES & COBROS
// ═══════════════════════════════════════════════════════════════════
// ─── Helpers Liquidación ───
function totalComisionLiq(liq){
  if(!liq||!Array.isArray(liq.lineasComision)) return 0;
  return liq.lineasComision.reduce((sum,ln)=>sum + (parseFloat(ln.monto)||0), 0);
}
function liquidoALiquidar(liq){
  const venta = parseFloat(liq?.montoVentaUSD)||0;
  return venta - totalComisionLiq(liq);
}
// 3 tipos base + custom
const TIPOS_LINEA_BASE = [
  {tipo:"comision_venta", label:"Comisión sobre venta", esPct:true, defaultPct:3},
  {tipo:"advance_fee",    label:"Advance Fee",          esPct:false},
  {tipo:"bonificacion",   label:"Bonificación",         esPct:false},
];

function LiquidacionesCobrosModule({data, setData, cobros, setCobros, embarques, contratos, clientes, exportadoras, can, temporada}) {
  const [tab, setTab] = useState("liquidaciones");
  const [modal, setModal] = useState(false);
  const [modalType, setModalType] = useState("liq");
  const [form, setForm] = useState({});
  const [detalle, setDetalle] = useState(null); // ID liquidación abierta

  const TABS=[{id:"liquidaciones",label:"💰 Liquidaciones"},{id:"cobros",label:"📥 Cobros Comisión"}];

  // Pre-llenar líneas base al elegir embarque
  function setEmbarqueElegido(embId){
    const emb=(embarques||[]).find(e=>e.id===embId);
    if(!emb){setForm(p=>({...p,embarqueId:""}));return;}
    // Buscar contrato del cliente×exportadora para sacar comisión%
    const contrato=(contratos||[]).find(c=>c.clienteId===emb.clienteId && c.exportadoraId===emb.exportadoraId && c.temporada===temporada);
    const pctDefault = contrato?.comisionPct || 3;
    const lineas = [
      {id:`ln_${Date.now()}_1`, tipo:"comision_venta", label:"Comisión sobre venta", esPct:true, pct:pctDefault, monto:0},
      {id:`ln_${Date.now()}_2`, tipo:"advance_fee",    label:"Advance Fee",          esPct:false, monto:0},
      {id:`ln_${Date.now()}_3`, tipo:"bonificacion",   label:"Bonificación",         esPct:false, monto:0},
    ];
    setForm(p=>({...p, embarqueId:embId, montoVentaUSD:0, lineasComision:lineas, contratoOrigenId: contrato?.id||"", observaciones:""}));
  }

  // Recalcular monto cuando cambia % o venta
  function recalcLineas(lineas, ventaUSD){
    return (lineas||[]).map(ln=>{
      if(ln.esPct){
        const pct=parseFloat(ln.pct)||0;
        return {...ln, monto: Math.round(ventaUSD*pct/100*100)/100};
      }
      return ln;
    });
  }
  function updVenta(v){
    const venta=parseFloat(v)||0;
    setForm(p=>({...p, montoVentaUSD:venta, lineasComision: recalcLineas(p.lineasComision, venta)}));
  }
  function updLineaPct(idx, pct){
    setForm(p=>{
      const lns=[...(p.lineasComision||[])];
      const venta=parseFloat(p.montoVentaUSD)||0;
      lns[idx]={...lns[idx], pct: parseFloat(pct)||0, monto: Math.round(venta*(parseFloat(pct)||0)/100*100)/100};
      return {...p, lineasComision: lns};
    });
  }
  function updLineaMonto(idx, monto){
    setForm(p=>{
      const lns=[...(p.lineasComision||[])];
      lns[idx]={...lns[idx], monto: parseFloat(monto)||0};
      return {...p, lineasComision: lns};
    });
  }
  function updLineaLabel(idx, label){
    setForm(p=>{
      const lns=[...(p.lineasComision||[])];
      lns[idx]={...lns[idx], label};
      return {...p, lineasComision: lns};
    });
  }
  function addLineaCustom(){
    setForm(p=>({...p, lineasComision: [...(p.lineasComision||[]), {id:`ln_${Date.now()}`, tipo:"custom", label:"Otro concepto", esPct:false, monto:0}]}));
  }
  function delLinea(idx){
    setForm(p=>{
      const lns=[...(p.lineasComision||[])];
      lns.splice(idx,1);
      return {...p, lineasComision: lns};
    });
  }

  function guardarLiq(){
    const emb=(embarques||[]).find(e=>e.id===form.embarqueId);
    if(!emb){alert("Selecciona un embarque.");return;}
    if(!form.lineasComision||form.lineasComision.length===0){alert("Agrega al menos una línea de comisión.");return;}
    const cl=(clientes||[]).find(c=>c.id===emb.clienteId);
    const ex=(exportadoras||[]).find(x=>x.id===emb.exportadoraId);
    const totalCom = totalComisionLiq(form);
    const liqData={
      ...form,
      id:`fliq_${Date.now()}`,
      temporada,
      contenedor:emb.contenedor,
      clienteId: emb.clienteId, clienteNombre: cl?.nombre||emb.cliente||"",
      exportadoraId: emb.exportadoraId, exportadoraNombre: ex?.nombre||emb.exportadora||"",
      embarqueRefId: emb.id,
      fechaCreacion:new Date().toISOString().slice(0,10),
      totalComisionUSD: totalCom,
      liquidoUSD: liquidoALiquidar(form),
      estado: form.estado||"Pendiente",
    };
    setData(prev=>[...prev, liqData]);
    // Generar cobro automático para Frisku al crearse la liquidación
    const cobroAuto={
      id:`fcob_${Date.now()}_auto`,
      temporada,
      concepto: `Comisión embarque ${emb.contenedor} — ${cl?.nombre||""}`,
      montoUSD: totalCom,
      nFactura:"",
      fechaCobro:"",
      estado:"Pendiente",
      liquidacionRefId: liqData.id,
      embarqueRefId: emb.id,
      origen: "auto-liquidacion",
      fechaCreacion: new Date().toISOString().slice(0,10),
    };
    setCobros(prev=>[...prev, cobroAuto]);
    setForm({});setModal(false);
  }
  function guardarCobro(){
    if(!form.concepto){alert("Concepto obligatorio.");return;}
    setCobros(prev=>[...prev,{...form,id:`fcob_${Date.now()}`,temporada,fechaCreacion:new Date().toISOString().slice(0,10),origen:"manual"}]);
    setForm({});setModal(false);
  }

  // Detalle de una liquidación
  const liqDetalle = detalle ? (data||[]).find(l=>l.id===detalle) : null;
  function updLiqDetalle(f,v){
    setData(prev=>prev.map(l=>{
      if(l.id!==detalle) return l;
      const nl={...l,[f]:v};
      // Recalcular totales
      if(f==="lineasComision"||f==="montoVentaUSD"){
        nl.totalComisionUSD = totalComisionLiq(nl);
        nl.liquidoUSD = liquidoALiquidar(nl);
      }
      return nl;
    }));
  }

  if(liqDetalle) {
    const lns = liqDetalle.lineasComision||[];
    const totalCom = totalComisionLiq(liqDetalle);
    const liquido = (parseFloat(liqDetalle.montoVentaUSD)||0) - totalCom;
    return (
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
          <button onClick={()=>setDetalle(null)} style={{background:"#21283b",border:"1px solid #30363d",borderRadius:8,padding:"6px 14px",cursor:"pointer",color:"#8b949e",fontSize:12}}>← Volver</button>
          <h3 style={{margin:0,color:"#e6edf3",fontSize:16}}>💰 Liquidación {liqDetalle.contenedor}</h3>
          <span style={{fontSize:10,padding:"4px 12px",borderRadius:20,background:"#d9770622",color:"#d97706",fontWeight:700}}>{liqDetalle.estado||"Pendiente"}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
          <div><div style={lblSt}>Cliente</div><div style={{fontSize:13,fontWeight:700,color:"#e6edf3"}}>{liqDetalle.clienteNombre||"—"}</div></div>
          <div><div style={lblSt}>Exportadora</div><div style={{fontSize:13,fontWeight:700,color:"#e6edf3"}}>{liqDetalle.exportadoraNombre||"—"}</div></div>
          <div><div style={lblSt}>Contenedor</div><div style={{fontSize:13,fontFamily:"monospace",color:"#e6edf3"}}>{liqDetalle.contenedor}</div></div>
          <div><div style={lblSt}>Fecha creación</div><div style={{fontSize:13,color:"#8b949e"}}>{liqDetalle.fechaCreacion}</div></div>
          <div>
            <div style={lblSt}>Monto venta USD</div>
            <input type="number" disabled={!can} value={liqDetalle.montoVentaUSD||""} onChange={e=>{
              const venta=parseFloat(e.target.value)||0;
              const recal=(liqDetalle.lineasComision||[]).map(ln=>{
                if(ln.esPct){
                  const pct=parseFloat(ln.pct)||0;
                  return {...ln, monto: Math.round(venta*pct/100*100)/100};
                }
                return ln;
              });
              setData(prev=>prev.map(l=>l.id===detalle?{...l,montoVentaUSD:venta,lineasComision:recal,totalComisionUSD:recal.reduce((s,ln)=>s+(parseFloat(ln.monto)||0),0),liquidoUSD: venta - recal.reduce((s,ln)=>s+(parseFloat(ln.monto)||0),0)}:l));
            }} style={inputSt}/>
          </div>
          <div><div style={lblSt}>Estado</div><select disabled={!can} value={liqDetalle.estado||"Pendiente"} onChange={e=>updLiqDetalle("estado",e.target.value)} style={inputSt}>
            <option>Pendiente</option><option>Liquidada</option><option>Cobrada</option><option>Pagada</option>
          </select></div>
        </div>

        <div style={{fontSize:13,fontWeight:700,color:"#e6edf3",marginBottom:10,marginTop:6}}>📊 Líneas de comisión</div>
        <div style={{overflowX:"auto",borderRadius:8,border:"1px solid #30363d",marginBottom:14}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#161b22"}}>{["Concepto","%","Monto USD",""].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#8b949e",fontWeight:700,fontSize:10}}>{h}</th>)}</tr></thead>
            <tbody>{lns.map((ln,idx)=>(
              <tr key={ln.id} style={{borderBottom:"1px solid #30363d22"}}>
                <td style={{padding:"4px 10px"}}>
                  {ln.tipo==="custom"?
                    <input disabled={!can} value={ln.label} onChange={e=>{
                      const nl=[...lns]; nl[idx]={...nl[idx],label:e.target.value};
                      updLiqDetalle("lineasComision",nl);
                    }} style={{...inputSt,padding:"4px 6px"}}/>
                    :<span style={{color:"#e6edf3",fontWeight:600}}>{ln.label}</span>
                  }
                </td>
                <td style={{padding:"4px 10px"}}>
                  {ln.esPct?
                    <input type="number" step="0.1" disabled={!can} value={ln.pct||""} onChange={e=>{
                      const pct=parseFloat(e.target.value)||0;
                      const venta=parseFloat(liqDetalle.montoVentaUSD)||0;
                      const nl=[...lns]; nl[idx]={...nl[idx],pct,monto:Math.round(venta*pct/100*100)/100};
                      updLiqDetalle("lineasComision",nl);
                    }} style={{...inputSt,padding:"4px 6px",maxWidth:80}}/>
                    :<span style={{color:"#8b949e"}}>—</span>
                  }
                </td>
                <td style={{padding:"4px 10px"}}>
                  {ln.esPct?
                    <span style={{fontWeight:700,color:"#d97706"}}>USD {(parseFloat(ln.monto)||0).toLocaleString()}</span>
                    :<input type="number" disabled={!can} value={ln.monto||""} onChange={e=>{
                      const nl=[...lns]; nl[idx]={...nl[idx],monto:parseFloat(e.target.value)||0};
                      updLiqDetalle("lineasComision",nl);
                    }} style={{...inputSt,padding:"4px 6px",maxWidth:120}}/>
                  }
                </td>
                <td style={{padding:"4px 10px"}}>
                  {can && ln.tipo==="custom" && <button onClick={()=>{const nl=[...lns]; nl.splice(idx,1); updLiqDetalle("lineasComision",nl);}} style={{background:"transparent",border:"none",color:"#dc2626",cursor:"pointer",fontSize:14}}>🗑</button>}
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
        {can&&<button onClick={()=>{
          const nl=[...lns,{id:`ln_${Date.now()}`,tipo:"custom",label:"Nuevo concepto",esPct:false,monto:0}];
          updLiqDetalle("lineasComision",nl);
        }} style={{background:"transparent",border:"1px dashed #30363d",borderRadius:8,padding:"6px 16px",cursor:"pointer",color:"#8b949e",fontSize:11}}>+ Agregar línea custom</button>}

        <div style={{marginTop:18,padding:14,background:"#161b22",borderRadius:10,border:"1px solid #30363d"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{color:"#8b949e",fontSize:12}}>Venta bruta:</span>
            <span style={{fontWeight:700,color:"#16a34a"}}>USD {(parseFloat(liqDetalle.montoVentaUSD)||0).toLocaleString()}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{color:"#8b949e",fontSize:12}}>Total comisión Frisku:</span>
            <span style={{fontWeight:700,color:"#d97706"}}>− USD {totalCom.toLocaleString()}</span>
          </div>
          <div style={{borderTop:"1px solid #30363d",paddingTop:6,display:"flex",justifyContent:"space-between"}}>
            <span style={{color:"#e6edf3",fontWeight:700}}>Líquido a entregar:</span>
            <span style={{fontWeight:900,color:"#0ea5e9",fontSize:14}}>USD {liquido.toLocaleString()}</span>
          </div>
        </div>

        <div style={{marginTop:14}}>
          <div style={lblSt}>Observaciones</div>
          <textarea disabled={!can} value={liqDetalle.observaciones||""} onChange={e=>updLiqDetalle("observaciones",e.target.value)} style={{...inputSt,minHeight:60}}/>
        </div>
      </div>
    );
  }

  return(
    <div>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 16px",borderRadius:8,border:tab===t.id?"2px solid #d97706":"1px solid #30363d",background:tab===t.id?"#d97706":"transparent",color:tab===t.id?"#fff":"#8b949e",cursor:"pointer",fontSize:12,fontWeight:700}}>{t.label}</button>)}
      </div>

      {tab==="liquidaciones"&&(
        <div>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
            {can&&<button onClick={()=>{setModalType("liq");setForm({embarqueId:"",montoVentaUSD:0,lineasComision:[],estado:"Pendiente",observaciones:""});setModal(true);}} style={{background:"#d97706",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:700,fontSize:12}}>+ Nueva Liquidación</button>}
          </div>
          <div style={{overflowX:"auto",borderRadius:10,border:"1px solid #30363d"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{background:"#161b22"}}>{["Fecha","Contenedor","Cliente","Exportadora","Venta USD","Comisión USD","Líquido USD","Estado",""].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#8b949e",fontWeight:700,fontSize:10}}>{h}</th>)}</tr></thead>
              <tbody>{(data||[]).filter(l=>l.temporada===temporada).map(l=>{
                const tc = parseFloat(l.totalComisionUSD)||totalComisionLiq(l);
                const liq = (parseFloat(l.montoVentaUSD)||0) - tc;
                return(
                <tr key={l.id} onClick={()=>setDetalle(l.id)} style={{borderBottom:"1px solid #30363d22",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#d9770611"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"6px 10px",color:"#8b949e"}}>{l.fechaCreacion}</td>
                  <td style={{padding:"6px 10px",fontWeight:700,color:"#e6edf3",fontFamily:"monospace"}}>{l.contenedor}</td>
                  <td style={{padding:"6px 10px",color:"#8b949e"}}>{l.clienteNombre||l.cliente||"—"}</td>
                  <td style={{padding:"6px 10px",color:"#8b949e"}}>{l.exportadoraNombre||l.exportadora||"—"}</td>
                  <td style={{padding:"6px 10px",fontWeight:700,color:"#16a34a"}}>USD {(parseFloat(l.montoVentaUSD)||0).toLocaleString()}</td>
                  <td style={{padding:"6px 10px",fontWeight:700,color:"#d97706"}}>USD {tc.toLocaleString()}</td>
                  <td style={{padding:"6px 10px",fontWeight:700,color:"#0ea5e9"}}>USD {liq.toLocaleString()}</td>
                  <td style={{padding:"6px 10px"}} onClick={e=>e.stopPropagation()}><select disabled={!can} value={l.estado||"Pendiente"} onChange={e=>setData(prev=>prev.map(x=>x.id===l.id?{...x,estado:e.target.value}:x))} style={{padding:"3px 6px",borderRadius:4,border:"1px solid #30363d",fontSize:10,background:"#21283b",color:"#e6edf3"}}><option>Pendiente</option><option>Liquidada</option><option>Cobrada</option><option>Pagada</option></select></td>
                  <td style={{padding:"6px 10px",color:"#d97706",fontWeight:700}}>Ver →</td>
                </tr>);})}
                {(data||[]).filter(l=>l.temporada===temporada).length===0&&<tr><td colSpan={9} style={{padding:30,textAlign:"center",color:"#484f58"}}>Sin liquidaciones</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==="cobros"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,alignItems:"center"}}>
            <div style={{fontSize:10,color:"#8b949e",fontStyle:"italic"}}>Los cobros marcados con ⚡ se generan automáticamente al crear una liquidación</div>
            {can&&<button onClick={()=>{setModalType("cobro");setForm({concepto:"",montoUSD:0,nFactura:"",fechaCobro:"",estado:"Pendiente",observaciones:""});setModal(true);}} style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:700,fontSize:12}}>+ Cobro manual</button>}
          </div>
          <div style={{overflowX:"auto",borderRadius:10,border:"1px solid #30363d"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{background:"#161b22"}}>{["","Fecha","Concepto","Monto USD","N° Factura","Estado",""].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#8b949e",fontWeight:700,fontSize:10}}>{h}</th>)}</tr></thead>
              <tbody>{(cobros||[]).filter(c=>c.temporada===temporada).map(c=>(
                <tr key={c.id} style={{borderBottom:"1px solid #30363d22"}}>
                  <td style={{padding:"6px 10px",fontSize:14}}>{c.origen==="auto-liquidacion"?"⚡":""}</td>
                  <td style={{padding:"6px 10px",color:"#8b949e"}}>{c.fechaCreacion}</td>
                  <td style={{padding:"6px 10px",fontWeight:600,color:"#e6edf3"}}>{c.concepto}</td>
                  <td style={{padding:"6px 10px",fontWeight:700,color:"#16a34a"}}>USD {(parseFloat(c.montoUSD)||0).toLocaleString()}</td>
                  <td style={{padding:"6px 10px"}}><input disabled={!can} value={c.nFactura||""} onChange={e=>setCobros(prev=>prev.map(x=>x.id===c.id?{...x,nFactura:e.target.value}:x))} style={{...inputSt,padding:"3px 6px",maxWidth:120}}/></td>
                  <td style={{padding:"6px 10px"}}><select disabled={!can} value={c.estado} onChange={e=>setCobros(prev=>prev.map(x=>x.id===c.id?{...x,estado:e.target.value}:x))} style={{padding:"3px 6px",borderRadius:4,border:"1px solid #30363d",fontSize:10,background:"#21283b",color:"#e6edf3"}}><option>Pendiente</option><option>Facturado</option><option>Cobrado</option><option>Pagado</option></select></td>
                  <td style={{padding:"6px 10px"}}>{can&&c.origen!=="auto-liquidacion"&&<button onClick={()=>{if(window.confirm("¿Eliminar?"))setCobros(prev=>prev.filter(x=>x.id!==c.id));}} style={{background:"#fef2f2",border:"none",borderRadius:4,padding:"3px 6px",cursor:"pointer",fontSize:10,color:"#991b1b"}}>🗑</button>}</td>
                </tr>))}
                {(cobros||[]).filter(c=>c.temporada===temporada).length===0&&<tr><td colSpan={7} style={{padding:30,textAlign:"center",color:"#484f58"}}>Sin cobros</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"#000a",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"#1c2333",borderRadius:14,padding:24,maxWidth:600,width:"100%",border:"1px solid #30363d",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <h3 style={{margin:"0 0 16px",color:"#e6edf3"}}>{modalType==="liq"?"Nueva Liquidación":"Nuevo Cobro Manual"}</h3>
            {modalType==="liq"?(
              <div style={{display:"grid",gap:12}}>
                <div><div style={lblSt}>Embarque *</div><select value={form.embarqueId||""} onChange={e=>setEmbarqueElegido(e.target.value)} style={inputSt}><option value="">—</option>{(embarques||[]).filter(e=>e.temporada===temporada).map(e=>{
                  const cl=(clientes||[]).find(c=>c.id===e.clienteId)?.nombre||e.cliente||"";
                  const ex=(exportadoras||[]).find(x=>x.id===e.exportadoraId)?.nombre||e.exportadora||"";
                  return <option key={e.id} value={e.id}>{e.contenedor} — {cl} / {ex}</option>;
                })}</select></div>
                {form.embarqueId&&(<>
                  <div><div style={lblSt}>Monto venta USD *</div><input type="number" value={form.montoVentaUSD||""} onChange={e=>updVenta(e.target.value)} style={inputSt} autoFocus/></div>
                  <div>
                    <div style={{...lblSt,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span>Líneas de comisión Frisku</span>
                      <button onClick={addLineaCustom} style={{background:"transparent",border:"1px solid #30363d",borderRadius:6,padding:"3px 10px",cursor:"pointer",color:"#8b949e",fontSize:10}}>+ Línea</button>
                    </div>
                    <div style={{border:"1px solid #30363d",borderRadius:8,overflow:"hidden"}}>
                      {(form.lineasComision||[]).map((ln,idx)=>(
                        <div key={ln.id} style={{display:"grid",gridTemplateColumns:"2fr 80px 1fr 30px",gap:8,padding:"6px 10px",borderBottom:"1px solid #30363d22",alignItems:"center"}}>
                          {ln.tipo==="custom"?
                            <input value={ln.label} onChange={e=>updLineaLabel(idx,e.target.value)} style={{...inputSt,padding:"4px 8px"}}/>
                            :<span style={{fontSize:11,color:"#e6edf3",fontWeight:600}}>{ln.label}</span>
                          }
                          {ln.esPct?
                            <input type="number" step="0.1" placeholder="%" value={ln.pct||""} onChange={e=>updLineaPct(idx,e.target.value)} style={{...inputSt,padding:"4px 6px"}}/>
                            :<span style={{fontSize:10,color:"#8b949e",textAlign:"center"}}>—</span>
                          }
                          {ln.esPct?
                            <span style={{fontSize:11,fontWeight:700,color:"#d97706",textAlign:"right"}}>USD {(parseFloat(ln.monto)||0).toLocaleString()}</span>
                            :<input type="number" placeholder="USD" value={ln.monto||""} onChange={e=>updLineaMonto(idx,e.target.value)} style={{...inputSt,padding:"4px 6px"}}/>
                          }
                          {ln.tipo==="custom"?
                            <button onClick={()=>delLinea(idx)} style={{background:"transparent",border:"none",color:"#dc2626",cursor:"pointer",fontSize:12}}>×</button>
                            :<span/>
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{background:"#161b22",padding:10,borderRadius:8,border:"1px solid #30363d"}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                      <span style={{color:"#8b949e"}}>Total comisión Frisku:</span>
                      <span style={{fontWeight:700,color:"#d97706"}}>USD {totalComisionLiq(form).toLocaleString()}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,paddingTop:6,borderTop:"1px solid #30363d"}}>
                      <span style={{color:"#e6edf3",fontWeight:700}}>Líquido a entregar:</span>
                      <span style={{fontWeight:900,color:"#0ea5e9"}}>USD {liquidoALiquidar(form).toLocaleString()}</span>
                    </div>
                  </div>
                  <div style={{fontSize:10,color:"#8b949e",fontStyle:"italic"}}>⚡ Al guardar se generará automáticamente un cobro de comisión Frisku por USD {totalComisionLiq(form).toLocaleString()}</div>
                </>)}
              </div>
            ):(
              <div style={{display:"grid",gap:12}}>
                <div><div style={lblSt}>Concepto *</div><input value={form.concepto||""} onChange={e=>setForm(p=>({...p,concepto:e.target.value}))} placeholder="Servicio, asesoría, otro..." style={inputSt}/></div>
                <div><div style={lblSt}>Monto USD</div><input type="number" value={form.montoUSD||""} onChange={e=>setForm(p=>({...p,montoUSD:parseFloat(e.target.value)||0}))} style={inputSt}/></div>
                <div><div style={lblSt}>N° Factura</div><input value={form.nFactura||""} onChange={e=>setForm(p=>({...p,nFactura:e.target.value}))} style={inputSt}/></div>
              </div>
            )}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button onClick={()=>setModal(false)} style={{padding:"8px 18px",borderRadius:8,border:"1px solid #30363d",background:"transparent",color:"#8b949e",cursor:"pointer"}}>Cancelar</button>
              <button onClick={modalType==="liq"?guardarLiq:guardarCobro} style={{padding:"8px 18px",borderRadius:8,border:"none",background:modalType==="liq"?"#d97706":"#16a34a",color:"#fff",cursor:"pointer",fontWeight:700}}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// PROGRAMA & LOADING (Real vs Programa Comercial)
// ═══════════════════════════════════════════════════════════════════
function ProgramaModule({data, setData, embarques, contratos, programasComerciales=[], clientes, exportadoras, can, temporada, especies}) {
  const [vista, setVista] = useState("comparativo"); // "comparativo" | "semanal" | "exportadora"

  // Helper: número ISO de semana de una fecha
  function semanaISO(dateStr){
    if(!dateStr) return null;
    const d=new Date(dateStr);
    const o=new Date(d.getFullYear(),0,1);
    return Math.ceil((((d-o)/86400000)+o.getDay()+1)/7);
  }

  // Semana ISO actual
  function semanaActual(){
    const hoy=new Date();
    const o=new Date(hoy.getFullYear(),0,1);
    return Math.ceil((((hoy-o)/86400000)+o.getDay()+1)/7);
  }

  // ─── Vista 1: COMPARATIVO POR PROGRAMA COMERCIAL ───
  const comparativo = useMemo(()=>{
    const programasT = (programasComerciales||[]).filter(p=>p.temporada===temporada);
    const embT = (embarques||[]).filter(e=>e.temporada===temporada);
    const semHoy = semanaActual();

    return programasT.map(pg=>{
      const semIni = parseInt(pg.semanaIni)||0;
      const semFin = parseInt(pg.semanaFin)||0;
      const objetivo = parseFloat(pg.volumenObjetivo)||0;
      // Sumar asignaciones
      const asignaciones = pg.asignaciones||[];
      const totalAsignado = asignaciones.reduce((s,a)=>s+(parseFloat(a.contenedoresTotal)||0),0);
      const contenedoresPorSemanaTotal = asignaciones.reduce((s,a)=>s+(parseFloat(a.contenedoresSemana)||0),0);

      // Embarques reales vinculados a este programa
      const embsDelProg = embT.filter(e=>e.programaComercialId===pg.id);
      const totalReal = embsDelProg.length;

      // Programado a la fecha (suma de cont/sem × semanas corridas)
      let programadoAFecha = 0;
      if(semIni && semFin && contenedoresPorSemanaTotal>0){
        if(semHoy>=semIni){
          const semCorridas = Math.min(semHoy, semFin) - semIni + 1;
          programadoAFecha = semCorridas * contenedoresPorSemanaTotal;
        }
      }

      const cumplimiento = programadoAFecha>0 ? (totalReal/programadoAFecha)*100 : 0;
      let estado = "—";
      let estadoColor = "#8b949e";
      if(programadoAFecha>0){
        if(cumplimiento>=95 && cumplimiento<=105) {estado="En línea"; estadoColor="#16a34a";}
        else if(cumplimiento>105) {estado="Adelantado"; estadoColor="#0ea5e9";}
        else if(cumplimiento<95 && cumplimiento>=70) {estado="Levemente atrasado"; estadoColor="#d97706";}
        else if(cumplimiento<70) {estado="Atrasado"; estadoColor="#dc2626";}
      } else if(objetivo>0 && semHoy<semIni){
        estado="Por iniciar"; estadoColor="#8b949e";
      }

      return {
        programa: pg,
        totalAsignado,
        totalReal,
        programadoAFecha: Math.round(programadoAFecha*10)/10,
        cumplimiento: Math.round(cumplimiento),
        estado, estadoColor,
        semIni, semFin, contenedoresPorSemanaTotal,
        nExportadoras: asignaciones.filter(a=>a.exportadoraId).length,
      };
    });
  },[programasComerciales, embarques, temporada]);

  // ─── Vista 2: POR SEMANA (consolidado) ───
  const porSemana = useMemo(()=>{
    const map={};
    // Real: contar embarques por semana de ETD
    (embarques||[]).filter(e=>e.temporada===temporada).forEach(e=>{
      if(!e.etd) return;
      const w=semanaISO(e.etd);
      const key=`W${String(w).padStart(2,"0")}`;
      if(!map[key]) map[key]={semana:key,wNum:w,real:0,programado:0};
      map[key].real++;
    });
    // Programado: sumar cont/sem de todas las asignaciones activas que cubren cada semana
    (programasComerciales||[]).filter(p=>p.temporada===temporada && p.estado!=="Cancelado").forEach(p=>{
      const ini=parseInt(p.semanaIni)||0;
      const fin=parseInt(p.semanaFin)||0;
      if(!ini||!fin) return;
      const csTotal = (p.asignaciones||[]).reduce((s,a)=>s+(parseFloat(a.contenedoresSemana)||0),0);
      if(csTotal<=0) return;
      for(let w=ini; w<=fin; w++){
        const key=`W${String(w).padStart(2,"0")}`;
        if(!map[key]) map[key]={semana:key,wNum:w,real:0,programado:0};
        map[key].programado += csTotal;
      }
    });
    return Object.values(map).sort((a,b)=>a.wNum-b.wNum);
  },[embarques, programasComerciales, temporada]);

  // ─── Vista 3: POR EXPORTADORA ───
  const porExportadora = useMemo(()=>{
    const map={};
    (embarques||[]).filter(e=>e.temporada===temporada).forEach(e=>{
      const ex=(exportadoras||[]).find(x=>x.id===e.exportadoraId)?.nombre||e.exportadora||"Sin asignar";
      if(!map[ex]) map[ex]={nombre:ex,n:0,llegados:0,enTransito:0,programados:0};
      map[ex].n++;
      if(e.estado==="Llegado"||e.estado==="Cerrado"||e.estado==="Liquidado") map[ex].llegados++;
      else if(e.estado==="Despachado"||e.estado==="En tránsito") map[ex].enTransito++;
      else map[ex].programados++;
    });
    return Object.values(map).sort((a,b)=>b.n-a.n);
  },[embarques,exportadoras,temporada]);

  const VISTAS=[
    {id:"comparativo",label:"📊 Real vs Programado"},
    {id:"semanal",label:"📅 Por semana"},
    {id:"exportadora",label:"🏭 Por exportadora"},
  ];

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#e6edf3"}}>📊 Programa & Loading · Temporada {temporada}</div>
      </div>

      <div style={{padding:"10px 14px",background:"#1c2333",borderRadius:8,marginBottom:14,fontSize:11,color:"#8b949e",fontStyle:"italic"}}>
        💡 Esta vista compara los embarques reales contra los programas comerciales definidos. Para que aparezca un programa aquí, debe estar creado en <strong style={{color:"#2563eb"}}>Programas Comerciales</strong> con exportadoras asignadas.
      </div>

      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {VISTAS.map(v=><button key={v.id} onClick={()=>setVista(v.id)} style={{padding:"6px 14px",borderRadius:8,border:vista===v.id?"2px solid #2563eb":"1px solid #30363d",background:vista===v.id?"#2563eb":"transparent",color:vista===v.id?"#fff":"#8b949e",cursor:"pointer",fontSize:11,fontWeight:700}}>{v.label}</button>)}
      </div>

      {/* ─── VISTA COMPARATIVO ─── */}
      {vista==="comparativo"&&(
        <div>
          {comparativo.length===0?
            <div style={{padding:30,textAlign:"center",color:"#484f58",border:"1px solid #30363d",borderRadius:10,fontSize:11}}>Sin programas comerciales en esta temporada. Crea uno en el módulo Programas Comerciales.</div>
            :<div style={{overflowX:"auto",borderRadius:10,border:"1px solid #30363d"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr style={{background:"#161b22"}}>{["Programa","Especie","Ventana","Exp.","Real / Esperado","Cumplim.","Estado"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#8b949e",fontWeight:700,fontSize:10}}>{h}</th>)}</tr></thead>
                <tbody>{comparativo.map(c=>(
                  <tr key={c.programa.id} style={{borderBottom:"1px solid #30363d22"}}>
                    <td style={{padding:"6px 10px",color:"#e6edf3",fontWeight:600}}>{c.programa.clienteNombre}</td>
                    <td style={{padding:"6px 10px"}}>
                      <span style={{fontSize:9,background:"#0ea5e922",color:"#0ea5e9",padding:"1px 6px",borderRadius:10,fontWeight:600}}>{c.programa.especie||"—"}</span>
                      {c.programa.variedad&&<span style={{fontSize:10,color:"#8b949e",marginLeft:6}}>{c.programa.variedad}</span>}
                    </td>
                    <td style={{padding:"6px 10px",color:"#8b949e",fontSize:10}}>
                      {c.semIni&&c.semFin?
                        <span>W{c.semIni}-W{c.semFin} · {c.contenedoresPorSemanaTotal}/sem · <strong style={{color:"#e6edf3"}}>{c.totalAsignado} asignados</strong></span>
                        :<span style={{fontStyle:"italic",color:"#484f58"}}>Sin ventana definida</span>
                      }
                    </td>
                    <td style={{padding:"6px 10px"}}>
                      <span style={{fontSize:10,padding:"2px 8px",background:"#0f766e22",color:"#0f766e",borderRadius:10,fontWeight:700}}>{c.nExportadoras}</span>
                    </td>
                    <td style={{padding:"6px 10px",fontSize:11}}>
                      <span style={{fontWeight:700,color:"#e6edf3"}}>{c.totalReal}</span>
                      {c.programadoAFecha>0&&<span style={{color:"#8b949e"}}> / {c.programadoAFecha}</span>}
                    </td>
                    <td style={{padding:"6px 10px"}}>
                      {c.programadoAFecha>0?
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{flex:1,height:6,background:"#21283b",borderRadius:3,overflow:"hidden",minWidth:60}}>
                            <div style={{height:"100%",width:`${Math.min(c.cumplimiento,150)*0.66}%`,background:c.estadoColor,transition:"all 0.3s"}}/>
                          </div>
                          <span style={{fontSize:10,fontWeight:700,color:c.estadoColor}}>{c.cumplimiento}%</span>
                        </div>
                        :<span style={{color:"#484f58"}}>—</span>
                      }
                    </td>
                    <td style={{padding:"6px 10px"}}>
                      <span style={{fontSize:9,padding:"2px 8px",borderRadius:10,fontWeight:700,background:`${c.estadoColor}22`,color:c.estadoColor}}>{c.estado}</span>
                    </td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          }
        </div>
      )}

      {/* ─── VISTA SEMANAL ─── */}
      {vista==="semanal"&&(
        <div>
          {porSemana.length===0?
            <div style={{padding:30,textAlign:"center",color:"#484f58",border:"1px solid #30363d",borderRadius:10,fontSize:11}}>Sin datos para mostrar (revisar ETDs de embarques y programas comerciales)</div>
            :<div style={{overflowX:"auto",borderRadius:10,border:"1px solid #30363d"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr style={{background:"#161b22"}}>{["Semana","Programado","Real","Desviación","Cumplim."].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#8b949e",fontWeight:700,fontSize:10}}>{h}</th>)}</tr></thead>
                <tbody>{porSemana.map(s=>{
                  const desv = s.real - s.programado;
                  const cumpl = s.programado>0 ? Math.round((s.real/s.programado)*100) : null;
                  const desvColor = desv===0?"#8b949e":desv>0?"#0ea5e9":"#d97706";
                  return(
                  <tr key={s.semana} style={{borderBottom:"1px solid #30363d22"}}>
                    <td style={{padding:"6px 10px",fontFamily:"monospace",fontWeight:700,color:"#e6edf3"}}>{s.semana}</td>
                    <td style={{padding:"6px 10px"}}><span style={{color:"#8b949e"}}>{s.programado||"—"}</span></td>
                    <td style={{padding:"6px 10px"}}><span style={{fontWeight:700,color:"#e6edf3"}}>{s.real}</span></td>
                    <td style={{padding:"6px 10px"}}>{s.programado>0?<span style={{fontWeight:700,color:desvColor}}>{desv>0?"+":""}{desv}</span>:<span style={{color:"#484f58"}}>—</span>}</td>
                    <td style={{padding:"6px 10px"}}>{cumpl!==null?<span style={{fontWeight:700,color:cumpl>=95&&cumpl<=105?"#16a34a":cumpl>105?"#0ea5e9":"#d97706"}}>{cumpl}%</span>:<span style={{color:"#484f58"}}>—</span>}</td>
                  </tr>);})}
                </tbody>
              </table>
            </div>
          }
        </div>
      )}

      {/* ─── VISTA EXPORTADORA ─── */}
      {vista==="exportadora"&&(
        <div>
          {porExportadora.length===0?
            <div style={{padding:30,textAlign:"center",color:"#484f58",border:"1px solid #30363d",borderRadius:10,fontSize:11}}>Sin embarques en esta temporada</div>
            :<div style={{overflowX:"auto",borderRadius:10,border:"1px solid #30363d"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr style={{background:"#161b22"}}>{["Exportadora","Total","Llegados","En tránsito","Programados"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#8b949e",fontWeight:700,fontSize:10}}>{h}</th>)}</tr></thead>
                <tbody>{porExportadora.map(x=>(
                  <tr key={x.nombre} style={{borderBottom:"1px solid #30363d22"}}>
                    <td style={{padding:"6px 10px",fontWeight:600,color:"#e6edf3"}}>{x.nombre}</td>
                    <td style={{padding:"6px 10px",fontWeight:700,color:"#e6edf3"}}>{x.n}</td>
                    <td style={{padding:"6px 10px"}}>{x.llegados>0&&<span style={{fontSize:10,padding:"2px 8px",background:"#16a34a22",color:"#16a34a",borderRadius:10,fontWeight:700}}>{x.llegados}</span>}</td>
                    <td style={{padding:"6px 10px"}}>{x.enTransito>0&&<span style={{fontSize:10,padding:"2px 8px",background:"#0ea5e922",color:"#0ea5e9",borderRadius:10,fontWeight:700}}>{x.enTransito}</span>}</td>
                    <td style={{padding:"6px 10px"}}>{x.programados>0&&<span style={{fontSize:10,padding:"2px 8px",background:"#d9770622",color:"#d97706",borderRadius:10,fontWeight:700}}>{x.programados}</span>}</td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          }
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// QC & PROCEDIMIENTOS
// ═══════════════════════════════════════════════════════════════════
function QCModule({embarques, clientes, exportadoras, can, temporada}) {
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const embarquesT = (embarques||[]).filter(e=>e.temporada===temporada);

  // QC pendientes: embarques que llegaron pero sin QC destino
  const sinQCDestino = embarquesT.filter(e=>(e.estado==="Llegado"||e.estado==="QC Destino")&&!e.qcDestino);
  // QC origen pendientes
  const sinQCOrigen = embarquesT.filter(e=>(e.estado==="Despachado"||e.estado==="En tránsito"||e.estado==="Llegado")&&!e.qcOrigen);

  const FILTROS=[
    {id:"todos",label:`Todos (${embarquesT.length})`},
    {id:"sin_origen",label:`Sin QC Origen (${sinQCOrigen.length})`},
    {id:"sin_destino",label:`Sin QC Destino (${sinQCDestino.length})`},
  ];

  const lista = filtroEstado==="sin_origen"?sinQCOrigen:filtroEstado==="sin_destino"?sinQCDestino:embarquesT;

  return (
    <div>
      <div style={{fontSize:13,fontWeight:700,color:"#e6edf3",marginBottom:14}}>🔍 QC & Procedimientos · Temporada {temporada}</div>

      {/* Alertas */}
      {(sinQCOrigen.length>0||sinQCDestino.length>0)&&(
        <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
          {sinQCOrigen.length>0&&<div style={{padding:"8px 14px",background:"#d9770622",border:"1px solid #d9770644",borderRadius:8,fontSize:11,color:"#d97706",fontWeight:700}}>⚠️ {sinQCOrigen.length} embarques sin QC Origen</div>}
          {sinQCDestino.length>0&&<div style={{padding:"8px 14px",background:"#dc262622",border:"1px solid #dc262644",borderRadius:8,fontSize:11,color:"#dc2626",fontWeight:700}}>🔴 {sinQCDestino.length} llegados sin QC Destino</div>}
        </div>
      )}

      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {FILTROS.map(f=><button key={f.id} onClick={()=>setFiltroEstado(f.id)} style={{padding:"6px 12px",borderRadius:8,border:filtroEstado===f.id?"2px solid #16a34a":"1px solid #30363d",background:filtroEstado===f.id?"#16a34a":"transparent",color:filtroEstado===f.id?"#fff":"#8b949e",cursor:"pointer",fontSize:10,fontWeight:700}}>{f.label}</button>)}
      </div>

      <div style={{overflowX:"auto",borderRadius:10,border:"1px solid #30363d"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:"#161b22"}}>{["Contenedor","Cliente","Exportadora","Estado","QC Origen","QC Destino","Adv. Request"].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#8b949e",fontWeight:700,fontSize:10}}>{h}</th>)}</tr></thead>
          <tbody>{lista.map(e=>{
            const cl=(clientes||[]).find(c=>c.id===e.clienteId)?.nombre||e.cliente||"—";
            const ex=(exportadoras||[]).find(x=>x.id===e.exportadoraId)?.nombre||e.exportadora||"—";
            return(
            <tr key={e.id} style={{borderBottom:"1px solid #30363d22"}}>
              <td style={{padding:"6px 10px",fontWeight:700,color:"#e6edf3",fontFamily:"monospace"}}>{e.contenedor}</td>
              <td style={{padding:"6px 10px",color:"#8b949e"}}>{cl}</td>
              <td style={{padding:"6px 10px",color:"#8b949e"}}>{ex}</td>
              <td style={{padding:"6px 10px"}}><span style={{fontSize:9,padding:"2px 8px",borderRadius:10,fontWeight:700,background:e.estado==="Llegado"||e.estado==="Cerrado"?"#16a34a22":"#d9770622",color:e.estado==="Llegado"||e.estado==="Cerrado"?"#16a34a":"#d97706"}}>{e.estado}</span></td>
              <td style={{padding:"6px 10px"}}><span style={{fontSize:14}}>{e.qcOrigen?"✅":"⬜"}</span></td>
              <td style={{padding:"6px 10px"}}><span style={{fontSize:14}}>{e.qcDestino?"✅":"⬜"}</span></td>
              <td style={{padding:"6px 10px"}}><span style={{fontSize:14}}>{e.advanceRequest?"📝":"—"}</span></td>
            </tr>);})}
            {lista.length===0&&<tr><td colSpan={7} style={{padding:30,textAlign:"center",color:"#484f58"}}>Sin embarques en este filtro</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{marginTop:14,padding:10,background:"#161b22",borderRadius:8,fontSize:10,color:"#8b949e",fontStyle:"italic"}}>💡 Para editar QC, ir a Embarques → seleccionar embarque → tab QC. Aquí se ven todos consolidados para detectar pendientes.</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAESTROS & ALARMAS
// ═══════════════════════════════════════════════════════════════════
function MaestrosModule({data, setData, embarques, contratos, clientes, exportadoras, cobros, temporada, can}) {
  // Resumen agregado
  const stats = useMemo(()=>{
    const embT=(embarques||[]).filter(e=>e.temporada===temporada);
    return {
      clientesActivos: (clientes||[]).filter(c=>c.activo!==false).length,
      clientesTotales: (clientes||[]).length,
      exportadorasActivas: (exportadoras||[]).filter(x=>x.activa!==false).length,
      exportadorasTotales: (exportadoras||[]).length,
      contratosVigentes: (contratos||[]).filter(c=>c.temporada===temporada&&(c.estado==="Firmado"||c.estado==="Vigente")).length,
      embarquesActivos: embT.filter(e=>e.estado!=="Cerrado").length,
      cobrosPendientesUSD: (cobros||[]).filter(c=>c.temporada===temporada&&c.estado==="Pendiente").reduce((s,c)=>s+(parseFloat(c.montoUSD)||0),0),
    };
  },[clientes,exportadoras,contratos,embarques,cobros,temporada]);

  // Listado de alertas operativas
  const alertas = useMemo(()=>{
    const out=[];
    const embT=(embarques||[]).filter(e=>e.temporada===temporada);
    embT.forEach(e=>{
      const docs=["bl","factura","fitosanitario","certOrigen","packingList"];
      const faltan=docs.filter(d=>!e[d]);
      if(faltan.length>0&&e.estado!=="Cerrado"&&e.estado!=="Programado"){
        out.push({tipo:"docs",contenedor:e.contenedor,msg:`${faltan.length} docs pendientes`,nivel:"warn"});
      }
      if(e.fechaLlegada){
        const dias=Math.floor((new Date()-new Date(e.fechaLlegada))/(1000*60*60*24));
        if(dias>30&&e.estado!=="Cerrado"&&e.estado!=="Liquidado"){
          out.push({tipo:"liq",contenedor:e.contenedor,msg:`${dias} días sin liquidar`,nivel:"danger"});
        }
        if(dias>14&&!e.qcDestino){
          out.push({tipo:"qc",contenedor:e.contenedor,msg:`${dias} días sin QC Destino`,nivel:"warn"});
        }
      }
    });
    return out;
  },[embarques,temporada]);

  return (
    <div>
      <div style={{fontSize:13,fontWeight:700,color:"#e6edf3",marginBottom:14}}>⚙️ Maestros & Alarmas · Temporada {temporada}</div>

      {/* Stats summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:18}}>
        <div style={{padding:"10px 14px",background:"#b91c1c11",borderRadius:8,border:"1px solid #b91c1c33"}}>
          <div style={{fontSize:9,color:"#8b949e",textTransform:"uppercase"}}>Clientes</div>
          <div style={{fontSize:18,fontWeight:800,color:"#b91c1c"}}>{stats.clientesActivos}<span style={{fontSize:10,color:"#8b949e"}}>/{stats.clientesTotales}</span></div>
        </div>
        <div style={{padding:"10px 14px",background:"#0f766e11",borderRadius:8,border:"1px solid #0f766e33"}}>
          <div style={{fontSize:9,color:"#8b949e",textTransform:"uppercase"}}>Exportadoras</div>
          <div style={{fontSize:18,fontWeight:800,color:"#0f766e"}}>{stats.exportadorasActivas}<span style={{fontSize:10,color:"#8b949e"}}>/{stats.exportadorasTotales}</span></div>
        </div>
        <div style={{padding:"10px 14px",background:"#7c3aed11",borderRadius:8,border:"1px solid #7c3aed33"}}>
          <div style={{fontSize:9,color:"#8b949e",textTransform:"uppercase"}}>Contratos vig.</div>
          <div style={{fontSize:18,fontWeight:800,color:"#7c3aed"}}>{stats.contratosVigentes}</div>
        </div>
        <div style={{padding:"10px 14px",background:"#0ea5e911",borderRadius:8,border:"1px solid #0ea5e933"}}>
          <div style={{fontSize:9,color:"#8b949e",textTransform:"uppercase"}}>Embarques act.</div>
          <div style={{fontSize:18,fontWeight:800,color:"#0ea5e9"}}>{stats.embarquesActivos}</div>
        </div>
        <div style={{padding:"10px 14px",background:"#d9770611",borderRadius:8,border:"1px solid #d9770633"}}>
          <div style={{fontSize:9,color:"#8b949e",textTransform:"uppercase"}}>Cobros pend.</div>
          <div style={{fontSize:18,fontWeight:800,color:"#d97706"}}>USD {Math.round(stats.cobrosPendientesUSD).toLocaleString()}</div>
        </div>
      </div>

      <div style={{fontSize:12,fontWeight:700,color:"#e6edf3",marginBottom:10}}>🔔 Alarmas operativas</div>
      {alertas.length===0?
        <div style={{padding:30,textAlign:"center",color:"#484f58",border:"1px solid #30363d",borderRadius:10,fontSize:11}}>✓ Sin alarmas — todo al día</div>
        :<div style={{display:"flex",flexDirection:"column",gap:6}}>
          {alertas.map((a,i)=>(
            <div key={i} style={{padding:"8px 14px",background:a.nivel==="danger"?"#dc262622":"#d9770622",border:`1px solid ${a.nivel==="danger"?"#dc262644":"#d9770644"}`,borderRadius:8,fontSize:11,color:a.nivel==="danger"?"#dc2626":"#d97706",display:"flex",justifyContent:"space-between"}}>
              <span style={{fontWeight:600}}>{a.tipo==="docs"?"📄":a.tipo==="liq"?"💰":"🔍"} <span style={{fontFamily:"monospace",color:"#e6edf3"}}>{a.contenedor}</span> — {a.msg}</span>
            </div>
          ))}
        </div>}

      <div style={{marginTop:24,fontSize:12,fontWeight:700,color:"#e6edf3",marginBottom:10}}>🍇 Especies del catálogo</div>
      <EspeciesEditor data={data} setData={setData} can={can}/>
    </div>
  );
}

// ── Editor de especies custom ──
function EspeciesEditor({data, setData, can}) {
  const [nueva, setNueva] = useState("");
  const custom = Array.isArray(data?.especiesCustom) ? data.especiesCustom : [];

  function agregar(){
    const v = (nueva||"").trim();
    if(!v) return;
    if(ESPECIES_BASE.map(s=>s.toLowerCase()).includes(v.toLowerCase())) {
      alert(`"${v}" ya está en el catálogo base.`);
      return;
    }
    if(custom.map(s=>s.toLowerCase()).includes(v.toLowerCase())) {
      alert(`"${v}" ya está agregada.`);
      return;
    }
    setData(p=>({...p, especiesCustom:[...custom, v]}));
    setNueva("");
  }
  function eliminar(esp){
    if(!window.confirm(`¿Quitar "${esp}" del catálogo? (los registros existentes con esa especie seguirán mostrándola)`)) return;
    setData(p=>({...p, especiesCustom: custom.filter(x=>x!==esp)}));
  }

  return (
    <div style={{padding:14,background:"#161b22",borderRadius:10,border:"1px solid #30363d"}}>
      <div style={{fontSize:10,color:"#8b949e",marginBottom:10,fontStyle:"italic"}}>El catálogo base incluye: {ESPECIES_BASE.join(", ")}. Aquí puedes agregar especies adicionales que aparecerán en todos los selectores del módulo.</div>
      {custom.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
          {custom.map(e=>(
            <span key={e} style={{fontSize:11,padding:"4px 10px 4px 12px",background:"#7c3aed22",color:"#a78bfa",borderRadius:20,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
              {e}
              {can&&<button onClick={()=>eliminar(e)} style={{background:"transparent",border:"none",color:"#dc2626",cursor:"pointer",fontSize:14,padding:0,lineHeight:1}}>×</button>}
            </span>
          ))}
        </div>
      )}
      {custom.length===0&&<div style={{fontSize:11,color:"#484f58",marginBottom:12,fontStyle:"italic"}}>Sin especies adicionales por ahora.</div>}
      {can&&(
        <div style={{display:"flex",gap:6}}>
          <input value={nueva} onChange={e=>setNueva(e.target.value)} placeholder="Ej: Frutillas, Granadas, Mangos..." onKeyDown={e=>{if(e.key==="Enter")agregar();}} style={{...inputSt,flex:1}}/>
          <button onClick={agregar} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:8,padding:"7px 16px",cursor:"pointer",fontWeight:700,fontSize:11}}>+ Agregar</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PROGRAMAS COMERCIALES (Solicitud cliente → asignación a exportadoras)
// ═══════════════════════════════════════════════════════════════════
const ESTADOS_PC = ["Solicitado","En asignación","Activo","Cerrado","Cancelado"];
function colorEstadoPC(est){
  if(est==="Activo") return "#16a34a";
  if(est==="Cerrado") return "#0ea5e9";
  if(est==="Cancelado") return "#dc2626";
  if(est==="En asignación") return "#d97706";
  return "#8b949e";
}

function ProgramasComercialesModule({data, setData, contratos, clientes, exportadoras, can, temporada, especies=ESPECIES_FRISKU}) {
  const [modal, setModal] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const EMPTY_PROG = {
    clienteId:"", clienteNombre:"",
    especie:"", variedad:"", calibre:"",
    semanaIni:0, semanaFin:0,
    volumenObjetivo:0,
    estado:"Solicitado",
    asignaciones:[],
    notas:"",
    temporada: temporada||"",
  };
  const [form, setForm] = useState(EMPTY_PROG);

  const filtrado = (data||[]).filter(p=>p.temporada===temporada);
  const prog = detalle ? (data||[]).find(p=>p.id===detalle) : null;

  function updProg(f, v){
    setData(prev=>prev.map(p=>p.id===detalle?{...p,[f]:v}:p));
  }

  function guardar(){
    if(!form.clienteId){alert("Cliente solicitante obligatorio.");return;}
    if(!form.especie){alert("Especie obligatoria.");return;}
    const cl = (clientes||[]).find(c=>c.id===form.clienteId);
    const nuevo = {
      ...form,
      id:`fpc_${Date.now()}`,
      clienteNombre: cl?.nombre || "",
      fechaCreacion: new Date().toISOString().slice(0,10),
      temporada,
    };
    setData(prev=>[...prev, nuevo]);
    setForm(EMPTY_PROG);
    setModal(false);
  }

  // Calcular totales asignados
  function totalAsignado(p){
    return (p.asignaciones||[]).reduce((s,a)=>s+(parseFloat(a.contenedoresTotal)||0),0);
  }

  // ─── DETALLE de un programa ───
  if(prog){
    const semIni = parseInt(prog.semanaIni)||0;
    const semFin = parseInt(prog.semanaFin)||0;
    const nSemanas = (semIni&&semFin&&semFin>=semIni) ? (semFin-semIni+1) : 0;
    const asignaciones = prog.asignaciones||[];
    const asignado = totalAsignado(prog);
    const objetivo = parseFloat(prog.volumenObjetivo)||0;
    const saldo = objetivo - asignado;
    const estCol = colorEstadoPC(prog.estado);

    // BCs vigentes del cliente (para elegir exportadora con BC)
    const bcsVigentesDelCliente = (contratos||[]).filter(c =>
      c.temporada===temporada &&
      c.clienteId===prog.clienteId &&
      (c.estado==="Firmado" || c.estado==="Vigente")
    );

    function addAsignacion(){
      const nueva = {
        id:`asg_${Date.now()}`,
        exportadoraId:"", exportadoraNombre:"",
        contratoBCId:"",
        contenedoresSemana:0,
        contenedoresTotal:0,
      };
      updProg("asignaciones",[...asignaciones, nueva]);
    }
    function updAsignacion(idx, campo, valor){
      const nuevas = [...asignaciones];
      nuevas[idx] = {...nuevas[idx], [campo]: valor};
      // Si asignan exportadora, buscar BC vigente y pre-llenar
      if(campo==="exportadoraId"){
        const ex = (exportadoras||[]).find(x=>x.id===valor);
        nuevas[idx].exportadoraNombre = ex?.nombre || "";
        const bc = bcsVigentesDelCliente.find(c=>c.exportadoraId===valor);
        if(bc) nuevas[idx].contratoBCId = bc.id;
      }
      // Si cambian contenedoresSemana o las semanas, recalcular total
      if(campo==="contenedoresSemana"){
        const cs = parseFloat(valor)||0;
        nuevas[idx].contenedoresTotal = nSemanas>0 ? cs*nSemanas : nuevas[idx].contenedoresTotal;
      }
      updProg("asignaciones", nuevas);
    }
    function delAsignacion(idx){
      if(!window.confirm("¿Eliminar esta asignación?")) return;
      const nuevas = [...asignaciones]; nuevas.splice(idx,1);
      updProg("asignaciones", nuevas);
    }

    return (
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
          <button onClick={()=>setDetalle(null)} style={{background:"#21283b",border:"1px solid #30363d",borderRadius:8,padding:"6px 14px",cursor:"pointer",color:"#8b949e",fontSize:12}}>← Volver</button>
          <h3 style={{margin:0,color:"#e6edf3",fontSize:16}}>📊 Programa: {prog.clienteNombre} · {prog.especie}{prog.variedad?` (${prog.variedad})`:""}</h3>
          <select disabled={!can} value={prog.estado||"Solicitado"} onChange={e=>updProg("estado",e.target.value)} style={{fontSize:11,padding:"4px 10px",borderRadius:14,border:`2px solid ${estCol}`,background:`${estCol}22`,color:estCol,fontWeight:700,cursor:"pointer"}}>
            {ESTADOS_PC.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Datos del programa */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:18}}>
          <div><div style={lblSt}>Cliente solicitante</div><div style={{fontSize:13,fontWeight:700,color:"#e6edf3"}}>{prog.clienteNombre}</div></div>
          <div>
            <div style={lblSt}>Especie</div>
            <select disabled={!can} value={prog.especie||""} onChange={e=>updProg("especie",e.target.value)} style={inputSt}>
              {especies.map(e=><option key={e}>{e}</option>)}
            </select>
          </div>
          <div><div style={lblSt}>Variedad</div><input disabled={!can} value={prog.variedad||""} onChange={e=>updProg("variedad",e.target.value)} style={inputSt}/></div>
          <div><div style={lblSt}>Calibre / spec</div><input disabled={!can} value={prog.calibre||""} onChange={e=>updProg("calibre",e.target.value)} placeholder="L+, M, etc." style={inputSt}/></div>
          <div><div style={lblSt}>Semana inicio (ISO)</div><input type="number" min="1" max="53" disabled={!can} value={prog.semanaIni||""} onChange={e=>updProg("semanaIni",parseInt(e.target.value)||0)} style={inputSt}/></div>
          <div><div style={lblSt}>Semana fin (ISO)</div><input type="number" min="1" max="53" disabled={!can} value={prog.semanaFin||""} onChange={e=>updProg("semanaFin",parseInt(e.target.value)||0)} style={inputSt}/></div>
          <div><div style={lblSt}>Volumen objetivo (contenedores)</div><input type="number" disabled={!can} value={prog.volumenObjetivo||""} onChange={e=>updProg("volumenObjetivo",parseFloat(e.target.value)||0)} style={inputSt}/></div>
          <div><div style={lblSt}>Fecha creación</div><div style={{fontSize:12,color:"#8b949e",padding:"7px 0"}}>{prog.fechaCreacion}</div></div>
          <div><div style={lblSt}>N° semanas</div><div style={{fontSize:13,fontWeight:700,color:"#2563eb",padding:"7px 0"}}>{nSemanas||"—"}</div></div>
        </div>

        {/* Resumen objetivo vs asignado */}
        <div style={{padding:14,background:"#161b22",borderRadius:10,border:"1px solid #30363d",marginBottom:18}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,textAlign:"center"}}>
            <div>
              <div style={{fontSize:10,color:"#8b949e",textTransform:"uppercase",letterSpacing:1}}>Objetivo</div>
              <div style={{fontSize:20,fontWeight:800,color:"#e6edf3"}}>{objetivo||"—"}</div>
            </div>
            <div>
              <div style={{fontSize:10,color:"#8b949e",textTransform:"uppercase",letterSpacing:1}}>Asignado</div>
              <div style={{fontSize:20,fontWeight:800,color:asignado<=objetivo?"#16a34a":"#dc2626"}}>{asignado}</div>
            </div>
            <div>
              <div style={{fontSize:10,color:"#8b949e",textTransform:"uppercase",letterSpacing:1}}>Saldo</div>
              <div style={{fontSize:20,fontWeight:800,color:saldo===0?"#0ea5e9":saldo>0?"#d97706":"#dc2626"}}>{saldo>0?"+":""}{saldo}</div>
            </div>
          </div>
        </div>

        {/* Asignaciones a exportadoras */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:700,color:"#e6edf3"}}>🏭 Asignaciones a exportadoras Frisku</div>
          {can&&<button onClick={addAsignacion} style={{background:"#2563eb",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:700,fontSize:11}}>+ Agregar exportadora</button>}
        </div>

        {asignaciones.length===0?
          <div style={{padding:24,textAlign:"center",color:"#484f58",border:"1px dashed #30363d",borderRadius:10,fontSize:11}}>Sin asignaciones. Agrega una o varias exportadoras Frisku que cumplan este programa.</div>
          :<div style={{overflowX:"auto",borderRadius:10,border:"1px solid #30363d"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{background:"#161b22"}}>{["Exportadora","Business Closure","Cont./sem","Total cont.","Comisión",""].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#8b949e",fontWeight:700,fontSize:10}}>{h}</th>)}</tr></thead>
              <tbody>{asignaciones.map((a,idx)=>{
                const bc = (contratos||[]).find(c=>c.id===a.contratoBCId);
                const bcsParaEsta = bcsVigentesDelCliente.filter(c=>!asignaciones.some((x,i)=>i!==idx&&x.exportadoraId===c.exportadoraId) || c.exportadoraId===a.exportadoraId);
                return (
                <tr key={a.id} style={{borderBottom:"1px solid #30363d22"}}>
                  <td style={{padding:"6px 10px",minWidth:180}}>
                    <select disabled={!can} value={a.exportadoraId||""} onChange={e=>updAsignacion(idx,"exportadoraId",e.target.value)} style={{...inputSt,padding:"4px 8px"}}>
                      <option value="">— elegir exportadora —</option>
                      {(exportadoras||[]).map(x=>(<option key={x.id} value={x.id}>{x.nombre}</option>))}
                    </select>
                  </td>
                  <td style={{padding:"6px 10px",fontSize:10}}>
                    {bc?
                      <span style={{color:"#16a34a",fontWeight:600}}>✓ BC vigente · {bc.comisionPct||0}%</span>
                      :a.exportadoraId?
                        <span style={{color:"#d97706",fontWeight:600}}>⚠ Sin BC vigente</span>
                        :<span style={{color:"#484f58"}}>—</span>
                    }
                  </td>
                  <td style={{padding:"6px 10px",maxWidth:90}}>
                    <input type="number" step="0.5" disabled={!can} value={a.contenedoresSemana||""} onChange={e=>updAsignacion(idx,"contenedoresSemana",parseFloat(e.target.value)||0)} style={{...inputSt,padding:"4px 6px"}}/>
                  </td>
                  <td style={{padding:"6px 10px",maxWidth:90}}>
                    <input type="number" disabled={!can} value={a.contenedoresTotal||""} onChange={e=>updAsignacion(idx,"contenedoresTotal",parseFloat(e.target.value)||0)} style={{...inputSt,padding:"4px 6px"}}/>
                  </td>
                  <td style={{padding:"6px 10px",fontSize:10,color:"#d97706",fontWeight:700}}>{bc?`${bc.comisionPct||0}%`:"—"}</td>
                  <td style={{padding:"6px 10px"}}>
                    {can&&<button onClick={()=>delAsignacion(idx)} style={{background:"transparent",border:"none",color:"#dc2626",cursor:"pointer",fontSize:14}}>🗑</button>}
                  </td>
                </tr>);
              })}</tbody>
            </table>
          </div>}

        <div style={{marginTop:18}}>
          <div style={lblSt}>Notas del programa</div>
          <textarea disabled={!can} value={prog.notas||""} onChange={e=>updProg("notas",e.target.value)} placeholder="Origen de la solicitud, condiciones especiales, plazos..." style={{...inputSt,minHeight:60}}/>
        </div>
      </div>
    );
  }

  // ─── LISTADO ───
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#e6edf3"}}>📊 Programas Comerciales · Temporada {temporada}</div>
        {can&&<button onClick={()=>{setForm({...EMPTY_PROG,temporada});setModal(true);}} style={{background:"#2563eb",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:700,fontSize:12}}>+ Nuevo Programa</button>}
      </div>

      <div style={{padding:"10px 14px",background:"#1c2333",borderRadius:8,marginBottom:14,fontSize:11,color:"#8b949e",fontStyle:"italic"}}>
        💡 Un programa comercial parte de la solicitud de un cliente y puede asignarse a varias exportadoras Frisku que tengan un Business Closure vigente con ese cliente.
      </div>

      <div style={{overflowX:"auto",borderRadius:10,border:"1px solid #30363d"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:"#161b22"}}>{["Cliente","Especie / Var.","Ventana","Objetivo","Asignado","Exportadoras","Estado",""].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#8b949e",fontWeight:700,fontSize:10}}>{h}</th>)}</tr></thead>
          <tbody>{filtrado.map(p=>{
            const asignado = totalAsignado(p);
            const objetivo = parseFloat(p.volumenObjetivo)||0;
            const nExp = (p.asignaciones||[]).filter(a=>a.exportadoraId).length;
            const estCol = colorEstadoPC(p.estado);
            return (
              <tr key={p.id} onClick={()=>setDetalle(p.id)} style={{borderBottom:"1px solid #30363d22",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#2563eb11"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{padding:"6px 10px",fontWeight:600,color:"#e6edf3"}}>{p.clienteNombre}</td>
                <td style={{padding:"6px 10px"}}>
                  <span style={{fontSize:9,background:"#0ea5e922",color:"#0ea5e9",padding:"1px 6px",borderRadius:10,fontWeight:600}}>{p.especie||"—"}</span>
                  {p.variedad&&<span style={{fontSize:10,color:"#8b949e",marginLeft:6}}>{p.variedad}</span>}
                </td>
                <td style={{padding:"6px 10px",fontFamily:"monospace",color:"#8b949e",fontSize:10}}>{p.semanaIni&&p.semanaFin?`W${p.semanaIni}-W${p.semanaFin}`:"—"}</td>
                <td style={{padding:"6px 10px",fontWeight:700,color:"#e6edf3"}}>{objetivo||"—"}</td>
                <td style={{padding:"6px 10px",fontWeight:700,color:asignado===objetivo?"#16a34a":asignado>objetivo?"#dc2626":"#d97706"}}>{asignado}</td>
                <td style={{padding:"6px 10px"}}>
                  <span style={{fontSize:10,padding:"2px 8px",background:"#0f766e22",color:"#0f766e",borderRadius:10,fontWeight:700}}>{nExp}</span>
                </td>
                <td style={{padding:"6px 10px"}}>
                  <span style={{fontSize:9,padding:"2px 8px",borderRadius:10,fontWeight:700,background:`${estCol}22`,color:estCol}}>{p.estado||"Solicitado"}</span>
                </td>
                <td style={{padding:"6px 10px",color:"#2563eb",fontWeight:700}}>Ver →</td>
              </tr>);
          })}
          {filtrado.length===0&&<tr><td colSpan={8} style={{padding:30,textAlign:"center",color:"#484f58"}}>Sin programas comerciales en esta temporada</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo programa */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"#000a",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"#1c2333",borderRadius:14,padding:24,maxWidth:560,width:"100%",border:"1px solid #30363d",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <h3 style={{margin:"0 0 6px",color:"#e6edf3"}}>Nuevo Programa Comercial</h3>
            <div style={{fontSize:10,color:"#8b949e",marginBottom:16,fontStyle:"italic"}}>Parte de la solicitud de un cliente. Las exportadoras se asignan después en el detalle.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{gridColumn:"1/-1"}}>
                <div style={lblSt}>Cliente solicitante *</div>
                <select value={form.clienteId||""} onChange={e=>setForm(p=>({...p,clienteId:e.target.value}))} style={inputSt} autoFocus>
                  <option value="">—</option>
                  {(clientes||[]).map(c=><option key={c.id} value={c.id}>{c.nombre}{c.pais?` (${c.pais})`:""}</option>)}
                </select>
              </div>
              <div>
                <div style={lblSt}>Especie *</div>
                <select value={form.especie||""} onChange={e=>setForm(p=>({...p,especie:e.target.value}))} style={inputSt}>
                  <option value="">—</option>
                  {especies.map(e=><option key={e}>{e}</option>)}
                </select>
              </div>
              <div><div style={lblSt}>Variedad</div><input value={form.variedad||""} onChange={e=>setForm(p=>({...p,variedad:e.target.value}))} style={inputSt}/></div>
              <div><div style={lblSt}>Calibre/spec</div><input value={form.calibre||""} onChange={e=>setForm(p=>({...p,calibre:e.target.value}))} placeholder="L+, M..." style={inputSt}/></div>
              <div><div style={lblSt}>Volumen objetivo (cont.)</div><input type="number" value={form.volumenObjetivo||""} onChange={e=>setForm(p=>({...p,volumenObjetivo:parseFloat(e.target.value)||0}))} style={inputSt}/></div>
              <div><div style={lblSt}>Semana inicio</div><input type="number" min="1" max="53" value={form.semanaIni||""} onChange={e=>setForm(p=>({...p,semanaIni:parseInt(e.target.value)||0}))} placeholder="ej: 18" style={inputSt}/></div>
              <div><div style={lblSt}>Semana fin</div><input type="number" min="1" max="53" value={form.semanaFin||""} onChange={e=>setForm(p=>({...p,semanaFin:parseInt(e.target.value)||0}))} placeholder="ej: 30" style={inputSt}/></div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button onClick={()=>setModal(false)} style={{padding:"8px 18px",borderRadius:8,border:"1px solid #30363d",background:"transparent",color:"#8b949e",cursor:"pointer"}}>Cancelar</button>
              <button onClick={guardar} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",cursor:"pointer",fontWeight:700}}>Crear programa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// PlaceholderModule fallback (por si se usa en algún lugar futuro)
function PlaceholderModule({icon, title, desc}) {
  return (
    <div style={{textAlign:"center",padding:60,color:"#8b949e"}}>
      <div style={{fontSize:60,marginBottom:14,opacity:0.4}}>{icon}</div>
      <div style={{fontSize:16,fontWeight:700,color:"#e6edf3",marginBottom:8}}>{title}</div>
      <div style={{fontSize:12,maxWidth:500,margin:"0 auto"}}>{desc}</div>
      <div style={{fontSize:11,marginTop:14,fontStyle:"italic",color:"#484f58"}}>Próximamente — se construye en Sesión 3 del proyecto</div>
    </div>
  );
}


// ── Temporada helper ──
function temporadaActual() {
  const hoy = new Date();
  const m = hoy.getMonth(), y = hoy.getFullYear();
  return m >= 6 ? `${y}/${y+1}` : `${y-1}/${y}`;
}
function generarTemporadas() {
  const t = [];
  for(let y=2024;y<=2035;y++) t.push(`${y}/${y+1}`);
  return t;
}

// ═══════════════════════════════════════════════════════════════════
// MÓDULO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
export default function FriskuModule({usuarioActual, esAdmin, esSoloConsulta, tabPermisos={}, rolFrisku=null, onBack, onLogout}) {
  const [cargando, setCargando] = useState(true);
  const [subApp, setSubApp] = useState(null);
  const [tempSeleccionada, setTempSeleccionada] = useState(temporadaActual());
  const [showMaestros, setShowMaestros] = useState(false);

  const [data, setData] = useState({
    clientes:[], exportadoras:[], contratos:[], programas:[], programasComerciales:[], embarques:[],
    qcOrigen:[], qcDestino:[], liquidaciones:[], cobros:[], informes:[],
    maestros:{contactos:[],fichas:[],noContactar:[],correosReportes:[]},
    hubCardsOrder:null
  });

  const dataRef = useRef(data);
  useEffect(()=>{ dataRef.current = data; },[data]);

  // ─── PERMISOS ───
  // Permiso base de edición
  const canBase = typeof esSoloConsulta === "function" ? !esSoloConsulta(usuarioActual?.nombre) : !esSoloConsulta;
  // Rol específico Frisku (preparado para cuando se contrate comercial dedicado)
  // rolFrisku puede ser: null (admin normal) | "comercial" (edita ops) | "lectura" (solo ver)
  // Comercial puede editar: clientes, exportadoras, contratos, programas-comerciales, embarques, liquidaciones, cobros
  // Comercial NO puede: editar configuración del hub, hubCardsOrder
  const canPorModulo = (modulo) => {
    if(!canBase) return false;
    if(rolFrisku==="lectura") return false;
    if(rolFrisku==="comercial") {
      const permitidos = ["clientes","exportadoras","contratos","programas-comerciales","embarques","liquidaciones","qc","programa"];
      return permitidos.includes(modulo);
    }
    return true; // admin u otro: editar todo
  };
  // can por defecto (compatible con código anterior que pasa "can" como prop)
  const can = canBase;

  // Lista combinada de especies (base + custom guardadas en data)
  const especies = useMemo(()=>getEspecies(data.especiesCustom),[data.especiesCustom]);

  // Setters
  const setClientes = fn => setData(p=>({...p, clientes: typeof fn==="function"?fn(p.clientes||[]):fn}));
  const setExportadoras = fn => setData(p=>({...p, exportadoras: typeof fn==="function"?fn(p.exportadoras||[]):fn}));
  const setContratos = fn => setData(p=>({...p, contratos: typeof fn==="function"?fn(p.contratos||[]):fn}));
  const setProgramas = fn => setData(p=>({...p, programas: typeof fn==="function"?fn(p.programas||[]):fn}));
  const setProgramasComerciales = fn => setData(p=>({...p, programasComerciales: typeof fn==="function"?fn(p.programasComerciales||[]):fn}));
  const setEmbarques = fn => setData(p=>({...p, embarques: typeof fn==="function"?fn(p.embarques||[]):fn}));
  const setLiquidaciones = fn => setData(p=>({...p, liquidaciones: typeof fn==="function"?fn(p.liquidaciones||[]):fn}));
  const setCobros = fn => setData(p=>({...p, cobros: typeof fn==="function"?fn(p.cobros||[]):fn}));

  // Cargar
  useEffect(()=>{
    (async()=>{
      const d = await dbLoadFrisku();
      if(d) {
        // Asegurar campos nuevos para data antigua (compatibilidad)
        if(!Array.isArray(d.programasComerciales)) d.programasComerciales = [];
        if(!Array.isArray(d.especiesCustom)) d.especiesCustom = [];
        setData(d);
        window._lastSavedFrisku = {};
        ["clientes","exportadoras","contratos","programasComerciales","embarques","liquidaciones"].forEach(k=>{
          if(Array.isArray(d[k])) window._lastSavedFrisku[k] = d[k].length;
        });
        console.log("[Frisku] Cargado. Protección:", JSON.stringify(window._lastSavedFrisku));
      }
      setCargando(false);
    })();
  },[]);

  // Auto-guardado (debounce 2s)
  useEffect(()=>{
    if(cargando) return;
    const t = setTimeout(()=>dbSaveFrisku(dataRef.current), 2000);
    return ()=>clearTimeout(t);
  },[data, cargando]);

  // Alertas
  const alertasDocsPendientes = useMemo(()=>{
    return (data.embarques||[]).filter(e=>{
      const docs = ["bl","factura","fitosanitario","certOrigen","packingList"];
      return docs.some(d=>!e[d]) && e.estado!=="Cerrado";
    }).length;
  },[data.embarques]);

  const alertasLiqRetraso = useMemo(()=>{
    return (data.embarques||[]).filter(e=>{
      if(e.estado==="Cerrado"||e.estado==="Liquidado") return false;
      if(!e.fechaLlegada) return false;
      const llegada = new Date(e.fechaLlegada);
      const hoy = new Date();
      const dias = Math.floor((hoy-llegada)/(1000*60*60*24));
      return dias > 30; // Más de 30 días sin liquidar
    }).length;
  },[data.embarques]);

  const alertasCobro = useMemo(()=>{
    return (data.cobros||[]).filter(c=>c.estado==="Pendiente").length;
  },[data.cobros]);

  // SUBAPPS
  const SUBAPPS = [
    {id:"clientes",              label:"Clientes",               desc:"Importadores que Frisku representa a nivel mundial",                    icon:"👥", color:"#b91c1c", stats:`${(data.clientes||[]).length} clientes`},
    {id:"exportadoras",          label:"Exportadoras",            desc:"Proveedores de fruta fresca de Chile y Latinoamérica",                  icon:"🏭", color:"#0f766e", stats:`${(data.exportadoras||[]).length} exportadoras`},
    {id:"contratos",             label:"Business Closure",        desc:"Acuerdos marco cliente ↔ exportadora por temporada",                    icon:"📋", color:"#7c3aed", stats:`${(data.contratos||[]).length} contratos`},
    {id:"programas-comerciales", label:"Programas Comerciales",   desc:"Solicitudes de cliente asignadas a una o varias exportadoras Frisku",   icon:"📝", color:"#2563eb", stats:`${(data.programasComerciales||[]).length} programas`},
    {id:"programa",              label:"Programa & Loading",      desc:"Vista comparativa Real vs Programado por programa comercial",           icon:"📊", color:"#60a5fa", stats:"Real vs Prog."},
    {id:"embarques",             label:"Embarques & COMEX",       desc:"Orden embarque, docs (BL, Factura, CO, Fito), despacho, tracking",      icon:"🚢", color:"#0ea5e9", stats:`${(data.embarques||[]).length} embarques`, alert:alertasDocsPendientes>0?`⚠️ ${alertasDocsPendientes} docs pendientes`:null},
    {id:"qc",                    label:"QC & Procedimientos",     desc:"QC origen, QC destino, LMR, homologación productores",                  icon:"🔍", color:"#16a34a", stats:`${(data.qcOrigen||[]).length + (data.qcDestino||[]).length} QC`},
    {id:"liquidaciones",         label:"Liquidaciones & Cobros",  desc:"Liquidación cliente/exportadora, cobro comisión, facturación",          icon:"💰", color:"#d97706", stats:`${(data.liquidaciones||[]).length} liq.`, alert:alertasLiqRetraso>0?`🔴 ${alertasLiqRetraso} retrasadas`:alertasCobro>0?`⏳ ${alertasCobro} cobros pend.`:null},
    {id:"informes",              label:"Informes & Reportes",     desc:"Reporte mercado, shipping summary, informe carga semanal",              icon:"📈", color:"#6366f1", stats:"Reportes"},
    {id:"maestros",              label:"Maestros & Alarmas",      desc:"Contactos, fichas, listas, alertas de docs/pagos/QC",                   icon:"⚙️", color:"#64748b", stats:"Config"},
  ];

  if(cargando) return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontFamily:"sans-serif"}}>Cargando Frisku Foods...</div>;

  // Render sub-módulo
  if(subApp) {
    const sa = SUBAPPS.find(s=>s.id===subApp);
    return (
    <div style={{fontFamily:"sans-serif",background:C.bg,minHeight:"100vh",color:C.text,padding:"20px 20px 40px"}}>
      {/* NavBar breadcrumbs — superior izquierda */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={onBack} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:C.muted}}>Mediterra</button>
        <span style={{color:C.muted2}}>›</span>
        <button onClick={()=>setSubApp(null)} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:C.muted}}>Frisku Foods</button>
        <span style={{color:C.muted2}}>›</span>
        <span style={{fontSize:12,fontWeight:700,color:C.text,padding:"7px 14px",background:`${sa?.color||C.blue}22`,borderRadius:8}}>{sa?.label||subApp}</span>
        <div style={{flex:1}}/>
        <FriskuLogo height={28}/>
        <select value={tempSeleccionada} onChange={e=>setTempSeleccionada(e.target.value)}
          style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.card2,color:C.text,fontSize:11}}>
          {generarTemporadas().map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={onLogout} style={{background:C.accent,color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12}}>Salir</button>
      </div>
      <Card>
          {subApp==="clientes"&&<ClientesModule data={data.clientes||[]} setData={setClientes} can={canPorModulo("clientes")} especies={especies}/>}
          {subApp==="exportadoras"&&<ExportadorasModule data={data.exportadoras||[]} setData={setExportadoras} can={canPorModulo("exportadoras")} especies={especies}/>}
          {subApp==="contratos"&&<BusinessClosureModule data={data.contratos||[]} setData={setContratos} clientes={data.clientes||[]} exportadoras={data.exportadoras||[]} can={canPorModulo("contratos")} temporada={tempSeleccionada} especies={especies}/>}
          {subApp==="programas-comerciales"&&<ProgramasComercialesModule data={data.programasComerciales||[]} setData={setProgramasComerciales} contratos={data.contratos||[]} clientes={data.clientes||[]} exportadoras={data.exportadoras||[]} can={canPorModulo("programas-comerciales")} temporada={tempSeleccionada} especies={especies}/>}
          {subApp==="programa"&&<ProgramaModule data={data.programas||[]} setData={setProgramas} embarques={data.embarques||[]} contratos={data.contratos||[]} programasComerciales={data.programasComerciales||[]} clientes={data.clientes||[]} exportadoras={data.exportadoras||[]} can={canPorModulo("programa")} temporada={tempSeleccionada} especies={especies}/>}
          {subApp==="embarques"&&<EmbarquesCOMEXModule data={data.embarques||[]} setData={setEmbarques} clientes={data.clientes||[]} exportadoras={data.exportadoras||[]} contratos={data.contratos||[]} programasComerciales={data.programasComerciales||[]} can={canPorModulo("embarques")} temporada={tempSeleccionada} especies={especies}/>}
          {subApp==="qc"&&<QCModule embarques={data.embarques||[]} clientes={data.clientes||[]} exportadoras={data.exportadoras||[]} can={canPorModulo("qc")} temporada={tempSeleccionada}/>}
          {subApp==="liquidaciones"&&<LiquidacionesCobrosModule data={data.liquidaciones||[]} setData={setLiquidaciones} cobros={data.cobros||[]} setCobros={setCobros} embarques={data.embarques||[]} contratos={data.contratos||[]} clientes={data.clientes||[]} exportadoras={data.exportadoras||[]} can={canPorModulo("liquidaciones")} temporada={tempSeleccionada}/>}
          {subApp==="informes"&&<PlaceholderModule icon="📈" title="Informes & Reportes" desc="Reporte de mercado, shipping summary, informe carga semanal, real vs proyectado. Se construye en Sesión 3."/>}
          {subApp==="maestros"&&<MaestrosModule data={data} setData={setData} embarques={data.embarques||[]} contratos={data.contratos||[]} clientes={data.clientes||[]} exportadoras={data.exportadoras||[]} cobros={data.cobros||[]} temporada={tempSeleccionada} can={canPorModulo("maestros")}/>}
      </Card>
    </div>
    );
  }

  // Hub principal
  return (
    <div style={{fontFamily:"sans-serif",background:C.bg,minHeight:"100vh",color:C.text}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 24px",background:C.card,borderBottom:`1px solid ${C.border}`,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:C.card2,color:C.muted,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12}}>← Mediterra</button>
          <span style={{fontSize:14,fontWeight:700,color:C.text}}>Frisku Foods Hub</span>
          <FriskuLogo height={28}/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <select value={tempSeleccionada} onChange={e=>setTempSeleccionada(e.target.value)}
            style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.card2,color:C.text,fontSize:11}}>
            {generarTemporadas().map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={onLogout} style={{background:C.accent,color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12}}>Salir</button>
        </div>
      </div>

      <div style={{padding:"30px 24px",maxWidth:1000,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:30}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
            <FriskuLogo height={60}/>
          </div>
          <div style={{color:C.muted,fontSize:13}}>Connecting Quality · Representación de Importadores de Fruta Fresca</div>
        </div>

        {/* Alertas */}
        {(alertasDocsPendientes>0||alertasLiqRetraso>0||alertasCobro>0)&&(
          <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
            {alertasDocsPendientes>0&&<div style={{background:"#fef3c7",borderRadius:10,padding:"10px 16px",flex:1,minWidth:200,border:"1px solid #fbbf24"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#92400e"}}>⚠️ {alertasDocsPendientes} embarques con docs pendientes</div></div>}
            {alertasLiqRetraso>0&&<div style={{background:"#fef2f2",borderRadius:10,padding:"10px 16px",flex:1,minWidth:200,border:"1px solid #fecaca"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#991b1b"}}>🔴 {alertasLiqRetraso} liquidaciones retrasadas (+30 días)</div></div>}
            {alertasCobro>0&&<div style={{background:"#eff6ff",borderRadius:10,padding:"10px 16px",flex:1,minWidth:200,border:"1px solid #93c5fd"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#1e40af"}}>⏳ {alertasCobro} cobros de comisión pendientes</div></div>}
          </div>
        )}

        {/* Cards — drag-and-drop solo admin */}
        {(()=>{
          const HUB_DEFAULT = SUBAPPS.map(s=>s.id);
          const order = (Array.isArray(data.hubCardsOrder) && data.hubCardsOrder.length===HUB_DEFAULT.length) ? data.hubCardsOrder : HUB_DEFAULT;
          const handleDragStart = (e,id) => { window._dragCardF=id; window._didDragF=true; e.dataTransfer.effectAllowed="move"; };
          const handleDrop = (e,targetId) => {
            e.preventDefault(); e.stopPropagation();
            const from = window._dragCardF; if(!from||from===targetId){window._dragCardF=null;return;}
            const nw=[...order]; const fi=nw.indexOf(from), ti=nw.indexOf(targetId);
            if(fi===-1||ti===-1)return; nw.splice(fi,1); nw.splice(ti,0,from);
            setData(p=>({...p, hubCardsOrder:nw})); window._dragCardF=null;
          };
          const handleClick = (id) => { if(window._didDragF){window._didDragF=false;return;} setSubApp(id); };
          return (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16,margin:"0 auto 30px"}}>
              {order.map(sid=>{
                const sa = SUBAPPS.find(s=>s.id===sid);
                if(!sa) return null;
                return (
                  <div key={sa.id} draggable={!!esAdmin}
                    onDragStart={e=>{if(!esAdmin)return;handleDragStart(e,sa.id);}}
                    onDragOver={e=>{if(!esAdmin)return;e.preventDefault();e.dataTransfer.dropEffect="move";}}
                    onDrop={e=>{if(!esAdmin)return;handleDrop(e,sa.id);}}
                    onDragEnd={()=>{setTimeout(()=>{window._didDragF=false;},100);window._dragCardF=null;}}
                    onClick={()=>handleClick(sa.id)}
                    style={{background:`linear-gradient(135deg,${C.card},${sa.color}22)`,borderRadius:16,padding:"24px 20px",
                      border:`1px solid ${sa.color}44`,cursor:"pointer",transition:"all 0.2s",position:"relative",overflow:"hidden"}}
                    onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                    onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
                    {esAdmin&&<div style={{position:"absolute",top:8,right:10,fontSize:10,color:"#475569",cursor:"grab"}} title="Arrastra para reordenar">⋮⋮</div>}
                    <div style={{fontSize:32,marginBottom:10}}>{sa.icon}</div>
                    <div style={{fontWeight:800,fontSize:16,color:C.text,marginBottom:4}}>{sa.label}</div>
                    <div style={{fontSize:11,color:C.muted,marginBottom:12}}>{sa.desc}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,background:`${sa.color}22`,color:sa.color,padding:"3px 10px",borderRadius:20,fontWeight:700}}>{sa.stats}</span>
                      {sa.alert&&<span style={{fontSize:10,background:"#fef3c7",color:"#92400e",padding:"3px 10px",borderRadius:20,fontWeight:700}}>{sa.alert}</span>}
                    </div>
                    <div style={{position:"absolute",right:16,bottom:16,fontSize:20,color:`${sa.color}44`}}>→</div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* KPIs */}
        <div style={{display:"flex",gap:12,flexWrap:"wrap",margin:"0 auto"}}>
          <KPI label="🚢 Embarques" value={(data.embarques||[]).filter(e=>e.temporada===tempSeleccionada).length} color={C.blue}/>
          <KPI label="📋 Contratos" value={(data.contratos||[]).filter(c=>c.temporada===tempSeleccionada).length} color={C.purple}/>
          <KPI label="👥 Clientes" value={(data.clientes||[]).length} color={C.accent}/>
          <KPI label="🏭 Exportadoras" value={(data.exportadoras||[]).length} color={C.teal}/>
          <KPI label="💰 Cobros pend." value={alertasCobro} color={C.yellow}/>
          <KPI label="⚠️ Docs pend." value={alertasDocsPendientes} color={C.accent}/>
        </div>
      </div>
    </div>
  );
}
