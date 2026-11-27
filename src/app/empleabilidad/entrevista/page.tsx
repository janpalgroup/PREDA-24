'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useExpediente } from '@/hooks/useExpediente'
import Radar from '@/components/Radar'

type Item = { comp: string; q: string; tipo: 'principal' | 'repregunta'; transcripcion: string; audio_path: string | null; seg: number }
const EJES: [string, string][] = [['comunicacion', 'Comunicación'], ['estructura', 'Estructura (STAR)'], ['seguridad', 'Seguridad'], ['ajuste', 'Ajuste a la plaza'], ['persuasion', 'Persuasión'], ['presion', 'Manejo de presión']]
const MULETILLAS = /\b(e+h+|e+m+|m+m+|este|o sea|como que|digamos|b[uú]eno|tipo|a ver|viste|¿ya\?|no s[eé]|entonces|bueno pues)\b/gi
const MAX_SEG = 180
const ACUSES = ['Entiendo.', 'Gracias por tu respuesta.', 'Muy bien.', 'De acuerdo, continuemos.', 'Perfecto.']

async function ask(prompt: string, system: string, max = 3500): Promise<string | null> {
  try {
    const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, system, max_tokens: max }) })
    const d = await r.json(); return r.ok ? (d.result || null) : null
  } catch { return null }
}

