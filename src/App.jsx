import { useState, useRef, useEffect } from "react";

// ── SUPABASE CONFIG ───────────────────────────────────────────────────────────
const SB_URL = "https://rcmiggqzkxrgmxpdricd.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjbWlnZ3F6a3hyZ214cGRyaWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMDUyNjMsImV4cCI6MjA5MTc4MTI2M30.rqiZzx6UgCVg2mILwRPg1cMWfIT5rsg63aiHwheKjyc";

const sb = {
  from: (tabla) => ({
    _tabla: tabla,
    _filtros: [],
    _orden: null,
    _limite: null,

    select(cols="*"){ this._cols=cols; return this; },
    eq(col,val){ this._filtros.push(`${col}=eq.${encodeURIComponent(val)}`); return this; },
    order(col,{ascending=true}={}){ this._orden=`${col}.${ascending?"asc":"desc"}`; return this; },
    limit(n){ this._limite=n; return this; },

    async _fetch(method="GET", body=null){
      let url=`${SB_URL}/rest/v1/${this._tabla}`;
      const params=[];
      if(this._cols && method==="GET") params.push(`select=${this._cols}`);
      if(this._filtros.length) this._filtros.forEach(f=>params.push(f));
      if(this._orden) params.push(`order=${this._orden}`);
      if(this._limite) params.push(`limit=${this._limite}`);
      if(params.length) url+="?"+params.join("&");
      const headers={
        "apikey": SB_KEY,
        "Authorization": `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        "Prefer": method==="POST" ? "return=representation" : method==="PATCH"||method==="PUT" ? "return=representation" : "",
      };
      const res = await fetch(url,{method,headers,body:body?JSON.stringify(body):undefined});
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if(!res.ok) throw new Error(data?.message||data?.error||`Error ${res.status}`);
      return {data, error:null};
    },

    async get(){ return this._fetch("GET"); },

    async insert(obj){
      const body=Array.isArray(obj)?obj:[obj];
      let url=`${SB_URL}/rest/v1/${this._tabla}`;
      const res=await fetch(url,{
        method:"POST",
        headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json","Prefer":"return=representation"},
        body:JSON.stringify(body)
      });
      const text=await res.text();
      const data=text?JSON.parse(text):null;
      if(!res.ok) throw new Error(data?.message||`Error ${res.status}`);
      return {data:Array.isArray(data)?data:data, error:null};
    },

    async update(obj){
      let url=`${SB_URL}/rest/v1/${this._tabla}`;
      const params=[];
      if(this._filtros.length) this._filtros.forEach(f=>params.push(f));
      if(params.length) url+="?"+params.join("&");
      const res=await fetch(url,{
        method:"PATCH",
        headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json","Prefer":"return=representation"},
        body:JSON.stringify(obj)
      });
      const text=await res.text();
      const data=text?JSON.parse(text):null;
      if(!res.ok) throw new Error(data?.message||`Error ${res.status}`);
      return {data,error:null};
    },

    async upsert(obj, {onConflict="id"}={}){
      let url=`${SB_URL}/rest/v1/${this._tabla}?on_conflict=${onConflict}`;
      const body=Array.isArray(obj)?obj:[obj];
      const res=await fetch(url,{
        method:"POST",
        headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json","Prefer":"return=representation,resolution=merge-duplicates"},
        body:JSON.stringify(body)
      });
      const text=await res.text();
      const data=text?JSON.parse(text):null;
      if(!res.ok) throw new Error(data?.message||`Error ${res.status}`);
      return {data,error:null};
    },

    async delete(){
      let url=`${SB_URL}/rest/v1/${this._tabla}`;
      const params=[];
      if(this._filtros.length) this._filtros.forEach(f=>params.push(f));
      if(params.length) url+="?"+params.join("&");
      const res=await fetch(url,{
        method:"DELETE",
        headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json"},
      });
      if(!res.ok){const t=await res.text();throw new Error(JSON.parse(t)?.message||`Error ${res.status}`);}
      return {data:null,error:null};
    },
  })
};

const mapArt  = r => ({id:r.id,codigo:r.codigo,codigoPropio:r.codigo_propio||"",nombre:r.nombre,descripcion:r.descripcion||"",unidad:r.unidad||"Unidad",stock:+r.stock||0,precio:+r.precio||0,rentabilidad:+r.rentabilidad||0,activo:r.activo});
const mapCli  = r => ({id:r.id,razonSocial:r.razon_social,cuit:r.cuit,direccion:r.direccion||"",telefono:r.telefono||"",email:r.email||"",activo:r.activo});
const mapProv = r => ({id:r.id,razonSocial:r.razon_social,cuit:r.cuit,direccion:r.direccion||"",telefono:r.telefono||"",email:r.email||"",contacto:r.contacto||"",activo:r.activo});
const mapUsr  = r => ({id:r.id,usuario:r.usuario,password:r.password,nombre:r.nombre,rol:r.rol});
const mapComp = r => ({
  id:r.id,fecha:r.fecha,proveedorId:r.proveedor_id,proveedorNombre:r.proveedor_nombre,
  tipoBoleta:r.tipo_boleta,nroComprobante:r.nro_comprobante||"",
  totalDetalle:+r.total_detalle,totalImpuestos:+r.total_impuestos,
  totalCompra:+r.total_compra,usuario:r.usuario_nombre,lineas:[]
});
const mapVta  = r => ({
  id:r.id,fecha:r.fecha,clienteId:r.cliente_id,clienteNombre:r.cliente_nombre,
  nroComprobante:r.nro_comprobante||"",nroFacOficial:r.nro_fac_oficial||"",totalVenta:+r.total_venta,usuario:r.usuario_nombre,lineas:[]
});
const mapLinComp = r => ({articuloId:r.articulo_id,articuloNombre:r.articulo_nombre,articuloCodigo:r.articulo_codigo,detalle:r.detalle||"",cantidad:+r.cantidad,precioUnitario:+r.precio_unitario,total:+r.total,porcentajeIva:+r.porcentaje_iva||0,precioSinIva:+r.precio_sin_iva||0});
const mapLinVta  = r => ({articuloId:r.articulo_id,articuloNombre:r.articulo_nombre,articuloCodigo:r.articulo_codigo,cantidad:+r.cantidad,precioCosto:+r.precio_costo,rentabilidad:+r.rentabilidad,precioUnitario:+r.precio_unitario,subtotal:+r.subtotal});

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #EBF5FB; color: #1C2833; font-size: 15px; line-height: 1.5; }
  .btn { cursor: pointer; border: none; border-radius: 6px; padding: 9px 18px; font-family: 'Inter', system-ui, sans-serif; font-weight: 600; font-size: 13px; transition: all 0.15s; letter-spacing: 0.2px; }
  .btn-primary { background: #1A6FA8; color: #fff; }
  .btn-primary:hover { background: #145880; }
  .btn-naranja { background: #E8620A; color: #fff; }
  .btn-naranja:hover { background: #c9520a; }
  .btn-verde { background: #1A8F4A; color: #fff; }
  .btn-verde:hover { background: #157a3e; }
  .btn-danger { background: #C0392B; color: #fff; }
  .btn-danger:hover { background: #a93226; }
  .btn-outline { background: transparent; border: 2px solid #1A6FA8; color: #1A6FA8; }
  .btn-outline:hover { background: #1A6FA8; color: #fff; }
  .btn-rojo-outline { background: transparent; border: 2px solid #C0392B; color: #C0392B; }
  .btn-rojo-outline:hover { background: #C0392B; color: #fff; }
  input, select, textarea { font-family: 'Inter', system-ui, sans-serif; border: 1.5px solid #AED6F1; border-radius: 6px; padding: 9px 12px; font-size: 14px; width: 100%; outline: none; background: #fff; color: #1C2833; }
  input:focus, select:focus { border-color: #1A6FA8; box-shadow: 0 0 0 3px rgba(26,111,168,0.12); }
  input:disabled { background: #EBF5FB; color: #7F8C8D; }
  label { font-weight: 600; font-size: 12px; color: #1A5276; margin-bottom: 4px; display: block; letter-spacing: 0.3px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { background: #1A5276; color: #fff; padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; }
  td { padding: 10px 14px; border-bottom: 1px solid #D6EAF8; vertical-align: middle; color: #1C2833; }
  tr:hover td { background: rgba(26,111,168,0.05); }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; }
  .modal-ov { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
  .modal-box { background: #fff; border-radius: 10px; width: 100%; max-width: 680px; max-height: 92vh; overflow-y: auto; box-shadow: 0 24px 70px rgba(0,0,0,0.25); }
  .modal-head { background: linear-gradient(135deg, #1A5276 0%, #1A6FA8 100%); color: #fff; padding: 16px 20px; border-radius: 10px 10px 0 0; display: flex; justify-content: space-between; align-items: center; }
  .modal-body { padding: 22px; }
  .fg { display: flex; flex-direction: column; margin-bottom: 14px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .full { grid-column: 1 / -1; }
  .err { padding: 10px 14px; border-radius: 6px; background: #FDEDEC; border: 1px solid #F1948A; color: #C0392B; font-size: 13px; margin-bottom: 14px; }
  .ok { padding: 10px 14px; border-radius: 6px; background: #EAFAF1; border: 1px solid #82E0AA; color: #1A8F4A; font-size: 13px; margin-bottom: 14px; }
  .sec { background:#fff; border-radius:10px; padding:18px; margin-bottom:14px; box-shadow:0 2px 10px rgba(0,0,0,0.07); }
  .sec-title { font-weight:700; font-size:11px; color:#1A5276; margin-bottom:12px; letter-spacing:1px; text-transform:uppercase; }
  .loading { display:flex; align-items:center; justify-content:center; padding:60px; flex-direction:column; gap:12px; color:#7F8C8D; font-size:15px; }
  .spinner { width:38px; height:38px; border:3px solid #D6EAF8; border-top-color:#1A6FA8; border-radius:50%; animation:spin 0.8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .buscador-lista { position:absolute; top:100%; left:0; right:0; background:#fff; border:1.5px solid #AED6F1; border-radius:6px; z-index:500; box-shadow:0 6px 20px rgba(0,0,0,0.15); max-height:260px; overflow-y:auto; }
  .buscador-item { padding:10px 14px; cursor:pointer; border-bottom:1px solid #EBF5FB; font-size:14px; display:flex; justify-content:space-between; align-items:center; }
  .buscador-item:hover { background:#EBF5FB; }
  .buscador-nuevo { padding:10px 14px; cursor:pointer; color:#1A6FA8; font-weight:600; font-size:13px; border-top:2px solid #AED6F1; background:#F0F8FF; display:flex; align-items:center; gap:8px; }
  .buscador-nuevo:hover { background:#D6EAF8; }
  @media (max-width: 680px) { .grid2 { grid-template-columns: 1fr; } .full { grid-column: 1; } th,td { padding: 7px 9px; font-size: 12px; } }
`;

const fmtP = v => { const n=parseFloat(v); return (isNaN(n)?0:n).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2}); };
const hoy = () => new Date().toISOString().slice(0,10);
const precioSugerido = (precio,rent) => { const p=parseFloat(precio)||0,r=parseFloat(rent)||0; return p+p*r/100; };

const TIPOS = ["Factura A","Factura B","Factura C","Factura M","Ticket A","Ticket B","NO OFICIAL"];
const MENU = [
  {id:"dash",icon:"🏠",label:"INICIO",roles:["admin","operador"]},
  {id:"art",icon:"📦",label:"ARTÍCULOS",roles:["admin","operador"]},
  {id:"cli",icon:"👥",label:"CLIENTES",roles:["admin","operador"]},
  {id:"prov",icon:"🏭",label:"PROVEEDORES",roles:["admin","operador"]},
  {id:"comp",icon:"🛒",label:"COMPRAS",roles:["admin","operador"]},
  {id:"vta",icon:"💰",label:"VENTAS",roles:["admin","operador"]},
  {id:"rep",icon:"📊",label:"REPORTES",roles:["admin","operador"]},
  {id:"mov",icon:"📋",label:"MOVIMIENTOS",roles:["admin","operador"]},
  {id:"usr",icon:"🔐",label:"USUARIOS",roles:["admin"]},
];

function Loading({msg="Cargando..."}){ return <div className="loading"><div className="spinner"/><span>{msg}</span></div>; }

function Modal({title,onClose,children,w=680}){
  return(
    <div className="modal-ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box" style={{maxWidth:w}}>
        <div className="modal-head">
          <strong style={{fontSize:14}}>{title}</strong>
          <button className="btn" onClick={onClose} style={{background:"rgba(255,255,255,0.2)",color:"#fff",padding:"3px 10px"}}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function Login({onLogin}){
  const [u,setU]=useState("");
  const [p,setP]=useState("");
  const [err,setErr]=useState("");
  const [cargando,setCargando]=useState(false);

  const ingresar=async()=>{
    if(!u.trim()||!p){setErr("Completá usuario y contraseña");return;}
    setCargando(true); setErr("");
    try{
      const {data}=await sb.from("usuarios").select("*").eq("usuario",u.trim()).get();
      const found=data?.find(x=>x.password===p);
      if(found){onLogin(mapUsr(found));}
      else{setErr("Usuario o contraseña incorrectos");}
    }catch(e){
      setErr("Error de conexión: "+e.message);
    }finally{setCargando(false);}
  };

  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#1A5276 0%,#1A6FA8 50%,#2E86C1 100%)"}}>
      <div style={{background:"#fff",borderRadius:12,padding:36,width:"100%",maxWidth:360,margin:16,boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <img src="/WhatsApp Image 2026-05-04 at 23.55.48.jpeg"
            alt="FaroGestion"
            style={{width:180,height:"auto",borderRadius:8,marginBottom:8}}/>
          <div style={{fontSize:11,color:"#94A3B8",marginTop:4}}>Sistema de Gestión Comercial ☁️</div>
        </div>
        {err&&<div className="err">{err}</div>}
        <div className="fg"><label>USUARIO</label>
          <input value={u} onChange={e=>setU(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ingresar()} placeholder="usuario" disabled={cargando}/>
        </div>
        <div className="fg"><label>CONTRASEÑA</label>
          <input type="password" value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ingresar()} placeholder="••••••••" disabled={cargando}/>
        </div>
        <button onClick={ingresar} className="btn btn-primary" style={{width:"100%",padding:12,fontSize:14,marginTop:4}} disabled={cargando}>
          {cargando?"VERIFICANDO...":"INGRESAR →"}
        </button>
        <div style={{marginTop:16,padding:12,background:"#F4F6F9",borderRadius:6,fontSize:12,lineHeight:1.8}}>
          <strong style={{color:"#1A3A5C"}}>Usuarios de prueba:</strong><br/>
          👤 <b>admin</b> / <b>admin123</b><br/>
          👤 <b>operador</b> / <b>op123</b>
        </div>
      </div>
    </div>
  );
}

function Sidebar({usuario,page,setPage,onLogout}){
  return(
    <div style={{width:210,background:"#1A5276",minHeight:"100vh",display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"14px 12px",borderBottom:"1px solid rgba(255,255,255,0.15)",textAlign:"center"}}>
        <img src="/WhatsApp Image 2026-05-04 at 23.55.48.jpeg"
          alt="FaroGestion"
          style={{width:"100%",maxWidth:160,height:"auto",borderRadius:6,filter:"brightness(1.1)"}}/>
      </div>
      <nav style={{flex:1,paddingTop:8,overflowY:"auto"}}>
        {MENU.filter(m=>m.roles.includes(usuario.rol)).map(m=>(
          <button key={m.id} onClick={()=>setPage(m.id)} style={{
            display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 16px",
            background:page===m.id?"#1A6FA8":"transparent",border:"none",cursor:"pointer",
            color:page===m.id?"#fff":"rgba(255,255,255,0.72)",
            fontFamily:"'Courier New',monospace",fontWeight:700,fontSize:12,
            borderLeft:page===m.id?"3px solid #85C1E9":"3px solid transparent",textAlign:"left"
          }}>
            <span>{m.icon}</span><span>{m.label}</span>
          </button>
        ))}
      </nav>
      <div style={{padding:"14px",borderTop:"1px solid rgba(255,255,255,0.1)"}}>
        <div style={{fontSize:9,color:"rgba(255,255,255,0.5)"}}>SESIÓN</div>
        <div style={{color:"#fff",fontWeight:700,fontSize:12}}>{usuario.nombre}</div>
        <div style={{fontSize:9,color:"#E8620A",marginBottom:10}}>{usuario.rol.toUpperCase()}</div>
        <button className="btn btn-danger" onClick={onLogout} style={{width:"100%",fontSize:11}}>CERRAR SESIÓN</button>
      </div>
      <div style={{padding:"8px 12px",borderTop:"1px solid rgba(255,255,255,0.06)",textAlign:"center"}}>
        <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",lineHeight:1.6}}>
          Dev. <span style={{color:"rgba(255,255,255,0.55)",fontWeight:600}}>DASantini</span> &amp; Claude AI
        </div>
        <div style={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>v1.0 · 2026</div>
      </div>
    </div>
  );
}

// ── FIX 2: DASHBOARD — eliminado minHeight calc(100vh-40px), reducidos márgenes
// para que el contenido no desborde los márgenes verticales ──────────────────
function Dashboard({usuario}){
  const [hora,setHora]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setHora(new Date()),1000);return()=>clearInterval(t);},[]);

  const fmtFecha=d=>{
    const dias=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
    const meses=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  };
  const fmtHora=d=>`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;

  const h=hora.getHours();
  const saludoFinal=(h<12?"¡Buenos días":h<18?"¡Buenas tardes":"¡Buenas noches")+", "+usuario.nombre+"!";

  return(
    // FIX: se quitó minHeight:calc(100vh-40px) y se usa padding controlado
    // para que el contenido no se salga de los márgenes verticales
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px 32px",gap:0,minHeight:"100%"}}>
      {/* Logo — reducido de 220px a 180px */}
      <div style={{marginBottom:20}}>
        <img src="/WhatsApp Image 2026-05-04 at 23.55.48.jpeg"
          alt="FaroGestion"
          style={{width:180,height:"auto",borderRadius:12,marginBottom:10,filter:"drop-shadow(0 8px 24px rgba(26,111,168,0.25))"}}/>
        <p style={{fontSize:13,color:"#7F8C8D",fontWeight:500,letterSpacing:2,textTransform:"uppercase",textAlign:"center"}}>Sistema de Gestión Comercial</p>
      </div>

      {/* Fecha y hora — reducido margen inferior */}
      <div style={{background:"#fff",borderRadius:16,padding:"20px 48px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",marginBottom:20,minWidth:300}}>
        <div style={{fontSize:44,fontWeight:800,color:"#1A5276",fontVariantNumeric:"tabular-nums",letterSpacing:2,marginBottom:6,textAlign:"center"}}>
          {fmtHora(hora)}
        </div>
        <div style={{fontSize:15,color:"#5D6D7E",fontWeight:500,textAlign:"center"}}>
          {fmtFecha(hora)}
        </div>
      </div>

      {/* Saludo */}
      <div style={{background:"linear-gradient(135deg,#1A5276,#1A6FA8)",borderRadius:12,padding:"16px 36px",color:"#fff",textAlign:"center"}}>
        <p style={{fontSize:19,fontWeight:700,marginBottom:4}}>{saludoFinal}</p>
        <p style={{fontSize:13,opacity:0.85,fontWeight:400}}>
          Sesión iniciada como <strong>{usuario.rol.toUpperCase()}</strong>
        </p>
      </div>
    </div>
  );
}

// ── IMPORTADOR EXCEL ──────────────────────────────────────────────────────────
function cargarSheetJS(){
  return new Promise((res,rej)=>{
    if(window.XLSX){res(window.XLSX);return;}
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload=()=>res(window.XLSX);
    s.onerror=()=>rej(new Error("No se pudo cargar SheetJS"));
    document.head.appendChild(s);
  });
}
function norm(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[\s]+/g,""); }
function mapearColumna(col,mapeo){ const n=norm(col); for(const [campo,aliases] of Object.entries(mapeo)){ if(aliases.some(a=>n===a||n.includes(a))) return campo; } return null; }

const MAPEO_ART={codigo:["codigo","cod","codigobarra","codigobarras","barcode","sku"],nombre:["nombre","articulo","producto","item"],unidad:["unidad","um","unidadmedida"],stock:["stock","cantidad","cant","existencia"],precio:["precio","costo","preciocompra","preciocosto"],rentabilidad:["rentabilidad","rent","margen","ganancia","markup"],descripcion:["descripcionlarga","obs","observacion"]};
const MAPEO_CLI={razonSocial:["razonsocial","razon","nombre","empresa","cliente","denominacion"],cuit:["cuit","cuil","rut","documento","dni"],direccion:["direccion","domicilio","calle"],telefono:["telefono","tel","celular","phone"],email:["email","mail","correo"]};
const MAPEO_PROV={razonSocial:["razonsocial","razon","nombre","empresa","proveedor","denominacion"],cuit:["cuit","cuil","rut","documento"],direccion:["direccion","domicilio","calle"],telefono:["telefono","tel","celular"],email:["email","mail","correo"]};

function ModalImportExcel({titulo,mapeo,onImportar,onClose,campoUnico,labelCampoUnico}){
  const [paso,setPaso]=useState(1);
  const [filas,setFilas]=useState([]);
  const [errFile,setErrFile]=useState("");
  const [resultado,setResultado]=useState(null);
  const [cargando,setCargando]=useState(false);
  const fileRef=useRef(null);

  const leerExcel=async(file)=>{
    setErrFile("");
    try{
      const XLSX=await cargarSheetJS();
      const buf=await file.arrayBuffer();
      const wb=XLSX.read(buf,{type:"array"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
      if(!raw||raw.length<2){setErrFile("El archivo está vacío");return;}
      const headers=raw[0];
      const colMap={};
      headers.forEach((h,i)=>{ const c=mapearColumna(h,mapeo); if(c) colMap[i]=c; });
      if(!Object.values(colMap).includes(campoUnico)){setErrFile(`No se encontró columna "${labelCampoUnico}"`);return;}
      const datos=raw.slice(1).filter(r=>r.some(c=>String(c).trim()!=="")).map(r=>{ const o={}; Object.entries(colMap).forEach(([i,c])=>{o[c]=String(r[i]||"").trim();}); return o; });
      setFilas(datos); setPaso(2);
    }catch(e){setErrFile("Error: "+e.message);}
  };

  const confirmar=async()=>{
    setCargando(true);
    try{
      const res=await onImportar(filas);
      setResultado(res); setPaso(3);
    }catch(e){
      setErrFile("Error al importar: "+e.message);
      setPaso(2);
    }finally{setCargando(false);}
  };

  return(
    <Modal title={"📥 IMPORTAR "+titulo+" DESDE EXCEL"} onClose={onClose} w={820}>
      {paso===1&&(
        <div>
          <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:8,padding:14,marginBottom:14,fontSize:13}}>
            <b style={{color:"#1A3A5C"}}>📋 FORMATO ESPERADO</b><br/>
            Primera fila = encabezados. Columnas reconocidas:{" "}
            {Object.entries(mapeo).map(([k,v])=><span key={k} style={{display:"inline-block",background:"#DBEAFE",borderRadius:3,padding:"1px 6px",margin:2,fontSize:11}}>{v[0]}</span>)}
          </div>
          {errFile&&<div className="err">{errFile}</div>}
          <div style={{border:"2px dashed #94A3B8",borderRadius:8,padding:40,textAlign:"center",cursor:"pointer",background:"#F8FAFC"}} onClick={()=>fileRef.current?.click()}>
            <div style={{fontSize:40,marginBottom:8}}>📂</div>
            <div style={{fontWeight:700,color:"#1A3A5C"}}>Hacé clic para seleccionar el Excel</div>
            <div style={{fontSize:12,color:"#94A3B8",marginTop:4}}>Formatos: .xlsx, .xls</div>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={e=>{if(e.target.files[0])leerExcel(e.target.files[0]);}}/>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:14}}><button className="btn btn-outline" onClick={onClose}>CANCELAR</button></div>
        </div>
      )}
      {paso===2&&(
        <div>
          <div style={{background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:6,padding:10,marginBottom:12,color:"#16A34A",fontWeight:700,fontSize:13}}>
            ✅ {filas.length} registros encontrados. Revisá antes de importar.
          </div>
          {errFile&&<div className="err">{errFile}</div>}
          <div style={{overflowX:"auto",maxHeight:340,overflowY:"auto",marginBottom:14}}>
            <table>
              <thead><tr>{Object.keys(mapeo).filter(k=>filas[0]&&filas[0][k]!==undefined).map(k=><th key={k}>{k.toUpperCase()}</th>)}</tr></thead>
              <tbody>{filas.slice(0,50).map((f,i)=><tr key={i}>{Object.keys(mapeo).filter(k=>f[k]!==undefined).map(k=><td key={k} style={{fontSize:11,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f[k]}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"space-between"}}>
            <button className="btn btn-outline" onClick={()=>setPaso(1)}>← VOLVER</button>
            <button className="btn btn-verde" onClick={confirmar} disabled={cargando}>{cargando?"IMPORTANDO...":"✅ CONFIRMAR"}</button>
          </div>
        </div>
      )}
      {paso===3&&resultado&&(
        <div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{fontSize:48,marginBottom:12}}>🎉</div>
          <h3 style={{color:"#16A34A",marginBottom:16}}>¡IMPORTACIÓN COMPLETADA!</h3>
          <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap",marginBottom:20}}>
            <div style={{background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:8,padding:"12px 24px"}}><div style={{fontSize:26,fontWeight:700,color:"#16A34A"}}>{resultado.nuevos}</div><div style={{fontSize:11,color:"#64748B",fontWeight:700}}>NUEVOS</div></div>
            <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:8,padding:"12px 24px"}}><div style={{fontSize:26,fontWeight:700,color:"#2563A8"}}>{resultado.actualizados}</div><div style={{fontSize:11,color:"#64748B",fontWeight:700}}>ACTUALIZADOS</div></div>
            {resultado.errores>0&&<div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:8,padding:"12px 24px"}}><div style={{fontSize:26,fontWeight:700,color:"#DC2626"}}>{resultado.errores}</div><div style={{fontSize:11,color:"#64748B",fontWeight:700}}>OMITIDOS</div></div>}
          </div>
          <button className="btn btn-primary" onClick={onClose}>CERRAR</button>
        </div>
      )}
    </Modal>
  );
}

// ── FIX 3: ARTÍCULOS — columna NOMBRE con minWidth para evitar filas muy altas
function Articulos({articulos,setArticulos,usuario}){
  const [buscar,setBuscar]=useState("");
  const [modal,setModal]=useState(null);
  const [modalImport,setModalImport]=useState(false);
  const [form,setForm]=useState({});
  const [err,setErr]=useState("");
  const [guardando,setGuardando]=useState(false);

  const filtrados=articulos.filter(a=>a.nombre.toLowerCase().includes(buscar.toLowerCase())||a.codigo.toLowerCase().includes(buscar.toLowerCase()));
  const nuevo=()=>{setForm({codigo:"",codigoPropio:"",nombre:"",descripcion:"",unidad:"Unidad",stock:0,precio:0,rentabilidad:0,activo:true});setErr("");setModal("n");};
  const editar=a=>{setForm({...a});setErr("");setModal("e");};

  const guardar=async()=>{
    if(!form.codigo||!form.nombre){setErr("Código y nombre requeridos");return;}
    setGuardando(true); setErr("");
    try{
      const reg={codigo:form.codigo,codigo_propio:form.codigoPropio||"",nombre:form.nombre,descripcion:form.descripcion||"",unidad:form.unidad||"Unidad",stock:+form.stock||0,precio:+form.precio||0,rentabilidad:+form.rentabilidad||0,activo:form.activo};
      if(modal==="n"){
        const {data}=await sb.from("articulos").insert(reg);
        setArticulos(p=>[...p,...(data||[]).map(mapArt)]);
      }else{
        const {data}=await sb.from("articulos").eq("id",form.id).update(reg);
        setArticulos(p=>p.map(a=>a.id===form.id?(data?.[0]?mapArt(data[0]):{...form,...reg}):a));
      }
      setModal(null);
    }catch(e){setErr("Error: "+e.message);}
    finally{setGuardando(false);}
  };

  const importarArticulos=async(filas)=>{
    let nuevos=0,actualizados=0,errores=0;
    for(const f of filas){
      const codigo=(f.codigo||f.nombre||"").trim();
      const nombre=(f.nombre||codigo).trim();
      if(!codigo||!nombre){errores++;continue;}
      const reg={codigo,nombre,descripcion:f.descripcion||"",unidad:f.unidad||"Unidad",stock:parseFloat((f.stock||"").replace(",","."))||0,precio:parseFloat((f.precio||"").replace(",","."))||0,rentabilidad:parseFloat((f.rentabilidad||"").replace(",","."))||0,activo:true};
      try{
        const existe=articulos.find(a=>a.codigo===codigo);
        if(existe){await sb.from("articulos").eq("id",existe.id).update(reg);actualizados++;}
        else{await sb.from("articulos").insert(reg);nuevos++;}
      }catch{errores++;}
    }
    const {data}=await sb.from("articulos").select("*").order("nombre",{ascending:true}).get();
    setArticulos((data||[]).map(mapArt));
    return {nuevos,actualizados,errores};
  };

  const pSug=a=>precioSugerido(a.precio,a.rentabilidad);

  return(
    <div>
      <h2 style={{color:"#1A3A5C",marginBottom:14,fontSize:17,borderBottom:"3px solid #1A6FA8",paddingBottom:8}}>📦 ARTÍCULOS</h2>
      {modalImport&&<ModalImportExcel titulo="ARTÍCULOS" mapeo={MAPEO_ART} campoUnico="codigo" labelCampoUnico="Código" onImportar={importarArticulos} onClose={()=>setModalImport(false)}/>}
      <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{flex:1,minWidth:180,position:"relative"}}>
          <input value={buscar} onChange={e=>setBuscar(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter"){ const txt=buscar.trim().toLowerCase(); const art=articulos.find(a=>a.codigo.toLowerCase()===txt)||articulos.find(a=>a.nombre.toLowerCase()===txt); if(art){editar(art);setBuscar("");} }}}
            placeholder="🔍 Buscar o escanear código..."/>
          <span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:12,opacity:0.4}}>📷</span>
        </div>
        {usuario.rol==="admin"&&<button className="btn btn-outline" onClick={()=>setModalImport(true)} style={{borderColor:"#16A34A",color:"#16A34A"}}>📥 IMPORTAR XLS</button>}
        {usuario.rol==="admin"&&<button className="btn btn-naranja" onClick={nuevo}>+ NUEVO</button>}
      </div>
      <div style={{background:"#fff",borderRadius:8,overflow:"auto",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
        <table>
          {/* FIX: whiteSpace nowrap en columnas cortas + minWidth en NOMBRE */}
          <thead><tr>
            <th style={{whiteSpace:"nowrap"}}>#ID</th>
            <th style={{whiteSpace:"nowrap"}}>COD. PROPIO</th>
            <th style={{whiteSpace:"nowrap"}}>CÓDIGO</th>
            <th style={{minWidth:200}}>NOMBRE</th>
            <th style={{whiteSpace:"nowrap"}}>UNIDAD</th>
            <th style={{whiteSpace:"nowrap"}}>STOCK</th>
            <th style={{whiteSpace:"nowrap"}}>COSTO $</th>
            <th style={{whiteSpace:"nowrap"}}>RENT.%</th>
            <th style={{whiteSpace:"nowrap"}}>P.SUGERIDO $</th>
            <th style={{whiteSpace:"nowrap"}}>ESTADO</th>
            <th></th>
          </tr></thead>
          <tbody>
            {filtrados.map(a=>(
              <tr key={a.id}>
                <td style={{fontWeight:700,color:"#1A6FA8",whiteSpace:"nowrap"}}>#{a.id}</td>
                <td style={{fontSize:12,color:"#5D6D7E",whiteSpace:"nowrap"}}>{a.codigoPropio||<span style={{color:"#BDC3C7"}}>—</span>}</td>
                <td style={{whiteSpace:"nowrap"}}><b>{a.codigo}</b></td>
                {/* FIX: minWidth en la celda NOMBRE, nombre en una línea + descripción abajo */}
                <td style={{minWidth:200}}>
                  <div style={{fontWeight:600}}>{a.nombre}</div>
                  {a.descripcion&&<div style={{fontSize:12,color:"#7F8C8D"}}>{a.descripcion}</div>}
                </td>
                <td style={{whiteSpace:"nowrap"}}>{a.unidad}</td>
                <td style={{fontWeight:700,color:a.stock<=5?"#DC2626":"#16A34A",whiteSpace:"nowrap"}}>{a.stock}</td>
                <td style={{whiteSpace:"nowrap"}}>$ {fmtP(a.precio)}</td>
                <td style={{fontWeight:700,color:"#7C3AED",whiteSpace:"nowrap"}}>{a.rentabilidad||0}%</td>
                <td style={{fontWeight:700,color:"#0891B2",whiteSpace:"nowrap"}}>$ {fmtP(pSug(a))}</td>
                <td><span className="badge" style={{background:a.activo?"#1A8F4A":"#C0392B",color:"#fff"}}>{a.activo?"ACTIVO":"INACT."}</span></td>
                <td><button className="btn btn-outline" onClick={()=>editar(a)} style={{fontSize:11,padding:"4px 10px"}}>✏️</button></td>
              </tr>
            ))}
            {!filtrados.length&&<tr><td colSpan={11} style={{textAlign:"center",color:"#7F8C8D",padding:24}}>Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>
      {modal&&(
        <Modal title={modal==="n"?"NUEVO ARTÍCULO":"EDITAR ARTÍCULO"} onClose={()=>setModal(null)}>
          {err&&<div className="err">{err}</div>}
          <div className="grid2">
            <div className="fg"><label>COD. INTERNO (AUTO)</label><input value={form.id?"#"+form.id:"(automático)"} disabled style={{fontWeight:700,color:"#1A6FA8"}}/></div>
            <div className="fg"><label>CÓDIGO PROPIO / BARCODE</label><input value={form.codigoPropio||""} onChange={e=>setForm(p=>({...p,codigoPropio:e.target.value}))} placeholder="Opcional"/></div>
            <div className="fg"><label>CÓDIGO SISTEMA *</label><input value={form.codigo||""} onChange={e=>setForm(p=>({...p,codigo:e.target.value}))}/></div>
            <div className="fg"><label>NOMBRE *</label><input value={form.nombre||""} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))}/></div>
            <div className="fg full"><label>DESCRIPCIÓN</label><textarea rows={2} value={form.descripcion||""} onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))}/></div>
            <div className="fg"><label>UNIDAD</label>
              <select value={form.unidad||"Unidad"} onChange={e=>setForm(p=>({...p,unidad:e.target.value}))}>
                {["Unidad","Kg","Litro","Metro","Resma","Caja","Par","Docena"].map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="fg"><label>STOCK</label><input type="number" min={0} value={form.stock??0} onChange={e=>setForm(p=>({...p,stock:e.target.value}))}/></div>
            <div className="fg"><label>PRECIO COSTO ($)</label><input type="number" step="0.01" min={0} value={form.precio??0} onChange={e=>setForm(p=>({...p,precio:e.target.value}))}/></div>
            <div className="fg"><label>% RENTABILIDAD</label><input type="number" step="0.01" min={0} value={form.rentabilidad??0} onChange={e=>setForm(p=>({...p,rentabilidad:e.target.value}))}/></div>
            <div className="fg"><label>PRECIO SUGERIDO (calc.)</label><input disabled value={"$ "+fmtP(precioSugerido(form.precio,form.rentabilidad))} style={{fontWeight:700,color:"#0891B2"}}/></div>
            <div className="fg"><label>ESTADO</label>
              <select value={form.activo?"1":"0"} onChange={e=>setForm(p=>({...p,activo:e.target.value==="1"}))}>
                <option value="1">ACTIVO</option><option value="0">INACTIVO</option>
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:10,marginTop:16,justifyContent:"flex-end"}}>
            <button className="btn btn-outline" onClick={()=>setModal(null)} disabled={guardando}>CANCELAR</button>
            <button className="btn btn-naranja" onClick={guardar} disabled={guardando}>{guardando?"GUARDANDO...":"💾 GUARDAR"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Clientes({clientes,setClientes,usuario}){
  const [buscar,setBuscar]=useState("");
  const [modal,setModal]=useState(null);
  const [modalImport,setModalImport]=useState(false);
  const [form,setForm]=useState({});
  const [err,setErr]=useState("");
  const [guardando,setGuardando]=useState(false);

  const filtrados=clientes.filter(c=>c.razonSocial.toLowerCase().includes(buscar.toLowerCase())||c.cuit.includes(buscar));
  const nuevo=()=>{setForm({razonSocial:"",cuit:"",direccion:"",telefono:"",email:"",contacto:"",activo:true});setErr("");setModal("n");};
  const editar=c=>{setForm({...c});setErr("");setModal("e");};

  const guardar=async()=>{
    if(!form.razonSocial||!form.cuit){setErr("Razón social y CUIT requeridos");return;}
    setGuardando(true); setErr("");
    try{
      const reg={razon_social:form.razonSocial,cuit:form.cuit,direccion:form.direccion||"",telefono:form.telefono||"",email:form.email||"",activo:form.activo};
      if(modal==="n"){
        const {data}=await sb.from("clientes").insert(reg);
        setClientes(p=>[...p,...(data||[]).map(mapCli)]);
      }else{
        const {data}=await sb.from("clientes").eq("id",form.id).update(reg);
        setClientes(p=>p.map(c=>c.id===form.id?(data?.[0]?mapCli(data[0]):{...form}):c));
      }
      setModal(null);
    }catch(e){setErr("Error: "+e.message);}
    finally{setGuardando(false);}
  };

  const importarClientes=async(filas)=>{
    let nuevos=0,actualizados=0,errores=0;
    for(const f of filas){
      const cuit=(f.cuit||"").trim(); const rs=(f.razonSocial||"").trim();
      if(!cuit||!rs){errores++;continue;}
      const reg={razon_social:rs,cuit,direccion:(f.direccion||"").trim(),telefono:(f.telefono||"").trim(),email:(f.email||"").trim(),activo:true};
      try{
        const existe=clientes.find(c=>c.cuit===cuit);
        if(existe){await sb.from("clientes").eq("id",existe.id).update(reg);actualizados++;}
        else{await sb.from("clientes").insert(reg);nuevos++;}
      }catch{errores++;}
    }
    const {data}=await sb.from("clientes").select("*").order("razon_social",{ascending:true}).get();
    setClientes((data||[]).map(mapCli));
    return {nuevos,actualizados,errores};
  };

  return(
    <div>
      <h2 style={{color:"#1A3A5C",marginBottom:14,fontSize:17,borderBottom:"3px solid #1A6FA8",paddingBottom:8}}>👥 CLIENTES</h2>
      {modalImport&&<ModalImportExcel titulo="CLIENTES" mapeo={MAPEO_CLI} campoUnico="cuit" labelCampoUnico="CUIT" onImportar={importarClientes} onClose={()=>setModalImport(false)}/>}
      <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:180}}><input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="🔍 Razón social o CUIT..."/></div>
        {usuario.rol==="admin"&&<button className="btn btn-outline" onClick={()=>setModalImport(true)} style={{borderColor:"#16A34A",color:"#16A34A"}}>📥 IMPORTAR XLS</button>}
        {usuario.rol==="admin"&&<button className="btn btn-naranja" onClick={nuevo}>+ NUEVO</button>}
      </div>
      <div style={{background:"#fff",borderRadius:8,overflow:"auto",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
        <table>
          <thead><tr><th>RAZÓN SOCIAL</th><th>CUIT</th><th>TELÉFONO</th><th>EMAIL</th><th>ESTADO</th><th></th></tr></thead>
          <tbody>
            {filtrados.map(c=>(
              <tr key={c.id}>
                <td><b>{c.razonSocial}</b><br/><span style={{fontSize:11,color:"#94A3B8"}}>{c.direccion}</span></td>
                <td>{c.cuit}</td><td>{c.telefono}</td><td>{c.email}</td>
                <td><span className="badge" style={{background:c.activo?"#1A8F4A":"#C0392B",color:"#fff"}}>{c.activo?"ACTIVO":"INACT."}</span></td>
                <td><button className="btn btn-outline" onClick={()=>editar(c)} style={{fontSize:11,padding:"4px 10px"}}>✏️</button></td>
              </tr>
            ))}
            {!filtrados.length&&<tr><td colSpan={6} style={{textAlign:"center",color:"#94A3B8",padding:20}}>Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>
      {modal&&(
        <Modal title={modal==="n"?"NUEVO CLIENTE":"EDITAR CLIENTE"} onClose={()=>setModal(null)}>
          {err&&<div className="err">{err}</div>}
          <div className="grid2">
            <div className="fg full"><label>RAZÓN SOCIAL *</label><input value={form.razonSocial||""} onChange={e=>setForm(p=>({...p,razonSocial:e.target.value}))}/></div>
            <div className="fg"><label>CUIT *</label><input value={form.cuit||""} onChange={e=>setForm(p=>({...p,cuit:e.target.value}))} placeholder="XX-XXXXXXXX-X"/></div>
            <div className="fg"><label>TELÉFONO</label><input value={form.telefono||""} onChange={e=>setForm(p=>({...p,telefono:e.target.value}))}/></div>
            <div className="fg full"><label>DIRECCIÓN</label><input value={form.direccion||""} onChange={e=>setForm(p=>({...p,direccion:e.target.value}))}/></div>
            <div className="fg"><label>EMAIL</label><input value={form.email||""} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/></div>
            <div className="fg"><label>ESTADO</label>
              <select value={form.activo?"1":"0"} onChange={e=>setForm(p=>({...p,activo:e.target.value==="1"}))}>
                <option value="1">ACTIVO</option><option value="0">INACTIVO</option>
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:10,marginTop:16,justifyContent:"flex-end"}}>
            <button className="btn btn-outline" onClick={()=>setModal(null)} disabled={guardando}>CANCELAR</button>
            <button className="btn btn-naranja" onClick={guardar} disabled={guardando}>{guardando?"GUARDANDO...":"💾 GUARDAR"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Proveedores({proveedores,setProveedores,usuario}){
  const [buscar,setBuscar]=useState("");
  const [modal,setModal]=useState(null);
  const [modalImport,setModalImport]=useState(false);
  const [form,setForm]=useState({});
  const [err,setErr]=useState("");
  const [guardando,setGuardando]=useState(false);

  const filtrados=proveedores.filter(p=>p.razonSocial.toLowerCase().includes(buscar.toLowerCase())||p.cuit.includes(buscar));
  const nuevo=()=>{setForm({razonSocial:"",cuit:"",direccion:"",telefono:"",email:"",activo:true});setErr("");setModal("n");};
  const editar=p=>{setForm({...p});setErr("");setModal("e");};

  const guardar=async()=>{
    if(!form.razonSocial||!form.cuit){setErr("Razón social y CUIT requeridos");return;}
    setGuardando(true); setErr("");
    try{
      const reg={razon_social:form.razonSocial,cuit:form.cuit,direccion:form.direccion||"",telefono:form.telefono||"",email:form.email||"",contacto:form.contacto||"",activo:form.activo};
      if(modal==="n"){
        const {data}=await sb.from("proveedores").insert(reg);
        setProveedores(p=>[...p,...(data||[]).map(mapProv)]);
      }else{
        const {data}=await sb.from("proveedores").eq("id",form.id).update(reg);
        setProveedores(p=>p.map(x=>x.id===form.id?(data?.[0]?mapProv(data[0]):{...form}):x));
      }
      setModal(null);
    }catch(e){setErr("Error: "+e.message);}
    finally{setGuardando(false);}
  };

  const importarProveedores=async(filas)=>{
    let nuevos=0,actualizados=0,errores=0;
    for(const f of filas){
      const cuit=(f.cuit||"").trim(); const rs=(f.razonSocial||"").trim();
      if(!cuit||!rs){errores++;continue;}
      const reg={razon_social:rs,cuit,direccion:(f.direccion||"").trim(),telefono:(f.telefono||"").trim(),email:(f.email||"").trim(),activo:true};
      try{
        const existe=proveedores.find(p=>p.cuit===cuit);
        if(existe){await sb.from("proveedores").eq("id",existe.id).update(reg);actualizados++;}
        else{await sb.from("proveedores").insert(reg);nuevos++;}
      }catch{errores++;}
    }
    const {data}=await sb.from("proveedores").select("*").order("razon_social",{ascending:true}).get();
    setProveedores((data||[]).map(mapProv));
    return {nuevos,actualizados,errores};
  };

  return(
    <div>
      <h2 style={{color:"#1A3A5C",marginBottom:14,fontSize:17,borderBottom:"3px solid #1A6FA8",paddingBottom:8}}>🏭 PROVEEDORES</h2>
      {modalImport&&<ModalImportExcel titulo="PROVEEDORES" mapeo={MAPEO_PROV} campoUnico="cuit" labelCampoUnico="CUIT" onImportar={importarProveedores} onClose={()=>setModalImport(false)}/>}
      <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:180}}><input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="🔍 Razón social o CUIT..."/></div>
        {usuario.rol==="admin"&&<button className="btn btn-outline" onClick={()=>setModalImport(true)} style={{borderColor:"#16A34A",color:"#16A34A"}}>📥 IMPORTAR XLS</button>}
        {usuario.rol==="admin"&&<button className="btn btn-naranja" onClick={nuevo}>+ NUEVO</button>}
      </div>
      <div style={{background:"#fff",borderRadius:8,overflow:"auto",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
        <table>
          <thead><tr><th>RAZÓN SOCIAL</th><th>CUIT</th><th>CONTACTO</th><th>TELÉFONO</th><th>EMAIL</th><th>ESTADO</th><th></th></tr></thead>
          <tbody>
            {filtrados.map(p=>(
              <tr key={p.id}>
                <td><b>{p.razonSocial}</b><br/><span style={{fontSize:12,color:"#7F8C8D"}}>{p.direccion}</span></td>
                <td>{p.cuit}</td>
                <td style={{fontWeight:600,color:"#1A5276"}}>{p.contacto||<span style={{color:"#BDC3C7"}}>—</span>}</td>
                <td>{p.telefono}</td><td>{p.email}</td>
                <td><span className="badge" style={{background:p.activo?"#1A8F4A":"#C0392B",color:"#fff"}}>{p.activo?"ACTIVO":"INACT."}</span></td>
                <td><button className="btn btn-outline" onClick={()=>editar(p)} style={{fontSize:12,padding:"5px 12px"}}>✏️ Editar</button></td>
              </tr>
            ))}
            {!filtrados.length&&<tr><td colSpan={7} style={{textAlign:"center",color:"#7F8C8D",padding:24}}>Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>
      {modal&&(
        <Modal title={modal==="n"?"NUEVO PROVEEDOR":"EDITAR PROVEEDOR"} onClose={()=>setModal(null)}>
          {err&&<div className="err">{err}</div>}
          <div className="grid2">
            <div className="fg full"><label>RAZÓN SOCIAL *</label><input value={form.razonSocial||""} onChange={e=>setForm(p=>({...p,razonSocial:e.target.value}))}/></div>
            <div className="fg"><label>CUIT *</label><input value={form.cuit||""} onChange={e=>setForm(p=>({...p,cuit:e.target.value}))} placeholder="XX-XXXXXXXX-X"/></div>
            <div className="fg"><label>TELÉFONO</label><input value={form.telefono||""} onChange={e=>setForm(p=>({...p,telefono:e.target.value}))}/></div>
            <div className="fg full"><label>DIRECCIÓN</label><input value={form.direccion||""} onChange={e=>setForm(p=>({...p,direccion:e.target.value}))}/></div>
            <div className="fg"><label>EMAIL</label><input value={form.email||""} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/></div>
            <div className="fg"><label>CONTACTO / REFERENTE</label><input value={form.contacto||""} onChange={e=>setForm(p=>({...p,contacto:e.target.value}))} placeholder="Nombre del contacto"/></div>
            <div className="fg"><label>ESTADO</label>
              <select value={form.activo?"1":"0"} onChange={e=>setForm(p=>({...p,activo:e.target.value==="1"}))}>
                <option value="1">ACTIVO</option><option value="0">INACTIVO</option>
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:10,marginTop:16,justifyContent:"flex-end"}}>
            <button className="btn btn-outline" onClick={()=>setModal(null)} disabled={guardando}>CANCELAR</button>
            <button className="btn btn-naranja" onClick={guardar} disabled={guardando}>{guardando?"GUARDANDO...":"💾 GUARDAR"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ModalBuscarArticulo({articulos,onSelect,onNuevo,onClose,mostrarSugerido=false}){
  const [buscar,setBuscar]=useState("");
  const inputRef=useRef(null);
  useEffect(()=>{ setTimeout(()=>inputRef.current?.focus(),100); },[]);

  const filtrados=articulos.filter(a=>a.activo&&(
    buscar.trim()===""||
    a.nombre.toLowerCase().includes(buscar.toLowerCase())||
    a.codigo.toLowerCase().includes(buscar.toLowerCase())||
    (a.codigoPropio&&a.codigoPropio.toLowerCase().includes(buscar.toLowerCase()))
  )).slice(0,12);

  const handleKey=e=>{
    if(e.key==="Enter"){
      const txt=buscar.trim().toLowerCase();
      if(!txt)return;
      const exacto=articulos.find(a=>a.activo&&(
        a.codigo.toLowerCase()===txt||
        a.codigoPropio?.toLowerCase()===txt||
        a.nombre.toLowerCase()===txt
      ));
      const unico=articulos.filter(a=>a.activo&&(
        a.codigo.toLowerCase().includes(txt)||
        a.codigoPropio?.toLowerCase().includes(txt)||
        a.nombre.toLowerCase().includes(txt)
      ));
      const found=exacto||(unico.length===1?unico[0]:null);
      if(found){onSelect(found);onClose();}
    }
    if(e.key==="Escape") onClose();
  };

  return(
    <div className="modal-ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box" style={{maxWidth:560}}>
        <div className="modal-head">
          <strong style={{fontSize:14}}>🔍 BUSCAR ARTÍCULO</strong>
          <button className="btn" onClick={onClose} style={{background:"rgba(255,255,255,0.2)",color:"#fff",padding:"3px 10px"}}>✕</button>
        </div>
        <div className="modal-body" style={{padding:16}}>
          <div style={{position:"relative",marginBottom:12}}>
            <input ref={inputRef} value={buscar}
              onChange={e=>setBuscar(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escribir nombre, código o escanear barcode... (Enter para seleccionar único)"
              style={{fontSize:15,padding:"11px 14px 11px 40px"}}/>
            <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:18,opacity:0.5}}>🔍</span>
          </div>
          <div style={{maxHeight:340,overflowY:"auto",border:"1.5px solid #AED6F1",borderRadius:6}}>
            {filtrados.map(a=>(
              <div key={a.id}
                onClick={()=>{onSelect(a);onClose();}}
                style={{padding:"11px 14px",cursor:"pointer",borderBottom:"1px solid #EBF5FB",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                onMouseOver={e=>e.currentTarget.style.background="#EBF5FB"}
                onMouseOut={e=>e.currentTarget.style.background="#fff"}>
                <div>
                  <div style={{fontWeight:600,fontSize:14,color:"#1C2833"}}>{a.nombre}</div>
                  <div style={{fontSize:12,color:"#7F8C8D",marginTop:2}}>
                    ID: #{a.id}
                    {a.codigoPropio&&<span> · Cód: <b>{a.codigoPropio}</b></span>}
                    {a.codigo&&<span> · Sist: {a.codigo}</span>}
                    {" · "}{a.unidad}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                  <div style={{fontWeight:700,color:a.stock<=5?"#C0392B":"#1A8F4A",fontSize:13}}>Stock: {a.stock}</div>
                  {mostrarSugerido&&<div style={{fontSize:12,color:"#1A6FA8",fontWeight:600}}>$ {fmtP(precioSugerido(a.precio,a.rentabilidad))}</div>}
                </div>
              </div>
            ))}
            {!filtrados.length&&buscar.trim()!==""&&(
              <div style={{padding:16,textAlign:"center",color:"#7F8C8D",fontSize:14}}>
                No se encontró "<b>{buscar}</b>"
              </div>
            )}
            {!filtrados.length&&buscar.trim()===""&&(
              <div style={{padding:16,textAlign:"center",color:"#7F8C8D",fontSize:14}}>
                Escribí para buscar o escaneá el código de barras
              </div>
            )}
          </div>
          {onNuevo&&(
            <button onClick={()=>{onNuevo(buscar);onClose();}}
              style={{width:"100%",marginTop:10,padding:"11px 0",background:"#EBF5FB",border:"2px dashed #1A6FA8",borderRadius:6,color:"#1A6FA8",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              ➕ Agregar "{buscar||"nuevo artículo"}" a la base de datos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── FIX 1: BuscadorArticulo — al seleccionar artículo, si cantidad estaba vacía
// se inicializa en 1 para que el SUBTOTAL aparezca de inmediato ────────────────
function BuscadorArticulo({linea,articulos,setArticulos,onChange,onDelete,mostrarSugerido=false,cantidadRef,tipoBoleta=""}){
  const [modalAbierto,setModalAbierto]=useState(false);
  const [modalNuevo,setModalNuevo]=useState(false);
  const [nombrePreset,setNombrePreset]=useState("");
  const [formNuevo,setFormNuevo]=useState({});
  const [guardandoNuevo,setGuardandoNuevo]=useState(false);

  const esFacturaBOC = tipoBoleta==="Factura B"||tipoBoleta==="Factura C";
  const precioConIva = parseFloat(linea.precioUnitario) || 0;
  const pctIva = parseFloat(linea.porcentajeIva) || 0;
  const precioSinIvaCalc = pctIva>0 ? precioConIva/(1+pctIva/100) : 0;
  // FIX: usar parseFloat para evitar problemas con strings vacíos o coma decimal
  const totalLinea = (parseFloat(linea.cantidad) || 0) * precioConIva;
  const totalSinIva = (parseFloat(linea.cantidad) || 0) * precioSinIvaCalc;

  const selArticulo=a=>{
    const pu=mostrarSugerido?precioSugerido(a.precio,a.rentabilidad):(+a.precio||0);
    // FIX: si la cantidad estaba vacía, se inicializa en 1 para mostrar subtotal de inmediato
    const cantidadFinal = linea.cantidad===""||linea.cantidad===undefined||linea.cantidad===null ? 1 : linea.cantidad;
    onChange({
      ...linea,
      articuloId:a.id,
      articuloNombre:a.nombre,
      articuloCodigo:a.codigo,
      precioCosto:+a.precio||0,
      rentabilidad:+a.rentabilidad||0,
      precioUnitario:pu,
      cantidad:cantidadFinal,
      porcentajeIva:linea.porcentajeIva||0
    });
    setTimeout(()=>{if(cantidadRef?.current)cantidadRef.current.focus();},80);
  };

  const abrirNuevo=(nombre)=>{
    setFormNuevo({codigo:"",codigoPropio:"",nombre:nombre||"",descripcion:"",unidad:"Unidad",stock:0,precio:0,rentabilidad:0,activo:true});
    setNombrePreset(nombre||"");
    setModalNuevo(true);
  };

  const guardarNuevo=async()=>{
    if(!formNuevo.nombre){return;}
    if(!formNuevo.codigo){formNuevo.codigo="ART"+Date.now().toString().slice(-5);}
    setGuardandoNuevo(true);
    try{
      const reg={codigo:formNuevo.codigo,codigo_propio:formNuevo.codigoPropio||"",nombre:formNuevo.nombre,descripcion:formNuevo.descripcion||"",unidad:formNuevo.unidad||"Unidad",stock:+formNuevo.stock||0,precio:+formNuevo.precio||0,rentabilidad:+formNuevo.rentabilidad||0,activo:true};
      const {data}=await sb.from("articulos").insert(reg);
      if(data&&data[0]){
        const nuevo={id:data[0].id,codigo:data[0].codigo,codigoPropio:data[0].codigo_propio||"",nombre:data[0].nombre,descripcion:data[0].descripcion||"",unidad:data[0].unidad||"Unidad",stock:+data[0].stock||0,precio:+data[0].precio||0,rentabilidad:+data[0].rentabilidad||0,activo:true};
        if(setArticulos) setArticulos(p=>[...p,nuevo]);
        selArticulo(nuevo);
      }
      setModalNuevo(false);
    }catch(e){alert("Error al guardar: "+e.message);}
    finally{setGuardandoNuevo(false);}
  };

  return(
    <>
      {modalAbierto&&<ModalBuscarArticulo articulos={articulos} onSelect={selArticulo} onNuevo={abrirNuevo} onClose={()=>setModalAbierto(false)} mostrarSugerido={mostrarSugerido}/>}
      {modalNuevo&&(
        <Modal title="➕ AGREGAR NUEVO ARTÍCULO" onClose={()=>setModalNuevo(false)} w={520}>
          <div style={{marginBottom:12,padding:10,background:"#EBF5FB",borderRadius:6,fontSize:13,color:"#1A5276"}}>
            ℹ️ Este artículo se agregará a la base de datos y quedará disponible para futuras operaciones.
          </div>
          <div className="grid2">
            <div className="fg"><label>NOMBRE *</label><input value={formNuevo.nombre||""} onChange={e=>setFormNuevo(p=>({...p,nombre:e.target.value}))}/></div>
            <div className="fg"><label>CÓDIGO SISTEMA</label><input value={formNuevo.codigo||""} onChange={e=>setFormNuevo(p=>({...p,codigo:e.target.value}))} placeholder="Se genera automático"/></div>
            <div className="fg"><label>CÓDIGO PROPIO / BARCODE</label><input value={formNuevo.codigoPropio||""} onChange={e=>setFormNuevo(p=>({...p,codigoPropio:e.target.value}))}/></div>
            <div className="fg"><label>UNIDAD</label>
              <select value={formNuevo.unidad||"Unidad"} onChange={e=>setFormNuevo(p=>({...p,unidad:e.target.value}))}>
                {["Unidad","Kg","Litro","Metro","Resma","Caja","Par","Docena"].map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="fg"><label>PRECIO COSTO $</label><input type="number" step="0.01" min={0} value={formNuevo.precio||0} onChange={e=>setFormNuevo(p=>({...p,precio:e.target.value}))}/></div>
            <div className="fg"><label>% RENTABILIDAD</label><input type="number" step="0.01" min={0} value={formNuevo.rentabilidad||0} onChange={e=>setFormNuevo(p=>({...p,rentabilidad:e.target.value}))}/></div>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
            <button className="btn btn-outline" onClick={()=>setModalNuevo(false)}>CANCELAR</button>
            <button className="btn btn-verde" onClick={guardarNuevo} disabled={guardandoNuevo}>{guardandoNuevo?"GUARDANDO...":"💾 GUARDAR Y USAR"}</button>
          </div>
        </Modal>
      )}
      <tr>
        <td style={{minWidth:220}}>
          <div onClick={()=>setModalAbierto(true)}
            style={{padding:"9px 12px",border:"1.5px solid",borderColor:linea.articuloId?"#1A8F4A":"#AED6F1",borderRadius:6,cursor:"pointer",background:linea.articuloId?"#EAFAF1":"#fff",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:14}}>
            <span style={{fontWeight:linea.articuloId?600:400,color:linea.articuloId?"#1A5276":"#7F8C8D"}}>
              {linea.articuloNombre||"Tocar para buscar artículo..."}
            </span>
            <span style={{fontSize:16,opacity:0.6}}>🔍</span>
          </div>
        </td>
        <td>
          <input ref={cantidadRef} value={linea.cantidad||""} type="number" min={1}
            onChange={e=>onChange({...linea,cantidad:e.target.value})}
            style={{width:70,fontSize:14,textAlign:"center"}}/>
        </td>
        <td>
          <input value={linea.precioUnitario||""} type="number" step="0.01" min={0}
            onChange={e=>onChange({...linea,precioUnitario:e.target.value})}
            style={{width:110,fontSize:14,textAlign:"right"}}/>
        </td>
        {esFacturaBOC&&(
          <td>
            <select value={linea.porcentajeIva||0} onChange={e=>onChange({...linea,porcentajeIva:+e.target.value})}
              style={{width:90,fontSize:13}}>
              <option value={0}>Sin IVA</option>
              <option value={10.5}>10.5%</option>
              <option value={21}>21%</option>
            </select>
          </td>
        )}
        {esFacturaBOC&&(
          <td style={{textAlign:"right",fontSize:13,color:"#7F8C8D"}}>
            {pctIva>0?"$ "+fmtP(precioSinIvaCalc):"—"}
          </td>
        )}
        <td style={{fontWeight:700,color:"#1A6FA8",whiteSpace:"nowrap",textAlign:"right"}}>$ {fmtP(totalLinea)}</td>
        <td><button className="btn btn-danger" onClick={onDelete} style={{padding:"4px 10px",fontSize:12}}>✕</button></td>
      </tr>
    </>
  );
}
function LineaConRef(props){const cantRef=useRef(null);return <BuscadorArticulo {...props} cantidadRef={cantRef}/>;}

async function exportarExcel(filas, nombreArchivo){
  const XLSX = await new Promise((res,rej)=>{
    if(window.XLSX){res(window.XLSX);return;}
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload=()=>res(window.XLSX); s.onerror=()=>rej(new Error("No se pudo cargar SheetJS"));
    document.head.appendChild(s);
  });
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  const cols = Object.keys(filas[0]||{}).map(k=>({wch:Math.max(k.length, ...filas.map(r=>String(r[k]||"").length))+2}));
  ws["!cols"] = cols;
  XLSX.writeFile(wb, nombreArchivo+".xlsx");
}

function NuevaCompra({proveedores,articulos,setArticulos,compras,setCompras,usuario,onVolver}){
  const [enc,setEnc]=useState({fecha:hoy(),proveedorId:"",tipoBoleta:"Factura B",nroComprobante:""});
  const [lineas,setLineas]=useState([{_k:1,articuloId:null,articuloNombre:"",articuloCodigo:"",cantidad:"",precioUnitario:""}]);
  const [imp,setImp]=useState("");
  const [err,setErr]=useState("");
  const [guardando,setGuardando]=useState(false);
  const [ok,setOk]=useState(false);

  const sub=lineas.reduce((s,l)=>s+(parseFloat(l.cantidad)||0)*(parseFloat(l.precioUnitario)||0),0);
  const total=sub+(parseFloat(imp)||0);
  const agregar=()=>setLineas(p=>[...p,{_k:Date.now(),articuloId:null,articuloNombre:"",articuloCodigo:"",cantidad:"",precioUnitario:""}]);
  const mod=(i,d)=>setLineas(p=>p.map((l,idx)=>idx===i?d:l));
  const del=i=>setLineas(p=>p.filter((_,idx)=>idx!==i));

  const guardar=async()=>{
    if(!enc.proveedorId){setErr("Seleccione proveedor");return;}
    if(!lineas.length){setErr("Agregue al menos un artículo");return;}
    if(lineas.some(l=>!l.articuloId||(+l.cantidad)<=0)){setErr("Complete artículo y cantidad en todas las líneas");return;}
    setGuardando(true); setErr("");
    try{
      const prov=proveedores.find(p=>p.id===+enc.proveedorId);
      const {data:compData}=await sb.from("compras").insert({
        fecha:enc.fecha,proveedor_id:+enc.proveedorId,proveedor_nombre:prov?.razonSocial||"",
        tipo_boleta:enc.tipoBoleta,nro_comprobante:enc.nroComprobante||"",
        total_detalle:sub,total_impuestos:+imp||0,total_compra:total,usuario_nombre:usuario.nombre
      });
      const compId=compData[0].id;
      await sb.from("compras_detalle").insert(lineas.map(l=>({
        compra_id:compId,articulo_id:l.articuloId,articulo_nombre:l.articuloNombre,articulo_codigo:l.articuloCodigo,
        detalle:l.detalle||"",cantidad:+l.cantidad,precio_unitario:+l.precioUnitario,total:(+l.cantidad)*(+l.precioUnitario)
      })));
      for(const l of lineas){
        const art=articulos.find(a=>a.id===l.articuloId);
        if(art){
          const nuevoStock=(art.stock||0)+(+l.cantidad||0);
          await sb.from("articulos").eq("id",art.id).update({stock:nuevoStock});
          setArticulos(p=>p.map(a=>a.id===art.id?{...a,stock:nuevoStock}:a));
        }
      }
      const nuevaComp={id:compId,fecha:enc.fecha,proveedorId:+enc.proveedorId,proveedorNombre:prov?.razonSocial||"",tipoBoleta:enc.tipoBoleta,nroComprobante:enc.nroComprobante||"" ,totalDetalle:sub,totalImpuestos:+imp||0,totalCompra:total,usuario:usuario.nombre,lineas:lineas.map(l=>({...l,total:(+l.cantidad)*(+l.precioUnitario)}))};
      setCompras(p=>[...p,nuevaComp]);
      setOk(true); setTimeout(onVolver,1500);
    }catch(e){setErr("Error al guardar: "+e.message);}
    finally{setGuardando(false);}
  };

  if(ok)return(<div style={{textAlign:"center",padding:60}}><div style={{fontSize:48}}>✅</div><h3 style={{color:"#16A34A",marginTop:10}}>¡COMPRA GUARDADA!</h3><p style={{color:"#94A3B8",marginTop:6}}>Stock actualizado en la base de datos.</p></div>);
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <button className="btn btn-outline" onClick={onVolver} style={{fontSize:12}}>← VOLVER</button>
        <h2 style={{color:"#1A3A5C",fontSize:17,borderBottom:"3px solid #1A6FA8",paddingBottom:4}}>🛒 NUEVA COMPRA</h2>
      </div>
      {err&&<div className="err">{err}</div>}
      <div className="sec" style={{borderTop:"3px solid #2563A8"}}>
        <div className="sec-title">━━ ENCABEZADO ━━</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
          <div className="fg"><label>FECHA *</label><input type="date" value={enc.fecha} onChange={e=>setEnc(p=>({...p,fecha:e.target.value}))}/></div>
          <div className="fg"><label>NRO. COMPROBANTE</label><input value={enc.nroComprobante||""} onChange={e=>setEnc(p=>({...p,nroComprobante:e.target.value}))} placeholder="Ej: 0001-00012345"/></div>
          <div className="fg"><label>PROVEEDOR *</label>
            <select value={enc.proveedorId} onChange={e=>setEnc(p=>({...p,proveedorId:e.target.value}))}>
              <option value="">-- Seleccionar --</option>
              {proveedores.filter(p=>p.activo).map(p=><option key={p.id} value={p.id}>{p.razonSocial}</option>)}
            </select>
          </div>
          <div className="fg"><label>TIPO BOLETA *</label>
            <select value={enc.tipoBoleta} onChange={e=>setEnc(p=>({...p,tipoBoleta:e.target.value}))}>
              {TIPOS.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="fg"><label>USUARIO</label><input value={usuario.nombre} disabled/></div>
        </div>
      </div>
      <div className="sec" style={{borderTop:"3px solid #E8620A"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div className="sec-title" style={{margin:0}}>━━ DETALLE ━━</div>
          <button className="btn btn-primary" onClick={agregar} style={{fontSize:12}}>+ LÍNEA</button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table>
            <thead><tr>
                  <th>ARTÍCULO</th><th>CANT.</th><th>PRECIO $</th>
                  {(enc.tipoBoleta==="Factura B"||enc.tipoBoleta==="Factura C")&&<th>IVA %</th>}
                  {(enc.tipoBoleta==="Factura B"||enc.tipoBoleta==="Factura C")&&<th>PRECIO S/IVA $</th>}
                  <th>TOTAL $</th><th></th>
                </tr></thead>
            <tbody>
              {lineas.map((l,i)=><LineaConRef key={l._k} linea={l} articulos={articulos} setArticulos={setArticulos} onChange={d=>mod(i,d)} onDelete={()=>del(i)} mostrarSugerido={false} tipoBoleta={enc.tipoBoleta}/>)}
              {!lineas.length&&<tr><td colSpan={5} style={{textAlign:"center",color:"#94A3B8",padding:14}}>Sin líneas</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="sec" style={{borderTop:"3px solid #16A34A"}}>
        <div className="sec-title">━━ PIE ━━</div>
        <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:340,marginLeft:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700}}>SUBTOTAL:</span><strong style={{color:"#2563A8"}}>$ {fmtP(sub)}</strong></div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <label style={{margin:0,whiteSpace:"nowrap"}}>TOTAL IMPUESTOS $:</label>
            <input type="number" step="0.01" min={0} value={imp} onChange={e=>setImp(e.target.value)} style={{width:120,textAlign:"right"}} placeholder="0,00"/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",borderTop:"2px solid #E8620A",paddingTop:10}}>
            <span style={{fontWeight:700,fontSize:14}}>TOTAL COMPRA:</span>
            <strong style={{fontSize:20,color:"#E8620A"}}>$ {fmtP(total)}</strong>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
          <button className="btn btn-naranja" onClick={guardar} disabled={guardando} style={{padding:"11px 26px",fontSize:14}}>{guardando?"GUARDANDO...":"💾 CONFIRMAR COMPRA"}</button>
        </div>
      </div>
    </div>
  );
}

function Compras({proveedores,articulos,setArticulos,compras,setCompras,usuario}){
  const [vista,setVista]=useState("lista");
  const [sel,setSel]=useState(null);
  const [buscar,setBuscar]=useState("");
  const [desde,setDesde]=useState("");
  const [hasta,setHasta]=useState("");
  const [provFiltro,setProvFiltro]=useState("");

  if(vista==="nueva")return <NuevaCompra proveedores={proveedores} articulos={articulos} setArticulos={setArticulos} compras={compras} setCompras={setCompras} usuario={usuario} onVolver={()=>setVista("lista")}/>;
  if(vista==="det"&&sel){
    const c=sel;
    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <button className="btn btn-outline" onClick={()=>{setVista("lista");setSel(null);}} style={{fontSize:12}}>← VOLVER</button>
          <h2 style={{color:"#1A3A5C",fontSize:17}}>🛒 COMPRA #{c.id}</h2>
        </div>
        <div className="sec"><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
          {[["N° INTERNO",`#${c.id}`],["NRO. COMPROBANTE",c.nroComprobante||"—"],["FECHA",c.fecha],["PROVEEDOR",c.proveedorNombre],["TIPO",c.tipoBoleta],["USUARIO",c.usuario]].map(([k,v])=>(
            <div key={k}><div style={{fontSize:10,color:"#94A3B8",fontWeight:700}}>{k}</div><div style={{fontWeight:700}}>{v}</div></div>
          ))}
        </div></div>
        <div style={{background:"#fff",borderRadius:8,overflow:"auto",marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
          <table><thead><tr><th>ARTÍCULO</th><th>CANT.</th><th>P.UNIT $</th><th>TOTAL $</th></tr></thead>
            <tbody>{c.lineas.map((l,i)=><tr key={i}><td><b>{l.articuloCodigo}</b> {l.articuloNombre}</td><td>{l.cantidad}</td><td>$ {fmtP(l.precioUnitario)}</td><td style={{fontWeight:700}}>$ {fmtP(l.total)}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="sec"><div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:280,marginLeft:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span>SUBTOTAL:</span><b>$ {fmtP(c.totalDetalle)}</b></div>
          <div style={{display:"flex",justifyContent:"space-between"}}><span>IMPUESTOS:</span><b>$ {fmtP(c.totalImpuestos)}</b></div>
          <div style={{display:"flex",justifyContent:"space-between",borderTop:"2px solid #E8620A",paddingTop:8}}><span style={{fontWeight:700,fontSize:14}}>TOTAL:</span><b style={{fontSize:18,color:"#E8620A"}}>$ {fmtP(c.totalCompra)}</b></div>
        </div></div>
      </div>
    );
  }

  const filtradas=compras.filter(c=>{
    const txtOk=c.proveedorNombre.toLowerCase().includes(buscar.toLowerCase())||String(c.id).includes(buscar)||c.tipoBoleta.toLowerCase().includes(buscar.toLowerCase());
    const desdeOk=!desde||c.fecha>=desde;
    const hastaOk=!hasta||c.fecha<=hasta;
    const provOk=!provFiltro||c.proveedorNombre===provFiltro;
    return txtOk&&desdeOk&&hastaOk&&provOk;
  }).slice().reverse();

  const totalFiltrado=filtradas.reduce((s,c)=>s+(c.totalCompra||0),0);

  const exportar=async()=>{
    if(!filtradas.length){alert("No hay datos para exportar");return;}
    const resumen=filtradas.map(c=>({
      "ID": c.id,
      "Nro. Comprobante": c.nroComprobante||"",
      "Fecha": c.fecha,
      "Proveedor": c.proveedorNombre,
      "Tipo Boleta": c.tipoBoleta,
      "Subtotal $": c.totalDetalle,
      "Impuestos $": c.totalImpuestos,
      "Total $": c.totalCompra,
      "Usuario": c.usuario,
    }));
    const detalle=[];
    filtradas.forEach(c=>c.lineas.forEach(l=>detalle.push({
      "ID Compra": c.id,
      "Fecha": c.fecha,
      "Proveedor": c.proveedorNombre,
      "Código": l.articuloCodigo,
      "Artículo": l.articuloNombre,
      "Cantidad": l.cantidad,
      "Precio Unitario $": l.precioUnitario,
      "Total Línea $": l.total,
    })));
    const XLSX=await new Promise((res,rej)=>{
      if(window.XLSX){res(window.XLSX);return;}
      const s=document.createElement("script");
      s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload=()=>res(window.XLSX); s.onerror=()=>rej(new Error("Error"));
      document.head.appendChild(s);
    });
    const wb=XLSX.utils.book_new();
    const ws1=XLSX.utils.json_to_sheet(resumen);
    const ws2=XLSX.utils.json_to_sheet(detalle.length?detalle:[{"Sin detalle":""}]);
    ws1["!cols"]=Object.keys(resumen[0]).map(k=>({wch:Math.max(k.length,...resumen.map(r=>String(r[k]||"").length))+2}));
    if(detalle.length) ws2["!cols"]=Object.keys(detalle[0]).map(k=>({wch:Math.max(k.length,...detalle.map(r=>String(r[k]||"").length))+2}));
    XLSX.utils.book_append_sheet(wb,ws1,"Compras");
    XLSX.utils.book_append_sheet(wb,ws2,"Detalle");
    const fecha=new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb,`Compras_${fecha}.xlsx`);
  };

  const limpiarFiltros=()=>{setBuscar("");setDesde("");setHasta("");setProvFiltro("");};

  return(
    <div>
      <h2 style={{color:"#1A3A5C",marginBottom:14,fontSize:17,borderBottom:"3px solid #1A6FA8",paddingBottom:8}}>🛒 COMPRAS</h2>
      <div className="sec" style={{padding:12,marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10,alignItems:"end"}}>
          <div className="fg" style={{margin:0}}><label>BUSCAR</label><input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Proveedor, ID, tipo..."/></div>
          <div className="fg" style={{margin:0}}><label>FECHA DESDE</label><input type="date" value={desde} onChange={e=>setDesde(e.target.value)}/></div>
          <div className="fg" style={{margin:0}}><label>FECHA HASTA</label><input type="date" value={hasta} onChange={e=>setHasta(e.target.value)}/></div>
          <div className="fg" style={{margin:0}}><label>PROVEEDOR</label>
            <select value={provFiltro} onChange={e=>setProvFiltro(e.target.value)}>
              <option value="">Todos</option>
              {[...new Set(compras.map(c=>c.proveedorNombre))].sort().map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button className="btn btn-outline" onClick={limpiarFiltros} style={{fontSize:11,padding:"6px 10px"}}>✕ LIMPIAR</button>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{flex:1,fontSize:13,color:"#1A3A5C"}}>
          <strong>{filtradas.length}</strong> compra{filtradas.length!==1?"s":""} · Total: <strong style={{color:"#E8620A"}}>$ {fmtP(totalFiltrado)}</strong>
        </div>
        <button className="btn btn-outline" onClick={exportar} style={{borderColor:"#16A34A",color:"#16A34A",fontSize:12}}>📥 EXPORTAR EXCEL</button>
        <button className="btn btn-naranja" onClick={()=>setVista("nueva")}>+ NUEVA COMPRA</button>
      </div>
      <div style={{background:"#fff",borderRadius:8,overflow:"auto",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
        <table><thead><tr><th>ID</th><th>NRO. COMPROBANTE</th><th>FECHA</th><th>PROVEEDOR</th><th>TIPO</th><th>TOTAL $</th><th>USUARIO</th><th></th></tr></thead>
          <tbody>
            {filtradas.map(c=>(
              <tr key={c.id}>
                <td><b>#{c.id}</b></td><td>{c.nroComprobante||<span style={{color:"#94A3B8"}}>—</span>}</td><td>{c.fecha}</td><td>{c.proveedorNombre}</td>
                <td><span className="badge" style={{background:"#2563A8",color:"#fff"}}>{c.tipoBoleta}</span></td>
                <td style={{fontWeight:700,color:"#E8620A"}}>$ {fmtP(c.totalCompra)}</td>
                <td style={{fontSize:11,color:"#94A3B8"}}>{c.usuario}</td>
                <td><button className="btn btn-outline" onClick={()=>{setSel(c);setVista("det");}} style={{fontSize:11,padding:"4px 10px"}}>👁️ VER</button></td>
              </tr>
            ))}
            {!filtradas.length&&<tr><td colSpan={8} style={{textAlign:"center",color:"#94A3B8",padding:20}}>Sin compras para los filtros seleccionados</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NuevaVenta({clientes,articulos,setArticulos,ventas,setVentas,usuario,onVolver}){
  const nroAuto = String(ventas.length+1).padStart(6,"0");
  const [enc,setEnc]=useState({fecha:hoy(),clienteId:"",nroComprobante:nroAuto,nroFacOficial:""});
  const [lineas,setLineas]=useState([{_k:1,articuloId:null,articuloNombre:"",articuloCodigo:"",precioCosto:0,rentabilidad:0,cantidad:"",precioUnitario:""}]);
  const [err,setErr]=useState("");
  const [guardando,setGuardando]=useState(false);
  const [ok,setOk]=useState(false);

  const totalVenta=lineas.reduce((s,l)=>s+(parseFloat(l.cantidad)||0)*(parseFloat(l.precioUnitario)||0),0);
  const agregar=()=>setLineas(p=>[...p,{_k:Date.now(),articuloId:null,articuloNombre:"",articuloCodigo:"",precioCosto:0,rentabilidad:0,cantidad:"",precioUnitario:""}]);
  const mod=(i,d)=>setLineas(p=>p.map((l,idx)=>idx===i?d:l));
  const del=i=>setLineas(p=>p.filter((_,idx)=>idx!==i));

  const guardar=async()=>{
    if(!enc.clienteId){setErr("Seleccione un cliente");return;}
    if(!lineas.length){setErr("Agregue al menos un artículo");return;}
    if(lineas.some(l=>!l.articuloId||(+l.cantidad)<=0)){setErr("Complete artículo y cantidad en todas las líneas");return;}
    const cantPorArt={};
    lineas.forEach(l=>{if(l.articuloId)cantPorArt[l.articuloId]=(cantPorArt[l.articuloId]||0)+(+l.cantidad||0);});
    for(const [artId,cant] of Object.entries(cantPorArt)){
      const art=articulos.find(a=>a.id===+artId);
      if(art&&(art.stock||0)<cant){setErr(`Stock insuficiente para "${art.nombre}" (disponible: ${art.stock}, pedido: ${cant})`);return;}
    }
    setGuardando(true); setErr("");
    try{
      const cli=clientes.find(c=>c.id===+enc.clienteId);
      const {data:vtaData}=await sb.from("ventas").insert({
        fecha:enc.fecha,cliente_id:+enc.clienteId,cliente_nombre:cli?.razonSocial||"",
        nro_comprobante:enc.nroComprobante||nroAuto,nro_fac_oficial:enc.nroFacOficial||"",total_venta:totalVenta,usuario_nombre:usuario.nombre
      });
      const vtaId=vtaData[0].id;
      await sb.from("ventas_detalle").insert(lineas.map(l=>({
        venta_id:vtaId,articulo_id:l.articuloId,articulo_nombre:l.articuloNombre,articulo_codigo:l.articuloCodigo,
        cantidad:+l.cantidad,precio_costo:l.precioCosto,rentabilidad:l.rentabilidad,
        precio_unitario:+l.precioUnitario,subtotal:(+l.cantidad)*(+l.precioUnitario)
      })));
      for(const [artId,cant] of Object.entries(cantPorArt)){
        const art=articulos.find(a=>a.id===+artId);
        if(art){
          const nuevoStock=Math.max(0,(art.stock||0)-cant);
          await sb.from("articulos").eq("id",art.id).update({stock:nuevoStock});
          setArticulos(p=>p.map(a=>a.id===+artId?{...a,stock:nuevoStock}:a));
        }
      }
      const nuevaVta={id:vtaId,fecha:enc.fecha,clienteId:+enc.clienteId,clienteNombre:cli?.razonSocial||"",nroComprobante:enc.nroComprobante||nroAuto,nroFacOficial:enc.nroFacOficial||"",totalVenta,usuario:usuario.nombre,
        lineas:lineas.map(l=>({articuloId:l.articuloId,articuloNombre:l.articuloNombre,articuloCodigo:l.articuloCodigo,cantidad:+l.cantidad,precioCosto:l.precioCosto,rentabilidad:l.rentabilidad,precioUnitario:+l.precioUnitario,subtotal:(+l.cantidad)*(+l.precioUnitario)}))};
      setVentas(p=>[...p,nuevaVta]);
      setOk(true); setTimeout(onVolver,1500);
    }catch(e){setErr("Error al guardar: "+e.message);}
    finally{setGuardando(false);}
  };

  if(ok)return(<div style={{textAlign:"center",padding:60}}><div style={{fontSize:48}}>✅</div><h3 style={{color:"#16A34A",marginTop:10}}>¡VENTA REGISTRADA!</h3><p style={{color:"#94A3B8",marginTop:6}}>Stock descontado en la base de datos.</p></div>);
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <button className="btn btn-outline" onClick={onVolver} style={{fontSize:12}}>← VOLVER</button>
        <h2 style={{color:"#1A3A5C",fontSize:17,borderBottom:"3px solid #1A8F4A",paddingBottom:4}}>💰 NUEVA VENTA</h2>
      </div>
      {err&&<div className="err">{err}</div>}
      <div className="sec" style={{borderTop:"3px solid #16A34A"}}>
        <div className="sec-title">━━ ENCABEZADO ━━</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
          <div className="fg"><label>FECHA *</label><input type="date" value={enc.fecha} onChange={e=>setEnc(p=>({...p,fecha:e.target.value}))}/></div>
          <div className="fg">
            <label>NRO. INTERNO (AUTO)</label>
            <input value={enc.nroComprobante||nroAuto} disabled style={{fontWeight:700,color:"#1A6FA8"}}/>
          </div>
          <div className="fg">
            <label>N° FAC. OFICIAL</label>
            <input value={enc.nroFacOficial||""} onChange={e=>setEnc(p=>({...p,nroFacOficial:e.target.value}))} placeholder="Ej: 0001-00012345"/>
          </div>
          <div className="fg"><label>CLIENTE *</label>
            <select value={enc.clienteId} onChange={e=>setEnc(p=>({...p,clienteId:e.target.value}))}>
              <option value="">-- Seleccionar --</option>
              {clientes.filter(c=>c.activo).map(c=><option key={c.id} value={c.id}>{c.razonSocial}</option>)}
            </select>
          </div>
          <div className="fg"><label>USUARIO</label><input value={usuario.nombre} disabled/></div>
        </div>
      </div>
      <div className="sec" style={{borderTop:"3px solid #E8620A"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div className="sec-title" style={{margin:0}}>━━ DETALLE ━━</div>
          <button className="btn btn-primary" onClick={agregar} style={{fontSize:12}}>+ LÍNEA</button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table>
            <thead><tr><th>ARTÍCULO</th><th>CANT.</th><th>PRECIO UNIT. $</th><th>SUBTOTAL $</th><th></th></tr></thead>
            <tbody>
              {lineas.map((l,i)=><LineaConRef key={l._k} linea={l} articulos={articulos} setArticulos={setArticulos} onChange={d=>mod(i,d)} onDelete={()=>del(i)} mostrarSugerido={true}/>)}
              {!lineas.length&&<tr><td colSpan={5} style={{textAlign:"center",color:"#94A3B8",padding:14}}>Sin líneas</td></tr>}
            </tbody>
          </table>
        </div>
        {lineas.some(l=>l.articuloId)&&(
          <div style={{marginTop:10,padding:10,background:"#F0FDF4",borderRadius:6,fontSize:12}}>
            <div style={{fontWeight:700,color:"#16A34A",marginBottom:6}}>📊 RENTABILIDAD</div>
            {lineas.filter(l=>l.articuloId).map((l,i)=>{
              const sub=(parseFloat(l.cantidad)||0)*(parseFloat(l.precioUnitario)||0);
              const ganancia=sub-(parseFloat(l.cantidad)||0)*(parseFloat(l.precioCosto)||0);
              return(<div key={i} style={{display:"flex",gap:16,flexWrap:"wrap",borderBottom:"1px solid #BBF7D0",paddingBottom:3,marginBottom:3}}>
                <span style={{fontWeight:700}}>{l.articuloNombre}</span>
                <span>Cant.: {l.cantidad||0} · Costo: $ {fmtP(l.precioCosto)}</span>
                <span style={{color:"#16A34A",fontWeight:700}}>Ganancia: $ {fmtP(ganancia)}</span>
                <span style={{color:"#1A6FA8",fontWeight:700}}>Subtotal: $ {fmtP(sub)}</span>
              </div>);
            })}
          </div>
        )}
      </div>
      <div className="sec" style={{borderTop:"3px solid #0891B2"}}>
        <div className="sec-title">━━ TOTALES ━━</div>
        <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:340,marginLeft:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",borderTop:"2px solid #16A34A",paddingTop:10}}>
            <span style={{fontWeight:700,fontSize:15}}>TOTAL VENTA:</span>
            <strong style={{fontSize:22,color:"#16A34A"}}>$ {fmtP(totalVenta)}</strong>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
          <button className="btn btn-verde" onClick={guardar} disabled={guardando} style={{padding:"11px 26px",fontSize:14}}>{guardando?"GUARDANDO...":"💾 CONFIRMAR VENTA"}</button>
        </div>
      </div>
    </div>
  );
}

function Ventas({clientes,articulos,setArticulos,ventas,setVentas,usuario}){
  const [vista,setVista]=useState("lista");
  const [sel,setSel]=useState(null);
  const [buscar,setBuscar]=useState("");
  const [desde,setDesde]=useState("");
  const [hasta,setHasta]=useState("");
  const [cliFiltro,setCliFiltro]=useState("");

  if(vista==="nueva")return <NuevaVenta clientes={clientes} articulos={articulos} setArticulos={setArticulos} ventas={ventas} setVentas={setVentas} usuario={usuario} onVolver={()=>setVista("lista")}/>;
  if(vista==="det"&&sel){
    const v=sel;
    const totalGanancia=v.lineas.reduce((s,l)=>s+(l.subtotal-(l.cantidad||0)*(l.precioCosto||0)),0);
    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <button className="btn btn-outline" onClick={()=>{setVista("lista");setSel(null);}} style={{fontSize:12}}>← VOLVER</button>
          <h2 style={{color:"#1A3A5C",fontSize:17}}>💰 VENTA #{v.id}</h2>
        </div>
        <div className="sec"><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
          {[["N° INTERNO",`#${v.id}`],["N° COMPROBANTE",v.nroComprobante||"—"],["N° FAC. OFICIAL",v.nroFacOficial||"—"],["FECHA",v.fecha],["CLIENTE",v.clienteNombre],["USUARIO",v.usuario]].map(([k,val])=>(
            <div key={k+val}><div style={{fontSize:10,color:"#94A3B8",fontWeight:700}}>{k}</div><div style={{fontWeight:700}}>{val}</div></div>
          ))}
        </div></div>
        <div style={{background:"#fff",borderRadius:8,overflow:"auto",marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
          <table><thead><tr><th>ARTÍCULO</th><th>CANT.</th><th>COSTO $</th><th>P.UNIT $</th><th>SUBTOTAL $</th><th>GANANCIA $</th></tr></thead>
            <tbody>{v.lineas.map((l,i)=>{const g=l.subtotal-(l.cantidad||0)*(l.precioCosto||0);return(
              <tr key={i}><td><b>{l.articuloCodigo}</b> {l.articuloNombre}</td><td>{l.cantidad}</td><td style={{color:"#94A3B8"}}>$ {fmtP(l.precioCosto)}</td><td>$ {fmtP(l.precioUnitario)}</td><td style={{fontWeight:700}}>$ {fmtP(l.subtotal)}</td><td style={{fontWeight:700,color:"#16A34A"}}>$ {fmtP(g)}</td></tr>
            );})}</tbody>
          </table>
        </div>
        <div className="sec"><div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:300,marginLeft:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",borderTop:"2px solid #16A34A",paddingTop:8}}><span style={{fontWeight:700,fontSize:14}}>TOTAL VENTA:</span><b style={{fontSize:18,color:"#16A34A"}}>$ {fmtP(v.totalVenta)}</b></div>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,fontSize:13}}>GANANCIA TOTAL:</span><b style={{fontSize:16,color:"#0891B2"}}>$ {fmtP(totalGanancia)}</b></div>
        </div></div>
      </div>
    );
  }

  const filtradas=ventas.filter(v=>{
    const txtOk=v.clienteNombre.toLowerCase().includes(buscar.toLowerCase())||String(v.id).includes(buscar);
    const desdeOk=!desde||v.fecha>=desde;
    const hastaOk=!hasta||v.fecha<=hasta;
    const cliOk=!cliFiltro||v.clienteNombre===cliFiltro;
    return txtOk&&desdeOk&&hastaOk&&cliOk;
  }).slice().reverse();

  const totalFiltrado=filtradas.reduce((s,v)=>s+(v.totalVenta||0),0);
  const gananciaFiltrada=filtradas.reduce((s,v)=>s+v.lineas.reduce((ls,l)=>ls+(l.subtotal||0)-(l.cantidad||0)*(l.precioCosto||0),0),0);

  const exportar=async()=>{
    if(!filtradas.length){alert("No hay datos para exportar");return;}
    const resumen=filtradas.map(v=>({
      "ID": v.id,
      "Nro. Comprobante": v.nroComprobante||"",
      "Fecha": v.fecha,
      "Cliente": v.clienteNombre,
      "Total Venta $": v.totalVenta,
      "Ganancia $": v.lineas.reduce((s,l)=>s+(l.subtotal||0)-(l.cantidad||0)*(l.precioCosto||0),0),
      "Usuario": v.usuario,
    }));
    const detalle=[];
    filtradas.forEach(v=>v.lineas.forEach(l=>detalle.push({
      "ID Venta": v.id,
      "Fecha": v.fecha,
      "Cliente": v.clienteNombre,
      "Código": l.articuloCodigo,
      "Artículo": l.articuloNombre,
      "Cantidad": l.cantidad,
      "Costo Unit. $": l.precioCosto,
      "Precio Unit. $": l.precioUnitario,
      "Subtotal $": l.subtotal,
      "Ganancia $": (l.subtotal||0)-(l.cantidad||0)*(l.precioCosto||0),
    })));
    const XLSX=await new Promise((res,rej)=>{
      if(window.XLSX){res(window.XLSX);return;}
      const s=document.createElement("script");
      s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload=()=>res(window.XLSX); s.onerror=()=>rej(new Error("Error"));
      document.head.appendChild(s);
    });
    const wb=XLSX.utils.book_new();
    const ws1=XLSX.utils.json_to_sheet(resumen);
    const ws2=XLSX.utils.json_to_sheet(detalle.length?detalle:[{"Sin detalle":""}]);
    ws1["!cols"]=Object.keys(resumen[0]).map(k=>({wch:Math.max(k.length,...resumen.map(r=>String(r[k]||"").length))+2}));
    if(detalle.length) ws2["!cols"]=Object.keys(detalle[0]).map(k=>({wch:Math.max(k.length,...detalle.map(r=>String(r[k]||"").length))+2}));
    XLSX.utils.book_append_sheet(wb,ws1,"Ventas");
    XLSX.utils.book_append_sheet(wb,ws2,"Detalle");
    const fecha=new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb,`Ventas_${fecha}.xlsx`);
  };

  const limpiarFiltros=()=>{setBuscar("");setDesde("");setHasta("");setCliFiltro("");};

  return(
    <div>
      <h2 style={{color:"#1A3A5C",marginBottom:14,fontSize:17,borderBottom:"3px solid #1A8F4A",paddingBottom:8}}>💰 VENTAS</h2>
      <div className="sec" style={{padding:12,marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10,alignItems:"end"}}>
          <div className="fg" style={{margin:0}}><label>BUSCAR</label><input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Cliente o ID..."/></div>
          <div className="fg" style={{margin:0}}><label>FECHA DESDE</label><input type="date" value={desde} onChange={e=>setDesde(e.target.value)}/></div>
          <div className="fg" style={{margin:0}}><label>FECHA HASTA</label><input type="date" value={hasta} onChange={e=>setHasta(e.target.value)}/></div>
          <div className="fg" style={{margin:0}}><label>CLIENTE</label>
            <select value={cliFiltro} onChange={e=>setCliFiltro(e.target.value)}>
              <option value="">Todos</option>
              {[...new Set(ventas.map(v=>v.clienteNombre))].sort().map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div><button className="btn btn-outline" onClick={limpiarFiltros} style={{fontSize:11,padding:"6px 10px"}}>✕ LIMPIAR</button></div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{flex:1,fontSize:13,color:"#1A3A5C",display:"flex",gap:16,flexWrap:"wrap"}}>
          <span><strong>{filtradas.length}</strong> venta{filtradas.length!==1?"s":""}</span>
          <span>Total: <strong style={{color:"#16A34A"}}>$ {fmtP(totalFiltrado)}</strong></span>
          <span>Ganancia: <strong style={{color:"#0891B2"}}>$ {fmtP(gananciaFiltrada)}</strong></span>
        </div>
        <button className="btn btn-outline" onClick={exportar} style={{borderColor:"#16A34A",color:"#16A34A",fontSize:12}}>📥 EXPORTAR EXCEL</button>
        <button className="btn btn-verde" onClick={()=>setVista("nueva")}>+ NUEVA VENTA</button>
      </div>
      <div style={{background:"#fff",borderRadius:8,overflow:"auto",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
        <table><thead><tr><th>ID</th><th>NRO. COMPROBANTE</th><th>FECHA</th><th>CLIENTE</th><th>TOTAL $</th><th>GANANCIA $</th><th>USUARIO</th><th></th></tr></thead>
          <tbody>
            {filtradas.map(v=>{
              const gan=v.lineas.reduce((s,l)=>s+(l.subtotal||0)-(l.cantidad||0)*(l.precioCosto||0),0);
              return(
                <tr key={v.id}>
                  <td><b>#{v.id}</b></td><td>{v.nroComprobante||<span style={{color:"#94A3B8"}}>—</span>}</td><td>{v.fecha}</td><td>{v.clienteNombre}</td>
                  <td style={{fontWeight:700,color:"#16A34A"}}>$ {fmtP(v.totalVenta)}</td>
                  <td style={{fontWeight:700,color:"#0891B2"}}>$ {fmtP(gan)}</td>
                  <td style={{fontSize:11,color:"#94A3B8"}}>{v.usuario}</td>
                  <td><button className="btn btn-outline" onClick={()=>{setSel(v);setVista("det");}} style={{fontSize:11,padding:"4px 10px"}}>👁️ VER</button></td>
                </tr>
              );
            })}
            {!filtradas.length&&<tr><td colSpan={8} style={{textAlign:"center",color:"#94A3B8",padding:20}}>Sin ventas para los filtros seleccionados</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Reportes({ventas,articulos,compras}){
  const [periodo,setPeriodo]=useState("todo");
  const [tab,setTab]=useState("vendidos");
  const [artBuscar,setArtBuscar]=useState("");
  const [artSel,setArtSel]=useState(null);
  const [movTab,setMovTab]=useState("compras");
  const [movDesde,setMovDesde]=useState("");
  const [movHasta,setMovHasta]=useState("");
  const ahora=new Date();
  const vf=ventas.filter(v=>{
    if(periodo==="todo")return true;
    const fv=new Date(v.fecha);
    if(periodo==="mes")return fv.getFullYear()===ahora.getFullYear()&&fv.getMonth()===ahora.getMonth();
    if(periodo==="semana")return(ahora-fv)/(1000*60*60*24)<=7;
    return true;
  });
  const topVendidos=()=>{ const m={}; vf.forEach(v=>v.lineas.forEach(l=>{ if(!l.articuloId)return; if(!m[l.articuloId])m[l.articuloId]={id:l.articuloId,nombre:l.articuloNombre,codigo:l.articuloCodigo,cantidad:0,totalVendido:0}; m[l.articuloId].cantidad+=(+l.cantidad||0); m[l.articuloId].totalVendido+=(+l.subtotal||0); })); return Object.values(m).sort((a,b)=>b.cantidad-a.cantidad).slice(0,10); };
  const topRentables=()=>{ const m={}; vf.forEach(v=>v.lineas.forEach(l=>{ if(!l.articuloId)return; const g=(+l.subtotal||0)-(+l.cantidad||0)*(+l.precioCosto||0); if(!m[l.articuloId])m[l.articuloId]={id:l.articuloId,nombre:l.articuloNombre,codigo:l.articuloCodigo,gananciaTotal:0,totalVendido:0,cantidad:0}; m[l.articuloId].gananciaTotal+=g; m[l.articuloId].totalVendido+=(+l.subtotal||0); m[l.articuloId].cantidad+=(+l.cantidad||0); })); return Object.values(m).map(x=>({...x,rentProm:x.totalVendido>0?x.gananciaTotal/x.totalVendido*100:0})).sort((a,b)=>b.gananciaTotal-a.gananciaTotal).slice(0,10); };
  const topClientes=()=>{ const m={}; vf.forEach(v=>{ if(!m[v.clienteId])m[v.clienteId]={id:v.clienteId,nombre:v.clienteNombre,totalComprado:0,cantVentas:0}; m[v.clienteId].totalComprado+=(+v.totalVenta||0); m[v.clienteId].cantVentas++; }); return Object.values(m).sort((a,b)=>b.totalComprado-a.totalComprado).slice(0,10); };
  const evolucion=()=>{ const m={}; ventas.forEach(v=>{ const mes=v.fecha.slice(0,7); if(!m[mes])m[mes]={mes,total:0,cantidad:0}; m[mes].total+=(+v.totalVenta||0); m[mes].cantidad++; }); return Object.values(m).sort((a,b)=>a.mes.localeCompare(b.mes)).slice(-12); };
  const BarraH=({valor,max,color="#2563A8"})=>(<div style={{flex:1,height:14,background:"#F1F5F9",borderRadius:7,overflow:"hidden",minWidth:60}}><div style={{width:(max>0?Math.max(4,valor/max*100):0)+"%",height:"100%",background:color,borderRadius:7,transition:"width 0.4s"}}/></div>);
  const vend=topVendidos(),rent=topRentables(),clis=topClientes(),evol=evolucion();
  const totalVentas=vf.reduce((s,v)=>s+(+v.totalVenta||0),0);
  const totalGanancia=vf.reduce((s,v)=>s+v.lineas.reduce((ls,l)=>ls+(+l.subtotal||0)-(+l.cantidad||0)*(+l.precioCosto||0),0),0);
  const TABS=[{id:"vendidos",label:"🏆 MÁS VENDIDOS",color:"#2563A8"},{id:"rentables",label:"💎 MÁS RENTABLES",color:"#7C3AED"},{id:"clientes",label:"👥 MEJORES CLIENTES",color:"#E8620A"},{id:"evolucion",label:"📈 EVOLUCIÓN",color:"#16A34A"},{id:"movimientos",label:"📋 MOVIMIENTOS",color:"#0891B2"}];
  return(
    <div>
      <h2 style={{color:"#1A3A5C",marginBottom:14,fontSize:17,borderBottom:"3px solid #1A6FA8",paddingBottom:8}}>📊 REPORTES Y ESTADÍSTICAS</h2>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{fontWeight:700,fontSize:12,color:"#1A3A5C"}}>PERÍODO:</div>
        {[["todo","Todo el tiempo"],["mes","Este mes"],["semana","Últimos 7 días"]].map(([v,l])=>(
          <button key={v} onClick={()=>setPeriodo(v)} className="btn" style={{fontSize:12,padding:"6px 14px",background:periodo===v?"#1A3A5C":"#fff",color:periodo===v?"#fff":"#1A3A5C",border:"2px solid #1A3A5C"}}>{l}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginBottom:16}}>
        {[{l:"Ventas",v:vf.length,i:"🛒",c:"#2563A8"},{l:"$ Facturado",v:"$ "+fmtP(totalVentas),i:"💵",c:"#16A34A"},{l:"$ Ganancia",v:"$ "+fmtP(totalGanancia),i:"📈",c:"#7C3AED"},{l:"Margen %",v:totalVentas>0?(totalGanancia/totalVentas*100).toFixed(1)+"%":"0%",i:"💎",c:"#E8620A"}].map(c=>(
          <div key={c.l} style={{background:"#fff",borderRadius:8,padding:"12px 14px",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",borderLeft:`4px solid ${c.c}`}}>
            <div style={{fontSize:18}}>{c.i}</div><div style={{fontSize:15,fontWeight:700,color:c.c,marginTop:3}}>{c.v}</div><div style={{fontSize:10,color:"#94A3B8",fontWeight:700}}>{c.l}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className="btn" style={{fontSize:12,padding:"7px 14px",background:tab===t.id?t.color:"#fff",color:tab===t.id?"#fff":t.color,border:`2px solid ${t.color}`}}>{t.label}</button>)}
      </div>
      {tab==="vendidos"&&(<div className="sec"><div className="sec-title">🏆 TOP 10 MÁS VENDIDOS</div>
        {!vend.length&&<div style={{textAlign:"center",color:"#94A3B8",padding:24}}>Sin datos para el período</div>}
        {vend.map((a,i)=>(<div key={a.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
          <div style={{width:26,height:26,background:i<3?"#E8620A":"#2563A8",color:"#fff",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0}}>{i+1}</div>
          <div style={{minWidth:160,flex:2}}><div style={{fontWeight:700,fontSize:13}}>{a.nombre}</div><div style={{fontSize:11,color:"#94A3B8"}}>{a.codigo}</div></div>
          <BarraH valor={a.cantidad} max={vend[0]?.cantidad||1} color={i<3?"#E8620A":"#2563A8"}/>
          <div style={{minWidth:80,textAlign:"right",fontWeight:700,color:"#2563A8",fontSize:13}}>{a.cantidad} u.</div>
          <div style={{minWidth:110,textAlign:"right",fontWeight:700,color:"#16A34A",fontSize:13}}>$ {fmtP(a.totalVendido)}</div>
        </div>))}
      </div>)}
      {tab==="rentables"&&(<div className="sec"><div className="sec-title">💎 TOP 10 MÁS RENTABLES</div>
        {!rent.length&&<div style={{textAlign:"center",color:"#94A3B8",padding:24}}>Sin datos para el período</div>}
        {rent.map((a,i)=>(<div key={a.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
          <div style={{width:26,height:26,background:i<3?"#7C3AED":"#2563A8",color:"#fff",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0}}>{i+1}</div>
          <div style={{minWidth:160,flex:2}}><div style={{fontWeight:700,fontSize:13}}>{a.nombre}</div><div style={{fontSize:11,color:"#94A3B8"}}>{a.codigo} · {a.cantidad} u.</div></div>
          <BarraH valor={a.gananciaTotal} max={rent[0]?.gananciaTotal||1} color={i<3?"#7C3AED":"#2563A8"}/>
          <div style={{minWidth:80,textAlign:"right",fontWeight:700,color:"#7C3AED",fontSize:13}}>{a.rentProm.toFixed(1)}%</div>
          <div style={{minWidth:110,textAlign:"right",fontWeight:700,color:"#16A34A",fontSize:13}}>$ {fmtP(a.gananciaTotal)}</div>
        </div>))}
      </div>)}
      {tab==="clientes"&&(<div className="sec"><div className="sec-title">👥 TOP 10 MEJORES CLIENTES</div>
        {!clis.length&&<div style={{textAlign:"center",color:"#94A3B8",padding:24}}>Sin datos para el período</div>}
        {clis.map((c,i)=>(<div key={c.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
          <div style={{width:26,height:26,background:i<3?"#E8620A":"#2563A8",color:"#fff",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0}}>{i+1}</div>
          <div style={{minWidth:160,flex:2}}><div style={{fontWeight:700,fontSize:13}}>{c.nombre}</div><div style={{fontSize:11,color:"#94A3B8"}}>{c.cantVentas} compra{c.cantVentas!==1?"s":""}</div></div>
          <BarraH valor={c.totalComprado} max={clis[0]?.totalComprado||1} color={i<3?"#E8620A":"#2563A8"}/>
          <div style={{minWidth:120,textAlign:"right",fontWeight:700,color:"#16A34A",fontSize:13}}>$ {fmtP(c.totalComprado)}</div>
        </div>))}
      </div>)}
      {tab==="evolucion"&&(<div className="sec"><div className="sec-title">📈 EVOLUCIÓN MENSUAL (últimos 12 meses)</div>
        {!evol.length&&<div style={{textAlign:"center",color:"#94A3B8",padding:24}}>Sin datos de ventas</div>}
        {evol.map(e=>(<div key={e.mes} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
          <div style={{minWidth:70,fontWeight:700,fontSize:12,color:"#1A3A5C"}}>{e.mes}</div>
          <BarraH valor={e.total} max={Math.max(...evol.map(x=>x.total),1)} color="#16A34A"/>
          <div style={{minWidth:60,textAlign:"right",fontSize:11,color:"#94A3B8"}}>{e.cantidad} vta{e.cantidad!==1?"s":""}</div>
          <div style={{minWidth:120,textAlign:"right",fontWeight:700,color:"#16A34A",fontSize:13}}>$ {fmtP(e.total)}</div>
        </div>))}
        {evol.length>1&&<div style={{marginTop:14,padding:"10px 14px",background:"#F0FDF4",borderRadius:6,fontSize:12,color:"#16A34A",fontWeight:700}}>📊 Promedio mensual: $ {fmtP(evol.reduce((s,e)=>s+e.total,0)/evol.length)}</div>}
      </div>)}
      {tab==="movimientos"&&(
        <MovimientosArticulo
          articulos={articulos} compras={compras} ventas={ventas}
          artBuscar={artBuscar} setArtBuscar={setArtBuscar}
          artSel={artSel} setArtSel={setArtSel}
          movTab={movTab} setMovTab={setMovTab}
          movDesde={movDesde} setMovDesde={setMovDesde}
          movHasta={movHasta} setMovHasta={setMovHasta}
        />
      )}
    </div>
  );
}

function MovimientosArticulo({articulos,compras,ventas,artBuscar,setArtBuscar,artSel,setArtSel,movTab,setMovTab,movDesde,setMovDesde,movHasta,setMovHasta}){
  const [openArt,setOpenArt]=useState(false);
  const sugsArt=articulos.filter(a=>
    artBuscar.trim()===""||
    a.nombre.toLowerCase().includes(artBuscar.toLowerCase())||
    a.codigo.toLowerCase().includes(artBuscar.toLowerCase())
  ).slice(0,10);

  const selArt=a=>{ setArtSel(a); setArtBuscar(a.nombre); setOpenArt(false); };

  const lineasCompra=artSel ? compras.flatMap(c=>
    c.lineas.filter(l=>l.articuloId===artSel.id).map(l=>({
      tipo:"COMPRA", id:c.id, fecha:c.fecha,
      contraparte:c.proveedorNombre, tipoBoleta:c.tipoBoleta,
      cantidad:+l.cantidad||0, precioUnit:+l.precioUnitario||0,
      total:+l.total||0, usuario:c.usuario,
    }))
  ).filter(m=>(!movDesde||m.fecha>=movDesde)&&(!movHasta||m.fecha<=movHasta))
   .sort((a,b)=>b.fecha.localeCompare(a.fecha)) : [];

  const lineasVenta=artSel ? ventas.flatMap(v=>
    v.lineas.filter(l=>l.articuloId===artSel.id).map(l=>({
      tipo:"VENTA", id:v.id, fecha:v.fecha,
      nroComprobante:v.nroComprobante||"",
      contraparte:v.clienteNombre,
      cantidad:+l.cantidad||0,
      precioCosto:+l.precioCosto||0,
      precioUnit:+l.precioUnitario||0,
      subtotal:+l.subtotal||0,
      ganancia:(+l.subtotal||0)-(+l.cantidad||0)*(+l.precioCosto||0),
      usuario:v.usuario,
    }))
  ).filter(m=>(!movDesde||m.fecha>=movDesde)&&(!movHasta||m.fecha<=movHasta))
   .sort((a,b)=>b.fecha.localeCompare(a.fecha)) : [];

  const totalComprado=lineasCompra.reduce((s,m)=>s+m.cantidad,0);
  const totalVendido=lineasVenta.reduce((s,m)=>s+m.cantidad,0);
  const costoTotal=lineasCompra.reduce((s,m)=>s+m.total,0);
  const ventaTotal=lineasVenta.reduce((s,m)=>s+m.subtotal,0);
  const gananciaTotal=lineasVenta.reduce((s,m)=>s+m.ganancia,0);

  const exportar=async()=>{
    if(!artSel){alert("Seleccione un artículo primero");return;}
    if(!lineasCompra.length&&!lineasVenta.length){alert("Sin movimientos para exportar");return;}
    const XLSX=await new Promise((res,rej)=>{
      if(window.XLSX){res(window.XLSX);return;}
      const s=document.createElement("script");
      s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload=()=>res(window.XLSX); s.onerror=()=>rej(new Error("Error"));
      document.head.appendChild(s);
    });
    const wb=XLSX.utils.book_new();
    const resumen=[{"Artículo":artSel.nombre,"Código":artSel.codigo,"Stock Actual":artSel.stock,"Total Comprado (u.)":totalComprado,"Costo Total $":costoTotal,"Total Vendido (u.)":totalVendido,"Venta Total $":ventaTotal,"Ganancia Total $":gananciaTotal}];
    const hCompras=lineasCompra.map(m=>({"ID Compra":m.id,"Fecha":m.fecha,"Proveedor":m.contraparte,"Tipo Boleta":m.tipoBoleta,"Cantidad":m.cantidad,"Precio Unitario $":m.precioUnit,"Total $":m.total,"Usuario":m.usuario}));
    const hVentas=lineasVenta.map(m=>({"ID Venta":m.id,"Fecha":m.fecha,"Cliente":m.contraparte,"Cantidad":m.cantidad,"Costo Unit. $":m.precioCosto,"Precio Unit. $":m.precioUnit,"Subtotal $":m.subtotal,"Ganancia $":m.ganancia,"Usuario":m.usuario}));
    const setCols=(ws,rows)=>{ if(!rows.length)return; ws["!cols"]=Object.keys(rows[0]).map(k=>({wch:Math.max(k.length,...rows.map(r=>String(r[k]||"").length))+2})); };
    const ws0=XLSX.utils.json_to_sheet(resumen); setCols(ws0,resumen);
    const ws1=XLSX.utils.json_to_sheet(hCompras.length?hCompras:[{"Sin datos":""}]); setCols(ws1,hCompras);
    const ws2=XLSX.utils.json_to_sheet(hVentas.length?hVentas:[{"Sin datos":""}]); setCols(ws2,hVentas);
    XLSX.utils.book_append_sheet(wb,ws0,"Resumen");
    XLSX.utils.book_append_sheet(wb,ws1,"Compras");
    XLSX.utils.book_append_sheet(wb,ws2,"Ventas");
    XLSX.writeFile(wb,`Movimientos_${artSel.codigo}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return(
    <div>
      <div className="sec" style={{borderTop:"3px solid #0891B2"}}>
        <div className="sec-title">📋 MOVIMIENTOS POR ARTÍCULO</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"end"}}>
          <div style={{flex:1,minWidth:220,position:"relative"}}>
            <label>ARTÍCULO</label>
            <input value={artBuscar}
              onChange={e=>{setArtBuscar(e.target.value);setOpenArt(true);setArtSel(null);}}
              onFocus={()=>setOpenArt(true)} onBlur={()=>setTimeout(()=>setOpenArt(false),200)}
              placeholder="Buscar por nombre o código..."/>
            {openArt&&sugsArt.length>0&&(
              <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1px solid #94A3B8",borderRadius:4,zIndex:300,boxShadow:"0 4px 16px rgba(0,0,0,0.15)",maxHeight:220,overflowY:"auto"}}>
                {sugsArt.map(a=>(
                  <div key={a.id} onMouseDown={()=>selArt(a)}
                    style={{padding:"7px 12px",cursor:"pointer",borderBottom:"1px solid #CBD5E1",fontSize:12}}>
                    <b>{a.codigo}</b> — {a.nombre}
                    <span style={{color:"#94A3B8",fontSize:11}}> (Stock: {a.stock})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{minWidth:140}}><label>DESDE</label><input type="date" value={movDesde} onChange={e=>setMovDesde(e.target.value)}/></div>
          <div style={{minWidth:140}}><label>HASTA</label><input type="date" value={movHasta} onChange={e=>setMovHasta(e.target.value)}/></div>
          <button className="btn btn-outline" onClick={()=>{setMovDesde("");setMovHasta("");}} style={{fontSize:11,padding:"8px 12px"}}>✕ LIMPIAR</button>
          {artSel&&<button className="btn btn-outline" onClick={exportar} style={{borderColor:"#16A34A",color:"#16A34A",fontSize:11,padding:"8px 12px"}}>📥 EXPORTAR EXCEL</button>}
        </div>
      </div>
      {!artSel&&(<div style={{textAlign:"center",color:"#94A3B8",padding:40,fontSize:14}}>👆 Buscá y seleccioná un artículo para ver sus movimientos</div>)}
      {artSel&&(
        <>
          <div className="sec" style={{borderTop:"3px solid #1A3A5C"}}>
            <div className="sec-title">📦 {artSel.nombre} — {artSel.codigo}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
              {[{l:"Stock actual",v:artSel.stock+" u.",c:"#1A3A5C",i:"📦"},{l:"Total comprado",v:totalComprado+" u.",c:"#E8620A",i:"🛒"},{l:"Total vendido",v:totalVendido+" u.",c:"#2563A8",i:"💰"},{l:"Costo total $",v:"$ "+fmtP(costoTotal),c:"#B45309",i:"📉"},{l:"Venta total $",v:"$ "+fmtP(ventaTotal),c:"#16A34A",i:"📈"},{l:"Ganancia $",v:"$ "+fmtP(gananciaTotal),c:"#0891B2",i:"💎"}].map(c=>(
                <div key={c.l} style={{background:"#F8FAFC",borderRadius:8,padding:"12px 14px",borderLeft:`4px solid ${c.c}`}}>
                  <div style={{fontSize:18}}>{c.i}</div><div style={{fontSize:14,fontWeight:700,color:c.c,marginTop:3}}>{c.v}</div><div style={{fontSize:10,color:"#94A3B8",fontWeight:700}}>{c.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <button onClick={()=>setMovTab("compras")} className="btn" style={{fontSize:12,padding:"8px 18px",background:movTab==="compras"?"#E8620A":"#fff",color:movTab==="compras"?"#fff":"#E8620A",border:"2px solid #E8620A"}}>🛒 COMPRAS ({lineasCompra.length})</button>
            <button onClick={()=>setMovTab("ventas")} className="btn" style={{fontSize:12,padding:"8px 18px",background:movTab==="ventas"?"#16A34A":"#fff",color:movTab==="ventas"?"#fff":"#16A34A",border:"2px solid #16A34A"}}>💰 VENTAS ({lineasVenta.length})</button>
          </div>
          {movTab==="compras"&&(
            <div style={{background:"#fff",borderRadius:8,overflow:"auto",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
              <table>
                <thead><tr style={{background:"#E8620A"}}><th>ID</th><th>FECHA</th><th>PROVEEDOR</th><th>TIPO BOLETA</th><th>CANTIDAD</th><th>P. UNIT. $</th><th>TOTAL $</th><th>USUARIO</th></tr></thead>
                <tbody>
                  {lineasCompra.map((m,i)=>(<tr key={i}><td><b>#{m.id}</b></td><td>{m.fecha}</td><td>{m.contraparte}</td><td><span className="badge" style={{background:"#2563A8",color:"#fff"}}>{m.tipoBoleta}</span></td><td style={{fontWeight:700,color:"#E8620A"}}>{m.cantidad} u.</td><td>$ {fmtP(m.precioUnit)}</td><td style={{fontWeight:700}}>$ {fmtP(m.total)}</td><td style={{fontSize:11,color:"#94A3B8"}}>{m.usuario}</td></tr>))}
                  {!lineasCompra.length&&(<tr><td colSpan={8} style={{textAlign:"center",color:"#94A3B8",padding:24}}>Sin compras registradas para este artículo</td></tr>)}
                </tbody>
                {lineasCompra.length>0&&(<tfoot><tr style={{background:"#FFF7ED"}}><td colSpan={4} style={{fontWeight:700,color:"#E8620A",padding:"8px 12px"}}>TOTALES</td><td style={{fontWeight:700,color:"#E8620A",padding:"8px 12px"}}>{totalComprado} u.</td><td></td><td style={{fontWeight:700,color:"#E8620A",padding:"8px 12px"}}>$ {fmtP(costoTotal)}</td><td></td></tr></tfoot>)}
              </table>
            </div>
          )}
          {movTab==="ventas"&&(
            <div style={{background:"#fff",borderRadius:8,overflow:"auto",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
              <table>
                <thead><tr style={{background:"#16A34A"}}><th>ID</th><th>FECHA</th><th>CLIENTE</th><th>CANTIDAD</th><th>COSTO UNIT. $</th><th>P. VENTA $</th><th>SUBTOTAL $</th><th>GANANCIA $</th><th>USUARIO</th></tr></thead>
                <tbody>
                  {lineasVenta.map((m,i)=>(<tr key={i}><td><b>#{m.id}</b></td><td>{m.fecha}</td><td>{m.contraparte}</td><td style={{fontWeight:700,color:"#2563A8"}}>{m.cantidad} u.</td><td style={{color:"#94A3B8"}}>$ {fmtP(m.precioCosto)}</td><td>$ {fmtP(m.precioUnit)}</td><td style={{fontWeight:700}}>$ {fmtP(m.subtotal)}</td><td style={{fontWeight:700,color:"#16A34A"}}>$ {fmtP(m.ganancia)}</td><td style={{fontSize:11,color:"#94A3B8"}}>{m.usuario}</td></tr>))}
                  {!lineasVenta.length&&(<tr><td colSpan={9} style={{textAlign:"center",color:"#94A3B8",padding:24}}>Sin ventas registradas para este artículo</td></tr>)}
                </tbody>
                {lineasVenta.length>0&&(<tfoot><tr style={{background:"#F0FDF4"}}><td colSpan={3} style={{fontWeight:700,color:"#16A34A",padding:"8px 12px"}}>TOTALES</td><td style={{fontWeight:700,color:"#2563A8",padding:"8px 12px"}}>{totalVendido} u.</td><td></td><td></td><td style={{fontWeight:700,color:"#16A34A",padding:"8px 12px"}}>$ {fmtP(ventaTotal)}</td><td style={{fontWeight:700,color:"#0891B2",padding:"8px 12px"}}>$ {fmtP(gananciaTotal)}</td><td></td></tr></tfoot>)}
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UsuariosPage({usuarios,setUsuarios}){
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [err,setErr]=useState("");
  const [guardando,setGuardando]=useState(false);
  const nuevo=()=>{setForm({usuario:"",password:"",nombre:"",rol:"operador"});setErr("");setModal("n");};
  const editar=u=>{setForm({...u});setErr("");setModal("e");};
  const guardar=async()=>{
    if(!form.usuario||!form.password||!form.nombre){setErr("Todos los campos son obligatorios");return;}
    setGuardando(true); setErr("");
    try{
      const reg={usuario:form.usuario,password:form.password,nombre:form.nombre,rol:form.rol||"operador"};
      if(modal==="n"){
        if(usuarios.find(u=>u.usuario===form.usuario)){setErr("Usuario ya existe");setGuardando(false);return;}
        const {data}=await sb.from("usuarios").insert(reg);
        setUsuarios(p=>[...p,...(data||[]).map(mapUsr)]);
      }else{
        const {data}=await sb.from("usuarios").eq("id",form.id).update(reg);
        setUsuarios(p=>p.map(u=>u.id===form.id?(data?.[0]?mapUsr(data[0]):{...form}):u));
      }
      setModal(null);
    }catch(e){setErr("Error: "+e.message);}
    finally{setGuardando(false);}
  };
  return(
    <div>
      <h2 style={{color:"#1A3A5C",marginBottom:14,fontSize:17,borderBottom:"3px solid #1A6FA8",paddingBottom:8}}>🔐 USUARIOS</h2>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><button className="btn btn-naranja" onClick={nuevo}>+ NUEVO USUARIO</button></div>
      <div style={{background:"#fff",borderRadius:8,overflow:"auto",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
        <table><thead><tr><th>USUARIO</th><th>NOMBRE</th><th>ROL</th><th></th></tr></thead>
          <tbody>{usuarios.map(u=>(<tr key={u.id}><td><b>{u.usuario}</b></td><td>{u.nombre}</td><td><span className="badge" style={{background:u.rol==="admin"?"#E8620A":"#2563A8",color:"#fff"}}>{u.rol.toUpperCase()}</span></td><td><button className="btn btn-outline" onClick={()=>editar(u)} style={{fontSize:11,padding:"4px 10px"}}>✏️</button></td></tr>))}</tbody>
        </table>
      </div>
      {modal&&(<Modal title={modal==="n"?"NUEVO USUARIO":"EDITAR USUARIO"} onClose={()=>setModal(null)} w={400}>
        {err&&<div className="err">{err}</div>}
        <div className="fg"><label>NOMBRE COMPLETO *</label><input value={form.nombre||""} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))}/></div>
        <div className="fg"><label>USUARIO *</label><input value={form.usuario||""} onChange={e=>setForm(p=>({...p,usuario:e.target.value}))}/></div>
        <div className="fg"><label>CONTRASEÑA *</label><input type="password" value={form.password||""} onChange={e=>setForm(p=>({...p,password:e.target.value}))}/></div>
        <div className="fg"><label>ROL</label>
          <select value={form.rol||"operador"} onChange={e=>setForm(p=>({...p,rol:e.target.value}))}>
            <option value="admin">ADMINISTRADOR</option><option value="operador">OPERADOR</option>
          </select>
        </div>
        <div style={{display:"flex",gap:10,marginTop:16,justifyContent:"flex-end"}}>
          <button className="btn btn-outline" onClick={()=>setModal(null)} disabled={guardando}>CANCELAR</button>
          <button className="btn btn-naranja" onClick={guardar} disabled={guardando}>{guardando?"GUARDANDO...":"💾 GUARDAR"}</button>
        </div>
      </Modal>)}
    </div>
  );
}

function LibroMovimientos({compras,ventas,articulos}){
  const [desde,setDesde]=useState("");
  const [hasta,setHasta]=useState("");
  const [tipoMov,setTipoMov]=useState("todos");
  const [contrapFiltro,setContrapFiltro]=useState("");
  const [openArt,setOpenArt]=useState(false);
  const [artBuscar,setArtBuscar]=useState("");
  const [artSel,setArtSel]=useState(null);
  const [vista,setVista]=useState("tarjetas");

  const todos=[
    ...compras.flatMap(c=>c.lineas.map(l=>({
      fecha:c.fecha, tipo:"COMPRA", docId:c.id,
      tipoBoleta:c.tipoBoleta||"", nroComprobante:c.nroComprobante||"",
      contraparte:c.proveedorNombre, usuario:c.usuario,
      totalDoc:c.totalCompra||0,
      articuloId:l.articuloId, articuloCodigo:l.articuloCodigo||"",
      articuloNombre:l.articuloNombre||"",
      cantidad:+l.cantidad||0, precioUnitario:+l.precioUnitario||0,
      precioCosto:0, subtotal:+l.total||0, ganancia:0,
    }))),
    ...ventas.flatMap(v=>v.lineas.map(l=>({
      fecha:v.fecha, tipo:"VENTA", docId:v.id,
      tipoBoleta:"", nroComprobante:v.nroComprobante||"",
      contraparte:v.clienteNombre, usuario:v.usuario,
      totalDoc:v.totalVenta||0,
      articuloId:l.articuloId, articuloCodigo:l.articuloCodigo||"",
      articuloNombre:l.articuloNombre||"",
      cantidad:+l.cantidad||0, precioUnitario:+l.precioUnitario||0,
      precioCosto:+l.precioCosto||0, subtotal:+l.subtotal||0,
      ganancia:(+l.subtotal||0)-(+l.cantidad||0)*(+l.precioCosto||0),
    }))),
  ].sort((a,b)=>b.fecha.localeCompare(a.fecha)||b.docId-a.docId);

  const sugsArt=articulos.filter(a=>
    artBuscar.trim()===""||
    a.nombre.toLowerCase().includes(artBuscar.toLowerCase())||
    a.codigo.toLowerCase().includes(artBuscar.toLowerCase())
  ).slice(0,8);
  const selArt=a=>{setArtSel(a);setArtBuscar(a.nombre);setOpenArt(false);};
  const limpiarArt=()=>{setArtSel(null);setArtBuscar("");};

  const filtrados=todos.filter(m=>{
    if(tipoMov!=="todos"&&m.tipo!==tipoMov.toUpperCase()) return false;
    if(desde&&m.fecha<desde) return false;
    if(hasta&&m.fecha>hasta) return false;
    if(artSel&&m.articuloId!==artSel.id) return false;
    if(contrapFiltro&&!m.contraparte.toLowerCase().includes(contrapFiltro.toLowerCase())) return false;
    return true;
  });

  const porDoc=[];
  const docMap={};
  filtrados.forEach(m=>{
    const key=m.tipo+"-"+m.docId;
    if(!docMap[key]){
      const grupo={fecha:m.fecha,tipo:m.tipo,docId:m.docId,tipoBoleta:m.tipoBoleta,nroComprobante:m.nroComprobante,contraparte:m.contraparte,usuario:m.usuario,totalDoc:m.totalDoc,lineas:[]};
      docMap[key]=grupo; porDoc.push(grupo);
    }
    docMap[key].lineas.push(m);
  });

  const totCompras=filtrados.filter(m=>m.tipo==="COMPRA");
  const totVentas=filtrados.filter(m=>m.tipo==="VENTA");
  const sumCompras=totCompras.reduce((s,m)=>s+m.subtotal,0);
  const sumVentas=totVentas.reduce((s,m)=>s+m.subtotal,0);
  const sumGanancia=totVentas.reduce((s,m)=>s+m.ganancia,0);

  const limpiar=()=>{setDesde("");setHasta("");setTipoMov("todos");setArtSel(null);setArtBuscar("");setContrapFiltro("");};

  const exportar=async()=>{
    if(!filtrados.length){alert("No hay movimientos para exportar");return;}
    const XLSX=await new Promise((res,rej)=>{
      if(window.XLSX){res(window.XLSX);return;}
      const s=document.createElement("script");
      s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload=()=>res(window.XLSX); s.onerror=()=>rej(new Error("Error"));
      document.head.appendChild(s);
    });
    const filas=filtrados.map(m=>({"Fecha":m.fecha,"Tipo":m.tipo,"N° Doc":m.docId,"Nro. Comprobante":m.nroComprobante||"","Tipo Boleta":m.tipoBoleta||"-","Proveedor / Cliente":m.contraparte,"Cód. Artículo":m.articuloCodigo,"Artículo":m.articuloNombre,"Cantidad":m.cantidad,"P. Costo $":m.tipo==="VENTA"?m.precioCosto:"","P. Unitario $":m.precioUnitario,"Total Línea $":m.subtotal,"Ganancia $":m.tipo==="VENTA"?m.ganancia:"","Total Comprobante $":m.totalDoc,"Usuario":m.usuario}));
    const filasDoc=[];
    porDoc.forEach(d=>{
      filasDoc.push({"Fecha":d.fecha,"Tipo":d.tipo,"N° Doc":d.docId,"Nro. Comprobante":d.nroComprobante||"","Tipo Boleta":d.tipoBoleta||"-","Proveedor / Cliente":d.contraparte,"Usuario":d.usuario,"Total Comprobante $":d.totalDoc,"Cód. Artículo":"","Artículo":"","Cantidad":"","P. Costo $":"","P. Unitario $":"","Total Línea $":"","Ganancia $":""});
      d.lineas.forEach(l=>{filasDoc.push({"Fecha":"","Tipo":"","N° Doc":"","Nro. Comprobante":"","Tipo Boleta":"","Proveedor / Cliente":"","Usuario":"","Total Comprobante $":"","Cód. Artículo":l.articuloCodigo,"Artículo":l.articuloNombre,"Cantidad":l.cantidad,"P. Costo $":l.tipo==="VENTA"?l.precioCosto:"","P. Unitario $":l.precioUnitario,"Total Línea $":l.subtotal,"Ganancia $":l.tipo==="VENTA"?l.ganancia:""});});
    });
    const porArt={};
    filtrados.forEach(m=>{
      const k=m.articuloCodigo||m.articuloNombre;
      if(!porArt[k])porArt[k]={codigo:m.articuloCodigo,nombre:m.articuloNombre,cantComprada:0,cantVendida:0,costoTotal:0,ventaTotal:0,gananciaTotal:0};
      if(m.tipo==="COMPRA"){porArt[k].cantComprada+=m.cantidad;porArt[k].costoTotal+=m.subtotal;}
      else{porArt[k].cantVendida+=m.cantidad;porArt[k].ventaTotal+=m.subtotal;porArt[k].gananciaTotal+=m.ganancia;}
    });
    const resumen=Object.values(porArt).map(a=>({"Código":a.codigo,"Artículo":a.nombre,"Cant. Comprada":a.cantComprada,"Costo Total $":a.costoTotal,"Cant. Vendida":a.cantVendida,"Venta Total $":a.ventaTotal,"Ganancia $":a.gananciaTotal})).sort((a,b)=>a["Artículo"].localeCompare(b["Artículo"]));
    const setCols=(ws,rows)=>{if(!rows.length)return;ws["!cols"]=Object.keys(rows[0]).map(k=>({wch:Math.max(k.length,...rows.map(r=>String(r[k]||"").length))+2}));};
    const wb=XLSX.utils.book_new();
    const ws1=XLSX.utils.json_to_sheet(filas); setCols(ws1,filas);
    const ws2=XLSX.utils.json_to_sheet(filasDoc.length?filasDoc:[{"Sin datos":""}]); if(filasDoc.length)setCols(ws2,filasDoc);
    const ws3=XLSX.utils.json_to_sheet(resumen.length?resumen:[{"Sin datos":""}]); if(resumen.length)setCols(ws3,resumen);
    XLSX.utils.book_append_sheet(wb,ws1,"Detalle");
    XLSX.utils.book_append_sheet(wb,ws2,"Por Comprobante");
    XLSX.utils.book_append_sheet(wb,ws3,"Resumen por Artículo");
    XLSX.writeFile(wb,`Movimientos_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return(
    <div>
      <h2 style={{color:"#1A3A5C",marginBottom:14,fontSize:17,borderBottom:"3px solid #1A6FA8",paddingBottom:8}}>📋 LIBRO DE MOVIMIENTOS</h2>
      <div className="sec" style={{padding:14,marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:11,color:"#1A3A5C",marginBottom:10,letterSpacing:1}}>━━ FILTROS ━━</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:10,alignItems:"end"}}>
          <div className="fg" style={{margin:0}}><label>TIPO</label><select value={tipoMov} onChange={e=>setTipoMov(e.target.value)}><option value="todos">Todos</option><option value="compra">Solo Compras</option><option value="venta">Solo Ventas</option></select></div>
          <div className="fg" style={{margin:0}}><label>FECHA DESDE</label><input type="date" value={desde} onChange={e=>setDesde(e.target.value)}/></div>
          <div className="fg" style={{margin:0}}><label>FECHA HASTA</label><input type="date" value={hasta} onChange={e=>setHasta(e.target.value)}/></div>
          <div className="fg" style={{margin:0,position:"relative"}}>
            <label>ARTÍCULO</label>
            <div style={{position:"relative"}}>
              <input value={artBuscar} onChange={e=>{setArtBuscar(e.target.value);setOpenArt(true);setArtSel(null);}} onFocus={()=>setOpenArt(true)} onBlur={()=>setTimeout(()=>setOpenArt(false),200)} placeholder="Todos los artículos"/>
              {artSel&&<span onMouseDown={limpiarArt} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",cursor:"pointer",color:"#DC2626",fontWeight:700,fontSize:14}}>✕</span>}
            </div>
            {openArt&&sugsArt.length>0&&(<div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1px solid #94A3B8",borderRadius:4,zIndex:400,boxShadow:"0 4px 16px rgba(0,0,0,0.15)",maxHeight:200,overflowY:"auto"}}>{sugsArt.map(a=>(<div key={a.id} onMouseDown={()=>selArt(a)} style={{padding:"7px 12px",cursor:"pointer",borderBottom:"1px solid #CBD5E1",fontSize:12}}><b>{a.codigo}</b> — {a.nombre}</div>))}</div>)}
          </div>
          <div className="fg" style={{margin:0}}><label>PROVEEDOR / CLIENTE</label><input value={contrapFiltro} onChange={e=>setContrapFiltro(e.target.value)} placeholder="Buscar..."/></div>
          <div style={{display:"flex",alignItems:"flex-end"}}><button className="btn btn-outline" onClick={limpiar} style={{fontSize:11,padding:"8px 12px",width:"100%"}}>✕ LIMPIAR</button></div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginBottom:12}}>
        {[{l:"Comprobantes",v:porDoc.length,c:"#1A3A5C",i:"📋"},{l:"Líneas compras",v:totCompras.length,c:"#E8620A",i:"🛒"},{l:"$ Total comprado",v:"$ "+fmtP(sumCompras),c:"#B45309",i:"📉"},{l:"Líneas ventas",v:totVentas.length,c:"#16A34A",i:"💰"},{l:"$ Total vendido",v:"$ "+fmtP(sumVentas),c:"#16A34A",i:"📈"},{l:"$ Ganancia",v:"$ "+fmtP(sumGanancia),c:"#0891B2",i:"💎"}].map(c=>(<div key={c.l} style={{background:"#fff",borderRadius:8,padding:"11px 13px",boxShadow:"0 2px 8px rgba(0,0,0,0.07)",borderLeft:`4px solid ${c.c}`}}><div style={{fontSize:17}}>{c.i}</div><div style={{fontSize:14,fontWeight:700,color:c.c,marginTop:3}}>{c.v}</div><div style={{fontSize:10,color:"#94A3B8",fontWeight:700}}>{c.l}</div></div>))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setVista("tarjetas")} className="btn" style={{fontSize:12,padding:"7px 14px",background:vista==="tarjetas"?"#1A3A5C":"#fff",color:vista==="tarjetas"?"#fff":"#1A3A5C",border:"2px solid #1A3A5C"}}>🗂️ VISTA POR COMPROBANTE</button>
          <button onClick={()=>setVista("tabla")} className="btn" style={{fontSize:12,padding:"7px 14px",background:vista==="tabla"?"#1A3A5C":"#fff",color:vista==="tabla"?"#fff":"#1A3A5C",border:"2px solid #1A3A5C"}}>📊 VISTA TABLA</button>
        </div>
        <button className="btn btn-outline" onClick={exportar} style={{borderColor:"#16A34A",color:"#16A34A",fontSize:12}}>📥 EXPORTAR EXCEL ({filtrados.length} líneas · {porDoc.length} comprobantes)</button>
      </div>
      {vista==="tarjetas"&&(
        <div>
          {!porDoc.length&&(<div style={{textAlign:"center",color:"#94A3B8",padding:40,background:"#fff",borderRadius:8,boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>Sin movimientos para los filtros seleccionados</div>)}
          {porDoc.map((doc,di)=>(
            <div key={di} style={{background:"#fff",borderRadius:8,marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,0.08)",overflow:"hidden",borderLeft:`4px solid ${doc.tipo==="COMPRA"?"#E8620A":"#16A34A"}`}}>
              <div style={{background:doc.tipo==="COMPRA"?"rgba(232,98,10,0.06)":"rgba(22,163,74,0.06)",padding:"12px 16px",borderBottom:"1px solid #E2E8F0"}}>
                <div style={{display:"flex",flexWrap:"wrap",gap:16,alignItems:"center"}}>
                  <span className="badge" style={{background:doc.tipo==="COMPRA"?"#E8620A":"#16A34A",color:"#fff",fontSize:11,padding:"3px 10px"}}>{doc.tipo==="COMPRA"?"🛒 COMPRA":"💰 VENTA"}</span>
                  <div style={{display:"flex",flexWrap:"wrap",gap:20,flex:1}}>
                    {[["N° INTERNO","#"+doc.docId],["NRO. COMPROBANTE",doc.nroComprobante||"—"],["FECHA",doc.fecha],["TIPO BOLETA",doc.tipoBoleta||"—"],[doc.tipo==="COMPRA"?"PROVEEDOR":"CLIENTE",doc.contraparte],["USUARIO",doc.usuario]].map(([k,v])=>(<div key={k}><div style={{fontSize:9,color:"#94A3B8",fontWeight:700,letterSpacing:0.5}}>{k}</div><div style={{fontSize:13,fontWeight:700,color:"#1A3A5C"}}>{v}</div></div>))}
                  </div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:9,color:"#94A3B8",fontWeight:700}}>TOTAL COMPROBANTE</div><div style={{fontSize:18,fontWeight:700,color:doc.tipo==="COMPRA"?"#E8620A":"#16A34A"}}>$ {fmtP(doc.totalDoc)}</div></div>
                </div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table>
                  <thead><tr style={{background:"#F8FAFC"}}><th style={{color:"#64748B",fontWeight:700,fontSize:11}}>CÓDIGO</th><th style={{color:"#64748B",fontWeight:700,fontSize:11}}>ARTÍCULO</th><th style={{color:"#64748B",fontWeight:700,fontSize:11,textAlign:"right"}}>CANT.</th>{doc.tipo==="VENTA"&&<th style={{color:"#64748B",fontWeight:700,fontSize:11,textAlign:"right"}}>P. COSTO $</th>}<th style={{color:"#64748B",fontWeight:700,fontSize:11,textAlign:"right"}}>P. UNIT. $</th><th style={{color:"#64748B",fontWeight:700,fontSize:11,textAlign:"right"}}>TOTAL $</th>{doc.tipo==="VENTA"&&<th style={{color:"#64748B",fontWeight:700,fontSize:11,textAlign:"right"}}>GANANCIA $</th>}</tr></thead>
                  <tbody>
                    {doc.lineas.map((l,li)=>(<tr key={li}><td style={{fontFamily:"monospace",fontSize:11,color:"#64748B"}}>{l.articuloCodigo}</td><td style={{fontSize:13}}>{l.articuloNombre}</td><td style={{textAlign:"right",fontWeight:700}}>{l.cantidad}</td>{doc.tipo==="VENTA"&&<td style={{textAlign:"right",color:"#94A3B8",fontSize:12}}>$ {fmtP(l.precioCosto)}</td>}<td style={{textAlign:"right"}}>$ {fmtP(l.precioUnitario)}</td><td style={{textAlign:"right",fontWeight:700,color:doc.tipo==="COMPRA"?"#E8620A":"#16A34A"}}>$ {fmtP(l.subtotal)}</td>{doc.tipo==="VENTA"&&<td style={{textAlign:"right",fontWeight:700,color:"#0891B2"}}>$ {fmtP(l.ganancia)}</td>}</tr>))}
                  </tbody>
                  {doc.lineas.length>1&&(<tfoot><tr style={{background:"#F8FAFC",fontWeight:700}}><td colSpan={doc.tipo==="VENTA"?2:2} style={{padding:"7px 12px",color:"#1A3A5C",fontSize:12}}>SUBTOTALES</td><td style={{textAlign:"right",padding:"7px 12px"}}>{doc.lineas.reduce((s,l)=>s+l.cantidad,0)}</td>{doc.tipo==="VENTA"&&<td></td>}<td></td><td style={{textAlign:"right",padding:"7px 12px",color:doc.tipo==="COMPRA"?"#E8620A":"#16A34A"}}>$ {fmtP(doc.lineas.reduce((s,l)=>s+l.subtotal,0))}</td>{doc.tipo==="VENTA"&&<td style={{textAlign:"right",padding:"7px 12px",color:"#0891B2"}}>$ {fmtP(doc.lineas.reduce((s,l)=>s+l.ganancia,0))}</td>}</tr></tfoot>)}
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
      {vista==="tabla"&&(
        <div style={{background:"#fff",borderRadius:8,overflow:"auto",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
          <table>
            <thead><tr><th>FECHA</th><th>TIPO</th><th>N° DOC</th><th>NRO. COMPROBANTE</th><th>TIPO BOLETA</th><th>PROV. / CLIENTE</th><th>CÓDIGO</th><th>ARTÍCULO</th><th style={{textAlign:"right"}}>CANT.</th><th style={{textAlign:"right"}}>P. COSTO $</th><th style={{textAlign:"right"}}>P. UNIT. $</th><th style={{textAlign:"right"}}>TOTAL $</th><th style={{textAlign:"right"}}>GANANCIA $</th><th style={{textAlign:"right"}}>TOTAL COMP. $</th><th>USUARIO</th></tr></thead>
            <tbody>
              {filtrados.map((m,i)=>(<tr key={i} style={{background:m.tipo==="COMPRA"?"rgba(232,98,10,0.03)":"rgba(22,163,74,0.03)"}}><td style={{whiteSpace:"nowrap"}}>{m.fecha}</td><td><span className="badge" style={{background:m.tipo==="COMPRA"?"#E8620A":"#16A34A",color:"#fff",fontSize:10}}>{m.tipo}</span></td><td><b>#{m.docId}</b></td><td style={{fontSize:11}}>{m.nroComprobante||<span style={{color:"#94A3B8"}}>—</span>}</td><td style={{fontSize:11,color:"#94A3B8"}}>{m.tipoBoleta||"—"}</td><td style={{maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.contraparte}</td><td style={{fontFamily:"monospace",fontSize:11}}>{m.articuloCodigo}</td><td style={{maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.articuloNombre}</td><td style={{textAlign:"right",fontWeight:700}}>{m.cantidad}</td><td style={{textAlign:"right",color:"#94A3B8",fontSize:12}}>{m.tipo==="VENTA"?"$ "+fmtP(m.precioCosto):"—"}</td><td style={{textAlign:"right"}}>$ {fmtP(m.precioUnitario)}</td><td style={{textAlign:"right",fontWeight:700,color:m.tipo==="COMPRA"?"#E8620A":"#16A34A"}}>$ {fmtP(m.subtotal)}</td><td style={{textAlign:"right",fontWeight:700,color:"#0891B2"}}>{m.tipo==="VENTA"?"$ "+fmtP(m.ganancia):"—"}</td><td style={{textAlign:"right",fontWeight:700,color:"#64748B"}}>$ {fmtP(m.totalDoc)}</td><td style={{fontSize:11,color:"#94A3B8"}}>{m.usuario}</td></tr>))}
              {!filtrados.length&&(<tr><td colSpan={15} style={{textAlign:"center",color:"#94A3B8",padding:32,fontSize:14}}>Sin movimientos para los filtros seleccionados</td></tr>)}
            </tbody>
            {filtrados.length>0&&(<tfoot><tr style={{background:"#F8FAFC",fontWeight:700}}><td colSpan={8} style={{padding:"9px 12px",color:"#1A3A5C"}}>TOTALES ({filtrados.length} líneas · {porDoc.length} comprobantes)</td><td style={{textAlign:"right",padding:"9px 12px"}}>{filtrados.reduce((s,m)=>s+m.cantidad,0)}</td><td></td><td></td><td style={{textAlign:"right",padding:"9px 12px",color:"#1A3A5C"}}>$ {fmtP(filtrados.reduce((s,m)=>s+m.subtotal,0))}</td><td style={{textAlign:"right",padding:"9px 12px",color:"#0891B2"}}>$ {fmtP(sumGanancia)}</td><td></td><td></td></tr></tfoot>)}
          </table>
        </div>
      )}
    </div>
  );
}

export default function App(){
  const [usuario,setUsuario]=useState(null);
  const [page,setPage]=useState("dash");
  const [cargando,setCargando]=useState(false);
  const [errInicio,setErrInicio]=useState("");

  const [articulos,setArticulos]=useState([]);
  const [clientes,setClientes]=useState([]);
  const [proveedores,setProveedores]=useState([]);
  const [compras,setCompras]=useState([]);
  const [ventas,setVentas]=useState([]);
  const [usuarios,setUsuarios]=useState([]);

  const cargarDatos=async()=>{
    setCargando(true); setErrInicio("");
    try{
      const [rArt,rCli,rProv,rUsr,rComp,rVta,rDetComp,rDetVta]=await Promise.all([
        sb.from("articulos").select("*").order("nombre",{ascending:true}).get(),
        sb.from("clientes").select("*").order("razon_social",{ascending:true}).get(),
        sb.from("proveedores").select("*").order("razon_social",{ascending:true}).get(),
        sb.from("usuarios").select("*").get(),
        sb.from("compras").select("*").order("id",{ascending:false}).get(),
        sb.from("ventas").select("*").order("id",{ascending:false}).get(),
        sb.from("compras_detalle").select("*").get(),
        sb.from("ventas_detalle").select("*").get(),
      ]);
      setArticulos((rArt.data||[]).map(mapArt));
      setClientes((rCli.data||[]).map(mapCli));
      setProveedores((rProv.data||[]).map(mapProv));
      setUsuarios((rUsr.data||[]).map(mapUsr));
      const detComp=rDetComp.data||[];
      setCompras((rComp.data||[]).map(c=>({...mapComp(c),lineas:detComp.filter(d=>d.compra_id===c.id).map(mapLinComp)})));
      const detVta=rDetVta.data||[];
      setVentas((rVta.data||[]).map(v=>({...mapVta(v),lineas:detVta.filter(d=>d.venta_id===v.id).map(mapLinVta)})));
    }catch(e){
      setErrInicio("Error al cargar datos: "+e.message);
    }finally{setCargando(false);}
  };

  const handleLogin=async(usr)=>{
    setUsuario(usr);
    await cargarDatos();
  };

  const handleLogout=()=>{
    setUsuario(null);
    setArticulos([]); setClientes([]); setProveedores([]);
    setCompras([]); setVentas([]); setUsuarios([]);
    setPage("dash");
  };

  if(!usuario) return(<><style>{css}</style><Login onLogin={handleLogin}/></>);
  if(cargando) return(<><style>{css}</style><div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F4F6F9"}}><Loading msg="Cargando datos desde Supabase..."/></div></>);
  if(errInicio) return(<><style>{css}</style><div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F4F6F9"}}><div style={{background:"#fff",borderRadius:8,padding:32,maxWidth:400,textAlign:"center",boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}><div style={{fontSize:40,marginBottom:12}}>⚠️</div><h3 style={{color:"#DC2626",marginBottom:8}}>Error de conexión</h3><p style={{color:"#64748B",fontSize:13,marginBottom:20}}>{errInicio}</p><button className="btn btn-primary" onClick={cargarDatos}>🔄 REINTENTAR</button></div></div></>);

  const render=()=>{
    switch(page){
      case "dash": return <Dashboard usuario={usuario}/>;
      case "art":  return <Articulos articulos={articulos} setArticulos={setArticulos} usuario={usuario}/>;
      case "cli":  return <Clientes clientes={clientes} setClientes={setClientes} usuario={usuario}/>;
      case "prov": return <Proveedores proveedores={proveedores} setProveedores={setProveedores} usuario={usuario}/>;
      case "comp": return <Compras proveedores={proveedores} articulos={articulos} setArticulos={setArticulos} compras={compras} setCompras={setCompras} usuario={usuario}/>;
      case "vta":  return <Ventas clientes={clientes} articulos={articulos} setArticulos={setArticulos} ventas={ventas} setVentas={setVentas} usuario={usuario}/>;
      case "rep":  return <Reportes ventas={ventas} articulos={articulos} compras={compras}/>;
      case "mov":  return <LibroMovimientos compras={compras} ventas={ventas} articulos={articulos}/>;
      case "usr":  return usuario.rol==="admin"?<UsuariosPage usuarios={usuarios} setUsuarios={setUsuarios}/>:<div style={{padding:20,color:"#DC2626",fontWeight:700}}>⛔ Sin permisos</div>;
      default: return null;
    }
  };

  return(
    <>
      <style>{css}</style>
      <div style={{display:"flex",minHeight:"100vh"}}>
        <Sidebar usuario={usuario} page={page} setPage={setPage} onLogout={handleLogout}/>
        <main style={{flex:1,padding:"20px 22px",overflowX:"auto",overflowY:"auto",minWidth:0}}>
          {render()}
        </main>
      </div>
    </>
  );
}
