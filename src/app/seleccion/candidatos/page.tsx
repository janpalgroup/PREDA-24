'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAI } from '@/hooks/useAI'
import { useProcesoActivo } from '@/hooks/useProcesoActivo'

function CandidatosInner() {
  const router = useRouter()
  const { procesos, procesoId, setProcesoId, cargado, puedeRecomendar, proceso } = useProcesoActivo()
  const [candidatos, setCandidatos] = useState<any[]>([])
  const [filtro,     setFiltro]     = useState('')
  const [expanded,   setExpanded]   = useState<string|null>(null)
  const { callAI, loading } = useAI()
  const [entrevistas, setEntrevistas] = useState<any[]>([])
  const [terna,       setTerna]       = useState<any>(null)
  const [rec, setRec] = useState<any>(null)   // { cand, sugerencias, tiene_cv }
  const [recBusy, setRecBusy] = useState('')
  async function abrirRec(c:any){
    setRecBusy('load'); setRec({cand:c,sugerencias:[],tiene_cv:true,cargando:true})
    const r=await fetch('/api/recomendar-cv',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'sugerir',candidato_id:c.id})}); const d=await r.json()
    if(!r.ok){alert(d.error||'Error');setRec(null)} else setRec({cand:c,...d})
    setRecBusy('')
  }
  async function derivar(sug:any){
    const c=rec.cand
    if(!confirm('¿Recomendar a '+c.nombre+' para "'+sug.nombre+'"? Se creará una copia en ese proceso y se evaluará su CV con los filtros de esa plaza.')) return
    setRecBusy(sug.id)
    try{
      let analisis:any={}
      const pr=await (await fetch('/api/procesos?id='+sug.id)).json()
      if(c.cv_text){
        const ar=await fetch('/api/analizar-cv',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cvText:c.cv_text,nombre:c.nombre,cargo:sug.cargo||c.cargo||'',proceso:sug.nombre,keywords:pr.proceso?.requisitos||''})})
        const ad=await ar.json(); if(ad.ok) analisis={resultado:ad.resultado,score:ad.score,ats_score:ad.atsScore,dimensiones:ad.dimensiones,resumen:ad.resumen}
      }
      const r=await fetch('/api/recomendar-cv',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'derivar',candidato_id:c.id,proceso_id:sug.id,analisis})}); const d=await r.json()
      if(!r.ok) alert(d.error||'Error'); else { alert('Listo: '+c.nombre+' fue agregado al proceso "'+sug.nombre+'"'+(analisis.score!=null?' con puntaje '+analisis.score+'/100':'')); setRec((x:any)=>({...x,sugerencias:x.sugerencias.map((y:any)=>y.id===sug.id?{...y,ya_derivado:true}:y)})) }
    }catch(e:any){alert('Error: '+e.message)}
    setRecBusy('')
  }

  useEffect(()=>{
    if(!procesoId){setCandidatos([]);setEntrevistas([]);return}
    fetch('/api/candidatos?proceso_id='+procesoId).then(r=>r.json()).then(d=>setCandidatos(d.candidatos||[]))
    fetch('/api/entrevistas?proceso_id='+procesoId).then(r=>r.json()).then(d=>setEntrevistas(d.entrevistas||[]))
    setTerna(null)
    if (procesoId) fetch('/api/informes?tipo=terna&proceso_id='+procesoId).then(r=>r.json()).then(d=>setTerna((d.informes||[])[0]||null))
  },[procesoId])

  const entPts = (id:string) => { const e = entrevistas.find(x=>x.candidato_id===id&&x.puntaje!=null); return e?e.puntaje as number:null }
  // Ranking: CV (y entrevista si existe: 60% CV + 40% entrevista)
  const rank = (c:any) => { const cv=c.score||0; const en=entPts(c.id); return en!==null?Math.round(cv*0.6+en*0.4):cv }
  const ranking = [...candidatos].filter(c=>c.etapa!=='descartado'&&(c.score||0)>0).sort((a,b)=>rank(b)-rank(a))
  const top3 = ranking.slice(0,3)
  const alternos = ranking.slice(3).filter(c=>rank(c)>=60)

  async function recomendarTerna() {
    if (!top3.length) { alert('No hay candidatos evaluados'); return }
    const proc = procesos.find(p=>p.id===procesoId)
    const lista = top3.concat(alternos.slice(0,3)).map((c,i)=>(i+1)+'. '+c.nombre+' | Ranking '+rank(c)+' | CV '+(c.score||'?')+'/100 | ATS '+(c.ats_score||'?')+'/100'+(entPts(c.id)!==null?' | Entrevista '+entPts(c.id)+'/100':'')+'\nResumen: '+(c.resumen||String(c.resultado||'').substring(0,350))).join('\n\n')
    const r = await callAI(
      'Recomienda la TERNA FINAL para el cargo "'+(proc?.cargo||'')+'" del proceso "'+(proc?.nombre||'todos')+'".\n\nCANDIDATOS ORDENADOS POR RANKING:\n'+lista+'\n\nEntrega, sin tablas ni negritas:\n1. CANDIDATO RECOMENDADO (el de mayor ajuste) y por que\n2. TERNA (3 candidatos) con fortaleza principal y riesgo de cada uno\n3. OTROS CANDIDATOS QUE PODRIAN ASUMIR EL ROL\n4. SIGUIENTES PASOS',
      'Eres PREDA, experto en seleccion de personal. Responde en espanol.')
    if (!r) return
    const txt = r.replace(/\*\*/g,'').replace(/^#{1,4}\s*/gm,'')
    const res = await fetch('/api/informes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipo:'terna',proceso_id:procesoId||null,titulo:'Terna recomendada — '+(proc?.nombre||'todos'),contenido:txt,datos:{ids:top3.map(c=>c.id)}})})
    const d = await res.json(); setTerna(d.informe||{contenido:txt,created_at:new Date().toISOString()})
  }

  async function updateEtapa(id:string, etapa:string) {
    await fetch('/api/candidatos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,etapa})})
    setCandidatos(prev=>prev.map(c=>c.id===id?{...c,etapa}:c))
  }
  async function del(id:string) {
    if (!confirm('Eliminar candidato?')) return
    await fetch('/api/candidatos',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    setCandidatos(prev=>prev.filter(c=>c.id!==id))
  }

  const sColor = (s:number) => s>=60?'var(--ok)':s>=40?'var(--warn)':'var(--err)'
  const ETAPAS = ['cv','entrevista','shortlist','oferta','contratado','descartado']
  const COLS:Record<string,string> = {cv:'var(--accent2)',entrevista:'var(--warn)',shortlist:'#a855f7',oferta:'var(--ok)',contratado:'#10b981',descartado:'var(--err)'}
  const filtered = candidatos.filter(c=>!filtro||(c.nombre?.toLowerCase().includes(filtro.toLowerCase())||c.cargo?.toLowerCase().includes(filtro.toLowerCase())))

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'14px 26px 10px',borderBottom:'1px solid var(--border)'}}>
        <div style={{fontSize:20,fontWeight:600}}>Candidatos</div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 20px',background:'rgba(30,123,232,.06)',borderBottom:'1px solid var(--border)',flexShrink:0,flexWrap:'wrap'}}>
        <select value={procesoId} onChange={e=>setProcesoId(e.target.value)} style={{maxWidth:360,fontSize:13}}>
          <option value="">Selecciona el proceso...</option>
          {procesos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Buscar nombre o cargo..." style={{maxWidth:220,fontSize:13}}/>
        <span style={{fontSize:12,color:'var(--text-3)'}}>{filtered.length} candidatos</span>
        <button className="btn btn-primary" style={{marginLeft:'auto',fontSize:12}} onClick={()=>router.push('/seleccion/cv')}>+ Analizar CV</button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'14px 26px'}}>
        {top3.length>0 && (
          <div className="card" style={{border:'1px solid var(--border-hi)'}}>
            <div className="card-title" style={{display:'flex',alignItems:'center'}}>
              <span>Recomendación — terna y candidato adecuado</span>
              <button className="btn btn-primary" style={{marginLeft:'auto',fontSize:12}} onClick={recomendarTerna} disabled={loading}>{loading?<><span className="spin"/> Analizando...</>:'Recomendación IA de terna'}</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
              {top3.map((c,i)=>(
                <div key={c.id} style={{padding:'10px 12px',borderRadius:8,background:'var(--bg-panel)',border:'1px solid '+(i===0?'var(--ok)':'var(--border)')}}>
                  <div style={{fontSize:10,fontWeight:700,color:i===0?'var(--ok)':'var(--text-3)',marginBottom:3}}>{i===0?'★ RECOMENDADO':'TERNA #'+(i+1)}</div>
                  <div style={{fontSize:14,fontWeight:700}}>{c.nombre}</div>
                  <div style={{fontSize:11,color:'var(--text-3)',marginBottom:4}}>CV {c.score}/100 · ATS {c.ats_score||'?'}{entPts(c.id)!==null?' · Entrevista '+entPts(c.id):''}</div>
                  <div style={{fontSize:20,fontWeight:800,color:sColor(rank(c))}}>{rank(c)}<span style={{fontSize:10,color:'var(--text-3)',fontWeight:400}}> ranking</span></div>
                </div>
              ))}
            </div>
            {alternos.length>0 && <div style={{fontSize:12,color:'var(--text-2)',marginTop:10}}>También podrían asumir el rol (ranking ≥ 60): {alternos.map(c=>c.nombre+' ('+rank(c)+')').join(' · ')}</div>}
            {terna?.contenido && <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid var(--border)'}}>
              <div style={{fontSize:11,color:'var(--text-3)',marginBottom:5}}>Última recomendación guardada · {terna.created_at?new Date(terna.created_at).toLocaleString('es-PE'):''}</div>
              <div style={{fontSize:12,lineHeight:1.8,whiteSpace:'pre-wrap'}}>{terna.contenido}</div>
            </div>}
          </div>
        )}
        {filtered.length===0 ? <div className="empty">Sin candidatos</div> : filtered.map(c=>(
          <div key={c.id} className="card" style={{marginBottom:8}}>
            <div style={{display:'flex',alignItems:'center',gap:11}}>
              <div style={{width:38,height:38,borderRadius:'50%',background:'var(--adim)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:700,color:'var(--accent2)'}}>{(c.nombre||'?')[0]}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700}}>{c.nombre}</div>
                <div style={{fontSize:12,color:'var(--text-3)'}}>{c.cargo||'Sin cargo'} · {c.fecha||'Sin fecha'}{entPts(c.id)!==null?' · Entrevista '+entPts(c.id)+'/100':''}</div>
                {c.resumen && <div style={{fontSize:12,color:'var(--text-2)',marginTop:3,lineHeight:1.5,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{c.resumen}</div>}
              </div>
              <div style={{textAlign:'center',flexShrink:0,minWidth:45}}>
                <div style={{fontSize:20,fontWeight:800,color:sColor(c.score||0)}}>{c.score||'?'}</div>
                <div style={{fontSize:9,color:'var(--text-3)'}}>SCORE</div>
              </div>
              <select value={c.etapa||'cv'} onChange={e=>updateEtapa(c.id,e.target.value)}
                style={{fontSize:11,padding:'3px 6px',borderRadius:6,
                  background:(COLS[c.etapa||'cv']||'var(--border)')+'22',
                  color:COLS[c.etapa||'cv']||'var(--text-2)',
                  border:'1px solid '+(COLS[c.etapa||'cv']||'var(--border)'),
                  fontFamily:'var(--font)',width:'auto',cursor:'pointer'}}>
                {ETAPAS.map(e=><option key={e} value={e}>{e}</option>)}
              </select>
              <div style={{display:'flex',gap:5}}>
                <button className="btn btn-sec" style={{fontSize:11,padding:'4px 9px'}} onClick={()=>setExpanded(expanded===c.id?null:c.id)}>{expanded===c.id?'Ocultar':'Ver analisis'}</button>
                <button className="btn btn-sec" style={{fontSize:11,padding:'4px 9px'}} onClick={()=>router.push('/seleccion/entrevista')}>Entrevistar</button>
                {puedeRecomendar&&<button className="btn btn-sec" style={{fontSize:11,padding:'4px 9px'}} onClick={()=>abrirRec(c)} title="Recomendar este CV para otro proceso activo">↗ Otro proceso</button>}
                <button className="btn btn-danger" style={{fontSize:11,padding:'4px 8px'}} onClick={()=>del(c.id)}>✕</button>
              </div>
            </div>
            {expanded===c.id && c.resultado && (
              <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid var(--border)'}}>
                <div style={{display:'flex',gap:8,marginBottom:9}}>
                  <div className="card" style={{margin:0,padding:'8px 12px',textAlign:'center',minWidth:70}}><div style={{fontSize:18,fontWeight:800,color:sColor(c.score||0)}}>{c.score}</div><div style={{fontSize:9,color:'var(--text-3)'}}>GLOBAL</div></div>
                  <div className="card" style={{margin:0,padding:'8px 12px',textAlign:'center',minWidth:70}}><div style={{fontSize:18,fontWeight:800,color:sColor(c.ats_score||0)}}>{c.ats_score||'?'}</div><div style={{fontSize:9,color:'var(--text-3)'}}>ATS</div></div>
                </div>
                {c.dimensiones && <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'4px 14px',marginBottom:9}}>
                  {[['exp','Experiencia'],['form','Formación'],['cap','Capacitación'],['ats','ATS'],['blandas','Blandas'],['pres','Presentación']].map(([k,l])=>(
                    <div key={k}><div style={{display:'flex',justifyContent:'space-between',fontSize:11}}><span>{l}</span><b>{c.dimensiones[k]??'-'}</b></div><div className="sbar"><div className="sfill" style={{width:(c.dimensiones[k]||0)+'%',background:sColor(c.dimensiones[k]||0)}}/></div></div>
                  ))}
                </div>}
                <div style={{fontSize:12,lineHeight:1.8,whiteSpace:'pre-wrap',maxHeight:300,overflowY:'auto',background:'var(--bg-panel)',padding:10,borderRadius:8}}>{c.resultado}</div>
                <div className="btn-row" style={{marginTop:8}}>
                  <button className="btn btn-sec" style={{fontSize:11}} onClick={()=>navigator.clipboard.writeText(c.resultado)}>Copiar analisis</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {rec&&(
        <div onClick={()=>setRec(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:560,maxHeight:'85vh',overflowY:'auto',margin:0}}>
            <div className="card-title">Recomendar a {rec.cand.nombre} para otro proceso activo</div>
            {rec.cargando?<span className="spin"/>:!rec.tiene_cv?<div style={{fontSize:12,color:'var(--warn)'}}>Este candidato no tiene el texto del CV guardado, no se puede comparar con los filtros.</div>:rec.sugerencias.length===0?<div style={{fontSize:12,color:'var(--text-3)'}}>No hay otros procesos activos en la empresa.</div>:rec.sugerencias.map((x:any)=>{
              const calza=x.score>=(rec.umbral||50)
              return(
              <div key={x.id} style={{border:'1px solid '+(calza?'var(--ok)':'var(--border)'),borderRadius:8,padding:10,marginBottom:8}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{x.nombre}</div><div style={{fontSize:11,color:'var(--text-3)'}}>{x.cargo||''}</div></div>
                  <div style={{textAlign:'center'}}><div style={{fontSize:18,fontWeight:800,color:calza?'var(--ok)':'var(--text-3)'}}>{x.total?x.score+'%':'—'}</div><div style={{fontSize:9,color:'var(--text-3)'}}>filtros ATS</div></div>
                </div>
                {x.total===0?<div style={{fontSize:11,color:'var(--text-3)',marginTop:4}}>Este proceso no tiene keywords ATS definidas, no se puede medir el calce.</div>:<div style={{fontSize:11,marginTop:4,lineHeight:1.6}}><span style={{color:'var(--ok)'}}>Cumple: {x.encontradas.join(', ')||'—'}</span>{x.faltan.length>0&&<><br/><span style={{color:'var(--text-3)'}}>No aparece: {x.faltan.join(', ')}</span></>}</div>}
                <div style={{marginTop:6}}>{x.ya_derivado?<span style={{fontSize:11,color:'var(--ok)'}}>✔ Ya recomendado a este proceso</span>:<button className={'btn '+(calza?'btn-primary':'btn-sec')} style={{fontSize:11,padding:'4px 10px'}} disabled={!!recBusy} onClick={()=>derivar(x)}>{recBusy===x.id?<><span className="spin"/> Evaluando...</>:calza?'Recomendar a este proceso':'Recomendar igualmente'}</button>}</div>
              </div>)})}
            <div style={{fontSize:10,color:'var(--text-3)',marginBottom:8}}>Calza si cumple al menos el 50% de las keywords del proceso destino. Se crea una copia (el original no se toca) y se evalúa con la IA contra la plaza destino.</div>
            <button className="btn btn-sec" onClick={()=>setRec(null)}>Cerrar</button>
          </div>
        </div>)}
    </div>
  )
}

export default function CandidatosPage() {
  return (
    <Suspense fallback={<div className="empty"><span className="spin"/></div>}>
      <CandidatosInner/>
    </Suspense>
  )
}
