'use client'
import { useEffect, useState, useRef } from 'react'
import { useAI } from '@/hooks/useAI'
import { useProcesoActivo } from '@/hooks/useProcesoActivo'
export default function CVPage() {
  const { loading } = useAI()
  const { procesos, procesoId, setProcesoId, proceso, cargado } = useProcesoActivo()
  const [nombre,    setNombre]    = useState('')
  const [cargo,     setCargo]     = useState('')
  const [cvText,    setCvText]    = useState('')
  const [fileInfo,  setFileInfo]  = useState('')
  const [fileLoad,  setFileLoad]  = useState(false)
  const [resultado, setResultado] = useState('')
  const [score,     setScore]     = useState(0)
  const [atsScore,  setAtsScore]  = useState(0)
  const [dims,      setDims]      = useState<any>(null)
  const [resumen,   setResumen]   = useState('')
  const [archivo,   setArchivo]   = useState('')
  const [analizing, setAnalizing] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  async function extractFile(file: File) {
    setFileLoad(true); setFileInfo('Leyendo '+file.name+'...')
    try {
      const fd=new FormData(); fd.append('file',file)
      const res=await fetch('/api/extract-text',{method:'POST',body:fd})
      const d=await res.json()
      if(res.ok&&d.text){setCvText(d.text);setArchivo(file.name);setFileInfo('OK: '+file.name+' ('+d.chars?.toLocaleString()+' chars)')}
      else setFileInfo('Error: '+(d.error||'no se pudo leer'))
    } catch(e:any){setFileInfo('Error: '+e.message)}
    setFileLoad(false)
  }
  async function analizar() {
    if(!procesoId){alert('Primero elige el proceso al que pertenece este CV (arriba).');return}
    if(!cvText.trim()){alert('Carga el CV primero');return}
    setAnalizing(true); setResultado('')
    try {
      const kw = proceso?.requisitos||''
      const res = await fetch('/api/analizar-cv',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({cvText,nombre,cargo:cargo||proceso?.cargo||'',proceso:proceso?.nombre||'',keywords:kw})})
      const d = await res.json()
      if(d.ok){setResultado(d.resultado);setScore(d.score||0);setAtsScore(d.atsScore||0);setDims(d.dimensiones||null);setResumen(d.resumen||'')}
      else alert('Error: '+(d.error||'sin respuesta'))
    } catch(e:any){alert('Error: '+e.message)}
    setAnalizing(false)
  }
  async function guardar() {
    if(!resultado){alert('Analiza el CV primero');return}
    if(!nombre.trim()){alert('Ingresa el nombre del candidato');return}
    setSaving(true)
    await fetch('/api/candidatos',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({nombre,cargo:cargo||proceso?.cargo||'',proceso_id:procesoId||null,cv_text:cvText,resultado,score,ats_score:atsScore,dimensiones:dims,resumen,archivo_cv:archivo||null,aprobado:score>=60,etapa:'cv',fecha:new Date().toLocaleDateString('es-PE')})})
    setSaved(true); setTimeout(()=>setSaved(false),2500)
    setSaving(false)
  }
  const sColor=(s:number)=>s>=60?'var(--ok)':s>=40?'var(--warn)':'var(--err)'
  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'16px 26px 12px',borderBottom:'1px solid var(--border)'}}>
        <div style={{fontSize:20,fontWeight:600}}>Analizar CV — Evaluación Integral</div>
        <div style={{fontSize:12,color:'var(--text-3)',marginTop:4}}>6 dimensiones: experiencia, formación, capacitaciones, ATS keywords, competencias blandas, presentación</div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:9,padding:'8px 20px',background:'rgba(30,123,232,.06)',borderBottom:'1px solid var(--border)',flexShrink:0,flexWrap:'wrap'}}>
        <label style={{margin:0,fontSize:13,fontWeight:500}}>Proceso:</label>
        <select value={procesoId} onChange={e=>setProcesoId(e.target.value)} style={{maxWidth:380,fontSize:13,padding:'6px 10px'}}>
          <option value="">Selecciona el proceso...</option>
          {procesos.map(p=><option key={p.id} value={p.id}>{p.nombre} — {p.empresa||''}</option>)}
        </select>
        {proceso&&<span style={{fontSize:11,color:'var(--accent2)',fontWeight:600}}>Keywords: {proceso.requisitos?.substring(0,60)||'ninguna'}...</span>}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'18px 26px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,alignItems:'start'}}>
        <div>
          <div className="card">
            <div className="card-title">Datos del candidato</div>
            <div className="field"><label>Nombre completo *</label><input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Vladimir Janampa Jara"/></div>
            <div className="field"><label>Cargo (vacío = usa el del proceso)</label><input value={cargo} onChange={e=>setCargo(e.target.value)} placeholder={proceso?.cargo||'Ej: Jefe de Ventas'}/></div>
            <div className="field"><label>Cargar CV</label>
              <div style={{border:'2px dashed var(--border-hi)',borderRadius:8,padding:18,textAlign:'center',cursor:'pointer',background:'var(--bg-panel)'}}
                onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files?.[0];if(f)extractFile(f)}}>
                {fileLoad?<><div>Leyendo...</div><span className="spin"/></>:cvText?<><div style={{color:'var(--ok)',fontSize:16}}>✓ CV cargado</div><div style={{fontSize:11,color:'var(--ok)'}}>{fileInfo}</div><div style={{fontSize:10,color:'var(--text-3)'}}>Clic para reemplazar</div></>:<><div style={{fontSize:20}}>📄</div>{fileInfo&&<div style={{fontSize:12,color:'var(--err)',marginBottom:4}}>{fileInfo}</div>}<div style={{fontSize:13,fontWeight:600}}>Clic o arrastra el CV</div><div style={{fontSize:11,color:'var(--text-3)'}}>PDF · Word · TXT</div></>}
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".txt,.pdf,.docx,.doc" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)extractFile(f)}}/>
            <div className="field"><label>O pega el texto del CV</label><textarea value={cvText} onChange={e=>setCvText(e.target.value)} placeholder="Pega el CV aquí..." style={{minHeight:100,fontSize:12}}/></div>
            <div className="btn-row">
              <button className="btn btn-primary" onClick={analizar} disabled={analizing||!cvText.trim()} style={{fontSize:14}}>
                {analizing?<><span className="spin"/> Analizando (6 dimensiones)...</>:'Analizar con IA'}
              </button>
              <button className="btn btn-sec" onClick={()=>{setCvText('');setFileInfo('');setResultado('');setNombre('');setCargo('');setScore(0);setAtsScore(0);setDims(null);setResumen('');setArchivo('')}}>Limpiar</button>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Resultado del Análisis Integral</div>
          {!resultado?<div className="empty" style={{padding:40}}>El análisis de 6 dimensiones aparecerá aquí</div>:(
            <>
              <div style={{display:'flex',gap:9,marginBottom:12}}>
                <div className="card" style={{flex:1,textAlign:'center',margin:0,padding:10}}><div style={{fontSize:24,fontWeight:800,color:sColor(score)}}>{score}</div><div style={{fontSize:10,color:'var(--text-3)'}}>GLOBAL/100</div><div className="sbar" style={{marginTop:4}}><div className="sfill" style={{width:score+'%',background:sColor(score)}}/></div></div>
                <div className="card" style={{flex:1,textAlign:'center',margin:0,padding:10}}><div style={{fontSize:24,fontWeight:800,color:sColor(atsScore)}}>{atsScore}</div><div style={{fontSize:10,color:'var(--text-3)'}}>ATS/100</div></div>
                <div className="card" style={{flex:1,textAlign:'center',margin:0,padding:10}}><div style={{fontSize:13,fontWeight:700,color:score>=60?'var(--ok)':'var(--err)'}}>{score>=80?'Sobresaliente':score>=60?'Alto':score>=40?'Medio':'Bajo'}</div><div style={{fontSize:10,color:'var(--text-3)'}}>NIVEL</div></div>
              </div>
              {procesoId&&<div style={{padding:'5px 10px',borderRadius:6,background:'var(--adim)',fontSize:12,color:'var(--accent2)',marginBottom:10}}>Proceso: <b>{proceso?.nombre}</b></div>}
              <div style={{fontSize:12,lineHeight:1.8,whiteSpace:'pre-wrap',maxHeight:380,overflowY:'auto'}}>{resultado}</div>
              <div className="btn-row" style={{marginTop:10}}>
                <button className="btn btn-ok" onClick={guardar} disabled={saving||saved}>
                  {saved?'✓ Guardado':saving?<><span className="spin"/> Guardando...</>:'Guardar candidato'}
                </button>
                <button className="btn btn-sec" style={{fontSize:12}} onClick={()=>navigator.clipboard.writeText(resultado)}>Copiar</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
