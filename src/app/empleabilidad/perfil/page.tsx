'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAI } from '@/hooks/useAI'
import { useExpediente } from '@/hooks/useExpediente'

export default function PerfilPage() {
  const router = useRouter()
  const { callAI, loading } = useAI()
  const { exp, cargando, guardar } = useExpediente()
  const [cvTexto, setCvTexto] = useState('')
  const [leyendo, setLeyendo] = useState(false)
  const [info, setInfo] = useState('')
  const [err, setErr] = useState('')
  const [elegidos, setElegidos] = useState<string[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const analisis = exp?.analisis_perfil || null
  const posiciones: any[] = analisis?.posiciones || []
  const cvActual: string = cvTexto || exp?.cv_texto || ''
  const sel = elegidos ?? (exp?.cargos_objetivo || [])
  const sC = (s: number) => s >= 75 ? 'var(--ok)' : s >= 55 ? 'var(--warn)' : 'var(--err)'

  async function cargarArchivo(file: File) {
    setLeyendo(true); setErr(''); setInfo('Leyendo ' + file.name + '...')
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch('/api/extract-text', { method: 'POST', body: fd }); const d = await r.json()
      if (!r.ok || !d.text) throw new Error(d.error || 'No se pudo leer el archivo')
      setCvTexto(d.text)
      await guardar({ cv_texto: d.text, cv_archivo: file.name, cv_actualizado: new Date().toISOString() })
      setInfo('CV guardado en el expediente: ' + file.name + ' (' + d.text.length.toLocaleString() + ' caracteres). Ya no hace falta volver a cargarlo.')
    } catch (e: any) { setErr(e.message); setInfo('') }
    setLeyendo(false)
  }
  async function guardarPegado() {
    if (!cvTexto.trim()) return
    try { await guardar({ cv_texto: cvTexto, cv_archivo: 'Texto pegado', cv_actualizado: new Date().toISOString() }); setInfo('CV guardado en el expediente.') } catch (e: any) { setErr(e.message) }
  }

  async function analizar() {
    if (!cvActual.trim()) { setErr('Carga el CV primero'); return }
    setErr('')
    const prompt =
      'Analiza este CV de un candidato peruano y define el PERFIL A BUSCAR: las posiciones a las que puede postular hoy.\n\nCANDIDATO: ' + (exp?.nombre || '') + '\nCARGOS QUE DICE BUSCAR: ' + (exp?.cargos_objetivo || []).join(', ') + '\nRUBROS: ' + (exp?.rubros || []).join(', ') + '\nPRETENSION: ' + (exp?.pretension_salarial || 'no indicada') + '\n\nCV:\n' + cvActual.substring(0, 6000) + '\n\n' +
      'Responde SOLO JSON valido con esta forma exacta:\n{"score_empleabilidad":0-100,"nivel":"Junior|Semi senior|Senior|Directivo","anios_experiencia":N,"resumen":"resumen profesional de 3-4 lineas","fortalezas":["..."],"brechas":["..."],"rubros":["rubro 1","rubro 2"],"habilidades_clave":["..."],"posiciones":[{"cargo":"nombre de cargo tal como se publica en portales de empleo","compatibilidad":0-100,"nivel":"...","salario_estimado_soles":"S/ x - y","por_que":"por que encaja segun su CV","brecha":"que le falta para este cargo o ninguna","palabras_busqueda":["..."]}],"recomendaciones_cv":["..."]}\n' +
      'Incluye entre 6 y 8 posiciones, ordenadas de mayor a menor compatibilidad, usando titulos de cargo reales del mercado peruano. Los salarios son estimados de mercado.'
    const r = await callAI(prompt, 'Eres PREDA, experto en empleabilidad y mercado laboral peruano. Responde SOLO JSON valido en espanol.')
    if (!r) return
    try {
      const a = r.indexOf('{'), z = r.lastIndexOf('}')
      const d = JSON.parse(a >= 0 && z > a ? r.slice(a, z + 1) : r)
      if (!Array.isArray(d.posiciones) || !d.posiciones.length) throw new Error('sin posiciones')
      const top = d.posiciones.slice(0, 3).map((p: any) => p.cargo)
      const patch: any = { analisis_perfil: d, score_empleabilidad: Math.round(Number(d.score_empleabilidad) || 0) }
      if (!exp?.resumen && d.resumen) patch.resumen = d.resumen
      if (!(exp?.rubros || []).length && Array.isArray(d.rubros)) patch.rubros = d.rubros
      if (!(exp?.cargos_objetivo || []).length) { patch.cargos_objetivo = top; patch.cargo_objetivo = top[0] }
      await guardar(patch); setElegidos(null)
    } catch { setErr('La IA no devolvió el análisis en el formato esperado. Pulsa "Analizar" de nuevo.') }
  }

  async function aplicarCargos() {
    try { await guardar({ cargos_objetivo: sel, cargo_objetivo: sel[0] || '' }); setInfo('Cargos objetivo actualizados: ' + sel.join(', ')) } catch (e: any) { setErr(e.message) }
  }
  const toggle = (c: string) => setElegidos(sel.includes(c) ? sel.filter((x: string) => x !== c) : [...sel, c])

  if (cargando) return <div className="empty"><span className="spin" /></div>
  if (!exp) return (
    <div style={{ padding: 40 }}><div className="card" style={{ maxWidth: 520 }}>
      <div className="card-title">Primero elige al candidato</div>
      <div style={{ fontSize: 13, marginBottom: 12 }}>Busca al candidato por DNI en “Mi Expediente” y luego vuelve aquí.</div>
      <button className="btn btn-ok" onClick={() => router.push('/empleabilidad/expediente')}>Ir a Mi Expediente</button>
    </div></div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 26px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>Perfil a Buscar</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Candidato: <b style={{ color: 'var(--ok)' }}>{exp.nombre}</b>{exp.dni ? ' · DNI ' + exp.dni : ''} — carga el CV una vez y la IA indica las posiciones a las que puede postular</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 26px', display: 'grid', gridTemplateColumns: 'minmax(300px,380px) 1fr', gap: 18, alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">CV del candidato</div>
          <div style={{ border: '2px dashed var(--border-hi)', borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer', background: 'var(--bg-panel)', marginBottom: 10 }} onClick={() => fileRef.current?.click()}>
            {leyendo ? <><span className="spin" /> Leyendo...</> : exp.cv_texto || cvTexto ? <><div style={{ fontSize: 16, color: 'var(--ok)' }}>✔ CV cargado</div><div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{exp.cv_archivo || ''} · clic para reemplazar</div></> : <><div style={{ fontSize: 22 }}>📄</div><div style={{ fontWeight: 600 }}>Clic para cargar el CV</div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>PDF · Word · TXT</div></>}
          </div>
          <input ref={fileRef} type="file" accept=".txt,.pdf,.docx,.doc" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) cargarArchivo(f); e.target.value = '' }} />
          {err && <div style={{ fontSize: 12, color: 'var(--err)', marginBottom: 8 }}>{err}</div>}
          {info && <div style={{ fontSize: 12, color: 'var(--ok)', marginBottom: 8 }}>{info}</div>}
          <div className="field"><label>O pega el texto del CV</label><textarea value={cvTexto} onChange={e => setCvTexto(e.target.value)} style={{ minHeight: 90, fontSize: 12 }} placeholder="Pega el CV aquí..." /></div>
          {cvTexto.trim() && cvTexto !== exp.cv_texto && <button className="btn btn-sec" style={{ fontSize: 12, marginBottom: 8, width: '100%', justifyContent: 'center' }} onClick={guardarPegado}>Guardar este texto como CV</button>}
          <button className="btn btn-primary" onClick={analizar} disabled={loading || !cvActual.trim()} style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: 10 }}>{loading ? <><span className="spin" /> Analizando CV...</> : analisis ? 'Volver a analizar' : 'Analizar CV y definir perfil'}</button>
        </div>

        <div>
          {!analisis ? <div className="card"><div className="empty" style={{ padding: 50 }}>El análisis y las posiciones sugeridas aparecerán aquí</div></div> : (
            <>
              <div className="card">
                <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 40, fontWeight: 800, color: sC(exp.score_empleabilidad || 0) }}>{exp.score_empleabilidad ?? '-'}</div><div style={{ fontSize: 10, color: 'var(--text-3)' }}>EMPLEABILIDAD /100</div></div>
                  <div style={{ flex: 1, minWidth: 220, fontSize: 13, lineHeight: 1.7 }}>
                    <div><b>{analisis.nivel || ''}</b>{analisis.anios_experiencia != null ? ' · ' + analisis.anios_experiencia + ' años de experiencia' : ''}</div>
                    <div style={{ color: 'var(--text-2)' }}>{analisis.resumen}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
                  <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ok)', marginBottom: 4 }}>FORTALEZAS</div>{(analisis.fortalezas || []).map((f: string) => <div key={f} style={{ fontSize: 12, lineHeight: 1.6 }}>• {f}</div>)}</div>
                  <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warn)', marginBottom: 4 }}>BRECHAS</div>{(analisis.brechas || []).map((f: string) => <div key={f} style={{ fontSize: 12, lineHeight: 1.6 }}>• {f}</div>)}</div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Posiciones a las que puede postular (marca las que buscarás)</div>
                {posiciones.map((p: any) => (
                  <label key={p.cargo} style={{ display: 'flex', gap: 10, padding: '10px 10px', borderRadius: 8, marginBottom: 6, cursor: 'pointer', background: sel.includes(p.cargo) ? 'rgba(26,173,110,.08)' : 'var(--bg-panel)', border: '1px solid ' + (sel.includes(p.cargo) ? 'var(--ok)' : 'var(--border)') }}>
                    <input type="checkbox" checked={sel.includes(p.cargo)} onChange={() => toggle(p.cargo)} style={{ width: 'auto', marginTop: 3 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b style={{ fontSize: 14 }}>{p.cargo}</b><b style={{ color: sC(p.compatibilidad) }}>{p.compatibilidad}%</b></div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.nivel}{p.salario_estimado_soles ? ' · ' + p.salario_estimado_soles + ' (estimado)' : ''}</div>
                      <div style={{ fontSize: 12, marginTop: 3 }}>{p.por_que}</div>
                      {p.brecha && !/^ninguna/i.test(p.brecha) && <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 2 }}>Por reforzar: {p.brecha}</div>}
                    </div>
                  </label>
                ))}
                <div className="btn-row">
                  <button className="btn btn-sec" onClick={aplicarCargos}>Guardar como cargos objetivo ({sel.length})</button>
                  <button className="btn btn-ok" disabled={!sel.length} onClick={async () => { await aplicarCargos(); router.push('/empleabilidad/ofertas') }}>Buscar ofertas con estos cargos →</button>
                </div>
              </div>

              {(analisis.recomendaciones_cv || []).length > 0 && <div className="card"><div className="card-title">Cómo mejorar el CV</div>{analisis.recomendaciones_cv.map((r: string) => <div key={r} style={{ fontSize: 12, lineHeight: 1.7 }}>• {r}</div>)}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
