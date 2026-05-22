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

const mapArt  = r => ({id:r.id,codigo:r.codigo,codigoPropio:r.codigo_propio||"",nombre:r.nombre,descripcion:r.descripcion||"",unidad:r.unidad||"Unidad",stock:+r.stock||0,precio:+r.precio||0,rentabilidad:+r.rentabilidad||0,activo:r.activo,ultimaFechaCompra:r.ultima_fecha_compra||"",ultimoProveedorCompra:r.ultimo_proveedor_compra||""});
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
const mapLinComp = r => ({articuloId:r.articulo_id,articuloNombre:r.articulo_nombre,articuloCodigo:r.articulo_codigo,detalle:r.detalle||"",descuento:+r.descuento||0,unidadMedida:r.unidad_medida||"",cantidad:+r.cantidad,precioUnitario:+r.precio_unitario,precioFraccion:+r.precio_fraccion||+r.precio_unitario||0,total:+r.total,porcentajeIva:+r.porcentaje_iva||0,precioSinIva:+r.precio_sin_iva||0});
const mapLinVta  = r => ({articuloId:r.articulo_id,articuloNombre:r.articulo_nombre,articuloCodigo:r.articulo_codigo,unidadMedida:r.unidad_medida||'',cantidad:+r.cantidad,precioCosto:+r.precio_costo,rentabilidad:+r.rentabilidad,precioUnitario:+r.precio_unitario,subtotal:+r.subtotal});
const mapPagoCli  = r => ({id:r.id,fecha:r.fecha,clienteId:r.cliente_id,clienteNombre:r.cliente_nombre,monto:+r.monto,medioPago:r.medio_pago,detallePago:r.detalle_pago||"",concepto:r.concepto||"",ventaId:r.venta_id||null,usuario:r.usuario_nombre});
const mapPagoProv = r => ({id:r.id,fecha:r.fecha,proveedorId:r.proveedor_id,proveedorNombre:r.proveedor_nombre,monto:+r.monto,medioPago:r.medio_pago,detallePago:r.detalle_pago||"",concepto:r.concepto||"",compraId:r.compra_id||null,usuario:r.usuario_nombre});

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
const fmtFechaCorta = d => d ? `${d.slice(8,10)}/${d.slice(5,7)}/${d.slice(0,4)}` : "";

const TIPOS = ["Factura A","Factura B","Factura C","Factura M","Ticket A","Ticket B","NO OFICIAL"];
const MEDIOS_PAGO = ["EFECTIVO","TRANSFERENCIA","DÉBITO","CRÉDITO","CHEQUE","MERCADO PAGO","OTRO"];
const VERSION = "2.0";
const UNIDADES_COMPRA = ["Unidad","Kg","g","Litro","ml","Metro","Caja","Cajón","Bidón","Bolsa","Resma","Par","Docena"];
const MENU = [
  {id:"dash",icon:"🏠",label:"INICIO",roles:["admin","operador"]},
  {id:"art",icon:"📦",label:"ARTÍCULOS",roles:["admin","operador"]},
  {id:"cli",icon:"👥",label:"CLIENTES",roles:["admin","operador"]},
  {id:"prov",icon:"🏭",label:"PROVEEDORES",roles:["admin","operador"]},
  {id:"comp",icon:"🛒",label:"COMPRAS",roles:["admin","operador"]},
  {id:"vta",icon:"💰",label:"VENTAS",roles:["admin","operador"]},
  {id:"rep",icon:"📊",label:"REPORTES",roles:["admin","operador"]},
  {id:"mov",icon:"📋",label:"MOVIMIENTOS",roles:["admin","operador"]},
  {id:"cta",icon:"💳",label:"CTA. CORRIENTE",roles:["admin","operador"]},
  {id:"usr",icon:"🔐",label:"USUARIOS",roles:["admin"]},
];


// ── LOGO FARO GESTION (SVG inline) ───────────────────────────────────────────
function LogoFaro({size=72,showText=true,dark=false}){
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
      <svg width={size} height={size*1.15} viewBox="0 0 80 92" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="40" y1="8" x2="40" y2="1" stroke="#FCD34D" strokeWidth="3" strokeLinecap="round"/>
        <line x1="52" y1="12" x2="58" y2="5" stroke="#FCD34D" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="28" y1="12" x2="22" y2="5" stroke="#FCD34D" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="61" y1="20" x2="69" y2="15" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
        <line x1="19" y1="20" x2="11" y2="15" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
        <ellipse cx="40" cy="21" rx="11" ry="9" fill="#FCD34D" opacity="0.85"/>
        <ellipse cx="40" cy="21" rx="6" ry="5" fill="#FFFDE7"/>
        <rect x="27" y="26" width="26" height="10" rx="2" fill="#1A5276"/>
        <rect x="29" y="28" width="8" height="6" rx="1" fill="#7DD3FC" opacity="0.9"/>
        <rect x="43" y="28" width="8" height="6" rx="1" fill="#7DD3FC" opacity="0.9"/>
        <rect x="24" y="35" width="32" height="3" rx="1.5" fill="#475569"/>
        <polygon points="28,38 52,38 47,68 33,68" fill="white"/>
        <polygon points="28,38 52,38 51,47 29,47" fill="#E8620A" opacity="0.9"/>
        <polygon points="29.5,56 50.5,56 49,65 31,65" fill="#E8620A" opacity="0.9"/>
        <rect x="26" y="68" width="28" height="13" rx="3" fill="#1A5276"/>
        <rect x="23" y="65" width="34" height="5" rx="2" fill="#0F3460"/>
        <rect x="35" y="71" width="10" height="10" rx="3" fill="#0A2540"/>
        <path d="M8 83 Q20 79 32 83 Q44 87 56 83 Q66 79 74 83" stroke="#7DD3FC" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <path d="M4 88 Q18 84 32 88 Q46 92 60 88 Q70 84 78 88" stroke="#7DD3FC" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5"/>
      </svg>
      {showText&&(
        <div style={{textAlign:"center",lineHeight:1.2}}>
          <div style={{fontWeight:800,fontSize:14,letterSpacing:1,color:dark?"#fff":"#1A3A5C"}}>
            FARO<span style={{color:"#E8620A"}}>GESTION</span>
          </div>
          <div style={{fontSize:9,color:dark?"rgba(255,255,255,0.5)":"#94A3B8",letterSpacing:2,textTransform:"uppercase"}}>Sistema Comercial</div>
        </div>
      )}
    </div>
  );
}

function Loading({msg="Cargando..."}){  return <div className="loading"><div className="spinner"/><span>{msg}</span></div>; }

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
          <LogoFaro size={80} showText={true} dark={false}/>
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

