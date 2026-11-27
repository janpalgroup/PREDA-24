'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
// Pagina PUBLICA para el candidato (sin inicio de sesion). El acceso lo da el enlace unico.
export default function EvaluacionPublica() {
  const { token } = useParams() as { token: string }
  const [d, setD] = useState<any>(null); const [err, setErr] = useState(''); const [cargando, setCargando] = useState(true)
  const [activa, setActiva] = useState<string | null>(null)
  const [resp, setResp] = useState<any>({}); const [enviando, setEnviando] = useState(false); const [aviso, setAviso] = useState('')
  async function cargar() {
    try { const r = await fetch('/api/publico/evaluacion/' + token); const j = await r.json(); if (!r.ok) setErr(j.error || 'Error'); else setD(j) } catch { setErr('No se pudo conectar. Revisa tu internet.') }
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])
  const hechas: string[] = d?.completadas || []
  const pruebas: any[] = d?.pruebas || []
  const todas = pruebas.length > 0 && pruebas.every(p => hechas.includes(p.id))
  function abrir(p: any) {
    setAviso(''); setActiva(p.id)
    if (p.tipo === 'ficha') { const base: any = { ...(d.ficha_prev || {}) }; if (!base.nombres && d.nombre) { const w = d.nombre.split(' '); base.nombres = w.slice(0, Math.ceil(w.length / 2)).join(' '); base.apellidos = w.slice(Math.ceil(w.length / 2)).join(' ') } setResp({ ...resp, [p.id]: base }) }
    else setResp({ ...resp, [p.id]: p.items.map(() => (p.tipo === 'abierta' ? '' : -1)) })
  }
  async function enviar(p: any) {
    setAviso(''); const r = resp[p.id]
    if (p.tipo !== 'ficha' && p.tipo !== 'abierta') {
      const sin = (r || []).filter((x: number) => !(x >= 0)).length
      if (sin > 0 && !confirm('Te faltan ' + sin + ' pregunta(s) por responder. Una vez enviada la prueba no se puede modificar. ¿Enviar de todos modos?')) return
    } else if (p.tipo === 'abierta') { if (!confirm('Una vez enviada la prueba no se puede modificar. ¿Enviar?')) return }
    setEnviando(true)
    try {
      const x = await fetch('/api/publico/evaluacion/' + token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prueba_id: p.id, respuestas: r }) })
      const j = await x.json()
      if (!x.ok) setAviso(j.faltan ? 'Completa los campos obligatorios: ' + j.faltan.join(', ') : (j.error || 'Error'))
      else { setActiva(null); await cargar(); window.scrollTo(0, 0) }
    } catch { setAviso('No se pudo enviar. Revisa tu internet e inténtalo otra vez (tus respuestas siguen en pantalla).') }
    setEnviando(false)
  }
  const wrap: React.CSSProperties = { maxWidth: 760, margin: '0 auto', padding: '20px 16px 60px' }
  const marca = <div style={{ textAlign: 'center', marginBottom: 18 }}><div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 3 }}>PRE<span style={{ color: 'var(--accent)' }}>DA</span></div></div>
  if (cargando) return <div className="empty"><span className="spin" /></div>
  if (err) return <div style={wrap}>{marca}<div className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No se puede abrir este enlace</div><div style={{ fontSize: 13, color: 'var(--text-3)' }}>{err}</div></div></div>
  const p = activa ? pruebas.find(x => x.id === activa) : null
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}><div style={wrap}>
      {marca}
      {!p && (
        <>
          <div className="card">
            <div style={{ fontSize: 18, fontWeight: 700 }}>{d.titulo}</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Hola{d.nombre ? ', ' + d.nombre : ''}. Completa lo siguiente para continuar en el proceso de selección.</div>
            <ul style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.8, margin: '10px 0 0 16px' }}>
              <li>Responde tú mismo(a), con tranquilidad y en un lugar sin distracciones.</li>
              <li>Cada prueba se envía una sola vez; puedes hacer las pruebas en el orden que prefieras.</li>
              <li>Tus datos se usan solo para este proceso de selección (Ley N.º 29733).</li>
            </ul>
          </div>
          {todas ? (
            <div className="card" style={{ textAlign: 'center', borderColor: 'var(--ok)' }}><div style={{ fontSize: 30 }}>✅</div><div style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>¡Gracias! Has completado todo.</div><div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>El equipo de selección revisará tus resultados y se pondrá en contacto contigo.</div></div>
          ) : null}
          {pruebas.map(x => {
            const ok = hechas.includes(x.id)
            return (
              <div key={x.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 22 }}>{ok ? '✅' : x.tipo === 'ficha' ? '📝' : '🧩'}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{x.titulo}</div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>{x.tipo === 'ficha' ? 'Formulario' : x.items.length + ' ' + (x.tipo === 'abierta' ? 'casos' : 'preguntas')} · aprox. {x.tiempo} min</div></div>
                {ok ? <span style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>Enviada</span> : <button className="btn btn-primary" onClick={() => abrir(x)}>Comenzar</button>}
              </div>
            )
          })}
        </>
      )}
      {p && (
        <div>
          <button className="btn btn-sec" style={{ fontSize: 12, marginBottom: 10 }} onClick={() => setActiva(null)}>← Volver a la lista</button>
          <div className="card"><div style={{ fontSize: 17, fontWeight: 700 }}>{p.titulo}</div><div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{p.instr}</div></div>
          {p.tipo === 'ficha' && (d.ficha_def || []).map((s: any) => (
            <div key={s.sec} className="card"><div className="card-title">{s.sec}</div>
              <div className="g2">{s.campos.map((c: any) => {
                const v = (resp[p.id] || {})[c.k]; const set = (val: any) => setResp((r: any) => ({ ...r, [p.id]: { ...(r[p.id] || {}), [c.k]: val } }))
                if (c.t === 'check') return <label key={c.k} style={{ gridColumn: '1/-1', display: 'flex', gap: 8, fontSize: 12, alignItems: 'flex-start', cursor: 'pointer' }}><input type="checkbox" checked={v === true} onChange={e => set(e.target.checked)} style={{ width: 'auto', marginTop: 2 }} /><span>{c.l} *</span></label>
                return <div key={c.k} className="field" style={c.t === 'textarea' ? { gridColumn: '1/-1' } : undefined}><label>{c.l}{c.req ? ' *' : ''}</label>
                  {c.t === 'select' ? <select value={v || ''} onChange={e => set(e.target.value)}><option value="">Selecciona...</option>{c.op.map((o: string) => <option key={o}>{o}</option>)}</select>
                    : c.t === 'textarea' ? <textarea value={v || ''} onChange={e => set(e.target.value)} style={{ minHeight: 60 }} />
                      : <input type={c.t === 'date' ? 'date' : c.t === 'number' ? 'number' : 'text'} value={v || ''} onChange={e => set(e.target.value)} />}</div>
              })}</div>
            </div>
          ))}
          {p.tipo === 'abierta' && p.items.map((it: any, i: number) => (
            <div key={i} className="card"><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, whiteSpace: 'pre-wrap' }}>Caso {i + 1}. {it.q}</div>
              <textarea value={(resp[p.id] || [])[i] || ''} onChange={e => setResp((r: any) => { const a = (r[p.id] || []).slice(); a[i] = e.target.value; return { ...r, [p.id]: a } })} style={{ minHeight: 130 }} placeholder="Escribe tu respuesta..." /></div>
          ))}
          {(p.tipo === 'mcq' || p.tipo === 'likert') && p.items.map((it: any, i: number) => (
            <div key={i} className="card" style={p.tipo === 'likert' ? { padding: '12px 16px' } : undefined}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, whiteSpace: 'pre-wrap' }}>{i + 1}. {it.q}</div>
              <div style={{ display: 'flex', flexDirection: p.tipo === 'likert' ? 'row' : 'column', gap: 6, flexWrap: 'wrap' }}>
                {it.o.map((o: string, k: number) => {
                  const sel = (resp[p.id] || [])[i] === k
                  return <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', margin: 0, flex: p.tipo === 'likert' ? '1 1 120px' : undefined, border: '1px solid ' + (sel ? 'var(--accent)' : 'var(--border)'), background: sel ? 'rgba(30,123,232,.12)' : 'var(--bg-panel)' }}>
                    <input type="radio" name={'q' + i} checked={sel} onChange={() => setResp((r: any) => { const a = (r[p.id] || []).slice(); a[i] = k; return { ...r, [p.id]: a } })} style={{ width: 'auto' }} />{p.tipo === 'likert' ? o : String.fromCharCode(65 + k) + ') ' + o}</label>
                })}
              </div>
            </div>
          ))}
          {aviso && <div style={{ color: 'var(--err)', fontSize: 13, marginBottom: 10 }}>{aviso}</div>}
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 14 }} disabled={enviando} onClick={() => enviar(p)}>{enviando ? 'Enviando...' : 'Enviar ' + p.titulo}</button>
        </div>
      )}
    </div></div>
  )
}
