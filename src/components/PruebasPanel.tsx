'use client'
import { useEffect, useState } from 'react'
import { CATALOGO, DIM_NOMBRES, nivel } from '@/lib/pruebas'
// Envio de formularios (ficha de datos) y pruebas a candidatos. Seleccion manual + recomendacion de IA (Groq, gratis).
export default function PruebasPanel({ procesos, procesoId, setProcesoId }: { procesos: any[]; procesoId: string; setProcesoId: (id: string) => void }) {
  const [cands, setCands] = useState<any[]>([]); const [selC, setSelC] = useState<string[]>([])
  const [cargo, setCargo] = useState(''); const [resp, setResp] = useState(''); const [empresa, setEmpresa] = useState('')
  const [sel, setSel] = useState<string[]>(['ficha']); const [rec, setRec] = useState<any>(null)
  const [ia, setIa] = useState<Record<string, any[]>>({}); const [dias, setDias] = useState(14)
  const [busy, setBusy] = useState(''); const [msg, setMsg] = useState('')
  const [evals, setEvals] = useState<any[]>([]); const [nuevas, setNuevas] = useState<any[]>([])
  const [canal, setCanal] = useState<'email' | 'whatsapp'>('email'); const [textos, setTextos] = useState<Record<string, string>>({})
  const [abierto, setAbierto] = useState<string | null>(null)
  const link = (t: string) => window.location.origin + '/evaluacion/' + t
  const telWA = (t: string) => { const d = (t || '').replace(/\D/g, ''); return d.length === 9 ? '51' + d : d }
  const iaSel = sel.filter(id => CATALOGO.find(c => c.id === id)?.ia)

  async function cargarEvals(pid: string) { const r = await fetch('/api/evaluaciones?proceso_id=' + pid); const d = await r.json(); if (r.ok) setEvals(d.evaluaciones || []); else setMsg(d.error || '') }
  useEffect(() => {
    setSelC([]); setRec(null); setIa({}); setNuevas([]); setTextos({}); setMsg('')
    if (!procesoId) { setCands([]); setEvals([]); return }
    const p = procesos.find(x => x.id === procesoId)
    setCargo(p?.cargo || ''); setResp([p?.descripcion, p?.requisitos].filter(Boolean).join('\n')); setEmpresa(p?.empresa || '')
    fetch('/api/candidatos?proceso_id=' + procesoId).then(r => r.json()).then(d => setCands(d.candidatos || []))
    cargarEvals(procesoId)
  }, [procesoId, procesos.length])

  async function post(url: string, body: any) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error ' + r.status); return d }
  async function recomendar() {
    if (!cargo.trim() && !resp.trim()) { setMsg('Escribe el cargo y/o las responsabilidades'); return }
    setBusy('rec'); setMsg('')
    try { const d = await post('/api/evaluaciones/ia', { accion: 'recomendar', cargo, responsabilidades: resp }); setRec(d) } catch (e: any) { setMsg('IA: ' + e.message) }
    setBusy('')
  }
  async function generar() {
    if (!cargo.trim() && !resp.trim()) { setMsg('Escribe el cargo y/o las responsabilidades'); return }
    setBusy('gen'); setMsg('')
    try { const d = await post('/api/evaluaciones/ia', { accion: 'generar', cargo, responsabilidades: resp, ids: iaSel }); setIa(x => ({ ...x, ...d.ia })); if (d.errores?.length) setMsg('No se pudo generar: ' + d.errores.join(' | ') + '. Intenta de nuevo.') } catch (e: any) { setMsg('IA: ' + e.message) }
    setBusy('')
  }
  async function crear() {
    const falta = iaSel.filter(id => !(ia[id] && ia[id].length))
    if (falta.length) { setMsg('Primero genera (y revisa) las preguntas de: ' + falta.map(id => CATALOGO.find(c => c.id === id)?.titulo).join(', ')); return }
    setBusy('crear'); setMsg('')
    try {
      const d = await post('/api/evaluaciones', { proceso_id: procesoId, candidatos: selC, ids: sel, ia, dias, titulo: 'Evaluación — ' + (cargo || 'proceso') })
      setNuevas(d.creadas || []); await cargarEvals(procesoId); setMsg('Enlaces creados. Ahora genera el mensaje y envíalo a cada candidato.')
    } catch (e: any) { setMsg('Error: ' + e.message) }
    setBusy('')
  }
  async function mensaje(n: any) {
    const c = cands.find(x => x.id === n.candidato_id); const nombres = sel.map(id => CATALOGO.find(x => x.id === id)?.titulo).join(', ')
    const p = (canal === 'whatsapp' ? 'Redacta un mensaje de WhatsApp breve (máx. 6 líneas)' : 'Redacta un email profesional breve (3 párrafos máx.; formato "ASUNTO: ..." y luego el cuerpo)') +
      ' de RR.HH. para ' + n.nombre + ', candidato/a al cargo de ' + (cargo || 'la vacante') + ' en ' + (empresa || 'nuestra empresa') + '. Debe pedirle completar en línea: ' + nombres + '. Indica que el enlace estará disponible ' + dias + ' días, que responda con sinceridad y tranquilidad, y que sus datos se usan solo para el proceso (Ley 29733). Incluye EXACTAMENTE el texto [ENLACE] donde irá el link. Español cordial, sin inventar datos.'
    setBusy('msg' + n.id)
    try {
      const d = await post('/api/ai', { prompt: p, system: 'Eres PREDA, experto en comunicaciones de RR.HH. en español.', max_tokens: 700 })
      let t = String(d.result || '').replace(/\*\*/g, ''); if (t.indexOf('[ENLACE]') < 0) t += '\n\n' + '[ENLACE]'
      t = t.split('[ENLACE]').join(link(n.token))
      setTextos(x => ({ ...x, [n.id]: t }))
      fetch('/api/informes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'mensaje', proceso_id: procesoId, candidato_id: n.candidato_id, titulo: (canal === 'whatsapp' ? 'WhatsApp' : 'Email') + ' — Envío de pruebas — ' + n.nombre, contenido: t }) })
    } catch (e: any) { setMsg('IA: ' + e.message) }
    setBusy('')
    void c
  }
  async function analizar(ev: any) {
    setBusy('an' + ev.id)
    try { const d = await post('/api/evaluaciones/ia', { accion: 'analizar', id: ev.id, cargo }); setEvals(x => x.map(e => e.id === ev.id ? { ...e, analisis_ia: d.analisis } : e)) } catch (e: any) { setMsg('IA: ' + e.message) }
    setBusy('')
  }
  async function borrar(ev: any) {
    if (!confirm('¿Eliminar esta evaluación y sus resultados? Esta acción no se puede deshacer.')) return
    await fetch('/api/evaluaciones?id=' + ev.id, { method: 'DELETE' }); cargarEvals(procesoId)
  }
  const nom = (id: string) => cands.find(c => c.id === id)?.nombre || 'Candidato'
  const grupos = Array.from(new Set(CATALOGO.map(c => c.grupo)))
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '18px 26px' }}>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title">1. Proceso y candidatos</div>
        <div className="field"><select value={procesoId} onChange={e => setProcesoId(e.target.value)}><option value="">Selecciona el proceso...</option>{procesos.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.empresa || ''}</option>)}</select></div>
        {procesoId && (cands.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Este proceso no tiene candidatos.</div> : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}><button className="btn btn-sec" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setSelC(cands.map(c => c.id))}>Todos</button><button className="btn btn-sec" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setSelC([])}>Ninguno</button><span style={{ fontSize: 11, color: 'var(--text-3)', alignSelf: 'center' }}>{selC.length} seleccionado(s)</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 5, maxHeight: 200, overflowY: 'auto' }}>
              {cands.map(c => <label key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 9px', borderRadius: 8, margin: 0, cursor: 'pointer', fontSize: 12, border: '1px solid ' + (selC.includes(c.id) ? 'var(--accent)' : 'var(--border)'), background: selC.includes(c.id) ? 'rgba(30,123,232,.1)' : 'var(--bg-panel)' }}>
                <input type="checkbox" checked={selC.includes(c.id)} onChange={() => setSelC(s => s.includes(c.id) ? s.filter(x => x !== c.id) : s.concat(c.id))} style={{ width: 'auto' }} />{c.nombre}</label>)}
            </div></>
        ))}
      </div>
      {procesoId && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-title">2. Cargo y recomendación de la IA</div>
          <div className="g2"><div className="field"><label>Cargo</label><input value={cargo} onChange={e => setCargo(e.target.value)} /></div><div className="field"><label>Empresa</label><input value={empresa} onChange={e => setEmpresa(e.target.value)} /></div></div>
          <div className="field"><label>Responsabilidades / requisitos del cargo</label><textarea value={resp} onChange={e => setResp(e.target.value)} style={{ minHeight: 80 }} placeholder="Pega las funciones principales del puesto..." /></div>
          <button className="btn btn-sec" onClick={recomendar} disabled={busy === 'rec'}>{busy === 'rec' ? <><span className="spin" /> Analizando...</> : '🤖 Recomendar pruebas con IA'}</button>
          {rec && (
            <div style={{ marginTop: 10, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
              {rec.resumen && <div style={{ fontSize: 12, marginBottom: 6 }}><b>Perfil:</b> {rec.resumen}</div>}
              {rec.recomendadas.map((r: any) => <div key={r.id} style={{ fontSize: 12, marginBottom: 3 }}>• <b>{CATALOGO.find(c => c.id === r.id)?.titulo}</b> — {r.motivo}</div>)}
              <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px', marginTop: 6 }} onClick={() => setSel(rec.recomendadas.map((r: any) => r.id))}>Marcar las recomendadas</button>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>Es una sugerencia: tú decides qué enviar marcando o desmarcando abajo.</div>
            </div>
          )}
        </div>
      )}
      {procesoId && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-title">3. Formularios y pruebas a enviar (selección manual)</div>
          {grupos.map(g => (
            <div key={g} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 4 }}>{g}</div>
              {CATALOGO.filter(c => c.grupo === g).map(c => (
                <label key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 8px', fontSize: 12, cursor: 'pointer', margin: 0 }}>
                  <input type="checkbox" checked={sel.includes(c.id)} onChange={() => setSel(s => s.includes(c.id) ? s.filter(x => x !== c.id) : s.concat(c.id))} style={{ width: 'auto', marginTop: 2 }} />
                  <span><b>{c.titulo}</b> <span style={{ color: 'var(--text-3)' }}>· ~{c.tiempo} min</span><br /><span style={{ color: 'var(--text-3)' }}>{c.desc}</span></span>
                </label>
              ))}
            </div>
          ))}
          {iaSel.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <button className="btn btn-sec" onClick={generar} disabled={busy === 'gen'}>{busy === 'gen' ? <><span className="spin" /> Generando...</> : '🤖 Generar preguntas del cargo con IA'}</button>
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 8 }}>Revisa y quita las que no te convenzan antes de enviar.</span>
              {iaSel.map(id => ia[id] && (
                <div key={id} style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{CATALOGO.find(c => c.id === id)?.titulo} ({ia[id].length})</div>
                  {ia[id].map((it: any, i: number) => (
                    <div key={i} style={{ fontSize: 11, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 6, padding: 8, marginTop: 4 }}>
                      <div style={{ whiteSpace: 'pre-wrap' }}><b>{i + 1}.</b> {it.q}</div>
                      {it.o && it.o.map((o: string, k: number) => <div key={k} style={{ color: k === it.correcta ? 'var(--ok)' : 'var(--text-3)' }}>{String.fromCharCode(65 + k)}) {o}{k === it.correcta ? '  ✔ clave' : ''}</div>)}
                      {it.exp && <div style={{ color: 'var(--text-3)', marginTop: 2 }}>{id === 'caso' ? 'Criterios: ' : 'Nota: '}{it.exp}</div>}
                      <button className="btn btn-sec" style={{ fontSize: 10, padding: '2px 7px', marginTop: 4 }} onClick={() => setIa(x => ({ ...x, [id]: x[id].filter((_: any, j: number) => j !== i) }))}>Quitar</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <div className="field" style={{ margin: 0 }}><label>Validez del enlace (días)</label><input type="number" min={1} max={60} value={dias} onChange={e => setDias(Number(e.target.value))} style={{ width: 90 }} /></div>
            <button className="btn btn-primary" onClick={crear} disabled={busy === 'crear' || !selC.length || !sel.length} style={{ marginTop: 16 }}>{busy === 'crear' ? <><span className="spin" /> Creando...</> : 'Crear enlaces para ' + selC.length + ' candidato(s)'}</button>
          </div>
        </div>
      )}
      {msg && <div style={{ fontSize: 12, margin: '0 0 12px', color: /^(Error|IA|No se)/.test(msg) ? 'var(--err)' : 'var(--ok)' }}>{msg}</div>}
      {nuevas.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-title">4. Enviar a los candidatos</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button className={'btn ' + (canal === 'email' ? 'btn-primary' : 'btn-sec')} style={{ fontSize: 12 }} onClick={() => setCanal('email')}>✉️ Email</button>
            <button className={'btn ' + (canal === 'whatsapp' ? 'btn-primary' : 'btn-sec')} style={{ fontSize: 12 }} onClick={() => setCanal('whatsapp')}>💬 WhatsApp</button>
          </div>
          {nuevas.map(n => {
            const c = cands.find(x => x.id === n.candidato_id); const t = textos[n.id]
            return (
              <div key={n.id} style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{n.nombre} <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>{canal === 'whatsapp' ? (c?.telefono || '(sin teléfono)') : (c?.email || '(sin email)')}</span></div>
                <div style={{ fontSize: 11, color: 'var(--accent2)', wordBreak: 'break-all' }}>{link(n.token)}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                  <button className="btn btn-sec" style={{ fontSize: 11, padding: '3px 9px' }} onClick={() => { navigator.clipboard.writeText(link(n.token)); setMsg('Enlace copiado') }}>Copiar enlace</button>
                  <button className="btn btn-sec" style={{ fontSize: 11, padding: '3px 9px' }} onClick={() => mensaje(n)} disabled={busy === 'msg' + n.id}>{busy === 'msg' + n.id ? 'Redactando...' : '🤖 Redactar mensaje'}</button>
                  {t && (canal === 'whatsapp'
                    ? <a className="btn btn-ok" style={{ fontSize: 11, padding: '3px 9px', textDecoration: 'none' }} target="_blank" rel="noreferrer" href={'https://wa.me/' + telWA(c?.telefono || '') + '?text=' + encodeURIComponent(t)}>Abrir en WhatsApp</a>
                    : <a className="btn btn-ok" style={{ fontSize: 11, padding: '3px 9px', textDecoration: 'none' }} href={'mailto:' + (c?.email || '') + '?subject=' + encodeURIComponent((t.match(/ASUNTO:\s*(.*)/i) || [])[1] || 'Evaluación — ' + cargo) + '&body=' + encodeURIComponent(t.replace(/ASUNTO:.*\n?/i, '').trim())}>Abrir en correo</a>)}
                </div>
                {t && <div style={{ fontSize: 11, whiteSpace: 'pre-wrap', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 6, padding: 8, marginTop: 6 }}>{t}</div>}
              </div>
            )
          })}
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>El sistema no envía solo: abre tu correo o WhatsApp con el mensaje listo para que lo envíes tú.</div>
        </div>
      )}
      {procesoId && (
        <div className="card">
          <div className="card-title">Seguimiento y resultados ({evals.length})</div>
          {evals.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Aún no se enviaron pruebas en este proceso.</div> : evals.map(ev => {
            const R = ev.resultados || {}; const hechas = Object.keys(R).length; const tot = (ev.pruebas || []).length
            const venc = ev.expira && new Date(ev.expira).getTime() < Date.now() && ev.estado !== 'completada'
            return (
              <div key={ev.id} style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{nom(ev.candidato_id)}</div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>{(ev.pruebas || []).map((p: any) => p.titulo).join(' · ')}</div></div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: ev.estado === 'completada' ? 'rgba(26,173,110,.15)' : venc ? 'rgba(232,64,64,.15)' : 'rgba(240,160,40,.15)', color: ev.estado === 'completada' ? 'var(--ok)' : venc ? 'var(--err)' : 'var(--warn)' }}>{venc ? 'Vencido' : ev.estado === 'completada' ? 'Completada' : ev.estado === 'en_curso' ? 'En curso ' + hechas + '/' + tot : 'Pendiente'}</span>
                  <button className="btn btn-sec" style={{ fontSize: 11, padding: '3px 9px' }} onClick={() => { navigator.clipboard.writeText(link(ev.token)); setMsg('Enlace copiado') }}>Copiar enlace</button>
                  {hechas > 0 && <button className="btn btn-sec" style={{ fontSize: 11, padding: '3px 9px' }} onClick={() => setAbierto(abierto === ev.id ? null : ev.id)}>{abierto === ev.id ? 'Ocultar' : 'Ver resultados'}</button>}
                  <button className="btn btn-sec" style={{ fontSize: 11, padding: '3px 9px', color: 'var(--err)' }} onClick={() => borrar(ev)}>Eliminar</button>
                </div>
                {abierto === ev.id && (
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    {(ev.pruebas || []).map((p: any) => {
                      const r = R[p.id]; if (!r) return <div key={p.id} style={{ color: 'var(--text-3)' }}>• {p.titulo}: sin completar</div>
                      if (p.tipo === 'ficha') return <details key={p.id} style={{ margin: '4px 0' }}><summary style={{ cursor: 'pointer' }}>• {p.titulo}: recibida</summary><div style={{ background: 'var(--bg-panel)', padding: 8, borderRadius: 6, marginTop: 4, lineHeight: 1.7 }}>{Object.keys(ev.ficha || {}).filter(k => (ev.ficha || {})[k] !== '' && (ev.ficha || {})[k] !== false).map(k => <div key={k}><b>{k.replace(/_/g, ' ')}:</b> {String((ev.ficha || {})[k])}</div>)}</div></details>
                      if (p.tipo === 'likert') return <div key={p.id} style={{ margin: '4px 0' }}>• <b>{p.titulo}</b>: {Object.keys(r.dimensiones || {}).map(d => (DIM_NOMBRES[d] || d) + ' ' + r.dimensiones[d] + ' (' + nivel(r.dimensiones[d]) + ')').join(' · ')}{r.alerta_deseabilidad && <span style={{ color: 'var(--warn)' }}> ⚠ posible respuesta socialmente deseable</span>}</div>
                      if (p.tipo === 'mcq') return <div key={p.id} style={{ margin: '4px 0' }}>• <b>{p.titulo}</b>: {r.correctas}/{r.total} ({r.porcentaje}%) {r.sin_responder > 0 ? '· ' + r.sin_responder + ' sin responder' : ''}</div>
                      return <div key={p.id} style={{ margin: '4px 0' }}>• <b>{p.titulo}</b>: {r.respondidas}/{r.total} casos respondidos</div>
                    })}
                    <div style={{ marginTop: 6 }}><button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => analizar(ev)} disabled={busy === 'an' + ev.id}>{busy === 'an' + ev.id ? <><span className="spin" /> Analizando...</> : '🤖 ' + (ev.analisis_ia ? 'Regenerar' : 'Generar') + ' informe con IA'}</button></div>
                    {ev.analisis_ia && <div style={{ whiteSpace: 'pre-wrap', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 6, padding: 10, marginTop: 6, lineHeight: 1.7 }}>{ev.analisis_ia}</div>}
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>Pruebas sin supervisión: los resultados son orientativos y no constituyen un diagnóstico psicológico.</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
