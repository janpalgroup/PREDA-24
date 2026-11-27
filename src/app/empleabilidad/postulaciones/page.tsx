'use client'
import { useEffect, useState } from 'react'
export default function PostulacionesPage() {
  const[postulaciones,setPostulaciones]=useState<any[]>([]);const[loading,setLoading]=useState(true);const[filtro,setFiltro]=useState('');const[form,setForm]=useState({plataforma:'LinkedIn',empresa:'',cargo:'',link:'',fecha_postulacion:'',estado:'postulado',compatibilidad:'',salario_ofrecido:'',notas:''});const[show,setShow]=useState(false);const[saving,setSaving]=useState(false)
  useEffect(()=>{load()},[])
  async function load(){setLoading(true);const r=await fetch('/api/postulaciones');const d=await r.json();setPostulaciones(d.postulaciones||[]);setLoading(false)}
  async function save(){if(!form.empresa||!form.cargo){alert('Empresa y cargo son requeridos');return};setSaving(true);await fetch('/api/postulaciones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,compatibilidad:form.compatibilidad?parseInt(form.compatibilidad):null})});setSaving(false);setShow(false);setForm({plataforma:'LinkedIn',empresa:'',cargo:'',link:'',fecha_postulacion:'',estado:'postulado',compatibilidad:'',salario_ofrecido:'',notas:''});load()}
  async function updateEstado(id:string,estado:string){await fetch('/api/postulaciones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,estado})});setPostulaciones(prev=>prev.map(p=>p.id===id?{...p,estado}:p))}
  async function del(id:string){if(!confirm('Eliminar postulacion?'))return;await fetch('/api/postulaciones',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});load()}
  const filtered=postulaciones.filter(p=>!filtro||(p.empresa?.toLowerCase().includes(filtro.toLowerCase())||p.cargo?.toLowerCase().includes(filtro.toLowerCase())))
  const PLATS=['LinkedIn','Bumeran','Computrabajo','Indeed','Aptitus','Glassdoor','Laborum','Trabajando.pe','Torre','Otra']
  const ESTADOS=['postulado','visto','entrevista','oferta','rechazado','aceptado']
  const COLS:Record<string,string>={postulado:'var(--accent2)',visto:'var(--text-2)',entrevista:'#a855f7',oferta:'var(--ok)',rechazado:'var(--err)',aceptado:'#10b981'}
  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'14px 26px 10px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div><div style={{fontSize:20,fontWeight:600}}>Mis Postulaciones</div><div style={{fontSize:12,color:'var(--text-3)',marginTop:4}}>Registro de postulaciones — CRM de busqueda laboral</div></div>
        <button className="btn btn-ok" onClick={()=>setShow(!show)}>+ Nueva Postulacion</button>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 26px',background:'rgba(26,173,110,.04)',borderBottom:'1px solid var(--border)',flexShrink:0,flexWrap:'wrap'}}>
        <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Buscar empresa o cargo..." style={{maxWidth:260,fontSize:13}}/>
        <div style={{display:'flex',gap:5}}>{ESTADOS.map(e=>{const n=postulaciones.filter(p=>p.estado===e).length;return n>0?<span key={e} style={{padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:600,background:(COLS[e]||'var(--border)')+'22',color:COLS[e]||'var(--text-2)'}}>{e}: {n}</span>:null})}  </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'14px 26px'}}>
        {show&&(
          <div className="card" style={{marginBottom:14}}>
            <div className="card-title">+ Registrar Postulacion</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
              <div className="field"><label>Plataforma</label><select value={form.plataforma} onChange={e=>setForm(f=>({...f,plataforma:e.target.value}))}>{PLATS.map(p=><option key={p}>{p}</option>)}</select></div>
              <div className="field"><label>Empresa *</label><input value={form.empresa} onChange={e=>setForm(f=>({...f,empresa:e.target.value}))} placeholder="Nombre de la empresa"/></div>
              <div className="field"><label>Cargo *</label><input value={form.cargo} onChange={e=>setForm(f=>({...f,cargo:e.target.value}))} placeholder="Titulo del puesto"/></div>
              <div className="field"><label>Link de la oferta</label><input value={form.link} onChange={e=>setForm(f=>({...f,link:e.target.value}))} placeholder="https://..."/></div>
              <div className="field"><label>Compatibilidad %</label><input type="number" value={form.compatibilidad} onChange={e=>setForm(f=>({...f,compatibilidad:e.target.value}))} placeholder="Ej: 92"/></div>
              <div className="field"><label>Fecha</label><input type="date" value={form.fecha_postulacion} onChange={e=>setForm(f=>({...f,fecha_postulacion:e.target.value}))}/></div>
            </div>
            <div className="field"><label>Notas</label><textarea value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} style={{minHeight:50}} placeholder="Observaciones..."/></div>
            <div className="btn-row"><button className="btn btn-ok" onClick={save} disabled={saving}>{saving?<><span className="spin"/> Guardando...</>:'Guardar'}</button><button className="btn btn-sec" onClick={()=>setShow(false)}>Cancelar</button></div>
          </div>
        )}
        {loading?<div className="empty"><span className="spin"/></div>:filtered.length===0?<div className="empty">Sin postulaciones registradas</div>:filtered.map(p=>(
          <div key={p.id} className="card" style={{marginBottom:8}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:4}}>
                  <span style={{padding:'2px 8px',borderRadius:20,fontSize:11,background:'var(--adim)',color:'var(--accent2)',fontWeight:600}}>{p.plataforma}</span>
                  <span style={{padding:'2px 7px',borderRadius:20,fontSize:11,fontWeight:600,background:(COLS[p.estado]||'var(--border)')+'22',color:COLS[p.estado]||'var(--text-2)',textTransform:'capitalize'}}>{p.estado}</span>
                </div>
                <div style={{fontSize:14,fontWeight:700}}>{p.cargo}</div>
                <div style={{fontSize:12,color:'var(--text-2)',marginTop:1}}>{p.empresa}</div>
                {p.notas&&<div style={{fontSize:11,color:'var(--text-3)',marginTop:3}}>{p.notas}</div>}
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                {p.compatibilidad&&<div style={{fontSize:15,fontWeight:800,color:p.compatibilidad>=90?'var(--ok)':p.compatibilidad>=70?'var(--warn)':'var(--err)'}}>{p.compatibilidad}%</div>}
                <select value={p.estado} onChange={e=>updateEstado(p.id,e.target.value)} style={{fontSize:11,padding:'3px 6px',marginTop:5,background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:5,color:'var(--text-1)',fontFamily:'var(--font)',cursor:'pointer',width:'auto',textTransform:'capitalize'}}>{ESTADOS.map(e=><option key={e} value={e}>{e}</option>)}</select>
              </div>
            </div>
            <div className="btn-row" style={{marginTop:7}}>
              {p.link&&<a href={p.link} target="_blank" rel="noopener noreferrer" className="btn btn-ok" style={{fontSize:12,textDecoration:'none',padding:'5px 11px'}}>Abrir oferta →</a>}
              <button className="btn btn-danger" style={{fontSize:11,padding:'4px 8px'}} onClick={()=>del(p.id)}>X</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