export default function PreEntrevistaPage() {
  const router = useRouter()
  const { exp, cargando } = useExpediente()
  const [fase, setFase] = useState<'config' | 'sim' | 'reporte'>('config')
  const [cargo, setCargo] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [requisitos, setRequisitos] = useState('')
  const [postulaciones, setPostulaciones] = useState<any[]>([])
  const [tipo, setTipo] = useState('Por competencias STAR')
  const [nPreg, setNPreg] = useState(5)
  const [repreg, setRepreg] = useState(true)
  const [autoRec, setAutoRec] = useState(true)
  const [mostrarTexto, setMostrarTexto] = useState(true)
  const [voces, setVoces] = useState<SpeechSynthesisVoice[]>([])
  const [vozIdx, setVozIdx] = useState(0)
  const [items, setItems] = useState<Item[]>([])
  const [idx, setIdx] = useState(0)
  const [estado, setEstado] = useState<'preparando' | 'hablando' | 'esperando' | 'grabando' | 'procesando'>('preparando')
  const [segundos, setSegundos] = useState(0)
  const [aviso, setAviso] = useState('')
  const [reporte, setReporte] = useState<any>(null)
  const [generando, setGenerando] = useState(false)
  const [historial, setHistorial] = useState<any[]>([])
  const [audioUrl, setAudioUrl] = useState<Record<number, string>>({})

  const itemsRef = useRef<Item[]>([]); const idxRef = useRef(0)
  const streamRef = useRef<MediaStream | null>(null); const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([]); const timerRef = useRef<any>(null); const segRef = useRef(0)
  const entIdRef = useRef<string | null>(null); const chain = useRef<Promise<any>>(Promise.resolve())
  const cancelRef = useRef(false); const nRepreRef = useRef(0)
  const cfgRef = useRef<any>({})
  cfgRef.current = { cargo, empresa, requisitos, tipo, repreg, autoRec, exp, voces, vozIdx }

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const cargarVoces = () => {
      const es = window.speechSynthesis.getVoices().filter(v => /^es/i.test(v.lang))
      const pref = (v: SpeechSynthesisVoice) => /es-PE/i.test(v.lang) ? 0 : /es-(MX|US|419|CO|AR|CL)/i.test(v.lang) ? 1 : 2
      es.sort((a, b) => pref(a) - pref(b)); setVoces(es); setVozIdx(0)
    }
    cargarVoces(); window.speechSynthesis.onvoiceschanged = cargarVoces
    return () => { cancelRef.current = true; try { window.speechSynthesis.cancel() } catch {}; liberarMic() }
  }, [])
  useEffect(() => {
    if (!exp) return
    setCargo((exp.cargos_objetivo || [])[0] || ''); itemsRef.current = []
    fetch('/api/postulaciones?expediente_id=' + exp.id).then(r => r.json()).then(d => setPostulaciones(d.postulaciones || []))
    cargarHistorial()
  }, [exp?.id])
  function cargarHistorial() { if (exp) fetch('/api/entrevistas?expediente_id=' + exp.id + '&modo=practica').then(r => r.json()).then(d => setHistorial(d.entrevistas || [])) }

  function liberarMic() { clearInterval(timerRef.current); try { streamRef.current?.getTracks().forEach(t => t.stop()) } catch {}; streamRef.current = null }

  // ---- Voz del entrevistador (sintesis del navegador) ----
  function hablar(texto: string): Promise<void> {
    return new Promise(res => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) { res(); return }
      try {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(texto)
        const v = cfgRef.current.voces[cfgRef.current.vozIdx]
        if (v) { u.voice = v; u.lang = v.lang } else u.lang = 'es-PE'
        u.rate = 0.95; u.pitch = 1
        let hecho = false; const fin = () => { if (!hecho) { hecho = true; res() } }
        u.onend = fin; u.onerror = fin
        setTimeout(fin, Math.max(3000, texto.length * 90 + 2500))
        window.speechSynthesis.speak(u)
      } catch { res() }
    })
  }

  // ---- Persistencia ----
  function persist(extra?: any) {
    chain.current = chain.current.then(async () => {
      const c = cfgRef.current
      const body = { id: entIdRef.current, expediente_id: c.exp?.id, modo: 'practica', candidato_nombre: c.exp?.nombre, cargo: c.cargo, tipo: c.tipo, plaza: { cargo: c.cargo, empresa: c.empresa, requisitos: c.requisitos }, preguntas: itemsRef.current, ...(extra || {}) }
      try {
        const r = await fetch('/api/entrevistas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        const d = await r.json(); if (d.entrevista && !entIdRef.current) entIdRef.current = d.entrevista.id
      } catch {}
    }).catch(() => {})
    return chain.current
  }

  // ---- Inicio de la simulacion ----
  async function iniciar() {
    if (!cargo.trim()) { setAviso('Indica el cargo o plaza a la que postula'); return }
    if (!exp?.cv_texto) { setAviso('El candidato no tiene CV: cárgalo en “Perfil a Buscar” para personalizar las preguntas.') }
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices) { setAviso('Este navegador no permite grabar audio. Usa Chrome o Edge.'); return }
    setAviso(''); cancelRef.current = false
    try { streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true }) }
    catch (e: any) { setAviso('No se pudo usar el micrófono: ' + (e.name === 'NotAllowedError' ? 'permiso denegado. Permítelo en el candado de la barra de direcciones.' : e.message)); return }
    setFase('sim'); setEstado('preparando'); setReporte(null); setAudioUrl({}); nRepreRef.current = 0; entIdRef.current = null
    const prompt =
      'Genera ' + nPreg + ' preguntas de entrevista de tipo "' + tipo + '" para que el candidato practique, para la plaza "' + cargo + '"' + (empresa ? ' en ' + empresa : '') + '.\n' +
      (requisitos ? 'REQUISITOS / DESCRIPCION DE LA PLAZA:\n' + requisitos.substring(0, 1500) + '\n' : '') +
      (exp?.cv_texto ? '\nCV DEL CANDIDATO (personaliza: logros, vacios, cambios de empleo, brechas frente a la plaza):\n' + exp.cv_texto.substring(0, 3000) + '\n' : '') +
      '\nLas preguntas deben sonar naturales al decirlas en voz alta (maximo 30 palabras cada una), empezar por una de presentacion y mezclar experiencia, competencias, motivacion y manejo de presion.\nFormato ESTRICTO, dos lineas por pregunta:\nCOMPETENCIA: nombre\nPREGUNTA: texto\nSin introduccion ni numeracion.'
    const r = await ask(prompt, 'Eres un entrevistador de RRHH experto en el mercado peruano. Responde en espanol.')
    if (!r) { setAviso('No se pudieron generar las preguntas (revisa la clave de Groq).'); setFase('config'); liberarMic(); return }
    const lines = r.replace(/\*\*/g, '').replace(/^#+\s*/gm, '').split('\n').map(l => l.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim()).filter(Boolean)
    const qs: Item[] = []; let comp = 'Competencia'
    for (const l of lines) {
      const mc = l.match(/^COMPETENCIA\s*:\s*(.*)$/i), mq = l.match(/^PREGUNTA\s*(?:\d+)?\s*:\s*(.*)$/i)
      if (mc) comp = mc[1].trim() || comp
      else if (mq && mq[1].trim()) qs.push({ comp, q: mq[1].trim(), tipo: 'principal', transcripcion: '', audio_path: null, seg: 0 })
      else if (l.includes('?') && l.length > 20) qs.push({ comp: 'General', q: l, tipo: 'principal', transcripcion: '', audio_path: null, seg: 0 })
    }
    if (!qs.length) { setAviso('La IA no devolvió preguntas legibles. Intenta de nuevo.'); setFase('config'); liberarMic(); return }
    itemsRef.current = qs; setItems(qs); idxRef.current = 0; setIdx(0)
    await persist()
    await hablar('Hola ' + ((exp?.nombre || '').split(' ')[0] || '') + '. Soy tu entrevistador virtual. Vamos a simular una entrevista para el puesto de ' + cargo + '. Responde con tranquilidad y con ejemplos reales. Empecemos.')
    if (!cancelRef.current) await presentarPregunta(0)
  }

  async function presentarPregunta(i: number) {
    idxRef.current = i; setIdx(i); setEstado('hablando')
    await hablar(itemsRef.current[i].q)
    if (cancelRef.current) return
    setEstado('esperando')
    if (cfgRef.current.autoRec) iniciarGrabacion()
  }

  // ---- Grabacion de la respuesta ----
  function iniciarGrabacion() {
    const stream = streamRef.current; if (!stream) return
    try {
      const tipos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
      const mime = tipos.find(t => (MediaRecorder as any).isTypeSupported?.(t)) || ''
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 })
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = () => { const blob = new Blob(chunksRef.current, { type: rec.mimeType || mime || 'audio/webm' }); procesarRespuesta(blob, segRef.current) }
      recRef.current = rec; rec.start(1000)
      segRef.current = 0; setSegundos(0); setEstado('grabando')
      timerRef.current = setInterval(() => { segRef.current += 1; setSegundos(segRef.current); if (segRef.current >= MAX_SEG) detener() }, 1000)
    } catch (e: any) { setAviso('No se pudo grabar: ' + e.message) }
  }
  function detener() {
    clearInterval(timerRef.current)
    try { if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop() } catch {}
  }

  async function procesarRespuesta(blob: Blob, seg: number) {
    const i = idxRef.current
    setEstado('procesando'); setAviso('Transcribiendo tu respuesta...')
    let texto = '', path: string | null = null
    if (blob.size > 800) {
      try {
        const fd = new FormData(); const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
        fd.append('audio', new File([blob], 'r.' + ext, { type: blob.type })); fd.append('key', 'exp-' + (cfgRef.current.exp?.id || 'x')); fd.append('idx', String(i))
        const r = await fetch('/api/entrevista-audio', { method: 'POST', body: fd }); const d = await r.json()
        texto = d.transcript || ''; path = d.audio_path || null
        if (d.transcript_error) setAviso('No se pudo transcribir: ' + d.transcript_error)
      } catch (e: any) { setAviso('Error al subir el audio: ' + e.message) }
    }
    const cur = [...itemsRef.current]; cur[i] = { ...cur[i], transcripcion: texto, audio_path: path, seg }
    itemsRef.current = cur; setItems(cur); persist()
    if (cancelRef.current) return
    setAviso('')
    // Repregunta del entrevistador (maximo 2 por sesion, solo si la respuesta fue vaga)
    const c = cfgRef.current
    if (c.repreg && cur[i].tipo === 'principal' && nRepreRef.current < 2 && texto.split(/\s+/).length >= 3) {
      const rp = await ask('Pregunta: ' + cur[i].q + '\nRespuesta del candidato: ' + texto + '\n\nSi la respuesta es vaga, sin ejemplo concreto o sin resultados, formula UNA repregunta breve (maximo 20 palabras) para profundizar. Si la respuesta es suficiente, responde exactamente: OK', 'Eres un entrevistador de RRHH. Responde en espanol, solo la repregunta o OK.', 120)
      const t = (rp || '').replace(/\*\*/g, '').replace(/^pregunta\s*:\s*/i, '').trim()
      if (t && !/^ok\b/i.test(t) && t.includes('?')) {
        nRepreRef.current += 1
        const n2 = [...itemsRef.current]; n2.splice(i + 1, 0, { comp: cur[i].comp, q: t, tipo: 'repregunta', transcripcion: '', audio_path: null, seg: 0 })
        itemsRef.current = n2; setItems(n2)
        await hablar('Entiendo. Permíteme profundizar.')
        if (!cancelRef.current) await presentarPregunta(i + 1)
        return
      }
    }
    if (i + 1 < itemsRef.current.length) {
      await hablar(ACUSES[Math.floor(Math.random() * ACUSES.length)])
      if (!cancelRef.current) await presentarPregunta(i + 1)
    } else {
      await hablar('Eso fue todo. Gracias por tu tiempo. Voy a preparar tu reporte.')
      if (!cancelRef.current) await terminar()
    }
  }

  async function terminar() {
    cancelRef.current = true; detener(); try { window.speechSynthesis.cancel() } catch {}; liberarMic()
    const resp = itemsRef.current.filter(x => x.transcripcion.trim())
    if (!resp.length) { setAviso('No hay respuestas grabadas para analizar.'); setFase('config'); return }
    setFase('reporte'); setGenerando(true)
    // Metricas calculadas del audio real
    const palabras = resp.reduce((a, x) => a + x.transcripcion.split(/\s+/).filter(Boolean).length, 0)
    const seg = resp.reduce((a, x) => a + (x.seg || 0), 0)
    const mul = resp.reduce((a, x) => a + (x.transcripcion.match(MULETILLAS) || []).length, 0)
    const metricas = { respuestas: resp.length, palabras, segundos: seg, ppm: seg > 0 ? Math.round(palabras / (seg / 60)) : 0, muletillas: mul, muletillas_por_100: palabras ? Math.round(mul / palabras * 1000) / 10 : 0, seg_promedio: Math.round(seg / resp.length), cortas: resp.filter(x => x.transcripcion.split(/\s+/).length < 25).length }
    const c = cfgRef.current
    const bloques = itemsRef.current.map((x, i) => 'P' + (i + 1) + (x.tipo === 'repregunta' ? ' (repregunta)' : '') + ' [' + x.comp + '] ' + x.q + '\nRESPUESTA (' + x.seg + 's): ' + (x.transcripcion || '(sin respuesta)')).join('\n\n')
    const prompt =
      'Analiza esta SIMULACION de entrevista hablada (transcrita de audio) del candidato ' + (c.exp?.nombre || '') + ' para el cargo "' + c.cargo + '"' + (c.empresa ? ' en ' + c.empresa : '') + '.\n' +
      (c.requisitos ? 'PLAZA: ' + c.requisitos.substring(0, 800) + '\n' : '') + (c.exp?.cv_texto ? 'CV (resumen): ' + c.exp.cv_texto.substring(0, 1500) + '\n' : '') +
      'METRICAS DE VOZ: ' + metricas.ppm + ' palabras/min, ' + metricas.muletillas + ' muletillas (' + metricas.muletillas_por_100 + ' por 100 palabras), respuesta promedio ' + metricas.seg_promedio + 's.\n\n' + bloques + '\n\n' +
      'Responde SOLO JSON valido:\n{"puntaje_global":0-100,"veredicto":"2-3 frases con el balance general","dimensiones":{"comunicacion":0-100,"estructura":0-100,"seguridad":0-100,"ajuste":0-100,"persuasion":0-100,"presion":0-100},"por_pregunta":[{"n":1,"puntaje":0-10,"feedback":"que hizo bien y mal","mejora":"como responder mejor","ejemplo":"respuesta modelo breve de 2 frases"}],"fortalezas":["..."],"mejoras":["recomendaciones concretas y accionables"],"plan_practica":["ejercicio 1","ejercicio 2","ejercicio 3"],"riesgos":["señales que un reclutador notaria"]}\nSe exigente pero constructivo. La estructura mide uso de situacion-tarea-accion-resultado. Basa todo solo en lo que dijo el candidato.'
    const r = await ask(prompt, 'Eres coach de entrevistas y psicologo organizacional en Peru. Responde SOLO JSON valido en espanol.', 4500)
    let datos: any = { metricas }
    if (r) { try { const a = r.indexOf('{'), z = r.lastIndexOf('}'); datos = { ...JSON.parse(r.slice(a, z + 1)), metricas } } catch { datos = { metricas, texto_crudo: r } } }
    setReporte(datos); setGenerando(false)
    const txt = datos.veredicto ? datos.veredicto + '\n\nFORTALEZAS\n- ' + (datos.fortalezas || []).join('\n- ') + '\n\nMEJORAS\n- ' + (datos.mejoras || []).join('\n- ') : (datos.texto_crudo || '')
    await persist({ perfil: datos, puntaje: datos.puntaje_global != null ? Math.round(datos.puntaje_global) : null, informe: txt })
    cargarHistorial()
  }

  async function escuchar(i: number, path: string) {
    const r = await fetch('/api/entrevista-audio?path=' + encodeURIComponent(path)); const d = await r.json()
    if (d.url) setAudioUrl(a => ({ ...a, [i]: d.url }))
  }
  function abrirHistorial(h: any) {
    itemsRef.current = h.preguntas || []; setItems(h.preguntas || []); setReporte(h.perfil || null); setCargo(h.cargo || ''); setAudioUrl({}); setFase('reporte'); setGenerando(false)
  }
  function reiniciarTodo() { cancelRef.current = true; try { window.speechSynthesis.cancel() } catch {}; detener(); liberarMic(); setFase('config'); setAviso('') }

  if (cargando) return <div className="empty"><span className="spin" /></div>
  if (!exp) return <div style={{ padding: 40 }}><div className="card" style={{ maxWidth: 520 }}><div className="card-title">Primero elige al candidato</div><button className="btn btn-ok" onClick={() => router.push('/empleabilidad/expediente')}>Ir a Mi Expediente</button></div></div>
  const sC = (s: number) => s >= 75 ? 'var(--ok)' : s >= 55 ? 'var(--warn)' : 'var(--err)'
  const fmt = (s: number) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
  const actual = items[idx]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 26px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>Pre-Entrevista — simulación hablada</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Candidato: <b style={{ color: 'var(--ok)' }}>{exp.nombre}</b> — la IA pregunta en voz alta según la plaza, el candidato responde hablando y al final recibe su reporte</div>
      </div>
      <div className="print-area" style={{ flex: 1, overflowY: 'auto', padding: '18px 26px' }}>
        {fase === 'config' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px,560px) 1fr', gap: 18, alignItems: 'start' }}>
            <div className="card">
              <div className="card-title">Plaza a practicar</div>
              {postulaciones.length > 0 && <div className="field"><label>Tomar de una postulación</label>
                <select onChange={e => { const p = postulaciones.find(x => x.id === e.target.value); if (p) { setCargo(p.cargo || ''); setEmpresa(p.empresa || '') } }} defaultValue=""><option value="">— elegir —</option>{postulaciones.map(p => <option key={p.id} value={p.id}>{p.cargo} — {p.empresa}</option>)}</select></div>}
              <div className="field"><label>Cargo / plaza *</label><input value={cargo} onChange={e => setCargo(e.target.value)} /></div>
              <div className="field"><label>Empresa (opcional)</label><input value={empresa} onChange={e => setEmpresa(e.target.value)} /></div>
              <div className="field"><label>Requisitos o descripción de la plaza (pégalos del aviso para mayor precisión)</label><textarea value={requisitos} onChange={e => setRequisitos(e.target.value)} style={{ minHeight: 90 }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                <div className="field"><label>Tipo</label><select value={tipo} onChange={e => setTipo(e.target.value)}>{['Por competencias STAR', 'Técnica del cargo', 'Conductual', 'Situacional', 'Mixta'].map(t => <option key={t}>{t}</option>)}</select></div>
                <div className="field"><label>Preguntas</label><select value={nPreg} onChange={e => setNPreg(Number(e.target.value))}>{[3, 5, 6, 8].map(n => <option key={n}>{n}</option>)}</select></div>
              </div>
              <div className="field"><label>Voz del entrevistador</label>
                {voces.length ? <select value={vozIdx} onChange={e => setVozIdx(Number(e.target.value))}>{voces.map((v, i) => <option key={v.name + i} value={i}>{v.name} ({v.lang})</option>)}</select> : <div style={{ fontSize: 12, color: 'var(--warn)' }}>Tu navegador no tiene voz en español instalada: las preguntas se mostrarán solo en texto. Chrome o Edge en Windows/Mac suelen tenerla.</div>}
              </div>
              <label style={{ display: 'flex', gap: 8, fontSize: 13, alignItems: 'center' }}><input type="checkbox" checked={repreg} onChange={e => setRepreg(e.target.checked)} style={{ width: 'auto' }} />Permitir repreguntas del entrevistador</label>
              <label style={{ display: 'flex', gap: 8, fontSize: 13, alignItems: 'center', marginTop: 6 }}><input type="checkbox" checked={autoRec} onChange={e => setAutoRec(e.target.checked)} style={{ width: 'auto' }} />Empezar a grabar automáticamente al terminar la pregunta</label>
              <label style={{ display: 'flex', gap: 8, fontSize: 13, alignItems: 'center', margin: '6px 0 12px' }}><input type="checkbox" checked={mostrarTexto} onChange={e => setMostrarTexto(e.target.checked)} style={{ width: 'auto' }} />Mostrar el texto de la pregunta (desmárcalo para practicar solo escuchando)</label>
              {aviso && <div style={{ color: 'var(--warn)', fontSize: 12, marginBottom: 8 }}>{aviso}</div>}
              <button className="btn btn-ok" onClick={iniciar} style={{ fontSize: 15, padding: '11px 26px' }}>🎙️ Iniciar simulación</button>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>Se pedirá permiso para usar el micrófono. Cada respuesta se graba, se transcribe y queda guardada en el expediente.</div>
            </div>
            <div className="card">
              <div className="card-title">Prácticas anteriores ({historial.length})</div>
              {historial.length === 0 ? <div className="empty" style={{ padding: 30 }}>Aún no hay prácticas</div> : (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70, marginBottom: 10 }}>
                    {[...historial].reverse().filter(h => h.puntaje != null).slice(-12).map(h => <div key={h.id} title={h.puntaje + '/100'} style={{ flex: 1, height: Math.max(6, h.puntaje * 0.7), background: sC(h.puntaje), borderRadius: '3px 3px 0 0' }} />)}
                  </div>
                  {historial.map(h => <div key={h.id} onClick={() => abrirHistorial(h)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', padding: '8px 4px', borderTop: '1px solid var(--border)', fontSize: 13 }}><span>{h.cargo || 'Sin cargo'} · {new Date(h.created_at).toLocaleDateString('es-PE')}</span><b style={{ color: sC(h.puntaje || 0) }}>{h.puntaje ?? '—'}</b></div>)}
                </>
              )}
            </div>
          </div>
        )}

        {fase === 'sim' && (
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
              <span>Pregunta {Math.min(idx + 1, items.length || 1)} de {items.length || '…'}{actual?.tipo === 'repregunta' ? ' (repregunta)' : ''} · {actual?.comp}</span>
              <button className="btn btn-sec" style={{ fontSize: 11 }} onClick={terminar} disabled={estado === 'preparando'}>Terminar y ver reporte</button>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '34px 24px' }}>
              <div style={{ fontSize: 44, marginBottom: 6 }}>{estado === 'hablando' ? '🗣️' : estado === 'grabando' ? '🎙️' : estado === 'procesando' ? '⏳' : estado === 'esperando' ? '👂' : '⚙️'}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: estado === 'grabando' ? 'var(--err)' : 'var(--accent2)', marginBottom: 12 }}>
                {estado === 'preparando' ? 'Preparando la entrevista...' : estado === 'hablando' ? 'El entrevistador está hablando...' : estado === 'esperando' ? 'Tu turno: pulsa Responder' : estado === 'grabando' ? '● Te escucho… ' + fmt(segundos) : 'Procesando tu respuesta...'}
              </div>
              {actual && (mostrarTexto || estado === 'esperando' || estado === 'grabando') && mostrarTexto && <div style={{ fontSize: 18, lineHeight: 1.6, fontWeight: 500 }}>{actual.q}</div>}
              {actual && !mostrarTexto && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>(Texto oculto: escucha la pregunta)</div>}
              <div className="btn-row" style={{ justifyContent: 'center', marginTop: 20 }}>
                {estado === 'esperando' && <button className="btn btn-primary" onClick={iniciarGrabacion} style={{ fontSize: 15, padding: '11px 28px' }}>🎙️ Responder</button>}
                {estado === 'grabando' && <button className="btn btn-danger" onClick={detener} style={{ fontSize: 15, padding: '11px 28px' }}>⏹ Terminé mi respuesta</button>}
                {(estado === 'esperando') && <button className="btn btn-sec" onClick={async () => { setEstado('hablando'); await hablar(actual.q); setEstado('esperando') }}>🔁 Repetir pregunta</button>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 12 }}>Responde como en una entrevista real: situación, qué hiciste y qué resultado lograste. Tiempo máximo por respuesta: {fmt(MAX_SEG)}.</div>
              {aviso && <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: 8 }}>{aviso}</div>}
            </div>
            {items.slice(0, idx).filter(x => x.transcripcion).slice(-2).map((x, k) => <div key={k} className="card" style={{ opacity: 0.7, fontSize: 12 }}><b>{x.q}</b><div style={{ marginTop: 4, color: 'var(--text-2)' }}>{x.transcripcion}</div></div>)}
          </div>
        )}

        {fase === 'reporte' && (
          generando || !reporte ? <div className="empty" style={{ padding: 60 }}><span className="spin" /> Analizando tus respuestas y preparando el reporte...</div> : (
            <div>
              <div className="no-print btn-row" style={{ marginTop: 0, marginBottom: 12 }}>
                <button className="btn btn-sec" onClick={reiniciarTodo}>← Nueva práctica</button>
                <button className="btn btn-sec" onClick={() => window.print()}>Imprimir / PDF</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px,400px) 1fr', gap: 18, alignItems: 'start' }}>
                <div>
                  <div className="card" style={{ textAlign: 'center' }}>
                    <div className="card-title">Reporte de práctica — {cargo}</div>
                    {reporte.puntaje_global != null && <div><span style={{ fontSize: 44, fontWeight: 800, color: sC(reporte.puntaje_global) }}>{Math.round(reporte.puntaje_global)}</span><span style={{ fontSize: 12, color: 'var(--text-3)' }}> /100</span></div>}
                    {reporte.dimensiones && <Radar ejes={EJES.map(e => e[1])} series={[{ nombre: 'Candidato', valores: EJES.map(e => Number(reporte.dimensiones[e[0]]) || 0), color: '#1aad6e' }]} />}
                  </div>
                  {reporte.metricas && (
                    <div className="card">
                      <div className="card-title">Cómo sonó (medido del audio)</div>
                      {[['Ritmo', reporte.metricas.ppm + ' palabras/min', reporte.metricas.ppm >= 110 && reporte.metricas.ppm <= 160 ? 'Adecuado (110–160)' : reporte.metricas.ppm < 110 ? 'Algo lento' : 'Muy rápido'], ['Muletillas', reporte.metricas.muletillas + ' (' + reporte.metricas.muletillas_por_100 + ' c/100 palabras)', reporte.metricas.muletillas_por_100 <= 3 ? 'Bajo' : reporte.metricas.muletillas_por_100 <= 6 ? 'Moderado' : 'Alto: trabajarlo'], ['Duración promedio', reporte.metricas.seg_promedio + ' s por respuesta', reporte.metricas.seg_promedio >= 40 && reporte.metricas.seg_promedio <= 120 ? 'Adecuada (40–120 s)' : reporte.metricas.seg_promedio < 40 ? 'Respuestas cortas' : 'Respuestas largas'], ['Respuestas muy cortas', String(reporte.metricas.cortas) + ' de ' + reporte.metricas.respuestas, '']].map(([a, b, c]) => <div key={a} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, padding: '5px 0', borderTop: '1px solid var(--border)' }}><span>{a}</span><span style={{ textAlign: 'right' }}><b>{b}</b><div style={{ color: 'var(--text-3)', fontSize: 11 }}>{c}</div></span></div>)}
                    </div>
                  )}
                </div>
                <div>
                  {reporte.texto_crudo && <div className="card"><div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.8 }}>{reporte.texto_crudo}</div></div>}
                  {reporte.veredicto && <div className="card"><div className="card-title">Veredicto</div><div style={{ fontSize: 13, lineHeight: 1.8 }}>{reporte.veredicto}</div></div>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {(reporte.fortalezas || []).length > 0 && <div className="card"><div className="card-title" style={{ color: 'var(--ok)' }}>Fortalezas</div>{reporte.fortalezas.map((f: string) => <div key={f} style={{ fontSize: 12, lineHeight: 1.7 }}>• {f}</div>)}</div>}
                    {(reporte.mejoras || []).length > 0 && <div className="card"><div className="card-title" style={{ color: 'var(--warn)' }}>Recomendaciones para mejorar</div>{reporte.mejoras.map((f: string) => <div key={f} style={{ fontSize: 12, lineHeight: 1.7 }}>• {f}</div>)}</div>}
                  </div>
                  {(reporte.riesgos || []).length > 0 && <div className="card"><div className="card-title" style={{ color: 'var(--err)' }}>Lo que notaría un reclutador</div>{reporte.riesgos.map((f: string) => <div key={f} style={{ fontSize: 12, lineHeight: 1.7 }}>• {f}</div>)}</div>}
                  {(reporte.plan_practica || []).length > 0 && <div className="card"><div className="card-title">Plan de práctica</div>{reporte.plan_practica.map((f: string, i: number) => <div key={f} style={{ fontSize: 12, lineHeight: 1.7 }}>{i + 1}. {f}</div>)}</div>}
                </div>
              </div>
              <div className="card">
                <div className="card-title">Detalle por pregunta</div>
                {items.map((x, i) => {
                  const pp = (reporte.por_pregunta || []).find((p: any) => Number(p.n) === i + 1)
                  return (
                    <div key={i} style={{ padding: '12px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><b style={{ fontSize: 13 }}>P{i + 1}{x.tipo === 'repregunta' ? ' (repregunta)' : ''}. {x.q}</b>{pp && <b style={{ color: sC((pp.puntaje || 0) * 10) }}>{pp.puntaje}/10</b>}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', margin: '5px 0', whiteSpace: 'pre-wrap' }}><i>Tu respuesta ({x.seg}s):</i> {x.transcripcion || '(sin respuesta)'}</div>
                      {x.audio_path && <div className="no-print">{audioUrl[i] ? <audio controls src={audioUrl[i]} style={{ width: '100%' }} /> : <button className="btn btn-sec" style={{ fontSize: 11 }} onClick={() => escuchar(i, x.audio_path!)}>▶ Escuchar mi respuesta</button>}</div>}
                      {pp?.feedback && <div style={{ fontSize: 12, marginTop: 4 }}><b>Feedback:</b> {pp.feedback}</div>}
                      {pp?.mejora && <div style={{ fontSize: 12, color: 'var(--warn)' }}><b>Cómo mejorar:</b> {pp.mejora}</div>}
                      {pp?.ejemplo && <div style={{ fontSize: 12, color: 'var(--ok)' }}><b>Ejemplo de respuesta:</b> {pp.ejemplo}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
