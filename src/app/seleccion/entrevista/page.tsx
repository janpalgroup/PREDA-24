'use client'
import { useEffect, useRef, useState } from 'react'
import { useAI } from '@/hooks/useAI'
import { useProcesoActivo } from '@/hooks/useProcesoActivo'
import Radar from '@/components/Radar'

type Preg = { comp: string; q: string; transcripcion: string; audio_path: string | null; evaluacion: string; pts: number }
const EJES = [
  ['comunicacion', 'Comunicación'], ['liderazgo', 'Liderazgo'], ['confiabilidad', 'Confiabilidad'], ['integridad', 'Integridad'],
  ['estabilidad', 'Estabilidad emocional'], ['resultados', 'Orient. a resultados'], ['equipo', 'Trabajo en equipo'], ['adaptabilidad', 'Adaptabilidad'],
]
const BIG5 = [['apertura', 'Apertura'], ['responsabilidad', 'Responsabilidad'], ['extraversion', 'Extraversión'], ['amabilidad', 'Amabilidad'], ['estabilidad_emocional', 'Estabilidad emocional']]
const MAX_SEG = 480

export default function EntrevistaPage() {
  const { callAI, loading } = useAI()
  const { procesos, procesoId, setProcesoId } = useProcesoActivo()
  const [candidatos, setCandidatos] = useState<any[]>([])
  const [candId, setCandId] = useState('')
  const [cargo, setCargo] = useState('')
  const [tipo, setTipo] = useState('Por competencias STAR')
  const [nPreg, setNPreg] = useState('6')
  const [entId, setEntId] = useState<string | null>(null)
  const [preguntas, setPreguntas] = useState<Preg[]>([])
  const [informe, setInforme] = useState('')
  const [perfil, setPerfil] = useState<any>(null)
  const [puntaje, setPuntaje] = useState<number | null>(null)
  const [tab, setTab] = useState<'config' | 'entrevista' | 'informe'>('config')
  const [generando, setGenerando] = useState(false)
  const [grabando, setGrabando] = useState<number | null>(null)
  const [segundos, setSegundos] = useState(0)
  const [procesandoAudio, setProcesandoAudio] = useState<number | null>(null)
  const [evaluando, setEvaluando] = useState<number | null>(null)
  const [msg, setMsg] = useState<Record<number, string>>({})
  const [audioUrl, setAudioUrl] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState('')
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const segRef = useRef(0)
  const entIdRef = useRef<string | null>(null)
  const saveChain = useRef<Promise<any>>(Promise.resolve())
  const S = useRef<any>({})

  const proceso = procesos.find(p => p.id === procesoId)
  const cand = candidatos.find(c => c.id === candId)
  S.current = { procesoId, candId, cand, cargo, tipo, preguntas, informe, perfil, puntaje }
  function setEnt(id: string | null) { entIdRef.current = id; setEntId(id) }

  useEffect(() => {
    setCandId('')
    if (!procesoId) { setCandidatos([]); return }
    fetch('/api/candidatos?proceso_id=' + procesoId).then(r => r.json()).then(d => setCandidatos(d.candidatos || []))
    const p = procesos.find(x => x.id === procesoId)
    if (p?.cargo) setCargo(p.cargo)
  }, [procesoId])
  // Al elegir candidato: recupera la ultima entrevista guardada (nada se pierde)
  useEffect(() => {
    if (!candId) return
    fetch('/api/entrevistas?candidato_id=' + candId).then(r => r.json()).then(d => {
      const e = (d.entrevistas || [])[0]
      if (e) {
        setEnt(e.id); setPreguntas(e.preguntas || []); setInforme(e.informe || ''); setPerfil(e.perfil || null)
        setPuntaje(e.puntaje ?? null); setCargo(e.cargo || cargo); setTipo(e.tipo || tipo); setTab('entrevista')
      } else { nuevaEntrevista(false) }
    })
  }, [candId])

  function nuevaEntrevista(irConfig = true) {
    setEnt(null); setPreguntas([]); setInforme(''); setPerfil(null); setPuntaje(null); setAudioUrl({}); setMsg({})
    if (irConfig) setTab('config')
  }

  function guardar(next?: { preguntas?: Preg[]; informe?: string; perfil?: any; puntaje?: number | null }) {
    saveChain.current = saveChain.current.then(() => doGuardar(next)).catch(() => {})
    return saveChain.current
  }
  async function doGuardar(next?: { preguntas?: Preg[]; informe?: string; perfil?: any; puntaje?: number | null }) {
    const st = S.current
    const body: any = {
      id: entIdRef.current, proceso_id: st.procesoId || null, candidato_id: st.candId || null, candidato_nombre: st.cand?.nombre || null,
      cargo: st.cargo, tipo: st.tipo, preguntas: next?.preguntas ?? st.preguntas, informe: next?.informe ?? st.informe,
      perfil: next?.perfil !== undefined ? next.perfil : st.perfil, puntaje: next?.puntaje !== undefined ? next.puntaje : st.puntaje,
    }
    try {
      const r = await fetch('/api/entrevistas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      if (d.entrevista) {
        if (!entIdRef.current) setEnt(d.entrevista.id)
        setSaved('Guardado ' + new Date().toLocaleTimeString('es-PE'))
        if (st.candId && st.cand?.etapa === 'cv') {
          fetch('/api/candidatos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: st.candId, etapa: 'entrevista' }) })
          setCandidatos(prev => prev.map(c => c.id === st.candId ? { ...c, etapa: 'entrevista' } : c))
        }
      } else setSaved('Error al guardar: ' + (d.error || ''))
    } catch (e: any) { setSaved('Error al guardar: ' + e.message) }
  }

  async function genPreguntas() {
    if (!cargo.trim()) { alert('Selecciona un proceso o ingresa el cargo'); return }
    setGenerando(true)
    const cvTxt = (cand?.cv_text || '').substring(0, 3500)
    const prompt =
      'Genera ' + nPreg + ' preguntas de entrevista de tipo "' + tipo + '" para el cargo "' + cargo + '".\n\n' +
      (proceso ? 'PLAZA / PROCESO: ' + (proceso.nombre || '') + (proceso.empresa ? ' — ' + proceso.empresa : '') + '\n' +
        'RESPONSABILIDADES Y DESCRIPCION: ' + (proceso.descripcion || 'no especificada').substring(0, 1500) + '\n' +
        'REQUISITOS Y CRITERIOS DE LA PLAZA: ' + (proceso.requisitos || 'no especificados').substring(0, 1200) + '\n\n' : '') +
      (cvTxt ? 'CV DEL CANDIDATO ' + (cand?.nombre || '') + ' (usa su experiencia real para personalizar: indaga vacios, logros, cambios de empleo, brechas frente a la plaza):\n' + cvTxt + '\n\n' : '') +
      'Incluye preguntas que verifiquen los logros del CV, las responsabilidades clave de la plaza, motivacion, manejo de presion, integridad y confiabilidad.\n' +
      'Formato ESTRICTO — dos lineas por pregunta:\nCOMPETENCIA: nombre de la competencia\nPREGUNTA: pregunta completa\n\nSin introducciones ni numeracion.'
    const r = await callAI(prompt, 'Eres PREDA, experto en entrevistas por competencias y evaluacion psicolaboral. Responde en espanol.')
    setGenerando(false)
    if (!r) return
    const lines = r.replace(/\*\*/g, '').replace(/^#+\s*/gm, '').split('\n').map(l => l.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim()).filter(Boolean)
    const qs: Preg[] = []
    let comp = 'Competencia'
    for (const l of lines) {
      const mc = l.match(/^COMPETENCIA\s*:\s*(.*)$/i), mq = l.match(/^PREGUNTA\s*(?:\d+)?\s*:\s*(.*)$/i)
      if (mc) comp = mc[1].replace(/[\[\]]/g, '').trim() || comp
      else if (mq) { const q = mq[1].replace(/[\[\]]/g, '').trim(); if (q) qs.push({ comp, q, transcripcion: '', audio_path: null, evaluacion: '', pts: 0 }) }
      else if (l.includes('?') && l.length > 20) qs.push({ comp: 'Evaluacion', q: l, transcripcion: '', audio_path: null, evaluacion: '', pts: 0 })
    }
    if (!qs.length) { alert('No se pudieron leer las preguntas. Respuesta de la IA: ' + r.substring(0, 200)); return }
    setPreguntas(qs); setInforme(''); setPerfil(null); setPuntaje(null); setTab('entrevista')
    await guardar({ preguntas: qs, informe: '', perfil: null, puntaje: null })
  }

  function setP(i: number, patch: Partial<Preg>) {
    setPreguntas(prev => prev.map((p, k) => k === i ? { ...p, ...patch } : p))
  }

  async function iniciarGrabacion(i: number) {
    if (grabando !== null) return
    setMsg(m => ({ ...m, [i]: '' }))
    if (typeof window === 'undefined' || !navigator.mediaDevices || typeof MediaRecorder === 'undefined') {
      setMsg(m => ({ ...m, [i]: 'Este navegador no permite grabar. Usa Chrome o Edge, o escribe la respuesta.' })); return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const tipos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
      const mime = tipos.find(t => (MediaRecorder as any).isTypeSupported?.(t)) || ''
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 })
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || mime || 'audio/webm' })
        subirAudio(i, blob)
      }
      recRef.current = rec
      rec.start(1000)
      setGrabando(i); setSegundos(0); segRef.current = 0
      timerRef.current = setInterval(() => {
        segRef.current += 1; setSegundos(segRef.current)
        if (segRef.current >= MAX_SEG) detenerGrabacion()
      }, 1000)
    } catch (e: any) {
      setMsg(m => ({ ...m, [i]: 'No se pudo acceder al micrófono: ' + (e.name === 'NotAllowedError' ? 'permiso denegado. Permite el micrófono en el candado de la barra de direcciones.' : e.message) }))
    }
  }
  function detenerGrabacion() {
    clearInterval(timerRef.current)
    try { if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop() } catch {}
    setGrabando(null)
  }
  async function subirAudio(i: number, blob: Blob) {
    if (blob.size < 800) { setMsg(m => ({ ...m, [i]: 'La grabación quedó vacía. Intenta de nuevo.' })); return }
    setProcesandoAudio(i)
    setMsg(m => ({ ...m, [i]: 'Guardando audio y transcribiendo...' }))
    try {
      const fd = new FormData()
      const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
      fd.append('audio', new File([blob], 'respuesta.' + ext, { type: blob.type }))
      fd.append('key', S.current.candId || S.current.procesoId || 'general'); fd.append('idx', String(i))
      const r = await fetch('/api/entrevista-audio', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok || d.error) throw new Error(d.error || 'Error al subir audio')
      const cur: Preg[] = S.current.preguntas
      const prev = cur[i]
      const texto = d.transcript ? ((prev?.transcripcion ? prev.transcripcion + '\n' : '') + d.transcript) : (prev?.transcripcion || '')
      const nuevas = cur.map((p, k) => k === i ? { ...p, audio_path: d.audio_path || p.audio_path, transcripcion: texto } : p)
      setPreguntas(nuevas)
      let aviso = d.transcript ? 'Audio guardado y transcrito. Revisa el texto y evalúa.' : 'Audio guardado.'
      if (d.transcript_error) aviso += ' No se pudo transcribir (' + d.transcript_error + '). Escribe la respuesta manualmente.'
      if (d.storage_error) aviso += ' El audio no se pudo guardar en la nube (' + d.storage_error + '); la transcripción sí se conservó.'
      setMsg(m => ({ ...m, [i]: aviso }))
      await guardar({ preguntas: nuevas })
    } catch (e: any) {
      setMsg(m => ({ ...m, [i]: 'Error: ' + e.message }))
    }
    setProcesandoAudio(null)
  }
  async function escuchar(i: number) {
    const p = preguntas[i]; if (!p.audio_path) return
    const r = await fetch('/api/entrevista-audio?path=' + encodeURIComponent(p.audio_path)); const d = await r.json()
    if (d.url) setAudioUrl(a => ({ ...a, [i]: d.url })); else alert('No se pudo abrir el audio: ' + (d.error || ''))
  }

  async function evaluar(i: number) {
    const q = preguntas[i]
    if (!q.transcripcion.trim()) { alert('Graba o escribe la respuesta primero'); return }
    setEvaluando(i)
    const r = await callAI(
      'Evalúa esta respuesta de entrevista (transcrita de audio, puede tener errores menores de transcripción):\nCargo: ' + cargo + '\nCompetencia: ' + q.comp + '\nPregunta: ' + q.q +
      '\nRespuesta del candidato: ' + q.transcripcion + '\n\nEntrega, sin tablas ni negritas:\nNIVEL: Básico/Intermedio/Avanzado\nPOSITIVO: fortaleza observada\nMEJORAR: area de mejora\nSEÑALES DE ALERTA: incongruencias, evasivas o riesgos (o "ninguna")\nPUNTAJE: X/10',
      'Eres PREDA, experto en evaluacion de entrevistas. Responde en espanol.'
    )
    setEvaluando(null)
    if (!r) return
    const m = r.replace(/\*\*/g, '').match(/PUNTAJE[^0-9\n]{0,15}(\d+)/i)
    const pts = Math.min(10, parseInt((m || [])[1] || '0'))
    const nuevas = preguntas.map((p, k) => k === i ? { ...p, evaluacion: r.replace(/\*\*/g, ''), pts } : p)
    setPreguntas(nuevas)
    await guardar({ preguntas: nuevas })
  }

  async function genInforme() {
    const resp = preguntas.filter(p => p.transcripcion.trim())
    if (!resp.length) { alert('Responde (graba o escribe) al menos una pregunta'); return }
    const resumen = preguntas.map((p, i) => 'P' + (i + 1) + ' [' + p.comp + '] ' + p.q + '\nRespuesta: ' + (p.transcripcion || '(sin respuesta)') + '\nEvaluacion: ' + (p.evaluacion || 'no evaluada') + '\nPuntaje: ' + p.pts + '/10').join('\n\n')
    const prompt =
      'Genera el INFORME DE ENTREVISTA con analisis de perfil para el cargo "' + cargo + '", candidato ' + (cand?.nombre || '') + '.\n\n' +
      (proceso ? 'PLAZA: ' + (proceso.descripcion || '').substring(0, 800) + ' | Requisitos: ' + (proceso.requisitos || '').substring(0, 600) + '\n\n' : '') +
      (cand?.resultado ? 'EVALUACION PREVIA DEL CV (score ' + (cand.score || '?') + '/100):\n' + String(cand.resultado).substring(0, 1200) + '\n\n' : '') +
      'RESPUESTAS DE ENTREVISTA:\n' + resumen + '\n\n' +
      'Entrega, sin tablas ni negritas, con estas secciones:\n1. RESUMEN EJECUTIVO\n2. COMPETENCIAS EVALUADAS (puntaje por cada una)\n3. ANALISIS DE PERSONALIDAD (tendencias observadas en el discurso)\n4. CONFIABILIDAD E INTEGRIDAD (coherencia entre CV y respuestas, señales de alerta)\n5. FORTALEZAS\n6. AREAS DE MEJORA Y RECOMENDACIONES DE COACHING\n7. AJUSTE A LA PLAZA Y RECOMENDACION FINAL (Contratar / Contratar con reservas / No contratar)\n\n' +
      'AL FINAL, en la ultima linea escribe exactamente: PERFIL_JSON: {"comunicacion":N,"liderazgo":N,"confiabilidad":N,"integridad":N,"estabilidad":N,"resultados":N,"equipo":N,"adaptabilidad":N,"bigfive":{"apertura":N,"responsabilidad":N,"extraversion":N,"amabilidad":N,"estabilidad_emocional":N},"global":N} con N entero 0-100 segun lo observado en las respuestas.'
    const r = await callAI(prompt, 'Eres PREDA, psicologo organizacional y coach ejecutivo experto en seleccion. Basas tus juicios solo en lo dicho por el candidato. Responde en espanol.')
    if (!r) return
    const jm = r.match(/PERFIL_JSON\s*:?\s*(\{[\s\S]*\})\s*$/i)
    let pf: any = null
    if (jm) { try { pf = JSON.parse(jm[1]) } catch {} }
    const texto = r.replace(/PERFIL_JSON[\s\S]*$/i, '').replace(/\*\*/g, '').replace(/^#{1,4}\s*/gm, '').trim()
    let glob: number | null = pf?.global != null ? Math.round(Number(pf.global)) : null
    if (glob === null) { const pts = preguntas.filter(p => p.pts > 0); if (pts.length) glob = Math.round(pts.reduce((a, p) => a + p.pts, 0) / pts.length * 10) }
    setInforme(texto); setPerfil(pf); setPuntaje(glob); setTab('informe')
    await guardar({ informe: texto, perfil: pf, puntaje: glob })
  }

  const respondidas = preguntas.filter(p => p.transcripcion.trim()).length
  const fmt = (s: number) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
  const sC = (s: number) => s >= 70 ? 'var(--ok)' : s >= 50 ? 'var(--warn)' : 'var(--err)'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="no-print" style={{ padding: '14px 26px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>Entrevista con IA</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Preguntas desde el CV y la plaza · grabación de audio · transcripción · análisis de perfil y telaraña</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: saved.startsWith('Error') ? 'var(--err)' : 'var(--ok)' }}>{saved}</div>
      </div>
      <div className="no-print" style={{ display: 'flex', gap: 2, padding: '0 26px', borderBottom: '1px solid var(--border)' }}>
        {([['config', 'Configurar'], ['entrevista', 'Entrevista (' + preguntas.length + ' preguntas)'], ['informe', 'Informe y perfil']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: tab === k ? '2px solid var(--accent)' : '2px solid transparent', color: tab === k ? 'var(--accent2)' : 'var(--text-3)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>{l}</button>
        ))}
      </div>
      <div className="no-print" style={{ flex: 1, overflowY: 'auto', padding: '18px 26px' }}>
        {tab === 'config' && (
          <div className="card" style={{ maxWidth: 900 }}>
            <div className="card-title">Configurar entrevista</div>
            <div className="field"><label>Proceso (plaza)</label>
              <select value={procesoId} onChange={e => setProcesoId(e.target.value)}>
                <option value="">Sin proceso (solo cargo)</option>
                {procesos.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.empresa || ''}</option>)}
              </select>
            </div>
            <div className="field"><label>Candidato (usa su CV para personalizar y guarda todo en su ficha)</label>
              <select value={candId} onChange={e => setCandId(e.target.value)} disabled={!procesoId}>
                <option value="">{procesoId ? 'Selecciona candidato' : 'Primero elige un proceso'}</option>
                {candidatos.map(c => <option key={c.id} value={c.id}>{c.nombre} — {c.score || '?'}/100</option>)}
              </select>
            </div>
            <div className="field"><label>Cargo *</label><input value={cargo} onChange={e => setCargo(e.target.value)} /></div>
            <div className="field"><label>Tipo de entrevista</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)}>
                {['Por competencias STAR', 'Técnica del cargo', 'Conductual', 'Situacional', 'Mixta (competencias + técnica)'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field"><label>Número de preguntas</label>
              <select value={nPreg} onChange={e => setNPreg(e.target.value)}>{['4', '5', '6', '8', '10'].map(n => <option key={n}>{n}</option>)}</select>
            </div>
            <div className="btn-row">
              <button className="btn btn-primary" onClick={genPreguntas} disabled={generando || loading} style={{ fontSize: 14, padding: '10px 22px' }}>
                {generando ? <><span className="spin" /> Generando preguntas...</> : (preguntas.length ? 'Generar nuevas preguntas' : 'Generar preguntas con IA')}
              </button>
              {preguntas.length > 0 && <button className="btn btn-sec" onClick={() => nuevaEntrevista(true)}>Nueva entrevista (la actual queda guardada)</button>}
            </div>
            {candId && <div className="info-box" style={{ marginTop: 10 }}>Se usará el CV de <b>{cand?.nombre}</b> y las responsabilidades de la plaza. La entrevista queda guardada en su ficha.</div>}
          </div>
        )}

        {tab === 'entrevista' && (
          preguntas.length === 0 ? <div className="empty">Genera las preguntas en la pestaña Configurar</div> : (
            <>
              <div className="info-box">
                {cand ? <>Candidato: <b>{cand.nombre}</b> · </> : null}Cargo: <b>{cargo}</b>. Pulsa <b>🎙️ Grabar</b>, deja que el candidato responda y pulsa <b>⏹ Detener</b>: el audio se guarda y se transcribe solo. Puedes corregir el texto antes de evaluar.
              </div>
              {preguntas.map((p, i) => (
                <div key={i} className="card" style={{ marginBottom: 14, border: p.evaluacion ? '1px solid rgba(26,173,110,.3)' : '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: p.evaluacion ? 'var(--ok)' : 'var(--adim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{p.evaluacion ? p.pts : i + 1}</div>
                    <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, background: 'var(--adim)', color: 'var(--accent2)', fontWeight: 600 }}>{p.comp}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>Pregunta {i + 1} de {preguntas.length}</span>
                    {p.evaluacion && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ok)' }}>{p.pts}/10</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, padding: '12px 14px', background: 'var(--bg-panel)', borderRadius: 8, marginBottom: 12, border: '1px solid var(--border)' }}>{p.q}</div>
                  <div className="btn-row" style={{ marginTop: 0, marginBottom: 10 }}>
                    {grabando === i ? (
                      <button className="btn btn-danger" onClick={detenerGrabacion} style={{ fontSize: 13 }}>⏹ Detener ({fmt(segundos)})</button>
                    ) : (
                      <button className="btn btn-primary" onClick={() => iniciarGrabacion(i)} disabled={grabando !== null || procesandoAudio !== null} style={{ fontSize: 13 }}>🎙️ {p.audio_path ? 'Grabar otra vez (se añade)' : 'Grabar respuesta'}</button>
                    )}
                    {grabando === i && <span style={{ color: 'var(--err)', fontSize: 12, fontWeight: 700 }}>● Grabando…</span>}
                    {procesandoAudio === i && <span style={{ fontSize: 12, color: 'var(--accent2)' }}><span className="spin" /> Transcribiendo…</span>}
                    {p.audio_path && <button className="btn btn-sec" style={{ fontSize: 12 }} onClick={() => escuchar(i)}>▶ Escuchar audio guardado</button>}
                  </div>
                  {audioUrl[i] && <audio controls src={audioUrl[i]} style={{ width: '100%', marginBottom: 10 }} />}
                  {msg[i] && <div style={{ fontSize: 12, marginBottom: 8, color: msg[i].startsWith('Error') || msg[i].startsWith('No se pudo') ? 'var(--warn)' : 'var(--text-2)' }}>{msg[i]}</div>}
                  <div className="field"><label>Respuesta del candidato (transcripción editable)</label>
                    <textarea value={p.transcripcion} onChange={e => setP(i, { transcripcion: e.target.value })} onBlur={() => guardar()} style={{ minHeight: 80 }} placeholder="Se completa sola al grabar, o escríbela aquí…" />
                  </div>
                  <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => evaluar(i)} disabled={evaluando !== null || loading || !p.transcripcion.trim()}>
                    {evaluando === i ? <><span className="spin" /> Evaluando...</> : 'Evaluar respuesta con IA'}
                  </button>
                  {p.evaluacion && <div style={{ marginTop: 10, padding: 10, background: 'rgba(30,123,232,.05)', borderRadius: 8, border: '1px solid var(--border-hi)', fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{p.evaluacion}</div>}
                </div>
              ))}
              <button className="btn btn-ok" onClick={genInforme} disabled={loading || respondidas === 0} style={{ fontSize: 14, padding: '11px 24px', width: '100%', justifyContent: 'center' }}>
                {loading && !generando ? <><span className="spin" /> Generando análisis...</> : 'Generar informe y perfil (telaraña) — ' + respondidas + ' respuestas'}
              </button>
            </>
          )
        )}

        {tab === 'informe' && (
          !informe ? <div className="empty">Genera el informe desde la pestaña Entrevista</div> : (
            <div id="informe-entrevista">
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px,420px) 1fr', gap: 18, alignItems: 'start' }}>
                <div>
                  <div className="card" style={{ textAlign: 'center' }}>
                    <div className="card-title">Perfil del candidato (telaraña)</div>
                    {perfil ? <Radar ejes={EJES.map(e => e[1])} series={[{ nombre: cand?.nombre || 'Candidato', valores: EJES.map(e => Number(perfil[e[0]]) || 0), color: '#2a8fff' }]} /> : <div className="empty">La IA no devolvió puntajes de perfil. Genera el informe de nuevo.</div>}
                    {puntaje !== null && <div style={{ marginTop: 8 }}><span style={{ fontSize: 30, fontWeight: 800, color: sC(puntaje) }}>{puntaje}</span><span style={{ fontSize: 11, color: 'var(--text-3)' }}> /100 ajuste global</span></div>}
                  </div>
                  {perfil?.bigfive && (
                    <div className="card">
                      <div className="card-title">Tendencias de personalidad (Big Five)</div>
                      {BIG5.map(([k, l]) => { const v = Math.max(0, Math.min(100, Number(perfil.bigfive[k]) || 0)); return (
                        <div key={k} style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}><span>{l}</span><b>{v}</b></div>
                          <div className="sbar"><div className="sfill" style={{ width: v + '%', background: 'var(--accent2)' }} /></div>
                        </div>) })}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.5 }}>Los puntajes de perfil son una inferencia de la IA a partir de lo dicho en la entrevista. No reemplazan una prueba psicométrica validada; úsalos como apoyo a la decisión.</div>
                </div>
                <div className="card">
                  <div className="card-title">Informe de entrevista</div>
                  <div style={{ fontSize: 13, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{informe}</div>
                  <div className="btn-row">
                    <button className="btn btn-sec" onClick={() => navigator.clipboard.writeText(informe)}>Copiar</button>
                    <button className="btn btn-sec" onClick={() => window.print()}>Imprimir / PDF</button>
                    <button className="btn btn-sec" onClick={genInforme} disabled={loading}>Regenerar</button>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
      {tab === 'informe' && informe && (
        <div className="hoja">
          <div className="az" style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 6 }}>
            <div><div style={{ fontSize: 17, fontWeight: 700 }}>Informe de Entrevista y Perfil</div><div style={{ fontSize: 10 }}>{cand?.nombre || 'Candidato'}{cargo ? ' · ' + cargo : ''}</div></div>
            <div style={{ textAlign: 'right', fontSize: 10 }}>PREDA Suite · {new Date().toLocaleDateString('es-PE')}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14, marginTop: 10, alignItems: 'center' }}>
            <div>{perfil && <Radar size={300} ejes={EJES.map(e => e[1])} series={[{ nombre: cand?.nombre || 'Candidato', valores: EJES.map(e => Number(perfil[e[0]]) || 0), color: '#1665d8' }]} />}</div>
            <div>
              {puntaje !== null && <div className="suave" style={{ padding: '8px 12px', borderRadius: 8, textAlign: 'center', marginBottom: 8 }}><span style={{ fontSize: 28, fontWeight: 800 }}>{puntaje}</span><span style={{ fontSize: 10 }}> /100 ajuste global</span></div>}
              {perfil && EJES.map(e => { const v = Math.max(0, Math.min(100, Number(perfil[e[0]]) || 0)); return (<div key={e[0]} style={{ marginBottom: 5 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5 }}><span>{e[1]}</span><b>{v}</b></div><div className="barra"><i style={{ width: v + '%' }} /></div></div>) })}
              {perfil?.bigfive && <><h4>Big Five</h4>{BIG5.map(([k, l]) => { const v = Math.max(0, Math.min(100, Number(perfil.bigfive[k]) || 0)); return (<div key={k} style={{ marginBottom: 5 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5 }}><span>{l}</span><b>{v}</b></div><div className="barra"><i style={{ width: v + '%' }} /></div></div>) })}</>}
            </div>
          </div>
          <h4>Informe de entrevista</h4>
          <div style={{ fontSize: '10pt', lineHeight: 1.55, whiteSpace: 'pre-wrap', textAlign: 'justify' }}>{informe}</div>
          <div style={{ marginTop: 10, fontSize: 8, borderTop: '1px solid #b9cdee', paddingTop: 4 }}>Los puntajes de perfil son una inferencia de la IA a partir de lo dicho en la entrevista; no reemplazan una prueba psicométrica validada. Úsese como apoyo a la decisión.</div>
        </div>
      )}
    </div>
  )
}
