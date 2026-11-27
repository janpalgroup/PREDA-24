'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAI } from '@/hooks/useAI'

function OfertaCard({ o, onCheck, compatColor, dimmed }: { o:any; onCheck:()=>void; compatColor:(c:number)=>string; dimmed?:boolean }) {
  const [exp, setExp] = useState(false)
  const isHiring = o.tipo === 'hiring_post'
  return (
    <div className="card" style={{margin:'0 0 10px',opacity:dimmed?0.72:1,
      border:o.checklist?'1px solid var(--ok)':isHiring?'1px solid rgba(168,85,247,.4)':'1px solid var(--border)'}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
        <input type="checkbox" checked={!!o.checklist} onChange={onCheck} style={{marginTop:5,width:17,height:17,cursor:'pointer',accentColor:'var(--ok)'}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:5}}>
            <span style={{padding:'2px 8px',borderRadius:20,fontSize:11,background:isHiring?'rgba(168,85,247,.15)':'var(--adim)',color:isHiring?'#a855f7':'var(--accent2)',fontWeight:600}}>{o.plataforma}</span>
            <span style={{padding:'2px 7px',borderRadius:20,fontSize:11,background:'var(--bg-panel)',color:'var(--text-3)',border:'1px solid var(--border)'}}>{o.modalidad}</span>
            {o.sector==='estatal'&&<span style={{padding:'2px 7px',borderRadius:20,fontSize:10,background:'rgba(232,160,32,.15)',color:'var(--warn)',fontWeight:600}}>Estatal</span>}
            {isHiring&&<span style={{padding:'2px 7px',borderRadius:20,fontSize:10,background:'rgba(168,85,247,.1)',color:'#a855f7',fontWeight:600}}>Hiring Post</span>}
            {o.dias_publicado!=null&&<span style={{fontSize:11,color:'var(--text-3)'}}>Hace {o.dias_publicado} dia{o.dias_publicado!==1?'s':''}</span>}{o.estado_link==='verificado'&&<span style={{fontSize:10,color:'var(--ok)',fontWeight:700}}>✔ Aviso verificado</span>}
          </div>
          <div style={{fontSize:15,fontWeight:700,marginBottom:2}}>{o.titulo}</div>
          <div style={{fontSize:12,color:'var(--text-2)',marginBottom:3}}>{o.empresa}{o.ubicacion?' · '+o.ubicacion:''}</div>
          {o.salario&&o.salario!=='No especificado'&&<div style={{fontSize:12,color:'var(--ok)',fontWeight:600,marginBottom:3}}>{o.salario}</div>}
          {o.descripcion&&<div style={{fontSize:12,color:'var(--text-3)',lineHeight:1.6,marginBottom:3}}>{o.descripcion}</div>}
          {o.razon&&<div style={{fontSize:12,color:compatColor(o.compatibilidad),fontStyle:'italic'}}>{o.razon}</div>}
        </div>
        <div style={{textAlign:'center',flexShrink:0,minWidth:58}}>
          <div style={{fontSize:24,fontWeight:800,color:compatColor(o.compatibilidad)}}>{o.compatibilidad}%</div>
          <div style={{fontSize:10,color:'var(--text-3)'}}>COMPAT.</div>
          <div style={{fontSize:10,fontWeight:600,marginTop:2,lineHeight:1.2,
            color:o.recomendacion?.includes('Postular')?'var(--ok)':o.recomendacion?.includes('Mejorar')?'var(--warn)':'var(--err)'}}>
            {o.recomendacion}
          </div>
        </div>
      </div>
      {o.requisitos?.length>0&&exp&&(
        <div style={{marginTop:10,padding:10,background:'var(--bg-panel)',borderRadius:8,border:'1px solid var(--border)'}}>
          <div style={{fontSize:11,fontWeight:600,color:'var(--text-3)',marginBottom:5}}>REQUISITOS</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
            {o.requisitos.map((r:string)=><span key={r} style={{padding:'2px 8px',borderRadius:20,fontSize:11,background:'var(--adim)',color:'var(--accent2)'}}>{r}</span>)}
          </div>
        </div>
      )}
      <div className="btn-row" style={{marginTop:9}}>
        <a href={o.link_postular} target="_blank" rel="noopener noreferrer"
          className="btn btn-ok" style={{fontSize:13,textDecoration:'none',padding:'8px 16px'}}>
          Postular en {o.plataforma} →
        </a>
        {o.requisitos?.length>0&&<button className="btn btn-sec" style={{fontSize:11}} onClick={()=>setExp(!exp)}>{exp?'Ocultar':'Ver requisitos'}</button>}
        <label style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'var(--text-2)',cursor:'pointer',margin:0,fontWeight:'normal'}}>
          <input type="checkbox" checked={!!o.checklist} onChange={onCheck} style={{accentColor:'var(--ok)'}}/>Seleccionar
        </label>
      </div>
    </div>
  )
}

