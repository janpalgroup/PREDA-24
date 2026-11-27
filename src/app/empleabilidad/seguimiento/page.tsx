'use client'
import { useEffect, useState } from 'react'
import { useAI } from '@/hooks/useAI'
export default function SeguimientoPage() {
  const { callAI, loading } = useAI()
  const [postulaciones, setPostulaciones] = useState<any[]>([])
  const [postId,        setPostId]        = useState('')
  const [seguimientos,  setSeguimientos]  = useState<any[]>([])
  const [consejo,       setConsejo]       = useState('')
  const [saving,        setSaving]        = useState(false)
  const [form, setForm] = useState({ tipo:'email', fecha:'', descripcion:'', resultado:'', proximo_paso:'' })

  useEffect(()=>{ fetch('/api/postulaciones').then(r=>r.json()).then(d=>setPostulaciones(d.postulaciones||[])) },[])
  useEffect(()=>{
    if (!postId) return
    fetch('/api/seguimiento?postulacion_id='+postId).then(r=>r.json()).then(d=>setSeguimientos(d.seguimientos||[]))
  },[postId])

  async function save() {
    if (!form.descripcion.trim()) { alert('Ingresa la descripcion'); return }
    setSaving(true)
    await fetch('/api/seguimiento',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form,postulacion_id:postId}) })
    setSaving(false)
    setForm({ tipo:'email', fecha:'', descripcion:'', resultado:'', proximo_paso:'' })
    fetch('/api/seguimiento?postulacion_id='+postId).then(r=>r.json()).then(d=>setSeguimientos(d.seguimientos||[]))
  }

  async function genConsejo() {
    const post = postulaciones.find(p=>p.id===postId)
    const hist = seguimientos.map(s=>s.tipo+': '+s.descripcion).join('\n')
    const prompt =
      'Soy candidato en proceso de seleccion para el cargo "' + (post?.cargo||'') + '" en "' + (post?.empresa||'') + '".\n' +
      'Estado actual: ' + (post?.estado||'') + '\n' +
      'Historial de interacciones:\n' + hist + '\n\n' +
      'Como experto en empleabilidad, que debo hacer ahora para avanzar en este proceso? Dame 3-5 acciones concretas y especificas.'
    const r = await callAI(prompt, 'Eres PREDA, experto en empleabilidad. Responde en espanol con consejos practicos.')
    if (r) setConsejo(r)
  }

  const post = postulaciones.find(p=>p.id===postId)
  const TIPOS = ['llamada','email','entrevista','feedback','oferta','otro']
  const TIPOICO: Record<string,string> = { llamada:'📞', email:'✉️', entrevista:'🎙️', feedback:'💬', oferta:'📋', otro:'📝' }

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'14px 26px 10px',borderBottom:'1px solid var(--border)'}}>
        <div style={{fontSize:20,fontWeight:600}}>Seguimiento de Postulaciones</div>
        <div style={{fontSize:12,color:'var(--text-3)',marginTop:4}}>Registra interacciones y obtén consejos de IA para avanzar</div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 26px',background:'rgba(26,173,110,.04)',borderBottom:'1px solid var(--border)',flexShrink:0}}>
        <label style={{margin:0}}>Postulacion:</label>
        <select value={postId} onChange={e=>setPostId(e.target.value)} style={{maxWidth:400,fontSize:13}}>
          <option value="">Selecciona una postulacion...</option>
          {postulaciones.map(p=><option key={p.id} value={p.id}>{p.cargo} — {p.empresa} ({p.estado})</option>)}
        </select>
        {postId && <button className="btn btn-ok" style={{fontSize:12}} onClick={genConsejo} disabled={loading}>{loading?<><span className="spin"/> Generando...</>:'¿Que hago ahora?'}</button>}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'14px 26px'}}>
        {!postId ? <div className="empty">Selecciona una postulacion para ver el seguimiento</div> : (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,alignItems:'start'}}>
            <div>
              {consejo && (
                <div className="card" style={{marginBottom:14,background:'rgba(26,173,110,.05)',border:'1px solid var(--ok)'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--ok)',marginBottom:8}}>CONSEJO DE PREDA</div>
                  <div style={{fontSize:13,lineHeight:1.8,whiteSpace:'pre-wrap'}}>{consejo}</div>
                </div>
              )}
              <div className="card">
                <div className="card-title">Registrar Interaccion</div>
                <div className="g2">
                  <div className="field"><label>Tipo</label>
                    <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                      {TIPOS.map(t=><option key={t} value={t}>{TIPOICO[t]} {t}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Fecha</label><input type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))}/></div>
                </div>
                <div className="field"><label>¿Que paso? *</label><textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} style={{minHeight:70}} placeholder="Describe la interaccion..."/></div>
                <div className="field"><label>Resultado</label><input value={form.resultado} onChange={e=>setForm(f=>({...f,resultado:e.target.value}))} placeholder="Resultado de esta interaccion"/></div>
                <div className="field"><label>Proximo paso</label><input value={form.proximo_paso} onChange={e=>setForm(f=>({...f,proximo_paso:e.target.value}))} placeholder="Que hacer despues"/></div>
                <button className="btn btn-ok" onClick={save} disabled={saving} style={{width:'100%',justifyContent:'center'}}>{saving?<><span className="spin"/> Guardando...</>:'Registrar interaccion'}</button>
              </div>
            </div>
            <div className="card">
              <div className="card-title">Historial — {post?.cargo} en {post?.empresa}</div>
              {seguimientos.length===0 ? <div className="empty" style={{padding:30}}>Sin interacciones registradas</div> : seguimientos.map(s=>(
                <div key={s.id} style={{padding:'10px 12px',background:'var(--bg-panel)',borderRadius:9,border:'1px solid var(--border)',borderLeft:'3px solid var(--accent)',marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}>
                    <span style={{fontSize:14}}>{TIPOICO[s.tipo]||'📝'}</span>
                    <span style={{fontSize:11,fontWeight:600,color:'var(--accent2)',textTransform:'capitalize'}}>{s.tipo}</span>
                    {s.fecha&&<span style={{fontSize:11,color:'var(--text-3)',marginLeft:'auto'}}>{s.fecha}</span>}
                  </div>
                  <div style={{fontSize:13,marginBottom:2}}>{s.descripcion}</div>
                  {s.resultado&&<div style={{fontSize:11,color:'var(--ok)'}}>✅ {s.resultado}</div>}
                  {s.proximo_paso&&<div style={{fontSize:11,color:'var(--accent2)',marginTop:2}}>→ {s.proximo_paso}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
