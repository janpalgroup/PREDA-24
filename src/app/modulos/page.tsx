'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { tieneModulo, primeraRuta } from '@/lib/permisos'
import CuentaMenu from '@/components/CuentaMenu'
export default function ModulosPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  useEffect(()=>{
    fetch('/api/auth/session').then(r=>r.json()).then(d=>{
      if(!d.user||!d.user.empresa_id){router.push('/');return}
      setUser(d.user)
    })
  },[])
  async function logout(){await fetch('/api/auth/logout',{method:'POST'});router.push('/')}
  if(!user)return<div className="empty"><span className="spin"/></div>
  const perms:string[]=user.permisos||[]
  const tiene=(m:string)=>tieneModulo(perms,m)
  const rutaDe=(m:string)=>primeraRuta(perms,m)||'/modulos'
  return(
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32}}>
      <div style={{textAlign:'center',marginBottom:32}}>
        <div style={{fontSize:34,fontWeight:800,letterSpacing:4,marginBottom:6}}>PRE<span style={{color:'var(--accent)'}}>DA</span></div>
        <div style={{fontSize:11,color:'var(--text-3)',letterSpacing:2,marginBottom:10}}>SUITE INTEGRAL DE GESTIÓN DEL TALENTO</div>
        <div style={{fontSize:13,color:'var(--text-3)'}}>Buenos días, <b style={{color:'var(--text-1)'}}>{user.nombre}</b> <span style={{fontSize:10,padding:'1px 7px',borderRadius:10,background:'var(--adim)',color:'var(--accent2)',textTransform:'uppercase'}}>{user.rol}</span></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:(tiene('seleccion')&&tiene('empleabilidad'))?'1fr 1fr':'1fr',gap:16,maxWidth:(tiene("seleccion")&&tiene("empleabilidad"))?980:420,width:'100%',marginBottom:14}}>
        {[
          {emoji:'👔',title:'Selección de Personal',desc:'Gestiona procesos de reclutamiento, analiza CVs con IA, realiza entrevistas y genera reportes ejecutivos.',tags:['Procesos','CV+ATS','Candidatos','Entrevista IA','Shortlist','Verificaciones'],color:'var(--accent)',path:'seleccion'},
          {emoji:'💼',title:'Empleabilidad',desc:'Acompaña al candidato: CV Harvard, búsqueda automática de ofertas reales con compatibilidad IA y seguimiento CRM.',tags:['Expediente CRM','CV Harvard','Buscar Ofertas','Postulaciones','Seguimiento','Pre-Entrevista'],color:'var(--ok)',path:'empleabilidad'},
        ].filter(m=>tiene(m.path)).map(m=>(
          <div key={m.title} onClick={()=>router.push(rutaDe(m.path))} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:13,padding:24,cursor:'pointer',transition:'.18s'}}
            onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor=m.color;(e.currentTarget as HTMLElement).style.transform='translateY(-3px)'}}
            onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)';(e.currentTarget as HTMLElement).style.transform='none'}}>
            <div style={{fontSize:34,marginBottom:11}}>{m.emoji}</div>
            <div style={{fontSize:17,fontWeight:700,marginBottom:6}}>{m.title}</div>
            <div style={{fontSize:12,color:'var(--text-3)',lineHeight:1.7,marginBottom:12}}>{m.desc}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:11}}>
              {m.tags.map(t=><span key={t} style={{padding:'2px 8px',borderRadius:20,fontSize:10,background:'rgba(30,123,232,.12)',color:'var(--accent2)',fontWeight:600}}>{t}</span>)}
            </div>
            <div style={{color:m.color,fontSize:12,fontWeight:600}}>Ingresar →</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:10,maxWidth:720,width:'100%'}}>
        {user.rol==='admin'&&(
        <div onClick={()=>router.push('/administracion/config')} style={{flex:1,background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:'14px 20px',cursor:'pointer',display:'flex',alignItems:'center',gap:13,transition:'.15s'}}
          onMouseOver={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--warn)'}
          onMouseOut={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}>
          <span style={{fontSize:20}}>⚙️</span>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>Administración del Sistema</div><div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>Usuarios · API Keys · Plantilla CV · Configuración</div></div>
          <span style={{color:'var(--warn)',fontSize:12,fontWeight:600}}>→</span>
        </div>
        )}
        <CuentaMenu/>
        <button className="btn btn-sec" onClick={logout} style={{fontSize:12}}>Cerrar sesión</button>
      </div>
    </div>
  )
}