export default function CVEmpPage() {
  const router = useRouter()
  const { callAI, loading: aiLoad } = useAI()

  const [expediente,    setExpediente]    = useState<any>(null)
  const [fase,          setFase]          = useState(1)
  const [cvText,        setCvText]        = useState('')
  const [fileInfo,      setFileInfo]      = useState('')
  const [fileLoad,      setFileLoad]      = useState(false)
  const [analisis,      setAnalisis]      = useState('')
  const [score,         setScore]         = useState(0)
  const [atsScore,      setAtsScore]      = useState(0)
  const [cvMejorado,    setCvMejorado]    = useState('')
  const [cargoObj,      setCargoObj]      = useState('')
  const [pais,          setPais]          = useState('Peru')
  const [departamento,  setDepartamento]  = useState('Lima')
  const [provincia,     setProvincia]     = useState('Lima')
  const [distrito,      setDistrito]      = useState('San Isidro')
  const [sectorBusq,    setSectorBusq]    = useState('privado')
  const [ofertas,       setOfertas]       = useState<any[]>([])
  const [buscando,      setBuscando]      = useState(false)
  const [busqErr,       setBusqErr]       = useState('')
  const [sinApi,        setSinApi]        = useState(false)
  const [sinApiMsg,     setSinApiMsg]     = useState('')
  const [metodo,        setMetodo]        = useState('')
  const [filtroATS,     setFiltroATS]     = useState('todos')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(()=>{
    const eid = sessionStorage.getItem('preda_expediente_id')
    if (eid) {
      fetch('/api/expediente?id='+eid).then(r=>r.json()).then(d=>{
        if(d.expediente){
          setExpediente(d.expediente)
          if(d.expediente.cv_texto)setCvText(d.expediente.cv_texto)
          if(d.expediente.cargo_objetivo)setCargoObj(d.expediente.cargo_objetivo)
          setFileInfo('CV cargado desde expediente: '+d.expediente.nombre)
        }
      }).catch(()=>{})
    }
  },[])

  async function extractFile(file: File) {
    setFileLoad(true); setFileInfo('Leyendo '+file.name+'...')
    try {
      const fd=new FormData(); fd.append('file',file)
      const res=await fetch('/api/extract-text',{method:'POST',body:fd})
      const d=await res.json()
      if(res.ok&&d.text){setCvText(d.text);setFileInfo('OK: '+file.name+' ('+d.chars?.toLocaleString()+' chars)')}
      else setFileInfo('Error: '+(d.error||'no se pudo leer'))
    } catch(e:any){setFileInfo('Error: '+e.message)}
    setFileLoad(false)
  }

  async function analizarCV() {
    if(!cvText.trim()){alert('Carga tu CV primero');return}
    const res=await fetch('/api/analizar-cv',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({cvText,nombre:expediente?.nombre||'Candidato',cargo:cargoObj,keywords:''})})
    const d=await res.json()
    if(d.ok){setAnalisis(d.resultado);setScore(d.score||0);setAtsScore(d.atsScore||0);setFase(2)}
    else alert('Error: '+(d.error||'sin respuesta'))
  }

  async function mejorarCV() {
    if(!cvText.trim()){alert('Carga tu CV primero');return}
    const r=await callAI(
      'Mejora este CV para el cargo "'+( cargoObj||'el cargo objetivo')+'".\\n\\nCV ORIGINAL:\\n'+cvText.substring(0,6000)+'\\n\\nREGLAS ESTRICTAS:\\n1. NO inventar datos, logros ni fechas\\n2. Verbos de impacto (lidere, eleve, construi, posicione)\\n3. Keywords ATS relevantes al cargo\\n4. Mantener TODA la experiencia laboral\\n5. Competencias en parrafo corrido separado por ·\\n6. Maximo 2 paginas\\n\\nEntrega el CV mejorado completo.',
      'Eres PREDA, experto en CV para ATS. Responde en espanol.'
    )
    if(r){setCvMejorado(r);setFase(3)}
  }

  async function buscarOfertas() {
    setBuscando(true); setBusqErr(''); setSinApi(false); setOfertas([])
    try {
      const res=await fetch('/api/buscar-ofertas',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({cargo:cargoObj||'profesional',pais,departamento,provincia,distrito,
          cvTexto:cvMejorado||cvText,sector:sectorBusq})})
      const d=await res.json()
      if(d.sin_api){setSinApi(true);setSinApiMsg(d.mensaje||'');setFase(4);setBuscando(false);return}
      if(!res.ok||!d.ok){setBusqErr(d.error||'Error al buscar');setBuscando(false);return}
      setOfertas(d.ofertas||[]);setMetodo(d.metodo||'');setFase(4)
    } catch(e:any){setBusqErr('Error: '+e.message)}
    setBuscando(false)
  }

  async function descargarCV(formato: 'docx'|'pdf') {
    const textFinal=cvMejorado||cvText
    if(!textFinal){alert('No hay CV para descargar');return}
    const res=await fetch('/api/cv-download',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({formato,nombre:expediente?.nombre||'Candidato',cargos:[cargoObj||'Profesional'],
        phone:expediente?.telefono||'',email:expediente?.email||'',linkedin:expediente?.linkedin||'',keywords:'',cvText:textFinal})})
    if(!res.ok){alert('Error al generar el CV');return}
    const blob=await res.blob()
    const a=document.createElement('a');a.href=URL.createObjectURL(blob)
    a.download='CV_'+(expediente?.nombre||'Candidato').replace(/\s+/g,'_')+'.'+formato;a.click()
  }

  function toggleCheck(id: string){setOfertas(prev=>prev.map(o=>o.id===id?{...o,checklist:!o.checklist}:o))}
  const compatColor=(c:number)=>c>=90?'var(--ok)':c>=70?'var(--warn)':'var(--err)'

  const ofertasATSOnly=ofertas.filter(o=>o.compatibilidad>=70&&(/ATS|keyword|t[eé]cnica|competencia/i.test(o.razon||'')))
  const ofertasFiltradas=filtroATS==='alta'?ofertas.filter(o=>o.compatibilidad>=90):filtroATS==='media'?ofertas.filter(o=>o.compatibilidad>=70&&o.compatibilidad<90):filtroATS==='ats_only'?ofertasATSOnly:ofertas
  const ofertasAltas=ofertasFiltradas.filter(o=>o.compatibilidad>=90)
  const ofertasMedias=ofertasFiltradas.filter(o=>o.compatibilidad>=70&&o.compatibilidad<90)
  const ofertasBajas=ofertasFiltradas.filter(o=>o.compatibilidad<70)
  const seleccionadas=ofertas.filter(o=>o.checklist)

  const faseBtn=(n:number,lbl:string,done:boolean)=>(
    <button onClick={()=>{if(done||n<=fase)setFase(n)}}
      style={{padding:'7px 14px',borderRadius:8,fontSize:12,border:'none',cursor:done||n<=fase?'pointer':'default',
        background:fase===n?'var(--accent)':done?'rgba(26,173,110,.15)':'var(--bg-panel)',
        color:fase===n?'#fff':done?'var(--ok)':'var(--text-3)',fontWeight:fase===n?700:400,
        fontFamily:'var(--font)',transition:'.15s'}}>
      {done?'OK ':''}{n} {lbl}
    </button>
  )

  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'14px 26px 10px',borderBottom:'1px solid var(--border)'}}>
        <div style={{fontSize:20,fontWeight:600}}>CV y Busqueda de Empleo</div>
        <div style={{fontSize:12,color:'var(--text-3)',marginTop:3}}>
          {expediente?<span>Candidato: <b style={{color:'var(--ok)'}}>{expediente.nombre}</b> — CV cargado del expediente</span>:'Carga el CV una vez → se usa en todas las fases'}
        </div>
      </div>
      <div style={{display:'flex',gap:6,padding:'8px 26px',background:'var(--bg-panel)',borderBottom:'1px solid var(--border)',flexShrink:0,flexWrap:'wrap'}}>
        {faseBtn(1,'Analizar CV',fase>1)}
        {faseBtn(2,'Mejorar CV'+(score?' ('+score+'%)':''),fase>2)}
        {faseBtn(3,'Ubicacion y sector',fase>3)}
        {faseBtn(4,'Ofertas ('+ofertas.length+')',ofertasAltas.length>0)}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'18px 26px'}}>

        {fase===1&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
            <div className="card">
              <div className="card-title">{expediente?'CV de '+expediente.nombre:'Cargar CV'}</div>
              {expediente&&cvText&&<div className="info-box" style={{marginBottom:10,fontSize:12,color:'var(--ok)'}}>CV cargado automaticamente desde el expediente CRM.</div>}
              {!expediente&&<div style={{marginBottom:10,padding:'9px 12px',borderRadius:8,background:'rgba(30,123,232,.08)',border:'1px solid var(--border)',fontSize:12}}>
                Para no cargar el CV cada vez, ve a <button onClick={()=>router.push('/empleabilidad/expediente')} style={{background:'none',border:'none',color:'var(--accent2)',cursor:'pointer',fontWeight:600,fontSize:12,padding:0}}>Mi Expediente</button> y selecciona un candidato.
              </div>}
              <div style={{border:'2px dashed var(--border-hi)',borderRadius:10,padding:20,textAlign:'center',cursor:'pointer',background:'var(--bg-panel)',marginBottom:10}}
                onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files?.[0];if(f)extractFile(f)}}>
                {fileLoad?<><div>Leyendo...</div><span className="spin"/></>:cvText?<><div style={{fontSize:18,color:'var(--ok)'}}>CV cargado</div><div style={{fontSize:11,color:'var(--ok)',marginTop:2}}>{fileInfo}</div><div style={{fontSize:10,color:'var(--text-3)'}}>Clic para reemplazar</div></>:<><div style={{fontSize:22,marginBottom:4}}>📄</div><div style={{fontSize:13,fontWeight:600}}>Clic o arrastra el CV</div><div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>PDF · Word · TXT</div></>}
              </div>
              <input ref={fileRef} type="file" accept=".txt,.pdf,.docx,.doc" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)extractFile(f)}}/>
              <div className="field"><label>O pega el texto del CV</label><textarea value={cvText} onChange={e=>setCvText(e.target.value)} placeholder="Pega el CV..." style={{minHeight:100,fontSize:12}}/></div>
              <div className="field"><label>Cargo objetivo</label><input value={cargoObj} onChange={e=>setCargoObj(e.target.value)} placeholder="Ej: Jefe de Ventas | KAM"/></div>
              <button className="btn btn-primary" onClick={analizarCV} disabled={aiLoad||!cvText.trim()} style={{fontSize:14,padding:'10px 20px',width:'100%',justifyContent:'center'}}>
                {aiLoad?<><span className="spin"/> Analizando CV (6 dimensiones)...</>:'Analizar CV con IA — Evaluacion Integral'}
              </button>
            </div>
            <div className="card">
              <div className="card-title">Evaluacion Integral</div>
              {!analisis?<div className="empty" style={{padding:40}}>El analisis aparecera aqui — 6 dimensiones: experiencia, formacion, capacitaciones, ATS, competencias, presentacion</div>:(
                <>
                  <div style={{display:'flex',gap:10,marginBottom:12}}>
                    <div className="card" style={{margin:0,flex:1,textAlign:'center',padding:10}}><div style={{fontSize:24,fontWeight:800,color:score>=60?'var(--ok)':'var(--warn)'}}>{score}</div><div style={{fontSize:10,color:'var(--text-3)'}}>GLOBAL/100</div></div>
                    <div className="card" style={{margin:0,flex:1,textAlign:'center',padding:10}}><div style={{fontSize:24,fontWeight:800,color:atsScore>=60?'var(--ok)':'var(--warn)'}}>{atsScore}</div><div style={{fontSize:10,color:'var(--text-3)'}}>ATS/100</div></div>
                  </div>
                  <div style={{fontSize:12,lineHeight:1.8,whiteSpace:'pre-wrap',maxHeight:380,overflowY:'auto'}}>{analisis}</div>
                  <div className="btn-row" style={{marginTop:10}}>
                    <button className="btn btn-ok" onClick={()=>setFase(2)}>Siguiente: Mejorar CV →</button>
                    <button className="btn btn-sec" style={{fontSize:12}} onClick={()=>navigator.clipboard.writeText(analisis)}>Copiar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {fase===2&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
            <div className="card">
              <div className="card-title">Mejorar CV con IA (Harvard ATS)</div>
              <div className="info-box" style={{marginBottom:10,fontSize:12}}>La IA reescribe con verbos de impacto y keywords ATS. No inventa datos.</div>
              <div className="field"><label>Cargo objetivo</label><input value={cargoObj} onChange={e=>setCargoObj(e.target.value)} placeholder="Ej: Jefe de Ventas Senior"/></div>
              <div style={{display:'flex',gap:8,marginBottom:12}}>
                <button className="btn btn-primary" onClick={mejorarCV} disabled={aiLoad||!cvText.trim()} style={{flex:1,justifyContent:'center'}}>{aiLoad?<><span className="spin"/> Mejorando CV...</>:'Mejorar CV con IA'}</button>
                <button className="btn btn-sec" onClick={()=>setFase(3)}>Saltar →</button>
              </div>
              {cvMejorado&&<div className="btn-row"><button className="btn btn-ok" onClick={()=>descargarCV('docx')}>Word</button><button className="btn btn-sec" onClick={()=>descargarCV('pdf')}>PDF</button></div>}
            </div>
            <div className="card">
              <div className="card-title">CV Mejorado</div>
              {!cvMejorado?<div className="empty" style={{padding:40}}>El CV mejorado aparecera aqui</div>:(
                <>
                  <div style={{fontSize:12,lineHeight:1.75,whiteSpace:'pre-wrap',maxHeight:420,overflowY:'auto',background:'var(--bg-deep)',padding:12,borderRadius:8}}>{cvMejorado}</div>
                  <button className="btn btn-ok" onClick={()=>setFase(3)} style={{marginTop:10}}>Siguiente: buscar ofertas →</button>
                </>
              )}
            </div>
          </div>
        )}

        {fase===3&&(
          <div>
            <div className="card" style={{marginBottom:14}}>
              <div className="card-title">Ubicacion de busqueda</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div className="field"><label>Pais</label><input value={pais} onChange={e=>setPais(e.target.value)}/></div>
                <div className="field"><label>Departamento</label><input value={departamento} onChange={e=>setDepartamento(e.target.value)}/></div>
                <div className="field"><label>Provincia</label><input value={provincia} onChange={e=>setProvincia(e.target.value)}/></div>
                <div className="field"><label>Distrito</label><input value={distrito} onChange={e=>setDistrito(e.target.value)}/></div>
              </div>
            </div>
            <div className="card" style={{marginBottom:14}}>
              <div className="card-title" style={{marginBottom:10}}>Sector de busqueda</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {[['privado','Sector Privado','Empresas, corporaciones, startups'],['estatal','Sector Estatal','CAS, SNP, municipalidades, ministerios'],['ambos','Ambos sectores','Privado + Estatal']].map(([v,l,d])=>(
                  <div key={v} onClick={()=>setSectorBusq(v)} style={{flex:1,minWidth:160,padding:'11px 14px',borderRadius:9,cursor:'pointer',border:'1px solid '+(sectorBusq===v?'var(--ok)':'var(--border)'),background:sectorBusq===v?'rgba(26,173,110,.1)':'var(--bg-panel)',transition:'.15s'}}>
                    <div style={{fontSize:13,fontWeight:700,color:sectorBusq===v?'var(--ok)':'var(--text-1)',marginBottom:3}}>{l}</div>
                    <div style={{fontSize:11,color:'var(--text-3)'}}>{d}</div>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-ok" onClick={buscarOfertas} disabled={buscando} style={{fontSize:15,padding:'13px 28px',width:'100%',justifyContent:'center'}}>
              {buscando?<><span className="spin"/> Buscando ofertas...</>:'Buscar ofertas ahora →'}
            </button>
            {busqErr&&<div style={{marginTop:10,padding:10,borderRadius:8,background:'rgba(232,64,64,.1)',color:'var(--err)',fontSize:13}}>{busqErr}</div>}
          </div>
        )}

        {fase===4&&(
          <div>
            {sinApi?(
              <div style={{background:'rgba(232,160,32,.1)',border:'1px solid var(--warn)',borderRadius:12,padding:24,maxWidth:640}}>
                <div style={{fontSize:16,fontWeight:700,color:'var(--warn)',marginBottom:12}}>Configura una API para ver ofertas reales</div>
                <div style={{fontSize:13,color:'var(--text-2)',lineHeight:1.8,whiteSpace:'pre-wrap',marginBottom:16}}>{sinApiMsg}</div>
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  <a href="https://jooble.org/api/about" target="_blank" className="btn btn-ok" style={{textDecoration:'none',fontSize:13}}>Jooble API (Gratis) →</a>
                  <a href="https://console.cloud.google.com" target="_blank" className="btn btn-sec" style={{textDecoration:'none',fontSize:13}}>Google API →</a>
                  <button className="btn btn-primary" onClick={()=>router.push('/administracion/config')}>Ir a Configuracion →</button>
                </div>
              </div>
            ):(
              <>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
                  {[{l:'Total',v:ofertasFiltradas.length,c:'var(--text-1)'},{l:'Alta 90%+',v:ofertasAltas.length,c:'var(--ok)'},{l:'Media 70-89%',v:ofertasMedias.length,c:'var(--warn)'},{l:'Seleccionadas',v:seleccionadas.length,c:'var(--accent2)'}].map(k=>(
                    <div key={k.l} className="card" style={{margin:0,textAlign:'center',padding:12}}><div style={{fontSize:22,fontWeight:800,color:k.c}}>{k.v}</div><div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>{k.l}</div></div>
                  ))}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
                  <span style={{fontSize:12,fontWeight:600,color:'var(--text-2)'}}>Filtrar:</span>
                  {(['todos','alta','media','ats_only'] as const).map(v=>(
                    <button key={v} onClick={()=>setFiltroATS(v)} style={{padding:'5px 13px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',border:'none',background:filtroATS===v?'var(--accent)':'var(--bg-panel)',color:filtroATS===v?'#fff':'var(--text-2)',fontFamily:'var(--font)'}}>
                      {v==='todos'?'Todas':v==='alta'?'Alta 90%+':v==='media'?'Media 70-89%':'Solo ATS keywords'}
                    </button>
                  ))}
                  <button className="btn btn-sec" style={{fontSize:12,marginLeft:'auto'}} onClick={()=>setFase(3)}>Cambiar ubicacion / rebuscar</button>
                </div>
                {metodo&&<div className="info-box" style={{marginBottom:14,fontSize:12}}>Cada boton <b>Postular</b> abre directamente la oferta. Fuente: <b style={{color:'var(--accent2)'}}>{metodo}</b></div>}
                {ofertasAltas.length>0&&(
                  <div style={{marginBottom:24}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--ok)',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                      ALTA COMPATIBILIDAD (90%+) — POSTULA AHORA
                      <span style={{padding:'2px 10px',borderRadius:20,background:'rgba(26,173,110,.15)',fontSize:12}}>{ofertasAltas.length}</span>
                    </div>
                    {Array.from(new Set(ofertasAltas.map(o=>o.plataforma))).map(plat=>{
                      const grupo=ofertasAltas.filter(o=>o.plataforma===plat)
                      return(
                        <div key={plat} style={{marginBottom:16}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,padding:'6px 12px',background:'var(--bg-panel)',borderRadius:8,border:'1px solid var(--border)'}}>
                            <span style={{fontSize:13,fontWeight:700,color:'var(--accent2)'}}>{plat}</span>
                            <span style={{fontSize:12,color:'var(--text-3)'}}>{grupo.length} oferta{grupo.length>1?'s':''}</span>
                          </div>
                          {grupo.map(o=><OfertaCard key={o.id} o={o} onCheck={()=>toggleCheck(o.id)} compatColor={compatColor}/>)}
                        </div>
                      )
                    })}
                  </div>
                )}
                {ofertasMedias.length>0&&(
                  <div style={{marginBottom:20,opacity:0.85}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--warn)',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                      COMPATIBILIDAD MEDIA (70-89%)
                      <span style={{padding:'2px 10px',borderRadius:20,background:'rgba(232,160,32,.15)',fontSize:12}}>{ofertasMedias.length}</span>
                    </div>
                    {Array.from(new Set(ofertasMedias.map(o=>o.plataforma))).map(plat=>{
                      const grupo=ofertasMedias.filter(o=>o.plataforma===plat)
                      return(
                        <div key={plat} style={{marginBottom:14}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:7,padding:'5px 11px',background:'var(--bg-panel)',borderRadius:7,border:'1px solid var(--border)'}}>
                            <span style={{fontSize:12,fontWeight:700,color:'var(--warn)'}}>{plat}</span>
                            <span style={{fontSize:11,color:'var(--text-3)'}}>{grupo.length}</span>
                          </div>
                          {grupo.map(o=><OfertaCard key={o.id} o={o} onCheck={()=>toggleCheck(o.id)} compatColor={compatColor} dimmed/>)}
                        </div>
                      )
                    })}
                  </div>
                )}
                {ofertasBajas.length>0&&<div style={{opacity:0.5,marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--err)',marginBottom:10}}>BAJA COMPATIBILIDAD — {ofertasBajas.length}</div>
                  {ofertasBajas.map(o=><OfertaCard key={o.id} o={o} onCheck={()=>toggleCheck(o.id)} compatColor={compatColor} dimmed/>)}
                </div>}
                {ofertasFiltradas.length===0&&<div className="empty" style={{padding:50}}>Sin ofertas con el filtro seleccionado</div>}
                {seleccionadas.length>0&&(
                  <div className="card" style={{border:'1px solid var(--ok)'}}>
                    <div className="card-title" style={{color:'var(--ok)'}}>Postulaciones seleccionadas ({seleccionadas.length})</div>
                    {seleccionadas.map(o=>(
                      <div key={o.id} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 12px',borderRadius:8,background:'var(--bg-panel)',marginBottom:6}}>
                        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{o.titulo}</div><div style={{fontSize:11,color:'var(--text-3)'}}>{o.empresa} · {o.plataforma}</div></div>
                        <span style={{fontSize:14,fontWeight:700,color:compatColor(o.compatibilidad)}}>{o.compatibilidad}%</span>
                        <a href={o.link_postular} target="_blank" rel="noopener noreferrer" className="btn btn-ok" style={{fontSize:12,textDecoration:'none',padding:'6px 14px'}}>Postular en {o.plataforma} →</a>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
