'use client'
import { useEffect, useState } from 'react'
import { useAI } from '@/hooks/useAI'
import PruebasPanel from '@/components/PruebasPanel'
import { useProcesoActivo } from '@/hooks/useProcesoActivo'
function MensajesTab() {
  const { callAI, loading } = useAI()
  const { procesos, procesoId, setProcesoId } = useProcesoActivo()
  const [candidatos, setCandidatos] = useState<any[]>([])
  const [selCands,   setSelCands]   = useState<string[]>([])
  const [tipo,       setTipo]       = useState('citacion_entrevista')
  const [fecha,      setFecha]      = useState('')
  const [hora,       setHora]       = useState('')
  const [lugar,      setLugar]      = useState('')
  const [detalles,   setDetalles]   = useState('')
  const [empresa,    setEmpresa]    = useState('')
  const [emails,     setEmails]     = useState<{nombre:string,email:string,telefono:string,cuerpo:string}[]>([])
  const [copied,     setCopied]     = useState<string|null>(null)

  const TIPOS = [
    {id:'invitacion_postular',     label:'Invitacion a participar en el proceso'},
    {id:'recepcion_cv',            label:'Confirmacion de recepcion de CV'},
    {id:'solicitud_informacion',   label:'Solicitud de informacion / CV actualizado'},
    {id:'citacion_entrevista',     label:'Citacion a entrevista'},
    {id:'confirmacion_entrevista', label:'Confirmacion de entrevista'},
    {id:'recordatorio_entrevista', label:'Recordatorio de entrevista'},
    {id:'reprogramacion',          label:'Reprogramacion de entrevista'},
    {id:'prueba_tecnica',          label:'Envio de prueba tecnica / psicolaboral'},
    {id:'resultado_aprobado',      label:'Resultado aprobado — pasa a siguiente etapa'},
    {id:'resultado_descartado',    label:'Resultado — no continua en el proceso'},
    {id:'banco_talentos',          label:'Incorporacion al banco de talentos'},
    {id:'solicitud_referencias',   label:'Solicitud de referencias laborales'},
    {id:'verificacion_datos',      label:'Autorizacion de verificacion de antecedentes'},
    {id:'oferta_laboral',          label:'Oferta laboral formal'},
    {id:'negociacion_salarial',    label:'Negociacion / contraoferta salarial'},
    {id:'aceptacion_oferta',       label:'Confirmacion de aceptacion de oferta'},
    {id:'solicitud_documentos',    label:'Solicitud de documentos de ingreso'},
    {id:'bienvenida',              label:'Bienvenida — nuevo ingreso'},
    {id:'seguimiento_postentrevista', label:'Seguimiento post-entrevista'},
    {id:'feedback_candidato',      label:'Retroalimentacion al candidato'},
    {id:'agradecimiento',          label:'Agradecimiento por participar'},
    {id:'cierre_proceso',          label:'Cierre del proceso'},
  ]
  const [canal, setCanal] = useState<'email'|'whatsapp'>('email')
  const [historial, setHistorial] = useState<any[]>([])
  const telWA = (t:string) => { const d=(t||'').replace(/\D/g,''); return d.length===9?'51'+d:d }

  useEffect(()=>{
    if (!procesoId) { setCandidatos([]); setSelCands([]); setHistorial([]); return }
    fetch('/api/informes?tipo=mensaje&proceso_id='+procesoId).then(r=>r.json()).then(d=>setHistorial(d.informes||[]))
    fetch('/api/candidatos?proceso_id='+procesoId).then(r=>r.json()).then(d=>{
      setCandidatos(d.candidatos||[]); setSelCands([])
      const proc = procesos.find(p=>p.id===procesoId)
      if (proc?.empresa) setEmpresa(proc.empresa)
    })
  },[procesoId])

  function toggleCand(id: string) {
    setSelCands(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  }

  async function genEmails() {
    const targets = candidatos.filter(c=>selCands.includes(c.id))
    if (!targets.length) { alert('Selecciona al menos un candidato'); return }
    const proc     = procesos.find(p=>p.id===procesoId)
    const tipoLbl  = TIPOS.find(t=>t.id===tipo)?.label || tipo
    const res: {nombre:string,email:string,telefono:string,cuerpo:string}[] = []
    for (const c of targets) {
      const datos =
        'Destinatario: ' + c.nombre + '\n' +
        'Cargo: ' + (c.cargo||proc?.cargo||'') + '\n' +
        'Empresa: ' + (empresa||'PREDA CONSULTORES') + '\n' +
        (fecha    ? 'Fecha: '    + fecha    + '\n' : '') +
        (hora     ? 'Hora: '     + hora     + '\n' : '') +
        (lugar    ? 'Lugar: '    + lugar    + '\n' : '') +
        (detalles ? 'Detalles: ' + detalles + '\n' : '')
      const prompt = canal==='whatsapp'
        ? 'Redacta un mensaje de WhatsApp de RRHH, tipo "' + tipoLbl + '", para:\n' + datos + '\nMensaje breve (maximo 6 lineas), cordial y profesional, en espanol, con saludo por el nombre, maximo 2 emojis, sin asunto y sin firma extensa. Devuelve solo el mensaje.'
        : 'Genera email profesional de RRHH tipo "' + tipoLbl + '" para:\n' + datos + '\nEmail profesional, cordial, en espanol, maximo 3 parrafos.\nFormato: ASUNTO: [asunto]\n\n[cuerpo]\n\nAtentamente,\nEquipo de Seleccion\n' + (empresa||'PREDA CONSULTORES')
      const r = await callAI(prompt, 'Eres PREDA, experto en comunicaciones RRHH. Emails profesionales en espanol.')
      if (r) {
        const cuerpo = r.replace(/\*\*/g,'')
        res.push({ nombre:c.nombre, email:c.email||'', telefono:c.telefono||'', cuerpo })
        fetch('/api/informes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipo:'mensaje',proceso_id:procesoId||null,candidato_id:c.id,titulo:(canal==='whatsapp'?'WhatsApp':'Email')+' — '+tipoLbl+' — '+c.nombre,contenido:cuerpo,datos:{canal,tipo,email:c.email||'',telefono:c.telefono||''}})}).then(x=>x.json()).then(d=>{if(d.informe)setHistorial(h=>[d.informe,...h])})
      }
    }
    setEmails(res)
  }

  function copyEmail(idx: number) {
    navigator.clipboard.writeText(emails[idx].cuerpo)
    setCopied(String(idx))
    setTimeout(()=>setCopied(null), 2000)
  }

  function downloadAll() {
    const txt = emails.map(e => 'Para: '+e.nombre+' <'+e.email+'>\n\n'+e.cuerpo).join('\n\n'+'='.repeat(50)+'\n\n')
    const b=new Blob([txt],{type:'text/plain'})
    const a=document.createElement('a');a.href=URL.createObjectURL(b)
    a.download='Mensajes_RRHH.txt';a.click()
  }

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'14px 26px 10px',borderBottom:'1px solid var(--border)'}}>
        <div style={{fontSize:20,fontWeight:600}}>Emails RRHH</div>
        <div style={{fontSize:12,color:'var(--text-3)',marginTop:4}}>Selecciona proceso → marca candidatos → genera correos o WhatsApp personalizados con IA (todo queda guardado)</div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'18px 26px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,alignItems:'start',maxWidth:1100}}>
        <div>
          <div className="card" style={{marginBottom:12}}>
            <div className="card-title">1. Proceso</div>
            <div className="field">
              <select value={procesoId} onChange={e=>setProcesoId(e.target.value)}>
                <option value="">Selecciona un proceso...</option>
                {procesos.map(p=><option key={p.id} value={p.id}>{p.nombre} — {p.empresa||''}</option>)}
              </select>
            </div>
            <div className="field"><label>Empresa</label>
              <input value={empresa} onChange={e=>setEmpresa(e.target.value)} placeholder="Nombre de la empresa"/>
            </div>
          </div>
          {procesoId && (
            <div className="card" style={{marginBottom:12}}>
              <div className="card-title" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span>2. Destinatarios ({selCands.length} sel.)</span>
                <div style={{display:'flex',gap:6}}>
                  <button className="btn btn-sec" style={{fontSize:11,padding:'3px 8px'}} onClick={()=>setSelCands(candidatos.map(c=>c.id))}>Todos</button>
                  <button className="btn btn-sec" style={{fontSize:11,padding:'3px 8px'}} onClick={()=>setSelCands([])}>Ninguno</button>
                </div>
              </div>
              {candidatos.length===0 ? <div style={{fontSize:13,color:'var(--text-3)'}}>Sin candidatos</div> : (
                <div style={{display:'flex',flexDirection:'column',gap:5,maxHeight:260,overflowY:'auto'}}>
                  {candidatos.map(c=>(
                    <label key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,
                      background:selCands.includes(c.id)?'rgba(30,123,232,.1)':'var(--bg-panel)',
                      border:'1px solid '+(selCands.includes(c.id)?'var(--accent)':'var(--border)'),cursor:'pointer',margin:0}}>
                      <input type="checkbox" checked={selCands.includes(c.id)} onChange={()=>toggleCand(c.id)} style={{width:16,height:16,accentColor:'var(--accent)'}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600}}>{c.nombre}</div>
                        <div style={{fontSize:11,color:'var(--text-3)'}}>{c.cargo||''} · {c.etapa}{c.email?' · '+c.email:''}</div>
                      </div>
                      {c.score&&<span style={{fontSize:13,fontWeight:700,color:c.score>=60?'var(--ok)':'var(--warn)'}}>{c.score}</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="card">
            <div className="card-title">3. Tipo y detalles</div>
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              <button className={'btn '+(canal==='email'?'btn-primary':'btn-sec')} style={{fontSize:12}} onClick={()=>setCanal('email')}>✉️ Email</button>
              <button className={'btn '+(canal==='whatsapp'?'btn-primary':'btn-sec')} style={{fontSize:12}} onClick={()=>setCanal('whatsapp')}>💬 WhatsApp</button>
            </div>
            <div className="field"><label>Situacion</label>
              <select value={tipo} onChange={e=>setTipo(e.target.value)}>
                {TIPOS.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            {(['citacion_entrevista','confirmacion_entrevista','recordatorio_entrevista','reprogramacion'].includes(tipo)) && (
              <div className="g2">
                <div className="field"><label>Fecha</label><input value={fecha} onChange={e=>setFecha(e.target.value)} placeholder="Lunes 28 de Julio"/></div>
                <div className="field"><label>Hora</label><input value={hora} onChange={e=>setHora(e.target.value)} placeholder="10:00 AM"/></div>
                <div className="field" style={{gridColumn:'1/-1'}}><label>Lugar / Modalidad</label><input value={lugar} onChange={e=>setLugar(e.target.value)} placeholder="Oficinas / Google Meet"/></div>
              </div>
            )}
            <div className="field"><label>Detalles adicionales</label>
              <textarea value={detalles} onChange={e=>setDetalles(e.target.value)} style={{minHeight:55}} placeholder="Instrucciones especiales..."/>
            </div>
            <button className="btn btn-primary" onClick={genEmails} disabled={loading||selCands.length===0}
              style={{width:'100%',justifyContent:'center',fontSize:14,padding:'10px'}}>
              {loading ? <><span className="spin"/> Generando {selCands.length} email{selCands.length>1?'s':''}...</> :
                'Generar ' + (selCands.length||'') + (canal==='whatsapp'?' WhatsApp':' email') + (selCands.length!==1?'s':'') + ' con IA'}
            </button>
          </div>
        </div>
        <div>
          {emails.length===0 ? (
            <div className="card" style={{textAlign:'center'}}><div className="empty" style={{padding:50}}>Los emails generados apareceran aqui</div></div>
          ) : (
            <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <span style={{fontSize:14,fontWeight:600,color:'var(--ok)'}}>{emails.length} email{emails.length>1?'s':''} generado{emails.length>1?'s':''}</span>
                <button className="btn btn-sec" style={{fontSize:12}} onClick={downloadAll}>Descargar todos</button>
              </div>
              {emails.map((e,idx)=>(
                <div key={idx} className="card" style={{marginBottom:12}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700}}>{e.nombre}</div>
                      <div style={{fontSize:12,color:'var(--accent2)'}}>{canal==='whatsapp'?(e.telefono||'(sin telefono)'):(e.email||'(sin email)')}</div>
                    </div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
                      <button className="btn btn-ok" onClick={()=>copyEmail(idx)} style={{fontSize:12,padding:'5px 12px'}}>{copied===String(idx)?'Copiado!':'Copiar'}</button>
                      {canal==='whatsapp'
                        ? <a className="btn btn-sec" style={{fontSize:12,padding:'5px 12px',textDecoration:'none'}} target="_blank" rel="noreferrer" href={'https://wa.me/'+telWA(e.telefono)+'?text='+encodeURIComponent(e.cuerpo)}>Abrir en WhatsApp</a>
                        : <a className="btn btn-sec" style={{fontSize:12,padding:'5px 12px',textDecoration:'none'}} href={'mailto:'+e.email+'?subject='+encodeURIComponent((e.cuerpo.match(/ASUNTO:\s*(.*)/i)||[])[1]||'')+'&body='+encodeURIComponent(e.cuerpo.replace(/ASUNTO:.*\n+/i,''))}>Abrir en correo</a>}
                    </div>
                  </div>
                  <div style={{fontSize:12,lineHeight:1.8,whiteSpace:'pre-wrap',maxHeight:250,overflowY:'auto',
                    background:'var(--bg-panel)',padding:12,borderRadius:8,border:'1px solid var(--border)'}}>{e.cuerpo}</div>
                </div>
              ))}
            </>
          )}
          {historial.length>0 && (
            <div className="card">
              <div className="card-title">Mensajes guardados de este proceso ({historial.length})</div>
              <div style={{maxHeight:280,overflowY:'auto'}}>
                {historial.map((h:any)=>(
                  <details key={h.id} style={{marginBottom:6}}>
                    <summary style={{fontSize:12,cursor:'pointer'}}>{h.titulo} · {new Date(h.created_at).toLocaleDateString('es-PE')}</summary>
                    <div style={{fontSize:12,lineHeight:1.7,whiteSpace:'pre-wrap',padding:8,background:'var(--bg-panel)',borderRadius:6,marginTop:4}}>{h.contenido}</div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EmailsPage() {
  const [tab, setTab] = useState<'msg' | 'pruebas'>('msg')
  const { procesos, procesoId, setProcesoId } = useProcesoActivo()
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 6, padding: '10px 26px 0', borderBottom: '1px solid var(--border)' }}>
        <button className={'btn ' + (tab === 'msg' ? 'btn-primary' : 'btn-sec')} style={{ fontSize: 12, borderRadius: '8px 8px 0 0' }} onClick={() => setTab('msg')}>✉️ Correos y WhatsApp</button>
        <button className={'btn ' + (tab === 'pruebas' ? 'btn-primary' : 'btn-sec')} style={{ fontSize: 12, borderRadius: '8px 8px 0 0' }} onClick={() => setTab('pruebas')}>📝 Formularios y pruebas</button>
      </div>
      {tab === 'msg' ? <MensajesTab /> : <PruebasPanel procesos={procesos} procesoId={procesoId} setProcesoId={setProcesoId} />}
    </div>
  )
}
