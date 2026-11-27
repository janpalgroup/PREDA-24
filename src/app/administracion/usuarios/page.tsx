'use client'
import { useEffect, useState } from 'react'
export default function UsuariosPage() {
  const[usuarios,setUsuarios]=useState<any[]>([]);const[loading,setLoading]=useState(true);const[form,setForm]=useState<any>({nombre:'',email:'',password:'',rol:'analista',empresas:[]});const[show,setShow]=useState(false);const[saving,setSaving]=useState(false);const[me,setMe]=useState<any>(null);const[emps,setEmps]=useState<any[]>([]);const[pw,setPw]=useState<Record<string,string>>({})
  useEffect(()=>{fetch('/api/empresas').then(r=>r.json()).then(d=>setEmps((d.empresas||[]).filter((e:any)=>e.activa!==false)));load();fetch('/api/auth/session').then(r=>r.json()).then(d=>setMe(d.user))},[])
  async function load(){setLoading(true);const r=await fetch('/api/usuarios');const d=await r.json();setUsuarios(d.usuarios||[]);setLoading(false)}
  async function save(){if(!form.nombre||!form.email||form.password.length<8){alert('Nombre, email y contraseña (mínimo 8 caracteres) son requeridos');return};setSaving(true);const r0=await fetch('/api/usuarios',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});if(!r0.ok){const d0=await r0.json();alert(d0.error||'Error')};setSaving(false);setShow(false);setForm({nombre:'',email:'',password:'',rol:'analista',empresas:[]});load()}
  async function upd(u:any,patch:any,ok?:string){const r=await fetch('/api/usuarios',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:u.id,...patch})});const d=await r.json();if(!r.ok)alert(d.error||'Error');else if(ok)alert(ok);load()}
  async function toggle(u:any){await upd(u,{activo:!u.activo})}
  async function resetPw(u:any){const p=pw[u.id]||'';if(p.length<8){alert('La contraseña debe tener al menos 8 caracteres');return};if(!confirm('¿Cambiar la contraseña de '+u.nombre+'?'))return;await upd(u,{password:p},'Contraseña de '+u.nombre+' actualizada');setPw(x=>({...x,[u.id]:''}))}
  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'14px 26px 10px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div><div style={{fontSize:20,fontWeight:600}}>Gestion de Usuarios</div><div style={{fontSize:12,color:'var(--text-3)',marginTop:4}}>Administra el acceso al sistema PREDA</div></div>
        <button className="btn btn-primary" onClick={()=>setShow(!show)}>+ Nuevo Usuario</button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'18px 26px'}}>
        {show&&(
          <div className="card" style={{marginBottom:14}}>
            <div className="card-title">Nuevo Usuario</div>
            <div className="field"><label>Nombre completo *</label><input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Nombre completo"/></div>
            <div className="field"><label>Email *</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="correo@empresa.com"/></div>
            <div className="field"><label>Contraseña *</label><input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Mínimo 8 caracteres"/></div>
            <div className="field"><label>Rol</label><select value={form.rol} onChange={e=>setForm(f=>({...f,rol:e.target.value}))}><option value="analista">Analista (solo Selección)</option><option value="supervisor">Supervisor (Selección + Empleabilidad)</option><option value="gerencia">Gerencia (Selección + Empleabilidad)</option><option value="admin">Administrador (todo + configuración)</option></select></div>
            {form.rol!=='admin'&&<div className="field"><label>Empresas con acceso</label>{emps.map(e=><label key={e.id} style={{display:'flex',gap:6,alignItems:'center',fontSize:12,margin:'2px 0'}}><input type="checkbox" style={{width:'auto'}} checked={form.empresas.includes(e.id)} onChange={()=>setForm((f:any)=>({...f,empresas:f.empresas.includes(e.id)?f.empresas.filter((x:string)=>x!==e.id):f.empresas.concat(e.id)}))}/>{e.nombre}</label>)}</div>}
            <div className="btn-row"><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<><span className="spin"/> Creando...</>:'Crear usuario'}</button><button className="btn btn-sec" onClick={()=>setShow(false)}>Cancelar</button></div>
          </div>
        )}
        {loading?<div className="empty"><span className="spin"/></div>:usuarios.map(u=>(
          <div key={u.id} className="card" style={{marginBottom:8}}>
            <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:'var(--adim)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:'var(--accent2)',flexShrink:0}}>{(u.nombre||'?')[0]}</div>
              <div style={{flex:1,minWidth:160}}>
                <div style={{fontSize:14,fontWeight:600}}>{u.nombre}{me&&me.id===u.id&&<span style={{fontSize:10,color:'var(--text-3)'}}> (tú)</span>}</div>
                <div style={{fontSize:12,color:'var(--text-3)'}}>{u.email}</div>
              </div>
              <select value={u.rol} disabled={me&&me.id===u.id} onChange={e=>upd(u,{rol:e.target.value})} style={{width:'auto',fontSize:12}}>
                <option value="analista">Analista</option><option value="supervisor">Supervisor</option><option value="gerencia">Gerencia</option><option value="admin">Administrador</option>
              </select>
              <span style={{padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:600,background:u.activo?'rgba(26,173,110,.15)':'rgba(232,64,64,.15)',color:u.activo?'var(--ok)':'var(--err)'}}>{u.activo?'Activo':'Inactivo'}</span>
              <button className="btn btn-sec" style={{fontSize:11,padding:'4px 9px'}} disabled={me&&me.id===u.id} onClick={()=>toggle(u)}>{u.activo?'Desactivar':'Activar'}</button>
            </div>
            <div style={{display:'flex',gap:8,marginTop:10,alignItems:'center',flexWrap:'wrap'}}>
              <input type="password" value={pw[u.id]||''} onChange={e=>setPw(x=>({...x,[u.id]:e.target.value}))} placeholder={'Nueva contraseña para '+u.nombre.split(' ')[0]+' (mín. 8)'} style={{flex:1,minWidth:180}} autoComplete="new-password"/>
              <button className="btn btn-sec" style={{fontSize:11,padding:'5px 10px'}} onClick={()=>resetPw(u)}>🔑 Cambiar contraseña</button>
            </div>
            {u.rol!=='admin'&&(
              <div style={{marginTop:8,fontSize:11}}>
                <span style={{color:'var(--text-3)'}}>Empresas con acceso: </span>
                {emps.map(e=>{const on=Array.isArray(u.empresas)&&u.empresas.includes(e.id);return(
                  <label key={e.id} style={{display:'inline-flex',alignItems:'center',gap:4,marginRight:12,cursor:'pointer'}}>
                    <input type="checkbox" checked={on} style={{width:'auto'}} onChange={()=>{const cur:string[]=Array.isArray(u.empresas)?u.empresas:[];upd(u,{empresas:on?cur.filter(x=>x!==e.id):cur.concat(e.id)})}}/>{e.nombre}
                  </label>)})}
                {(!Array.isArray(u.empresas)||u.empresas.length===0)&&<span style={{color:'var(--warn)'}}> ⚠ sin empresa asignada: no podrá ingresar</span>}
              </div>)}
            {u.rol==='admin'&&<div style={{fontSize:10,color:'var(--text-3)',marginTop:6}}>Administrador: accede a todas las empresas</div>}
            {u.rol!=='admin'&&<div style={{fontSize:10,color:'var(--text-3)',marginTop:6}}>{Array.isArray(u.permisos)?'Accesos personalizados ('+u.permisos.length+' páginas)':'Accesos por defecto del rol'} · se editan en Configuración → Accesos por usuario</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