function Sidebar({usuario,page,setPage,onLogout,onRefresh}){
  return(
    <div style={{width:210,background:"#0F0F0F",height:"100vh",display:"flex",flexDirection:"column",flexShrink:0,position:"fixed",top:0,left:0,zIndex:200,overflowY:"auto"}}>
      <div style={{padding:"14px 12px",borderBottom:"1px solid rgba(255,255,255,0.1)",textAlign:"center"}}>
        <LogoFaro size={56} showText={true} dark={true}/>
      </div>
      <nav style={{flex:1,paddingTop:8,overflowY:"auto"}}>
        {MENU.filter(m=>m.roles.includes(usuario.rol)).map(m=>(
          <button key={m.id} onClick={()=>setPage(m.id)} style={{
            display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 16px",
            background:page===m.id?"#E8620A":"transparent",border:"none",cursor:"pointer",
            color:page===m.id?"#fff":"rgba(255,255,255,0.65)",
            fontFamily:"'Courier New',monospace",fontWeight:700,fontSize:12,
            borderLeft:page===m.id?"3px solid #FCD34D":"3px solid transparent",textAlign:"left"
          }}>
            <span>{m.icon}</span><span>{m.label}</span>
          </button>
        ))}
      </nav>
      <div style={{padding:"14px",borderTop:"1px solid rgba(255,255,255,0.1)"}}>
        <div style={{fontSize:9,color:"rgba(255,255,255,0.5)"}}>SESIÓN</div>
        <div style={{color:"#fff",fontWeight:700,fontSize:12}}>{usuario.nombre}</div>
        <div style={{fontSize:9,color:"#E8620A",marginBottom:10}}>{usuario.rol.toUpperCase()}</div>
        <button onClick={onRefresh} style={{background:"transparent",border:"1px solid rgba(255,255,255,0.2)",color:"rgba(255,255,255,0.7)",borderRadius:6,padding:"7px 14px",cursor:"pointer",fontSize:11,width:"100%",marginBottom:6}}>🔄 ACTUALIZAR DATOS</button>
        <button className="btn btn-danger" onClick={onLogout} style={{width:"100%",fontSize:11}}>CERRAR SESIÓN</button>
      </div>
      <div style={{padding:"8px 12px",borderTop:"1px solid rgba(255,255,255,0.06)",textAlign:"center"}}>
        <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",lineHeight:1.6}}>
          Dev. <span style={{color:"rgba(255,255,255,0.55)",fontWeight:600}}>DASantini</span> &amp; Claude AI
        </div>
        <div style={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>v{VERSION} · 2026</div>
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
        <LogoFaro size={100} showText={true} dark={false}/>
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
      <div style={{background:"#fff",borderRadius:8,overflowX:"auto",overflowY:"visible",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",WebkitOverflowScrolling:"touch"}}>
        <table style={{minWidth:900}}>
          {/* FIX: whiteSpace nowrap en columnas cortas + minWidth en NOMBRE */}
          <thead><tr>
            <th style={{whiteSpace:"nowrap"}}>#ID</th>
            <th style={{whiteSpace:"nowrap"}}>COD. PROPIO</th>
            <th style={{whiteSpace:"nowrap"}}>CÓDIGO</th>
            <th style={{minWidth:200}}>NOMBRE</th>
            <th style={{whiteSpace:"nowrap"}}>UNIDAD</th>
            <th style={{whiteSpace:"nowrap"}}>STOCK</th>
            <th style={{whiteSpace:"nowrap"}}>ÚLT. COSTO $</th>
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
                <td style={{whiteSpace:"nowrap"}}>
                  <div>$ {fmtP(a.precio)}</div>
                  {a.ultimaFechaCompra&&<div style={{fontSize:10,color:"#94A3B8"}}>{a.ultimaFechaCompra}</div>}
                </td>
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
          {modal==="e"&&(form.ultimaFechaCompra||form.precio>0)&&(
            <div style={{background:"#EBF5FB",borderRadius:6,padding:"10px 14px",fontSize:12,marginBottom:14,borderLeft:"3px solid #0891B2"}}>
              <strong style={{color:"#1A5276"}}>🛒 Último precio de compra:</strong>{" "}
              <span style={{fontWeight:700,color:"#0891B2"}}>$ {fmtP(form.precio)}</span>
              {form.ultimaFechaCompra&&<span style={{color:"#7F8C8D"}}> · {form.ultimaFechaCompra}</span>}
              {form.ultimoProveedorCompra&&<span style={{color:"#7F8C8D"}}> · {form.ultimoProveedorCompra}</span>}
            </div>
          )}
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
                <td><button className="btn btn-outline" onClick={()=>editar(p)} style={{fontSize:11,padding:"4px 10px"}}>✏️</button></td>
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
      unidadMedida:a.unidad||'Unidad',
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
        <td style={{fontSize:12,color:"#7F8C8D",whiteSpace:"nowrap",minWidth:70}}>{linea.unidadMedida||<span style={{color:"#BDC3C7"}}>—</span>}</td>
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


// ── INPUT NUMÉRICO FORMATO ARGENTINO (miles con punto, decimal con coma) ───────
function NumInputAR({value, onChange, style, placeholder, disabled}){
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState("");
  const fmt = v => {
    if(v===""||v===undefined||v===null) return "";
    const n = parseFloat(String(v).replace(",",".").replace(/\s/g,""));
    if(isNaN(n)) return String(v);
    return n.toLocaleString("es-AR",{minimumFractionDigits:0,maximumFractionDigits:2});
  };
  const parse = v => String(v).replace(/\./g,"").replace(",",".");
  const onFocus = () => {
    setFocused(true);
    const str = (value!==undefined&&value!==null&&value!=="")?String(value).replace(".",","):"";
    setRaw(str);
  };
  const onBlur = () => {
    setFocused(false);
    const parsed = parseFloat(parse(raw));
    onChange(isNaN(parsed)?(raw==="-"?"-":""):parsed);
  };
  const onCh = e => {
    const v = e.target.value;
    if(!/^-?[\d.,]*$/.test(v)) return;
    setRaw(v);
    const parsed = parseFloat(parse(v));
    if(!isNaN(parsed)) onChange(parsed);
    else if(v===""||v==="-") onChange(v);
  };
  return(
    <input type="text"
      value={focused ? raw : fmt(value)}
      onFocus={onFocus} onBlur={onBlur} onChange={onCh}
      style={style} placeholder={placeholder} disabled={disabled}/>
  );
}

// ── LÍNEA DE COMPRA (detalle/marca, unidad, monto total, precio fracción) ─────
function LineaCompraRow({linea,articulos,onChange,onDelete,onAddAfter}){
  const [modalAbierto,setModalAbierto]=useState(false);
  const cantidad=parseFloat(linea.cantidad)||0;
  const montoTotal=parseFloat(linea.montoTotal)||0;
  const descuento=parseFloat(linea.descuento)||0;
  const montoNeto=montoTotal-descuento;
  const precioFraccion=cantidad!==0?montoNeto/cantidad:0;
  const selArticulo=(a)=>{
    onChange({...linea,articuloId:a.id,articuloNombre:a.nombre,articuloCodigo:a.codigo,
      unidadMedida:linea.unidadMedida||a.unidad||"Unidad",cantidad:linea.cantidad||1});
  };
  return(
    <>
      {modalAbierto&&<ModalBuscarArticulo articulos={articulos} onSelect={(a)=>{selArticulo(a);setModalAbierto(false);}} onClose={()=>setModalAbierto(false)} mostrarSugerido={false}/>}
      <tr>
        <td style={{minWidth:190}}>
          <div onClick={()=>setModalAbierto(true)} style={{padding:"8px 10px",border:"1.5px solid",borderColor:linea.articuloId?"#1A8F4A":"#AED6F1",borderRadius:6,cursor:"pointer",background:linea.articuloId?"#EAFAF1":"#fff",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
            <span style={{fontWeight:linea.articuloId?600:400,color:linea.articuloId?"#1A5276":"#7F8C8D"}}>{linea.articuloNombre||"Buscar artículo..."}</span>
            <span style={{fontSize:15,opacity:0.6}}>🔍</span>
          </div>
        </td>
        <td><input value={linea.detalle||""} onChange={e=>onChange({...linea,detalle:e.target.value})} placeholder="Marca/detalle" style={{width:120,fontSize:13}}/></td>
        <td>
          <NumInputAR value={linea.cantidad} onChange={v=>onChange({...linea,cantidad:v})}
            style={{width:95,fontSize:13,textAlign:"center"}} placeholder="0"/>
        </td>
        <td>
          <select value={linea.unidadMedida||"Unidad"} onChange={e=>onChange({...linea,unidadMedida:e.target.value})} style={{width:85,fontSize:13}}>
            {UNIDADES_COMPRA.map(u=><option key={u}>{u}</option>)}
          </select>
        </td>
        <td>
          <NumInputAR value={linea.montoTotal} onChange={v=>onChange({...linea,montoTotal:v})}
            style={{width:115,fontSize:13,textAlign:"right"}} placeholder="Total pagado"/>
        </td>
        <td>
          <NumInputAR value={linea.descuento} onChange={v=>onChange({...linea,descuento:v})}
            style={{width:88,fontSize:13,textAlign:"right",color:"#C0392B"}} placeholder="0"/>
        </td>
        <td style={{textAlign:"right",fontWeight:700,color:"#0891B2",whiteSpace:"nowrap",minWidth:110}}>
          {precioFraccion!==0?"$ "+fmtP(precioFraccion):<span style={{color:"#BDC3C7"}}>—</span>}
        </td>
        <td style={{whiteSpace:"nowrap"}}>
          <button className="btn btn-danger" onClick={onDelete} style={{padding:"4px 7px",fontSize:11,marginRight:3}}>✕</button>
          <button onClick={onAddAfter} title="Agregar línea aquí" style={{padding:"4px 7px",fontSize:11,background:"#1A8F4A",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontWeight:700}}>+</button>
        </td>
      </tr>
    </>
  );
}

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

function CompraForm({titulo,encInit,lineasInit,impuestosInit,proveedores,articulos,onGuardar,onVolver,guardando,err,ok}){
  const [enc,setEnc]=useState(encInit);
  const linNueva=()=>({_k:Date.now(),articuloId:null,articuloNombre:"",articuloCodigo:"",detalle:"",cantidad:"",unidadMedida:"Unidad",montoTotal:"",descuento:""});
  const [lineas,setLineas]=useState(lineasInit);
  const [impuestos,setImpuestos]=useState(impuestosInit);

  const sub=lineas.reduce((s,l)=>s+(parseFloat(l.montoTotal)||0)-(parseFloat(l.descuento)||0),0);
  const totalImp=impuestos.reduce((s,x)=>s+(parseFloat(x.monto)||0),0);
  const total=sub+totalImp;

  const agregar=()=>setLineas(p=>[...p,linNueva()]);
  const agregarDespues=i=>setLineas(p=>{const n=[...p];n.splice(i+1,0,linNueva());return n;});
  const mod=(i,d)=>setLineas(p=>p.map((l,idx)=>idx===i?d:l));
  const del=i=>setLineas(p=>p.filter((_,idx)=>idx!==i));
  const agregarImp=()=>setImpuestos(p=>[...p,{_k:Date.now(),concepto:"",monto:""}]);
  const modImp=(i,d)=>setImpuestos(p=>p.map((x,idx)=>idx===i?d:x));
  const delImp=i=>setImpuestos(p=>p.filter((_,idx)=>idx!==i));

  const handleGuardar=()=>onGuardar({enc,lineas,impuestos,sub,totalImp,total});

  if(ok)return(<div style={{textAlign:"center",padding:60}}><div style={{fontSize:48}}>✅</div><h3 style={{color:"#16A34A",marginTop:10}}>¡COMPRA GUARDADA!</h3><p style={{color:"#94A3B8",marginTop:6}}>Stock y precios actualizados.</p></div>);
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <button className="btn btn-outline" onClick={onVolver} style={{fontSize:12}}>← VOLVER</button>
        <h2 style={{color:"#1A3A5C",fontSize:17,borderBottom:"3px solid #1A6FA8",paddingBottom:4}}>{titulo}</h2>
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
          <div className="fg"><label>USUARIO</label><input value={enc.usuario||""} disabled/></div>
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
              <th>ARTÍCULO</th><th>DETALLE / MARCA</th><th>CANT.</th><th>UNIDAD</th>
              <th>MONTO TOTAL $</th><th style={{color:"#FCA5A5"}}>DESCUENTO $</th>
              <th style={{textAlign:"right",color:"#85C1E9"}}>PRECIO FRACCIÓN $</th><th></th>
            </tr></thead>
            <tbody>
              {lineas.map((l,i)=>(
                <LineaCompraRow key={l._k} linea={l} articulos={articulos}
                  onChange={d=>mod(i,d)} onDelete={()=>del(i)} onAddAfter={()=>agregarDespues(i)}/>
              ))}
              {!lineas.length&&<tr><td colSpan={8} style={{textAlign:"center",color:"#94A3B8",padding:14}}>Sin líneas</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:8,padding:"8px 12px",background:"#EBF5FB",borderRadius:6,fontSize:12,color:"#1A5276"}}>
          💡 <b>MONTO TOTAL $</b>: total bruto del ítem. <b>DESCUENTO $</b>: bonificación sobre ese ítem (resta al subtotal y al precio fracción). <b>+</b> en cada fila = insertar línea debajo.
        </div>
      </div>
      <div className="sec" style={{borderTop:"3px solid #16A34A"}}>
        <div className="sec-title">━━ PIE ━━</div>
        <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:460,marginLeft:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontWeight:700}}>SUBTOTAL ARTÍCULOS:</span>
            <strong style={{color:"#2563A8"}}>$ {fmtP(sub)}</strong>
          </div>
          <div style={{background:"#F8F9FA",borderRadius:8,padding:12,border:"1px solid #D6EAF8"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontWeight:700,fontSize:12,color:"#1A5276",textTransform:"uppercase",letterSpacing:0.3}}>Impuestos / Percepciones / Descuentos globales</span>
              <button className="btn btn-primary" onClick={agregarImp} style={{fontSize:11,padding:"4px 12px"}}>+ AGREGAR</button>
            </div>
            {impuestos.map((imp,i)=>(
              <div key={imp._k} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                <input value={imp.concepto} onChange={e=>modImp(i,{...imp,concepto:e.target.value})} placeholder="Concepto (ej: IVA 21%, IIBB, Desc. global...)" style={{flex:1,fontSize:13}}/>
                <NumInputAR value={imp.monto} onChange={v=>modImp(i,{...imp,monto:v})} style={{width:130,textAlign:"right",fontSize:13}} placeholder="0,00"/>
                {impuestos.length>1&&<button className="btn btn-danger" onClick={()=>delImp(i)} style={{padding:"4px 8px",fontSize:11,flexShrink:0}}>✕</button>}
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:6,borderTop:"1px dashed #AED6F1",marginTop:4}}>
              <span style={{fontWeight:600,fontSize:13,color:"#7C3AED"}}>Total impuestos/ajustes:</span>
              <strong style={{color:"#7C3AED"}}>$ {fmtP(totalImp)}</strong>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",borderTop:"2px solid #E8620A",paddingTop:10}}>
            <span style={{fontWeight:700,fontSize:14}}>TOTAL COMPRA:</span>
            <strong style={{fontSize:20,color:"#E8620A"}}>$ {fmtP(total)}</strong>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
          <button className="btn btn-naranja" onClick={handleGuardar} disabled={guardando} style={{padding:"11px 26px",fontSize:14}}>{guardando?"GUARDANDO...":"💾 CONFIRMAR COMPRA"}</button>
        </div>
      </div>
    </div>
  );
}

function NuevaCompra({proveedores,articulos,setArticulos,compras,setCompras,usuario,onVolver}){
  const [err,setErr]=useState(""); const [guardando,setGuardando]=useState(false); const [ok,setOk]=useState(false);

  const guardar=async({enc,lineas,impuestos,sub,totalImp,total})=>{
    if(!enc.proveedorId){setErr("Seleccione proveedor");return;}
    if(!lineas.length){setErr("Agregue al menos un artículo");return;}
    if(lineas.some(l=>!l.articuloId||parseFloat(l.cantidad)===0||isNaN(parseFloat(l.cantidad)))){
      setErr("Complete artículo y cantidad en todas las líneas (puede ser negativo para devoluciones)");return;}
    setGuardando(true); setErr("");
    try{
      const prov=proveedores.find(p=>p.id===+enc.proveedorId);
      const {data:compData}=await sb.from("compras").insert({
        fecha:enc.fecha,proveedor_id:+enc.proveedorId,proveedor_nombre:prov?.razonSocial||"",
        tipo_boleta:enc.tipoBoleta,nro_comprobante:enc.nroComprobante||"",
        total_detalle:sub,total_impuestos:totalImp,total_compra:total,usuario_nombre:usuario.nombre
      });
      const compId=compData[0].id;
      await sb.from("compras_detalle").insert(lineas.map(l=>{
        const cant=parseFloat(l.cantidad)||0; const montoTot=parseFloat(l.montoTotal)||0;
        const desc=parseFloat(l.descuento)||0; const montoNeto=montoTot-desc;
        const precFrac=cant!==0?montoNeto/cant:0;
        return {compra_id:compId,articulo_id:l.articuloId,articulo_nombre:l.articuloNombre,
          articulo_codigo:l.articuloCodigo,detalle:l.detalle||"",unidad_medida:l.unidadMedida||"Unidad",
          cantidad:cant,precio_unitario:precFrac,precio_fraccion:precFrac,total:montoTot,descuento:desc};
      }));
      const stockLocal={}; const precioLocal={};
      for(const l of lineas){
        const artId=l.articuloId; if(!artId) continue;
        const art=articulos.find(a=>a.id===artId); if(!art) continue;
        const baseStock=stockLocal[artId]!==undefined?stockLocal[artId]:(art.stock||0);
        const cant=parseFloat(l.cantidad)||0; const montoTot=parseFloat(l.montoTotal)||0;
        const desc=parseFloat(l.descuento)||0; const montoNeto=montoTot-desc;
        const precFrac=cant!==0?montoNeto/cant:0;
        stockLocal[artId]=baseStock+cant;
        precioLocal[artId]={precio:precFrac,fecha:enc.fecha,proveedor:prov?.razonSocial||""};
      }
      for(const [artIdStr,nuevoStock] of Object.entries(stockLocal)){
        const artId=+artIdStr; const info=precioLocal[artId];
        await sb.from("articulos").eq("id",artId).update({stock:nuevoStock,precio:info.precio,ultima_fecha_compra:info.fecha,ultimo_proveedor_compra:info.proveedor});
        setArticulos(p=>p.map(a=>a.id===artId?{...a,stock:nuevoStock,precio:info.precio,ultimaFechaCompra:info.fecha,ultimoProveedorCompra:info.proveedor}:a));
      }
      const lineasGuardadas=lineas.map(l=>{
        const cant=parseFloat(l.cantidad)||0; const montoTot=parseFloat(l.montoTotal)||0;
        const desc=parseFloat(l.descuento)||0; const montoNeto=montoTot-desc;
        const precFrac=cant!==0?montoNeto/cant:0;
        return {articuloId:l.articuloId,articuloNombre:l.articuloNombre,articuloCodigo:l.articuloCodigo,
          detalle:l.detalle||"",unidadMedida:l.unidadMedida||"Unidad",cantidad:cant,
          precioUnitario:precFrac,precioFraccion:precFrac,total:montoTot,descuento:desc};
      });
      setCompras(p=>[...p,{id:compId,fecha:enc.fecha,proveedorId:+enc.proveedorId,proveedorNombre:prov?.razonSocial||"",tipoBoleta:enc.tipoBoleta,nroComprobante:enc.nroComprobante||"",totalDetalle:sub,totalImpuestos:totalImp,totalCompra:total,usuario:usuario.nombre,lineas:lineasGuardadas}]);
      setOk(true); setTimeout(onVolver,1500);
    }catch(e){setErr("Error al guardar: "+e.message);}
    finally{setGuardando(false);}
  };

  return <CompraForm
    titulo="🛒 NUEVA COMPRA"
    encInit={{fecha:hoy(),proveedorId:"",tipoBoleta:"Factura B",nroComprobante:"",usuario:usuario.nombre}}
    lineasInit={[{_k:1,articuloId:null,articuloNombre:"",articuloCodigo:"",detalle:"",cantidad:"",unidadMedida:"Unidad",montoTotal:"",descuento:""}]}
    impuestosInit={[{_k:1,concepto:"",monto:""}]}
    proveedores={proveedores} articulos={articulos}
    onGuardar={guardar} onVolver={onVolver}
    guardando={guardando} err={err} ok={ok}/>;
}

// ── EDITAR COMPRA EXISTENTE ───────────────────────────────────────────────────
function EditarCompra({compraOriginal,proveedores,articulos,setArticulos,setCompras,usuario,onVolver}){
  const [err,setErr]=useState(""); const [guardando,setGuardando]=useState(false); const [ok,setOk]=useState(false);

  const guardar=async({enc,lineas,impuestos,sub,totalImp,total})=>{
    if(!enc.proveedorId){setErr("Seleccione proveedor");return;}
    if(!lineas.length){setErr("Agregue al menos un artículo");return;}
    if(lineas.some(l=>!l.articuloId||parseFloat(l.cantidad)===0||isNaN(parseFloat(l.cantidad)))){
      setErr("Complete artículo y cantidad en todas las líneas");return;}
    setGuardando(true); setErr("");
    try{
      const prov=proveedores.find(p=>p.id===+enc.proveedorId);
      // 1. Revertir stock viejo
      const stockLocal={};
      for(const l of compraOriginal.lineas){
        if(!l.articuloId) continue;
        const art=articulos.find(a=>a.id===l.articuloId); if(!art) continue;
        const base=stockLocal[l.articuloId]!==undefined?stockLocal[l.articuloId]:(art.stock||0);
        stockLocal[l.articuloId]=base-(parseFloat(l.cantidad)||0);
      }
      // 2. Aplicar stock nuevo
      const precioLocal={};
      for(const l of lineas){
        if(!l.articuloId) continue;
        const artActual=articulos.find(a=>a.id===l.articuloId);
        const base=stockLocal[l.articuloId]!==undefined?stockLocal[l.articuloId]:(artActual?.stock||0);
        const cant=parseFloat(l.cantidad)||0; const montoTot=parseFloat(l.montoTotal)||0;
        const desc=parseFloat(l.descuento)||0; const montoNeto=montoTot-desc;
        const precFrac=cant!==0?montoNeto/cant:0;
        stockLocal[l.articuloId]=base+cant;
        precioLocal[l.articuloId]={precio:precFrac,fecha:enc.fecha,proveedor:prov?.razonSocial||""};
      }
      // 3. Actualizar stock en DB
      for(const [artIdStr,nuevoStock] of Object.entries(stockLocal)){
        const artId=+artIdStr; const info=precioLocal[artId];
        if(info){
          await sb.from("articulos").eq("id",artId).update({stock:nuevoStock,precio:info.precio,ultima_fecha_compra:info.fecha,ultimo_proveedor_compra:info.proveedor});
          setArticulos(p=>p.map(a=>a.id===artId?{...a,stock:nuevoStock,precio:info.precio,ultimaFechaCompra:info.fecha,ultimoProveedorCompra:info.proveedor}:a));
        }else{
          await sb.from("articulos").eq("id",artId).update({stock:nuevoStock});
          setArticulos(p=>p.map(a=>a.id===artId?{...a,stock:nuevoStock}:a));
        }
      }
      // 4. Actualizar encabezado compra
      await sb.from("compras").eq("id",compraOriginal.id).update({
        fecha:enc.fecha,proveedor_id:+enc.proveedorId,proveedor_nombre:prov?.razonSocial||"",
        tipo_boleta:enc.tipoBoleta,nro_comprobante:enc.nroComprobante||"",
        total_detalle:sub,total_impuestos:totalImp,total_compra:total,usuario_nombre:usuario.nombre
      });
      // 5. Reemplazar detalle
      await sb.from("compras_detalle").eq("compra_id",compraOriginal.id).delete();
      await sb.from("compras_detalle").insert(lineas.map(l=>{
        const cant=parseFloat(l.cantidad)||0; const montoTot=parseFloat(l.montoTotal)||0;
        const desc=parseFloat(l.descuento)||0; const montoNeto=montoTot-desc;
        const precFrac=cant!==0?montoNeto/cant:0;
        return {compra_id:compraOriginal.id,articulo_id:l.articuloId,articulo_nombre:l.articuloNombre,
          articulo_codigo:l.articuloCodigo,detalle:l.detalle||"",unidad_medida:l.unidadMedida||"Unidad",
          cantidad:cant,precio_unitario:precFrac,precio_fraccion:precFrac,total:montoTot,descuento:desc};
      }));
      // 6. Actualizar estado local
      const lineasGuardadas=lineas.map(l=>{
        const cant=parseFloat(l.cantidad)||0; const montoTot=parseFloat(l.montoTotal)||0;
        const desc=parseFloat(l.descuento)||0; const montoNeto=montoTot-desc;
        const precFrac=cant!==0?montoNeto/cant:0;
        return {articuloId:l.articuloId,articuloNombre:l.articuloNombre,articuloCodigo:l.articuloCodigo,
          detalle:l.detalle||"",unidadMedida:l.unidadMedida||"Unidad",cantidad:cant,
          precioUnitario:precFrac,precioFraccion:precFrac,total:montoTot,descuento:desc};
      });
      setCompras(p=>p.map(c=>c.id===compraOriginal.id?{
        ...c,fecha:enc.fecha,proveedorId:+enc.proveedorId,proveedorNombre:prov?.razonSocial||"",
        tipoBoleta:enc.tipoBoleta,nroComprobante:enc.nroComprobante||"",
        totalDetalle:sub,totalImpuestos:totalImp,totalCompra:total,lineas:lineasGuardadas
      }:c));
      setOk(true); setTimeout(onVolver,1500);
    }catch(e){setErr("Error al guardar: "+e.message);}
    finally{setGuardando(false);}
  };

  return <CompraForm
    titulo={`✏️ EDITAR COMPRA #${compraOriginal.id}`}
    encInit={{fecha:compraOriginal.fecha,proveedorId:String(compraOriginal.proveedorId),tipoBoleta:compraOriginal.tipoBoleta,nroComprobante:compraOriginal.nroComprobante||"",usuario:usuario.nombre}}
    lineasInit={compraOriginal.lineas.map((l,i)=>({
      _k:i+1,articuloId:l.articuloId,articuloNombre:l.articuloNombre,articuloCodigo:l.articuloCodigo,
      detalle:l.detalle||"",cantidad:l.cantidad,unidadMedida:l.unidadMedida||"Unidad",
      montoTotal:l.total,descuento:l.descuento||0
    }))}
    impuestosInit={[{_k:1,concepto:"Impuestos anteriores",monto:String(compraOriginal.totalImpuestos||"")}]}
    proveedores={proveedores} articulos={articulos}
    onGuardar={guardar} onVolver={onVolver}
    guardando={guardando} err={err} ok={ok}/>;
}


function Compras({proveedores,articulos,setArticulos,compras,setCompras,usuario,pagosProveedores}){
  const [vista,setVista]=useState("lista");
  const [sel,setSel]=useState(null);
  const [buscar,setBuscar]=useState("");
  const [desde,setDesde]=useState("");
  const [hasta,setHasta]=useState("");
  const [provFiltro,setProvFiltro]=useState("");

  if(vista==="nueva")return <NuevaCompra proveedores={proveedores} articulos={articulos} setArticulos={setArticulos} compras={compras} setCompras={setCompras} usuario={usuario} onVolver={()=>setVista("lista")}/>;
  if(vista==="editar"&&sel)return <EditarCompra compraOriginal={sel} proveedores={proveedores} articulos={articulos} setArticulos={setArticulos} setCompras={setCompras} usuario={usuario} onVolver={()=>{setVista("lista");setSel(null);}}/>;
  if(vista==="det"&&sel){
    const c=sel;
    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <button className="btn btn-outline" onClick={()=>{setVista("lista");setSel(null);}} style={{fontSize:12}}>← VOLVER</button>
          <h2 style={{color:"#1A3A5C",fontSize:17}}>🛒 COMPRA #{c.id}</h2>
        </div>
        <div className="sec"><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
          {[["N° INTERNO",`#${c.id}`],["NRO. COMPROBANTE",c.nroComprobante||"—"],["FECHA",fmtFechaCorta(c.fecha)],["PROVEEDOR",c.proveedorNombre],["TIPO",c.tipoBoleta],["USUARIO",c.usuario]].map(([k,v])=>(
            <div key={k}><div style={{fontSize:10,color:"#94A3B8",fontWeight:700}}>{k}</div><div style={{fontWeight:700}}>{v}</div></div>
          ))}
        </div></div>
        <div style={{background:"#fff",borderRadius:8,overflow:"auto",marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
          <table><thead><tr><th>ARTÍCULO</th><th>DETALLE/MARCA</th><th>CANT.</th><th>UNIDAD</th><th style={{textAlign:"right"}}>MONTO TOTAL $</th><th style={{textAlign:"right",color:"#FCA5A5"}}>DESC. $</th><th style={{textAlign:"right"}}>PRECIO FRACC. $</th></tr></thead>
            <tbody>{c.lineas.map((l,i)=><tr key={i}><td><b>{l.articuloCodigo}</b> {l.articuloNombre}</td><td style={{fontSize:12,color:"#5D6D7E"}}>{l.detalle||<span style={{color:"#BDC3C7"}}>—</span>}</td><td>{l.cantidad}</td><td style={{fontSize:12,color:"#7F8C8D"}}>{l.unidadMedida||"—"}</td><td style={{textAlign:"right",fontWeight:700}}>$ {fmtP(l.total)}</td><td style={{textAlign:"right",color:"#C0392B"}}>{l.descuento>0?"$ "+fmtP(l.descuento):<span style={{color:"#BDC3C7"}}>—</span>}</td><td style={{textAlign:"right",fontWeight:700,color:"#0891B2"}}>$ {fmtP(l.precioFraccion||l.precioUnitario)}</td></tr>)}</tbody>
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

  const eliminarCompra=async(c)=>{
    if(!window.confirm(`¿Eliminar compra #${c.id}?\nProveedor: ${c.proveedorNombre}\nTotal: $${fmtP(c.totalCompra)}\n\nEsto revertirá el stock de todos los artículos.`)) return;
    try{
      const stockLocal={};
      for(const l of c.lineas){
        if(!l.articuloId) continue;
        const art=articulos.find(a=>a.id===l.articuloId); if(!art) continue;
        const base=stockLocal[l.articuloId]!==undefined?stockLocal[l.articuloId]:(art.stock||0);
        stockLocal[l.articuloId]=base-(parseFloat(l.cantidad)||0);
      }
      for(const [artIdStr,nuevoStock] of Object.entries(stockLocal)){
        const artId=+artIdStr;
        await sb.from("articulos").eq("id",artId).update({stock:nuevoStock});
        setArticulos(p=>p.map(a=>a.id===artId?{...a,stock:nuevoStock}:a));
      }
      await sb.from("compras_detalle").eq("compra_id",c.id).delete();
      await sb.from("compras").eq("id",c.id).delete();
      setCompras(p=>p.filter(x=>x.id!==c.id));
    }catch(e){alert("Error al eliminar: "+e.message);}
  };

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
        <table><thead><tr><th>ID</th><th>NRO. COMPROBANTE</th><th style={{whiteSpace:"nowrap"}}>FECHA</th><th>PROVEEDOR</th><th>TIPO</th><th>TOTAL $</th><th>USUARIO</th><th></th></tr></thead>
          <tbody>
            {filtradas.map(c=>(
              <tr key={c.id}>
                <td><b>#{c.id}</b></td>
                <td style={{fontSize:11}}>{c.nroComprobante||<span style={{color:"#94A3B8"}}>—</span>}</td>
                <td style={{fontSize:11,whiteSpace:"nowrap"}}>{fmtFechaCorta(c.fecha)}</td>
                <td>{c.proveedorNombre}</td>
                <td><span className="badge" style={{background:"#2563A8",color:"#fff",fontSize:10}}>{c.tipoBoleta}</span></td>
                <td style={{fontWeight:700,color:"#E8620A"}}>
                  $ {fmtP(c.totalCompra)}
                  {(()=>{
                    const pags=(pagosProveedores||[]).filter(p=>p.compraId===c.id);
                    const totalPag=Math.round(pags.reduce((s,p)=>s+p.monto,0)*100)/100;
                    const pend=Math.round((c.totalCompra-totalPag)*100)/100;
                    if(pend<=0) return <span className="badge" style={{background:"#16A34A",color:"#fff",fontSize:9,marginLeft:4}}>✓ SALDADA</span>;
                    if(totalPag>0) return <span className="badge" style={{background:"#E8620A",color:"#fff",fontSize:9,marginLeft:4}}>PARCIAL</span>;
                    return null;
                  })()}
                </td>
                <td style={{fontSize:10,color:"#94A3B8"}}>{c.usuario}</td>
                <td style={{whiteSpace:"nowrap"}}>
                  <button className="btn btn-outline" onClick={()=>{setSel(c);setVista("det");}} style={{fontSize:10,padding:"3px 7px",marginRight:3}}>👁️</button>
                  <button className="btn btn-primary" onClick={()=>{setSel(c);setVista("editar");}} style={{fontSize:10,padding:"3px 7px",marginRight:3}}>✏️</button>
                  <button className="btn btn-danger" onClick={()=>eliminarCompra(c)} style={{fontSize:10,padding:"3px 7px"}}>🗑️</button>
                </td>
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
        unidad_medida:l.unidadMedida||'Unidad',
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
            <thead><tr><th>ARTÍCULO</th><th>UNIDAD</th><th>CANT.</th><th>PRECIO UNIT. $</th><th>SUBTOTAL $</th><th></th></tr></thead>
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
          <table><thead><tr><th>ARTÍCULO</th><th>UNIDAD</th><th>CANT.</th><th>COSTO $</th><th>P.UNIT $</th><th>SUBTOTAL $</th><th>GANANCIA $</th></tr></thead>
            <tbody>{v.lineas.map((l,i)=>{const g=l.subtotal-(l.cantidad||0)*(l.precioCosto||0);return(
              <tr key={i}><td><b>{l.articuloCodigo}</b> {l.articuloNombre}</td><td style={{fontSize:11,color:"#7F8C8D"}}>{l.unidadMedida||"—"}</td><td>{l.cantidad}</td><td style={{color:"#94A3B8"}}>$ {fmtP(l.precioCosto)}</td><td>$ {fmtP(l.precioUnitario)}</td><td style={{fontWeight:700}}>$ {fmtP(l.subtotal)}</td><td style={{fontWeight:700,color:"#16A34A"}}>$ {fmtP(g)}</td></tr>
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


// ── CUENTA CORRIENTE ─────────────────────────────────────────────────────────
function CuentaCorriente({clientes,proveedores,ventas,compras,pagosClientes,setPagosClientes,pagosProveedores,setPagosProveedores,usuario}){
  const [tab,setTab]=useState("clientes");
  const [subTab,setSubTab]=useState("ledger"); // "ledger" | "boletas" | "informes"
  const [selEntidad,setSelEntidad]=useState(null);
  const [modalPago,setModalPago]=useState(false);
  const [formPago,setFormPago]=useState({});
  const [montoInput,setMontoInput]=useState(""); // controlled separately for real-time preview
  const [err,setErr]=useState("");
  const [guardando,setGuardando]=useState(false);
  const [buscar,setBuscar]=useState("");

  // ── Saldos por entidad ────────────────────────
  const balancesClientes=clientes.map(c=>{
    const totalVentas=ventas.filter(v=>v.clienteId===c.id).reduce((s,v)=>s+v.totalVenta,0);
    const totalCobros=pagosClientes.filter(p=>p.clienteId===c.id).reduce((s,p)=>s+p.monto,0);
    return {...c,totalVentas,totalCobros,saldo:totalVentas-totalCobros};
  }).filter(c=>c.totalVentas>0||c.totalCobros>0);

  const balancesProveedores=proveedores.map(p=>{
    const totalCompras=compras.filter(c=>c.proveedorId===p.id).reduce((s,c)=>s+c.totalCompra,0);
    const totalPagos=pagosProveedores.filter(pg=>pg.proveedorId===p.id).reduce((s,pg)=>s+pg.monto,0);
    return {...p,totalCompras,totalPagos,saldo:totalCompras-totalPagos};
  }).filter(p=>p.totalCompras>0||p.totalPagos>0);

  const totalACobrar=balancesClientes.reduce((s,c)=>s+Math.max(0,c.saldo),0);
  const totalAPagar=balancesProveedores.reduce((s,p)=>s+Math.max(0,p.saldo),0);

  // ── Libro mayor de la entidad seleccionada ────
  const r2=(n)=>Math.round(n*100)/100;
  const calcEstadoDoc=(totalDoc,pagosDoc)=>{
    const totalPag=r2(pagosDoc.reduce((s,p)=>s+p.monto,0));
    const pend=r2(totalDoc-totalPag);
    return {totalPagado:totalPag,pendiente:pend,estado:pend<=0?"SALDADO":totalPag>0?"PARCIAL":"PENDIENTE"};
  };
  const getLedger=()=>{
    if(!selEntidad) return [];
    const movs=[];
    if(tab==="clientes"){
      ventas.filter(v=>v.clienteId===selEntidad.id).forEach(v=>{
        const pagsDoc=pagosClientes.filter(p=>p.clienteId===selEntidad.id&&p.ventaId===v.id);
        const {totalPagado,pendiente,estado}=calcEstadoDoc(v.totalVenta,pagsDoc);
        movs.push({fecha:v.fecha,tipo:"VENTA",ref:`Vta #${v.id}${v.nroComprobante?" · "+v.nroComprobante:""}`,debe:v.totalVenta,haber:0,detalle:"",usuario:v.usuario,uid:"v"+v.id,estadoDoc:estado,totalDoc:v.totalVenta,totalPagado,pendiente});
      });
      pagosClientes.filter(p=>p.clienteId===selEntidad.id).forEach(p=>{
        const vtaRef=p.ventaId?ventas.find(v=>v.id===p.ventaId):null;
        const refDoc=p.ventaId?` → ${vtaRef?.nroComprobante?vtaRef.nroComprobante+' (Vta #'+p.ventaId+')':`Vta #${p.ventaId}`}`:"";
        movs.push({fecha:p.fecha,tipo:"COBRO",ref:p.concepto||`Cobro #${p.id}`,debe:0,haber:p.monto,detalle:p.medioPago+(p.detallePago?" · "+p.detallePago:"")+refDoc,usuario:p.usuario,uid:"p"+p.id,pagoId:p.id});
      });
    }else{
      compras.filter(c=>c.proveedorId===selEntidad.id).forEach(c=>{
        const pagsDoc=pagosProveedores.filter(p=>p.proveedorId===selEntidad.id&&p.compraId===c.id);
        const {totalPagado,pendiente,estado}=calcEstadoDoc(c.totalCompra,pagsDoc);
        movs.push({fecha:c.fecha,tipo:"COMPRA",ref:`Comp #${c.id}${c.nroComprobante?" · "+c.nroComprobante:""}`,debe:c.totalCompra,haber:0,detalle:"",usuario:c.usuario,uid:"c"+c.id,estadoDoc:estado,totalDoc:c.totalCompra,totalPagado,pendiente});
      });
      pagosProveedores.filter(p=>p.proveedorId===selEntidad.id).forEach(p=>{
        const compRef=p.compraId?compras.find(c=>c.id===p.compraId):null;
        const refDoc=p.compraId?` → ${compRef?.nroComprobante?compRef.nroComprobante+' (Comp #'+p.compraId+')':`Comp #${p.compraId}`}`:"";
        movs.push({fecha:p.fecha,tipo:"PAGO",ref:p.concepto||`Pago #${p.id}`,debe:0,haber:p.monto,detalle:p.medioPago+(p.detallePago?" · "+p.detallePago:"")+refDoc,usuario:p.usuario,uid:"p"+p.id,pagoId:p.id});
      });
    }
    movs.sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.uid.localeCompare(b.uid));
    let saldo=0;
    return movs.map(m=>{saldo+=m.debe-m.haber;return{...m,saldo};});
  };
  const ledger=getLedger();
  const saldoActual=ledger.length>0?ledger[ledger.length-1].saldo:0;

  // ── Registrar cobro/pago ──────────────────────
  const abrirPago=()=>{
    setFormPago({fecha:hoy(),medioPago:"EFECTIVO",detallePago:"",concepto:"",referenciaId:""});
    setMontoInput(""); setErr(""); setModalPago(true);
  };

  const guardarPago=async()=>{
    const monto=parseFloat(montoInput)||0;
    if(!monto||monto<=0){setErr("Ingresá un monto válido");return;}
    setGuardando(true); setErr("");
    try{
      if(tab==="clientes"){
        const reg={fecha:formPago.fecha,cliente_id:selEntidad.id,cliente_nombre:selEntidad.razonSocial,monto,medio_pago:formPago.medioPago,detalle_pago:formPago.detallePago||"",concepto:formPago.concepto||"",venta_id:formPago.referenciaId?+formPago.referenciaId:null,usuario_nombre:usuario.nombre};
        const {data}=await sb.from("pagos_clientes").insert(reg);
        setPagosClientes(p=>[...p,mapPagoCli(data[0])]);
      }else{
        const reg={fecha:formPago.fecha,proveedor_id:selEntidad.id,proveedor_nombre:selEntidad.razonSocial,monto,medio_pago:formPago.medioPago,detalle_pago:formPago.detallePago||"",concepto:formPago.concepto||"",compra_id:formPago.referenciaId?+formPago.referenciaId:null,usuario_nombre:usuario.nombre};
        const {data}=await sb.from("pagos_proveedores").insert(reg);
        setPagosProveedores(p=>[...p,mapPagoProv(data[0])]);
      }
      setModalPago(false);
    }catch(e){setErr("Error: "+e.message);}
    finally{setGuardando(false);}
  };

  const eliminarPago=async(pagoId)=>{
    if(!window.confirm("¿Eliminar este registro de pago/cobro?")) return;
    try{
      if(tab==="clientes"){
        await sb.from("pagos_clientes").eq("id",pagoId).delete();
        setPagosClientes(p=>p.filter(x=>x.id!==pagoId));
      }else{
        await sb.from("pagos_proveedores").eq("id",pagoId).delete();
        setPagosProveedores(p=>p.filter(x=>x.id!==pagoId));
      }
    }catch(e){alert("Error: "+e.message);}
  };

  const ventasEntidad=selEntidad&&tab==="clientes"
    ?ventas.filter(v=>v.clienteId===selEntidad.id).filter(v=>{
        const pagsDoc=pagosClientes.filter(p=>p.clienteId===selEntidad.id&&p.ventaId===v.id);
        return Math.round((v.totalVenta-pagsDoc.reduce((s,p)=>s+p.monto,0))*100)/100>0;
      })
    :[];
  const comprasEntidad=selEntidad&&tab==="proveedores"
    ?compras.filter(c=>c.proveedorId===selEntidad.id).filter(c=>{
        const pagsDoc=pagosProveedores.filter(p=>p.proveedorId===selEntidad.id&&p.compraId===c.id);
        return Math.round((c.totalCompra-pagsDoc.reduce((s,p)=>s+p.monto,0))*100)/100>0;
      })
    :[];
  const esCliente=tab==="clientes";
  const colorTab=esCliente?"#16A34A":"#E8620A";

  // ── Vista detalle de entidad ──────────────────
  if(selEntidad){
    const totalDebe=ledger.reduce((s,m)=>s+m.debe,0);
    const totalHaber=ledger.reduce((s,m)=>s+m.haber,0);
    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <button className="btn btn-outline" onClick={()=>setSelEntidad(null)} style={{fontSize:12}}>← VOLVER</button>
          <h2 style={{color:"#1A3A5C",fontSize:17,borderBottom:`3px solid ${colorTab}`,paddingBottom:4}}>
            {esCliente?"👥":"🏭"} {selEntidad.razonSocial}
          </h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginBottom:14}}>
          {[
            {l:esCliente?"Total Facturado":"Total Comprado",v:"$ "+fmtP(totalDebe),c:"#1A3A5C",i:"📄"},
            {l:esCliente?"Total Cobrado":"Total Pagado",v:"$ "+fmtP(totalHaber),c:"#16A34A",i:esCliente?"💰":"💸"},
            {l:esCliente?"Saldo Deudor":"Saldo Adeudado",v:"$ "+fmtP(saldoActual),c:saldoActual>0?"#DC2626":saldoActual<0?"#16A34A":"#94A3B8",i:saldoActual>0?"⚠️":saldoActual<0?"✅":"—"},
          ].map(c=>(
            <div key={c.l} style={{background:"#fff",borderRadius:8,padding:"12px 14px",boxShadow:"0 2px 8px rgba(0,0,0,0.07)",borderLeft:`4px solid ${c.c}`}}>
              <div style={{fontSize:18}}>{c.i}</div>
              <div style={{fontSize:15,fontWeight:700,color:c.c,marginTop:3}}>{c.v}</div>
              <div style={{fontSize:10,color:"#94A3B8",fontWeight:700}}>{c.l}</div>
            </div>
          ))}
        </div>
        {/* Sub-tabs */}
        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
          {[["ledger","📋 LIBRO MAYOR"],["boletas",esCliente?"🧾 POR VENTA":"🧾 POR COMPRA"],["informes","📊 INFORMES"]].map(([id,label])=>(
            <button key={id} onClick={()=>setSubTab(id)} className="btn" style={{fontSize:12,padding:"7px 16px",background:subTab===id?colorTab:"#fff",color:subTab===id?"#fff":colorTab,border:`2px solid ${colorTab}`}}>{label}</button>
          ))}
          <button className="btn" style={{background:colorTab,color:"#fff",padding:"7px 16px",fontSize:12,marginLeft:"auto"}} onClick={abrirPago}>
            {esCliente?"💰 REGISTRAR COBRO":"💸 REGISTRAR PAGO"}
          </button>
        </div>

        {/* ── LIBRO MAYOR ── */}
        {subTab==="ledger"&&(
          <div style={{background:"#fff",borderRadius:8,overflow:"auto",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",marginBottom:14}}>
            <table>
              <thead><tr>
                <th style={{whiteSpace:"nowrap"}}>FECHA</th><th>TIPO</th><th>REFERENCIA</th>
                <th>MEDIO / DETALLE</th>
                <th style={{textAlign:"right"}}>DEBE $</th><th style={{textAlign:"right"}}>HABER $</th>
                <th style={{textAlign:"right"}}>SALDO $</th><th>USUARIO</th><th></th>
              </tr></thead>
              <tbody>
                {ledger.map((m,i)=>(
                  <tr key={i} style={{background:m.tipo==="COBRO"||m.tipo==="PAGO"?"rgba(22,163,74,0.05)":"rgba(26,111,168,0.03)"}}>
                    <td style={{fontSize:11,whiteSpace:"nowrap"}}>{fmtFechaCorta(m.fecha)}</td>
                    <td>
                      <span className="badge" style={{fontSize:10,background:m.tipo==="VENTA"?"#16A34A":m.tipo==="COMPRA"?"#E8620A":m.tipo==="COBRO"?"#0891B2":"#7C3AED",color:"#fff"}}>{m.tipo}</span>
                      {m.estadoDoc&&<span className="badge" style={{fontSize:9,marginLeft:3,background:m.estadoDoc==="SALDADO"?"#16A34A":m.estadoDoc==="PARCIAL"?"#E8620A":"#DC2626",color:"#fff"}}>{m.estadoDoc}</span>}
                    </td>
                    <td style={{fontSize:12,color:"#1A5276",fontWeight:600}}>
                      {m.ref}
                      {m.estadoDoc&&m.estadoDoc!=="SALDADO"&&<div style={{fontSize:10,color:"#94A3B8"}}>Pagado: $ {fmtP(m.totalPagado)} · Pendiente: <span style={{color:"#DC2626",fontWeight:700}}>$ {fmtP(m.pendiente)}</span></div>}
                    </td>
                    <td style={{fontSize:12,color:"#5D6D7E"}}>{m.detalle||<span style={{color:"#BDC3C7"}}>—</span>}</td>
                    <td style={{textAlign:"right",fontWeight:700,color:m.debe>0?"#1A3A5C":"#BDC3C7"}}>{m.debe>0?"$ "+fmtP(m.debe):"—"}</td>
                    <td style={{textAlign:"right",fontWeight:700,color:m.haber>0?"#16A34A":"#BDC3C7"}}>{m.haber>0?"$ "+fmtP(m.haber):"—"}</td>
                    <td style={{textAlign:"right",fontWeight:700,color:m.saldo>0?"#DC2626":m.saldo<0?"#16A34A":"#94A3B8"}}>$ {fmtP(m.saldo)}</td>
                    <td style={{fontSize:10,color:"#94A3B8"}}>{m.usuario}</td>
                    <td>{m.pagoId&&<button className="btn btn-danger" onClick={()=>eliminarPago(m.pagoId)} style={{fontSize:10,padding:"2px 6px"}}>🗑️</button>}</td>
                  </tr>
                ))}
                {!ledger.length&&<tr><td colSpan={9} style={{textAlign:"center",color:"#94A3B8",padding:24}}>Sin movimientos registrados</td></tr>}
              </tbody>
              {ledger.length>0&&(<tfoot><tr style={{background:"#F8FAFC",fontWeight:700}}>
                <td colSpan={4} style={{padding:"9px 14px",color:"#1A3A5C"}}>TOTALES</td>
                <td style={{textAlign:"right",padding:"9px 14px",color:"#1A3A5C"}}>$ {fmtP(totalDebe)}</td>
                <td style={{textAlign:"right",padding:"9px 14px",color:"#16A34A"}}>$ {fmtP(totalHaber)}</td>
                <td style={{textAlign:"right",padding:"9px 14px",fontSize:15,color:saldoActual>0?"#DC2626":saldoActual<0?"#16A34A":"#94A3B8"}}>$ {fmtP(saldoActual)}</td>
                <td colSpan={2}></td>
              </tr></tfoot>)}
            </table>
          </div>
        )}

        {/* ── POR BOLETA / COMPROBANTE ── */}
        {subTab==="boletas"&&(()=>{
          const docs = esCliente ? ventasEntidad : comprasEntidad;
          const pagosEntidad = esCliente
            ? pagosClientes.filter(p=>p.clienteId===selEntidad.id)
            : pagosProveedores.filter(p=>p.proveedorId===selEntidad.id);
          const pagosLibres = pagosEntidad.filter(p=>!(esCliente?p.ventaId:p.compraId));
          const totalPagosLibres = pagosLibres.reduce((s,p)=>s+p.monto,0);
          return(
            <div style={{marginBottom:14}}>
              <div style={{background:"#fff",borderRadius:8,overflow:"auto",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",marginBottom:10}}>
                <table>
                  <thead><tr>
                    <th style={{whiteSpace:"nowrap"}}>FECHA</th>
                    <th>{esCliente?"N° VENTA":"N° COMPRA"}</th>
                    <th>COMPROBANTE</th>
                    <th style={{textAlign:"right"}}>TOTAL $</th>
                    <th style={{textAlign:"right"}}>PAGADO $</th>
                    <th style={{textAlign:"right"}}>PENDIENTE $</th>
                    <th style={{textAlign:"center"}}>ESTADO</th>
                  </tr></thead>
                  <tbody>
                    {docs.sort((a,b)=>(a.fecha||"").localeCompare(b.fecha||"")).map(doc=>{
                      const totalDoc=esCliente?(doc.totalVenta||0):(doc.totalCompra||0);
                      const pagosDoc=pagosEntidad.filter(p=>(esCliente?p.ventaId:p.compraId)===doc.id);
                      const totalPagado=pagosDoc.reduce((s,p)=>s+p.monto,0);
                      const pendiente=Math.round((totalDoc-totalPagado)*100)/100;
                      const pct=totalDoc>0?Math.min(100,totalPagado/totalDoc*100):0;
                      const estado=pendiente<=0?"SALDADO":totalPagado>0?"PARCIAL":"PENDIENTE";
                      const estadoColor=estado==="SALDADO"?"#16A34A":estado==="PARCIAL"?"#E8620A":"#DC2626";
                      return(
                        <tr key={doc.id} style={{background:estado==="SALDADO"?"rgba(22,163,74,0.04)":estado==="PARCIAL"?"rgba(232,98,10,0.04)":"rgba(220,38,38,0.04)"}}>
                          <td style={{fontSize:11,whiteSpace:"nowrap"}}>{fmtFechaCorta(doc.fecha)}</td>
                          <td style={{fontWeight:700,color:"#1A5276"}}>#{doc.id}</td>
                          <td style={{fontSize:12}}>{doc.nroComprobante||<span style={{color:"#BDC3C7"}}>—</span>}</td>
                          <td style={{textAlign:"right",fontWeight:700}}>$ {fmtP(totalDoc)}</td>
                          <td style={{textAlign:"right",fontWeight:700,color:"#16A34A"}}>
                            $ {fmtP(totalPagado)}
                            {pagosDoc.length>0&&<div style={{fontSize:9,color:"#94A3B8"}}>{pagosDoc.length} pago{pagosDoc.length!==1?"s":""}</div>}
                          </td>
                          <td style={{textAlign:"right",fontWeight:700,color:pendiente>0?"#DC2626":"#16A34A"}}>
                            {pendiente>0?"$ "+fmtP(pendiente):<span style={{color:"#16A34A"}}>✓ Saldado</span>}
                          </td>
                          <td style={{textAlign:"center"}}>
                            <div>
                              <span className="badge" style={{background:estadoColor,color:"#fff",fontSize:10}}>{estado}</span>
                              {totalDoc>0&&<div style={{marginTop:4,height:4,background:"#E2E8F0",borderRadius:4,overflow:"hidden",width:60,margin:"4px auto 0"}}>
                                <div style={{width:pct+"%",height:"100%",background:estadoColor,borderRadius:4,transition:"width 0.3s"}}/>
                              </div>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!docs.length&&<tr><td colSpan={7} style={{textAlign:"center",color:"#94A3B8",padding:24}}>Sin comprobantes</td></tr>}
                  </tbody>
                  {docs.length>0&&(<tfoot>
                    <tr style={{background:"#F8FAFC",fontWeight:700}}>
                      <td colSpan={3} style={{padding:"9px 14px"}}>TOTAL COMPROBANTES</td>
                      <td style={{textAlign:"right",padding:"9px 14px"}}>$ {fmtP(docs.reduce((s,d)=>s+(esCliente?(d.totalVenta||0):(d.totalCompra||0)),0))}</td>
                      <td style={{textAlign:"right",padding:"9px 14px",color:"#16A34A"}}>$ {fmtP(pagosEntidad.filter(p=>(esCliente?p.ventaId:p.compraId)).reduce((s,p)=>s+p.monto,0))}</td>
                      <td colSpan={2} style={{padding:"9px 14px",fontSize:11,color:"#94A3B8"}}>
                        {totalPagosLibres>0&&`+ $ ${fmtP(totalPagosLibres)} sin asignar a comprobante`}
                      </td>
                    </tr>
                  </tfoot>)}
                </table>
              </div>
              {totalPagosLibres>0&&(
                <div style={{padding:"10px 14px",background:"#FFF7ED",borderRadius:6,borderLeft:"3px solid #E8620A",fontSize:12,color:"#92400E"}}>
                  ⚠️ <strong>$ {fmtP(totalPagosLibres)}</strong> en pagos no asignados a un comprobante específico (aparecen en el libro mayor pero no en esta vista).
                </div>
              )}
            </div>
          );
        })()}

        {/* ── INFORMES ── */}
        {subTab==="informes"&&(()=>{
          const pagosEntidad = esCliente
            ? pagosClientes.filter(p=>p.clienteId===selEntidad.id)
            : pagosProveedores.filter(p=>p.proveedorId===selEntidad.id);
          const porMedio={};
          pagosEntidad.forEach(p=>{porMedio[p.medioPago]=(porMedio[p.medioPago]||0)+p.monto;});
          const exportarInforme=async()=>{
            const XLSX=await new Promise((res,rej)=>{
              if(window.XLSX){res(window.XLSX);return;}
              const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
              s.onload=()=>res(window.XLSX);s.onerror=()=>rej(new Error("Error"));document.head.appendChild(s);
            });
            const wb=XLSX.utils.book_new();
            const ws1=XLSX.utils.json_to_sheet(ledger.map(m=>({
              "Fecha":fmtFechaCorta(m.fecha),"Tipo":m.tipo,"Referencia":m.ref,
              "Estado":m.estadoDoc||"","Total Doc $":m.totalDoc||"","Pagado $":m.totalPagado||"","Pendiente $":m.pendiente||"",
              "Medio/Detalle":m.detalle,"Debe $":m.debe||"","Haber $":m.haber||"","Saldo $":m.saldo,"Usuario":m.usuario
            })));
            const docs=esCliente?ventasEntidad:comprasEntidad;
            const ws2=XLSX.utils.json_to_sheet(docs.map(doc=>{
              const totalDoc=esCliente?(doc.totalVenta||0):(doc.totalCompra||0);
              const pagsDoc=pagosEntidad.filter(p=>(esCliente?p.ventaId:p.compraId)===doc.id);
              const totalPag=pagsDoc.reduce((s,p)=>s+p.monto,0);
              return {"Fecha":fmtFechaCorta(doc.fecha),"N° Doc":doc.id,"Comprobante":doc.nroComprobante||"","Total $":totalDoc,"Pagado $":totalPag,"Pendiente $":Math.max(0,totalDoc-totalPag),"Estado":totalDoc-totalPag<=0?"SALDADO":totalPag>0?"PARCIAL":"PENDIENTE"};
            }));
            const ws3=XLSX.utils.json_to_sheet(Object.entries(porMedio).map(([medio,monto])=>({"Medio de pago":medio,"Total $":monto,"Pagos":pagosEntidad.filter(p=>p.medioPago===medio).length})));
            const setCols=(ws,rows)=>{if(!rows.length)return;ws["!cols"]=Object.keys(rows[0]).map(k=>({wch:Math.max(k.length,...rows.map(r=>String(r[k]||"").length))+2}));};
            setCols(ws1,[]); setCols(ws2,[]); setCols(ws3,[]);
            XLSX.utils.book_append_sheet(wb,ws1,"Libro Mayor");
            XLSX.utils.book_append_sheet(wb,ws2,"Por Comprobante");
            XLSX.utils.book_append_sheet(wb,ws3,"Por Medio de Pago");
            XLSX.writeFile(wb,`CtaCte_${selEntidad.razonSocial.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.xlsx`);
          };
          return(
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
                <button className="btn btn-outline" onClick={exportarInforme} style={{borderColor:"#16A34A",color:"#16A34A",fontSize:12}}>📥 EXPORTAR EXCEL (3 hojas)</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div className="sec" style={{borderTop:"3px solid "+colorTab}}>
                  <div className="sec-title">💳 PAGOS POR MEDIO</div>
                  {Object.entries(porMedio).sort((a,b)=>b[1]-a[1]).map(([medio,monto])=>(
                    <div key={medio} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #EBF5FB"}}>
                      <span style={{fontSize:13,fontWeight:600}}>{medio}</span>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontWeight:700,color:colorTab}}>$ {fmtP(monto)}</div>
                        <div style={{fontSize:10,color:"#94A3B8"}}>{pagosEntidad.filter(p=>p.medioPago===medio).length} pago{pagosEntidad.filter(p=>p.medioPago===medio).length!==1?"s":""}</div>
                      </div>
                    </div>
                  ))}
                  {!Object.keys(porMedio).length&&<div style={{color:"#94A3B8",fontSize:12,padding:8}}>Sin pagos registrados</div>}
                </div>
                <div className="sec" style={{borderTop:"3px solid #1A5276"}}>
                  <div className="sec-title">📋 RESUMEN</div>
                  {[
                    ["Total facturado/comprado","$ "+fmtP(totalDebe),"#1A3A5C"],
                    ["Total cobrado/pagado","$ "+fmtP(totalHaber),"#16A34A"],
                    ["Saldo pendiente","$ "+fmtP(saldoActual),saldoActual>0?"#DC2626":"#16A34A"],
                    ["Cantidad de pagos",String(pagosEntidad.length),"#7C3AED"],
                    ["Pago promedio",pagosEntidad.length>0?"$ "+fmtP(totalHaber/pagosEntidad.length):"—","#0891B2"],
                  ].map(([k,v,c])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #EBF5FB"}}>
                      <span style={{fontSize:12,color:"#5D6D7E"}}>{k}</span>
                      <span style={{fontWeight:700,color:c,fontSize:13}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
        {modalPago&&(
          <Modal title={esCliente?"💰 NUEVO COBRO — "+selEntidad.razonSocial:"💸 NUEVO PAGO — "+selEntidad.razonSocial} onClose={()=>setModalPago(false)} w={540}>
            {err&&<div className="err">{err}</div>}
            <div className="grid2">
              <div className="fg"><label>FECHA *</label><input type="date" value={formPago.fecha} onChange={e=>setFormPago(p=>({...p,fecha:e.target.value}))}/></div>
              <div className="fg"><label>MONTO *</label>
                <input type="number" step="0.01" min="0.01" value={montoInput}
                  onChange={e=>setMontoInput(e.target.value)}
                  style={{width:"100%",fontSize:14}} placeholder="0,00"/>
              </div>
              <div className="fg"><label>MEDIO DE PAGO *</label>
                <select value={formPago.medioPago} onChange={e=>setFormPago(p=>({...p,medioPago:e.target.value}))}>
                  {MEDIOS_PAGO.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="fg"><label>DETALLE DEL MEDIO</label>
                <input value={formPago.detallePago||""} onChange={e=>setFormPago(p=>({...p,detallePago:e.target.value}))}
                  placeholder={formPago.medioPago==="CHEQUE"?"Nro. cheque, banco, vto...":formPago.medioPago==="TRANSFERENCIA"?"Referencia, banco emisor...":formPago.medioPago==="MERCADO PAGO"?"Alias o referencia MP...":"Detalle opcional"}/>
              </div>
              <div className="fg full"><label>CONCEPTO</label>
                <input value={formPago.concepto||""} onChange={e=>setFormPago(p=>({...p,concepto:e.target.value}))} placeholder="Ej: Pago factura enero, Saldo a cuenta, Seña..."/>
              </div>
              <div className="fg full"><label>{esCliente?"VENTA RELACIONADA (opcional)":"COMPRA RELACIONADA (opcional)"}</label>
                <select value={formPago.referenciaId||""} onChange={e=>setFormPago(p=>({...p,referenciaId:e.target.value}))}>
                  <option value="">— Sin referencia a documento específico —</option>
                  {(esCliente?ventasEntidad:comprasEntidad).map(d=>{
                    const totalDoc=esCliente?d.totalVenta:d.totalCompra;
                    const pagosDoc=(esCliente?pagosClientes:pagosProveedores).filter(p=>(esCliente?p.ventaId:p.compraId)===d.id&&(esCliente?p.clienteId:p.proveedorId)===selEntidad.id);
                    const pendiente=totalDoc-pagosDoc.reduce((s,p)=>s+p.monto,0);
                    return(
                      <option key={d.id} value={d.id}>
                        #{d.id} · {fmtFechaCorta(d.fecha)} · Total: $ {fmtP(totalDoc)} · Pendiente: $ {fmtP(pendiente)}{d.nroComprobante?" · "+d.nroComprobante:""}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div style={{marginTop:12,padding:"10px 14px",background:"#F0FDF4",borderRadius:6,fontSize:12,color:"#16A34A",borderLeft:"3px solid #16A34A"}}>
              <strong>Saldo actual:</strong> $ {fmtP(saldoActual)} · Después del pago: <strong style={{color:saldoActual-(parseFloat(montoInput)||0)<=0?"#16A34A":"#E8620A"}}>$ {fmtP(saldoActual-(parseFloat(montoInput)||0))}</strong>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
              <button className="btn btn-outline" onClick={()=>setModalPago(false)} disabled={guardando}>CANCELAR</button>
              <button className="btn" style={{background:colorTab,color:"#fff",padding:"9px 20px"}} onClick={guardarPago} disabled={guardando}>
                {guardando?"GUARDANDO...":esCliente?"💰 CONFIRMAR COBRO":"💸 CONFIRMAR PAGO"}
              </button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // ── Vista principal (lista) ───────────────────
  const lista=esCliente?balancesClientes:balancesProveedores;
  const listaFiltrada=lista.filter(e=>(e.razonSocial||'').toLowerCase().includes((buscar||'').toLowerCase()));
  const totalDeudaFiltrada=listaFiltrada.reduce((s,e)=>s+Math.max(0,e.saldo),0);
  const totalAFavorFiltrada=listaFiltrada.reduce((s,e)=>s+Math.max(0,-e.saldo),0);

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <h2 style={{color:"#1A3A5C",fontSize:17,borderBottom:"3px solid #1A6FA8",paddingBottom:8}}>💳 CUENTA CORRIENTE <span style={{fontSize:11,color:"#94A3B8",fontWeight:400,marginLeft:8}}>v{VERSION}</span></h2>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(165px,1fr))",gap:10,marginBottom:16}}>
        {[
          {l:"Total a cobrar",v:"$ "+fmtP(totalACobrar),c:"#DC2626",i:"⚠️",sub:"Saldo deudor clientes"},
          {l:"Total a pagar",v:"$ "+fmtP(totalAPagar),c:"#E8620A",i:"💸",sub:"Saldo adeudado proveed."},
          {l:"Clientes con saldo",v:balancesClientes.filter(c=>c.saldo>0).length+" cliente"+(balancesClientes.filter(c=>c.saldo>0).length!==1?"s":""),c:"#1A5276",i:"👥",sub:"Con deuda pendiente"},
          {l:"Proveed. con saldo",v:balancesProveedores.filter(p=>p.saldo>0).length+" proveed.",c:"#7C3AED",i:"🏭",sub:"Con deuda pendiente"},
        ].map(c=>(
          <div key={c.l} style={{background:"#fff",borderRadius:8,padding:"14px 16px",boxShadow:"0 2px 8px rgba(0,0,0,0.07)",borderLeft:`4px solid ${c.c}`}}>
            <div style={{fontSize:20}}>{c.i}</div>
            <div style={{fontSize:15,fontWeight:700,color:c.c,marginTop:4}}>{c.v}</div>
            <div style={{fontSize:11,color:"#1A3A5C",fontWeight:700}}>{c.l}</div>
            <div style={{fontSize:10,color:"#94A3B8"}}>{c.sub}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <button onClick={()=>{setTab("clientes");setSelEntidad(null);setBuscar("");}} className="btn" style={{fontSize:13,padding:"9px 22px",background:tab==="clientes"?"#16A34A":"#fff",color:tab==="clientes"?"#fff":"#16A34A",border:"2px solid #16A34A"}}>👥 CLIENTES</button>
        <button onClick={()=>{setTab("proveedores");setSelEntidad(null);setBuscar("");}} className="btn" style={{fontSize:13,padding:"9px 22px",background:tab==="proveedores"?"#E8620A":"#fff",color:tab==="proveedores"?"#fff":"#E8620A",border:"2px solid #E8620A"}}>🏭 PROVEEDORES</button>
        <button onClick={()=>{setTab("informes");setSelEntidad(null);setBuscar("");}} className="btn" style={{fontSize:13,padding:"9px 22px",background:tab==="informes"?"#1A5276":"#fff",color:tab==="informes"?"#fff":"#1A5276",border:"2px solid #1A5276"}}>📊 INFORMES</button>
      </div>
      {tab==="informes"&&(()=>{
        const exportarGlobal=async()=>{
          const XLSX=await new Promise((res,rej)=>{
            if(window.XLSX){res(window.XLSX);return;}
            const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
            s.onload=()=>res(window.XLSX);s.onerror=()=>rej(new Error("Error"));document.head.appendChild(s);
          });
          const wb=XLSX.utils.book_new();
          const ws1=XLSX.utils.json_to_sheet(balancesClientes.sort((a,b)=>b.saldo-a.saldo).map(c=>({"Cliente":c.razonSocial,"CUIT":c.cuit,"Total Facturado $":c.totalVentas,"Total Cobrado $":c.totalCobros,"Saldo $":c.saldo,"Estado":c.saldo<=0?"Al día":"Deudor"})));
          const ws2=XLSX.utils.json_to_sheet(balancesProveedores.sort((a,b)=>b.saldo-a.saldo).map(p=>({"Proveedor":p.razonSocial,"CUIT":p.cuit,"Total Comprado $":p.totalCompras,"Total Pagado $":p.totalPagos,"Saldo $":p.saldo,"Estado":p.saldo<=0?"Al día":"Deudor"})));
          const todosLosPagos=[...pagosClientes.map(p=>({...p,tipo:"COBRO",entidad:p.clienteNombre})),...pagosProveedores.map(p=>({...p,tipo:"PAGO",entidad:p.proveedorNombre}))].sort((a,b)=>b.fecha.localeCompare(a.fecha));
          const ws3=XLSX.utils.json_to_sheet(todosLosPagos.map(p=>({"Fecha":fmtFechaCorta(p.fecha),"Tipo":p.tipo,"Entidad":p.entidad,"Monto $":p.monto,"Medio":p.medioPago,"Detalle":p.detallePago||"","Concepto":p.concepto||"","Usuario":p.usuario})));
          const setCols=(ws,rows)=>{if(!rows.length)return;ws["!cols"]=Object.keys(rows[0]).map(k=>({wch:Math.max(k.length,...rows.map(r=>String(r[k]||"").length))+2}));};
          setCols(ws1,[]); setCols(ws2,[]); setCols(ws3,[]);
          XLSX.utils.book_append_sheet(wb,ws1,"Clientes - Saldos");
          XLSX.utils.book_append_sheet(wb,ws2,"Proveedores - Saldos");
          XLSX.utils.book_append_sheet(wb,ws3,"Todos los pagos");
          XLSX.writeFile(wb,`CtaCte_Informe_${new Date().toISOString().slice(0,10)}.xlsx`);
        };
        const porMedioTotal={};
        [...pagosClientes,...pagosProveedores].forEach(p=>{porMedioTotal[p.medioPago]=(porMedioTotal[p.medioPago]||0)+p.monto;});
        return(
          <div>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
              <button className="btn btn-outline" onClick={exportarGlobal} style={{borderColor:"#16A34A",color:"#16A34A",fontSize:13}}>📥 EXPORTAR INFORME COMPLETO (Excel 3 hojas)</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12,marginBottom:14}}>
              <div className="sec" style={{borderTop:"3px solid #16A34A"}}>
                <div className="sec-title">👥 TOP DEUDORES — CLIENTES</div>
                {balancesClientes.filter(c=>c.saldo>0).sort((a,b)=>b.saldo-a.saldo).slice(0,5).map(c=>(
                  <div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #EBF5FB"}}>
                    <span style={{fontSize:12,fontWeight:600,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.razonSocial}</span>
                    <span style={{fontWeight:700,color:"#DC2626",fontSize:13}}>$ {fmtP(c.saldo)}</span>
                  </div>
                ))}
                {!balancesClientes.filter(c=>c.saldo>0).length&&<div style={{color:"#94A3B8",fontSize:12}}>Sin deudores</div>}
              </div>
              <div className="sec" style={{borderTop:"3px solid #E8620A"}}>
                <div className="sec-title">🏭 TOP ACREEDORES — PROVEEDORES</div>
                {balancesProveedores.filter(p=>p.saldo>0).sort((a,b)=>b.saldo-a.saldo).slice(0,5).map(p=>(
                  <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #EBF5FB"}}>
                    <span style={{fontSize:12,fontWeight:600,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.razonSocial}</span>
                    <span style={{fontWeight:700,color:"#E8620A",fontSize:13}}>$ {fmtP(p.saldo)}</span>
                  </div>
                ))}
                {!balancesProveedores.filter(p=>p.saldo>0).length&&<div style={{color:"#94A3B8",fontSize:12}}>Sin acreedores</div>}
              </div>
              <div className="sec" style={{borderTop:"3px solid #7C3AED"}}>
                <div className="sec-title">💳 PAGOS POR MEDIO</div>
                {Object.entries(porMedioTotal).sort((a,b)=>b[1]-a[1]).map(([medio,monto])=>(
                  <div key={medio} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #EBF5FB"}}>
                    <span style={{fontSize:12,fontWeight:600}}>{medio}</span>
                    <span style={{fontWeight:700,color:"#7C3AED",fontSize:13}}>$ {fmtP(monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
      {tab!=="informes"&&(
        <div style={{marginBottom:12,display:"flex",gap:8,alignItems:"center"}}>
          <input value={buscar} onChange={e=>setBuscar(e.target.value)}
            placeholder={`🔍 Buscar ${esCliente?"cliente":"proveedor"}...`}
            style={{flex:1}}
            onKeyDown={e=>{try{e.target.value;}catch(_){setBuscar("");}}}
          />
          {buscar&&<button className="btn btn-outline" onClick={()=>setBuscar("")} style={{fontSize:11,padding:"6px 10px"}}>✕</button>}
        </div>
      )}
      {tab!=="informes"&&<div style={{display:"flex",gap:16,marginBottom:10,fontSize:13,color:"#1A3A5C",flexWrap:"wrap"}}>
        <span><strong>{listaFiltrada.length}</strong> {esCliente?"cliente":"proveedor"}{listaFiltrada.length!==1?"s":""}</span>
        {totalDeudaFiltrada>0&&<span>Deuda pendiente: <strong style={{color:"#DC2626"}}>$ {fmtP(totalDeudaFiltrada)}</strong></span>}
        {totalAFavorFiltrada>0&&<span>A favor: <strong style={{color:"#16A34A"}}>$ {fmtP(totalAFavorFiltrada)}</strong></span>}
      </div>}
      {tab!=="informes"&&<div style={{background:"#fff",borderRadius:8,overflow:"auto",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
        <table>
          <thead><tr>
            <th>{esCliente?"CLIENTE":"PROVEEDOR"}</th>
            <th style={{textAlign:"right"}}>{esCliente?"TOTAL FACTURADO $":"TOTAL COMPRADO $"}</th>
            <th style={{textAlign:"right"}}>{esCliente?"TOTAL COBRADO $":"TOTAL PAGADO $"}</th>
            <th style={{textAlign:"right"}}>SALDO $</th>
            <th></th>
          </tr></thead>
          <tbody>
            {listaFiltrada.slice().sort((a,b)=>(a.razonSocial||'').localeCompare(b.razonSocial||'')).map(e=>(
              <tr key={e.id}>
                <td><b>{e.razonSocial}</b><br/><span style={{fontSize:11,color:"#94A3B8"}}>{e.cuit}</span></td>
                <td style={{textAlign:"right",fontWeight:700,color:"#1A3A5C"}}>$ {fmtP(esCliente?e.totalVentas:e.totalCompras)}</td>
                <td style={{textAlign:"right",fontWeight:700,color:"#16A34A"}}>$ {fmtP(esCliente?e.totalCobros:e.totalPagos)}</td>
                <td style={{textAlign:"right",fontWeight:700,fontSize:14,color:e.saldo>0?"#DC2626":e.saldo<0?"#16A34A":"#94A3B8"}}>
                  {e.saldo>0?"⚠️ ":e.saldo<0?"✅ ":""}$ {fmtP(e.saldo)}
                </td>
                <td><button className="btn btn-outline" onClick={()=>setSelEntidad(e)} style={{fontSize:11,padding:"4px 12px",whiteSpace:"nowrap"}}>VER CUENTA →</button></td>
              </tr>
            ))}
            {!listaFiltrada.length&&<tr><td colSpan={5} style={{textAlign:"center",color:"#94A3B8",padding:32}}>Sin movimientos registrados aún</td></tr>}
          </tbody>
        </table>
      </div>}
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
  const [pagosClientes,setPagosClientes]=useState([]);
  const [pagosProveedores,setPagosProveedores]=useState([]);

  const cargarDatos=async()=>{
    setCargando(true); setErrInicio("");
    try{
      const [rArt,rCli,rProv,rUsr,rComp,rVta,rDetComp,rDetVta,rPagCli,rPagProv]=await Promise.all([
        sb.from("articulos").select("*").order("nombre",{ascending:true}).get(),
        sb.from("clientes").select("*").order("razon_social",{ascending:true}).get(),
        sb.from("proveedores").select("*").order("razon_social",{ascending:true}).get(),
        sb.from("usuarios").select("*").get(),
        sb.from("compras").select("*").order("id",{ascending:false}).get(),
        sb.from("ventas").select("*").order("id",{ascending:false}).get(),
        sb.from("compras_detalle").select("*").get(),
        sb.from("ventas_detalle").select("*").get(),
        sb.from("pagos_clientes").select("*").order("fecha",{ascending:false}).get(),
        sb.from("pagos_proveedores").select("*").order("fecha",{ascending:false}).get(),
      ]);
      setArticulos((rArt.data||[]).map(mapArt));
      setClientes((rCli.data||[]).map(mapCli));
      setProveedores((rProv.data||[]).map(mapProv));
      setUsuarios((rUsr.data||[]).map(mapUsr));
      const detComp=rDetComp.data||[];
      setCompras((rComp.data||[]).map(c=>({...mapComp(c),lineas:detComp.filter(d=>d.compra_id===c.id).map(mapLinComp)})));
      const detVta=rDetVta.data||[];
      setVentas((rVta.data||[]).map(v=>({...mapVta(v),lineas:detVta.filter(d=>d.venta_id===v.id).map(mapLinVta)})));
      setPagosClientes((rPagCli.data||[]).map(mapPagoCli));
      setPagosProveedores((rPagProv.data||[]).map(mapPagoProv));
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
    setPagosClientes([]); setPagosProveedores([]);
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
      case "comp": return <Compras proveedores={proveedores} articulos={articulos} setArticulos={setArticulos} compras={compras} setCompras={setCompras} usuario={usuario} pagosProveedores={pagosProveedores}/>;
      case "vta":  return <Ventas clientes={clientes} articulos={articulos} setArticulos={setArticulos} ventas={ventas} setVentas={setVentas} usuario={usuario}/>;
      case "rep":  return <Reportes ventas={ventas} articulos={articulos} compras={compras}/>;
      case "mov":  return <LibroMovimientos compras={compras} ventas={ventas} articulos={articulos}/>;
      case "cta":  return <CuentaCorriente clientes={clientes} proveedores={proveedores} ventas={ventas} compras={compras} pagosClientes={pagosClientes} setPagosClientes={setPagosClientes} pagosProveedores={pagosProveedores} setPagosProveedores={setPagosProveedores} usuario={usuario}/>;
      case "usr":  return usuario.rol==="admin"?<UsuariosPage usuarios={usuarios} setUsuarios={setUsuarios}/>:<div style={{padding:20,color:"#DC2626",fontWeight:700}}>⛔ Sin permisos</div>;
      default: return null;
    }
  };

  return(
    <>
      <style>{css}</style>
      <div style={{display:"flex",minHeight:"100vh"}}>
        <Sidebar usuario={usuario} page={page} setPage={setPage} onLogout={handleLogout} onRefresh={cargarDatos}/>
        <main style={{flex:1,padding:"20px 22px",overflowX:"auto",overflowY:"auto",minWidth:0,marginLeft:210}}>
          {render()}
        </main>
      </div>
    </>
  );
}
