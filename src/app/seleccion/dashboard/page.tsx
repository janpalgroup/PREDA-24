'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
export default function DashboardPage() {
  const router = useRouter()
  const [procesos,   setProcesos]   = useState<any[]>([])
  const [candidatos, setCandidatos] = useState<any[]>([])
  useEffect(()=>{
    Promise.all([fetch('/api/procesos').then(r=>r.json()),fetch('/api/candidatos').then(r=>r.json())])
      .then(([p,c])=>{setProcesos(p.procesos||[]);setCandidatos(c.candidatos||[])})
  },[])
  const activos   = procesos.filter(p=>p.estado==='activo')
  const aprobados = candidatos.filter(c=>(c.score||0)>=60)
  const promScore = candidatos.filter(c=>c.score).length ? Math.round(candidatos.filter(c=>c.score).reduce((a,c)=>a+(c.score||0),0)/candidatos.filter(c=>c.score).length) : 0
  const ETAPAS=['cv','entrevista','shortlist','oferta','contratado','descartado']
  const COLS:Record<string,string>={cv:'var(--accent2)',entrevista:'var(--warn)',shortlist:'#a855f7',oferta:'var(--ok)',contratado:'#10b981',descartado:'var(--err)'}
  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'16px 26px 12px',borderBottom:'1px solid var(--border)'}}>
        <div style={{fontSize:20,fontWeight:600}}>Dashboard — Selección de Personal</div>
        <div style={{fontSize:12,color:'var(--text-3)',marginTop:4}}>Vista general de todos tus procesos activos</div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'18px 26px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
          {[{l:'Procesos Activos',v:activos.length,c:'var(--accent2)'},{l:'Total Candidatos',v:candidatos.length,c:'var(--text-1)'},{l:'Aprobados ≥60',v:aprobados.length,c:'var(--ok)'},{l:'Puntaje Promedio',v:promScore||0,c:promScore>=60?'var(--ok)':'var(--warn)'}].map(k=>(
            <div key={k.l} className="card" style={{textAlign:'center',margin:0}}>
              <div style={{fontSize:28,fontWeight:800,color:k.c}}>{k.v}</div>
              <div style={{fontSize:11,color:'var(--text-3)',marginTop:3}}>{k.l}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:8,marginBottom:16}}>
          {ETAPAS.map(e=>{const n=candidatos.filter(c=>c.etapa===e).length;return(
            <div key={e} style={{textAlign:'center',padding:'10px 5px',background:'var(--bg-panel)',borderRadius:8,border:'1px solid var(--border)'}}>
              <div style={{fontSize:20,fontWeight:700,color:COLS[e]||'var(--text-2)'}}>{n}</div>
              <div style={{fontSize:10,color:'var(--text-3)',marginTop:2,textTransform:'capitalize'}}>{e}</div>
            </div>
          )})}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div className="card">
            <div className="card-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>Procesos Activos</span>
              <button className="btn btn-sec" style={{fontSize:11,padding:'3px 9px'}} onClick={()=>router.push('/seleccion/procesos')}>Ver todos</button>
            </div>
            {activos.length===0?<div className="empty">Sin procesos activos</div>:activos.slice(0,4).map(p=>(
              <div key={p.id} onClick={()=>router.push('/seleccion/candidatos?proceso='+p.id)} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:7,background:'var(--bg-panel)',marginBottom:5,cursor:'pointer',border:'1px solid var(--border)'}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:'var(--ok)',flexShrink:0}}/>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{p.nombre}</div><div style={{fontSize:11,color:'var(--text-3)'}}>{p.empresa||''}{p.cargo?' · '+p.cargo:''}</div></div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-title">Accesos Rápidos</div>
            {[['📄','Analizar CV','/seleccion/cv'],['📦','Carga Masiva','/seleccion/masiva'],['🎙️','Entrevista IA','/seleccion/entrevista'],['🔍','Verificaciones','/seleccion/verificaciones']].map(([i,l,p])=>(
              <button key={p} onClick={()=>router.push(p)} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 11px',borderRadius:7,border:'1px solid var(--border)',background:'var(--bg-panel)',cursor:'pointer',fontFamily:'var(--font)',width:'100%',textAlign:'left',marginBottom:5,color:'var(--text-1)'}}>
                <span style={{fontSize:16}}>{i}</span><span style={{fontSize:13,fontWeight:600,color:'var(--accent2)'}}>{l}</span><span style={{marginLeft:'auto',color:'var(--text-3)'}}>→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
