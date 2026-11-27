'use client'
import { useEffect, useState } from 'react'
import { useAI } from '@/hooks/useAI'
export default function ReportesEmpPage() {
  const{callAI,loading}=useAI()
  const[postulaciones,setPostulaciones]=useState<any[]>([]);const[reporte,setReporte]=useState('')
  useEffect(()=>{fetch('/api/postulaciones').then(r=>r.json()).then(d=>setPostulaciones(d.postulaciones||[]))},[])
  const ESTADOS=['postulado','visto','entrevista','oferta','rechazado','aceptado']
  const COLS:Record<string,string>={postulado:'var(--accent2)',visto:'var(--text-2)',entrevista:'#a855f7',oferta:'var(--ok)',rechazado:'var(--err)',aceptado:'#10b981'}
  const n=(e:string)=>postulaciones.filter(p=>p.estado===e).length
  const entrevistas=n('entrevista');const ofertas=n('oferta');const total=postulaciones.length
  const conversion=total?Math.round(entrevistas/total*100):0
  async function genReporte(){
    const stats=ESTADOS.map(e=>e+': '+n(e)).join(' | ')
    const r=await callAI('Genera un REPORTE DE BUSQUEDA LABORAL.\n\nESTADISTICAS:\nTotal postulaciones: '+total+'\nEntrevistas: '+entrevistas+'\nOfertas recibidas: '+ofertas+'\nTasa de conversion: '+conversion+'%\nPor estado: '+stats+'\n\n1. RESUMEN EJECUTIVO\n2. ANALISIS DE RESULTADOS (plataformas, tasas)\n3. PLAN DE ACCION PROXIMAS 4 SEMANAS (acciones concretas)\n4. RECOMENDACIONES PARA MEJORAR LA BUSQUEDA','Eres PREDA, experto en empleabilidad. Responde en espanol.')
    if(r)setReporte(r)
  }
  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'14px 26px 10px',borderBottom:'1px solid var(--border)'}}><div style={{fontSize:20,fontWeight:600}}>Mi Reporte</div><div style={{fontSize:12,color:'var(--text-3)',marginTop:4}}>Estadisticas de tu busqueda laboral + plan de accion IA</div></div>
      <div style={{flex:1,overflowY:'auto',padding:'18px 26px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
          {[{l:'Postulaciones',v:total,c:'var(--accent2)'},{l:'Entrevistas',v:entrevistas,c:'#a855f7'},{l:'Ofertas',v:ofertas,c:'var(--ok)'},{l:'Conversion',v:conversion+'%',c:conversion>=20?'var(--ok)':'var(--warn)'}].map(k=>(
            <div key={k.l} className="card" style={{textAlign:'center',margin:0}}><div style={{fontSize:26,fontWeight:800,color:k.c}}>{k.v}</div><div style={{fontSize:11,color:'var(--text-3)',marginTop:3}}>{k.l}</div></div>
          ))}
        </div>
        <button className="btn btn-ok" onClick={genReporte} disabled={loading} style={{marginBottom:16,fontSize:14,padding:'10px 24px'}}>
          {loading?<><span className="spin"/> Generando reporte...</>:'Generar Reporte Completo con IA'}
        </button>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div className="card">
            <div className="card-title">Estado de postulaciones</div>
            {ESTADOS.map(e=>{const cn=n(e);const pct=total?Math.round(cn/total*100):0;return(
              <div key={e} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3,textTransform:'capitalize'}}><span style={{color:COLS[e],fontWeight:600}}>{e}</span><span style={{color:'var(--text-3)'}}>{cn} ({pct}%)</span></div>
                <div className="sbar"><div className="sfill" style={{width:pct+'%',background:COLS[e]||'var(--accent)'}}/></div>
              </div>
            )})}
          </div>
          <div className="card">
            <div className="card-title">Reporte IA</div>
            {!reporte?<div className="empty" style={{padding:30}}>Genera el reporte para ver el plan de accion</div>:(
              <><div style={{fontSize:13,lineHeight:1.8,whiteSpace:'pre-wrap',maxHeight:420,overflowY:'auto'}}>{reporte}</div>
              <div className="btn-row" style={{marginTop:10}}><button className="btn btn-sec" onClick={()=>navigator.clipboard.writeText(reporte)}>Copiar</button><button className="btn btn-sec" onClick={()=>{const b=new Blob([reporte],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='Mi_Reporte_Laboral.txt';a.click()}}>Descargar</button></div></>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
