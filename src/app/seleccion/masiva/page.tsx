'use client'
import { useEffect, useState, useRef } from 'react'
import { useProcesoActivo } from '@/hooks/useProcesoActivo'
export default function MasivaPage() {
  const { procesos, procesoId, setProcesoId, proceso } = useProcesoActivo()
  const [cargo,      setCargo]      = useState('')
  const [minScore,   setMinScore]   = useState(60)
  const [files,      setFiles]      = useState<File[]>([])
  const [resultados, setResultados] = useState<any[]>([])
  const [progreso,   setProgreso]   = useState(0)
  const [procesando, setProcesando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  async function procesar() {
    if (!procesoId) { alert('Primero elige el proceso donde se cargarán estos CVs (arriba).'); return }
    if (!files.length) { alert('Selecciona archivos'); return }
    setProcesando(true); setResultados([]); setProgreso(0)
    const res: any[] = []
    for (let i=0; i<files.length; i++) {
      const file = files[i]
      try {
        const fd = new FormData(); fd.append('file', file)
        const er = await fetch('/api/extract-text',{method:'POST',body:fd})
        const ed = await er.json()
        if (!er.ok||!ed.text) { res.push({nombre:file.name,ok:false,error:ed.error||'Error al leer',score:0,ats_score:0}); continue }
        const ar = await fetch('/api/analizar-cv',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({cvText:ed.text,nombre:file.name.replace(/\.(pdf|docx?|txt)$/i,''),
            cargo:cargo||proceso?.cargo||'',proceso:proceso?.nombre||'',keywords:proceso?.requisitos||''})})
        const ad = await ar.json()
        const cand = { nombre:file.name.replace(/\.(pdf|docx?|txt)$/i,''), ok:ad.ok&&(ad.score||0)>=minScore,
          score:ad.score||0, ats_score:ad.atsScore||0, resultado:ad.resultado||'', cvText:ed.text,
          cargo:cargo||proceso?.cargo||'', dims:ad.dimensiones||null, resumen:ad.resumen||'', archivo:file.name }
        res.push(cand)
        if (ad.ok) {
          await fetch('/api/candidatos',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({nombre:cand.nombre,cargo:cand.cargo,proceso_id:procesoId||null,
              cv_text:cand.cvText,resultado:cand.resultado,score:cand.score,ats_score:cand.ats_score,
              dimensiones:cand.dims,resumen:cand.resumen,archivo_cv:cand.archivo,
              aprobado:cand.ok,etapa:cand.ok?'cv':'descartado',fecha:new Date().toLocaleDateString('es-PE')})})
        }
      } catch(e:any) { res.push({nombre:file.name,ok:false,error:e.message,score:0,ats_score:0}) }
      setProgreso(Math.round((i+1)/files.length*100))
    }
    setResultados(res); setProcesando(false)
  }
  function descargarCSV() {
    const csv = ['Nombre,Score,ATS,Aprobado,Estado',
      ...resultados.map(r => '"'+r.nombre+'",'+r.score+','+r.ats_score+','+(r.ok?'SI':'NO')+',"'+(r.ok?'APROBADO':'DESCARTADO')+'"')
    ].join('\n')
    const b=new Blob([csv],{type:'text/csv'});const a=document.createElement('a')
    a.href=URL.createObjectURL(b);a.download='Masiva_'+new Date().toISOString().slice(0,10)+'.csv';a.click()
  }
  const sColor = (s:number) => s>=60?'var(--ok)':s>=40?'var(--warn)':'var(--err)'
  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'14px 26px 10px',borderBottom:'1px solid var(--border)'}}>
        <div style={{fontSize:20,fontWeight:600}}>Carga Masiva de CVs</div>
        <div style={{fontSize:12,color:'var(--text-3)',marginTop:4}}>Multiples CVs — extraccion automatica — evaluacion integral — guardado en proceso</div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 20px',background:'rgba(30,123,232,.06)',borderBottom:'1px solid var(--border)',flexShrink:0}}>
        <label style={{margin:0}}>Proceso:</label>
        <select value={procesoId} onChange={e=>setProcesoId(e.target.value)} style={{maxWidth:360,fontSize:13}}>
          <option value="">Selecciona el proceso...</option>
          {procesos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'18px 26px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,alignItems:'start'}}>
        <div>
          <div className="card">
            <div className="card-title">Configuracion</div>
            <div className="field"><label>Cargo (vacio = usa el del proceso)</label>
              <input value={cargo} onChange={e=>setCargo(e.target.value)} placeholder={proceso?.cargo||'Ej: Ejecutivo Comercial'}/>
            </div>
            <div className="field"><label>Puntaje minimo para aprobar</label>
              <input type="number" value={minScore} onChange={e=>setMinScore(Number(e.target.value))} style={{width:80}}/>
            </div>
            <div className="field"><label>Archivos CVs ({files.length} seleccionados)</label>
              <div style={{border:'2px dashed var(--border-hi)',borderRadius:8,padding:18,textAlign:'center',cursor:'pointer',background:'var(--bg-panel)'}}
                onClick={()=>fileRef.current?.click()}>
                {files.length>0 ? <div style={{color:'var(--ok)'}}>{files.length} archivos listos</div> :
                  <><div style={{fontSize:20}}>📦</div><div style={{fontSize:13,fontWeight:600}}>Clic para seleccionar CVs</div><div style={{fontSize:11,color:'var(--text-3)'}}>PDF · Word · TXT (multiples)</div></>}
              </div>
              <input ref={fileRef} type="file" accept=".txt,.pdf,.docx,.doc" multiple style={{display:'none'}} onChange={e=>setFiles(Array.from(e.target.files||[]))}/>
            </div>
            {procesando && (
              <div style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}>
                  <span>Procesando...</span><span>{progreso}%</span>
                </div>
                <div className="sbar" style={{height:6}}><div className="sfill" style={{width:progreso+'%'}}/></div>
              </div>
            )}
            <div className="btn-row">
              <button className="btn btn-primary" onClick={procesar} disabled={procesando||!files.length}>
                {procesando ? <><span className="spin"/> Analizando {files.length} CVs...</> : 'Iniciar analisis'}
              </button>
              {resultados.length>0 && <button className="btn btn-ok" onClick={descargarCSV}>Descargar CSV</button>}
            </div>
          </div>
          {resultados.length>0 && (
            <div className="card">
              <div className="card-title">Resumen</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                {[{l:'Aprobados',v:resultados.filter(r=>r.ok).length,c:'var(--ok)'},
                  {l:'Descartados',v:resultados.filter(r=>!r.ok).length,c:'var(--err)'},
                  {l:'Promedio',v:resultados.filter(r=>r.score).length?Math.round(resultados.reduce((a,r)=>a+(r.score||0),0)/resultados.filter(r=>r.score).length):0,c:'var(--accent2)'}
                ].map(k=>(
                  <div key={k.l} className="card" style={{margin:0,textAlign:'center',padding:9}}>
                    <div style={{fontSize:20,fontWeight:700,color:k.c}}>{k.v}</div>
                    <div style={{fontSize:10,color:'var(--text-3)'}}>{k.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-title">Resultados ({resultados.length}/{files.length})</div>
          {resultados.length===0 ? <div className="empty" style={{padding:40}}>Los resultados apareceran aqui</div> :
           resultados.map((r,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:7,
              background:'var(--bg-panel)',marginBottom:4,
              border:'1px solid '+(r.ok?'rgba(26,173,110,.3)':'rgba(232,64,64,.2)')}}>
              <div style={{width:24,height:24,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:10,fontWeight:700,flexShrink:0,
                background:r.ok?'rgba(26,173,110,.2)':'rgba(232,64,64,.2)',
                color:r.ok?'var(--ok)':'var(--err)'}}>
                {r.ok?'OK':'X'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.nombre}</div>
                <div style={{fontSize:10,color:'var(--text-3)'}}>{r.ok?'APROBADO':'DESCARTADO'} · Score: {r.score}/100 · ATS: {r.ats_score}/100</div>
              </div>
              <div style={{fontSize:17,fontWeight:700,color:sColor(r.score||0),flexShrink:0}}>{r.score}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
