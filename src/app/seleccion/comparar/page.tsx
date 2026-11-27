'use client'
import { useEffect, useState } from 'react'
import { useAI } from '@/hooks/useAI'
import { useProcesoActivo } from '@/hooks/useProcesoActivo'
import Radar from '@/components/Radar'

const DIMS: [string, string][] = [['exp', 'Experiencia'], ['form', 'Formación'], ['cap', 'Capacitación'], ['ats', 'ATS'], ['blandas', 'Blandas'], ['pres', 'Presentación']]
const COLORES = ['#2a8fff', '#1aad6e', '#e8a020', '#a855f7', '#e84040', '#14b8a6']

export default function CompararPage() {
  const { callAI, loading } = useAI()
  const { procesos, procesoId, setProcesoId } = useProcesoActivo()
  const [candidatos, setCandidatos] = useState<any[]>([])
  const [entrevistas, setEntrevistas] = useState<any[]>([])
  const [sel, setSel] = useState<string[]>([])
  const [nTop, setNTop] = useState(3)
  const [comparacion, setComparacion] = useState<any>(null)
  const [historial, setHistorial] = useState<any[]>([])

  useEffect(() => {
    setSel([]); setComparacion(null)
    if (!procesoId) { setCandidatos([]); setHistorial([]); return }
    fetch('/api/candidatos?proceso_id=' + procesoId).then(r => r.json()).then(d => setCandidatos(d.candidatos || []))
    fetch('/api/entrevistas?proceso_id=' + procesoId).then(r => r.json()).then(d => setEntrevistas(d.entrevistas || []))
    fetch('/api/informes?tipo=comparacion&proceso_id=' + procesoId).then(r => r.json()).then(d => { const h = d.informes || []; setHistorial(h); setComparacion(h[0] || null) })
  }, [procesoId])

  const proc = procesos.find(p => p.id === procesoId)
  const evaluados = [...candidatos].filter(c => (c.score || 0) > 0).sort((a, b) => (b.score || 0) - (a.score || 0))
  const elegidos = sel.map(id => candidatos.find(c => c.id === id)).filter(Boolean) as any[]
  const entPts = (id: string) => { const e = entrevistas.find(x => x.candidato_id === id && x.puntaje != null); return e ? e.puntaje as number : null }
  const sC = (s: number) => s >= 60 ? 'var(--ok)' : s >= 40 ? 'var(--warn)' : 'var(--err)'
  const toggle = (id: string) => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const topN = () => setSel(evaluados.slice(0, nTop).map(c => c.id))

  async function comparar() {
    if (elegidos.length < 2) { alert('Selecciona al menos 2 candidatos'); return }
    const bloques = elegidos.map((c, i) =>
      'CANDIDATO ' + (i + 1) + ': ' + c.nombre + '\nScore CV: ' + (c.score || 'N/D') + '/100 | ATS: ' + (c.ats_score || 'N/D') + '/100' +
      (entPts(c.id) !== null ? ' | Entrevista: ' + entPts(c.id) + '/100' : '') + ' | Etapa: ' + (c.etapa || 'cv') + '\n' +
      (c.dimensiones ? 'Dimensiones: ' + DIMS.map(d => d[1] + ' ' + (c.dimensiones[d[0]] ?? '-')).join(', ') + '\n' : '') +
      'Resumen: ' + (c.resumen || String(c.resultado || '').substring(0, 450))
    ).join('\n\n')
    const prompt =
      'Compara estos ' + elegidos.length + ' candidatos para el cargo "' + (proc?.cargo || '') + '" (proceso "' + (proc?.nombre || '') + '").\n\n' + bloques +
      '\n\nEntrega, sin tablas ni negritas:\n1. COMPARATIVO POR DIMENSION (experiencia, formacion, capacitaciones, ATS, competencias blandas)\n2. VENTAJAS Y RIESGOS DE CADA CANDIDATO\n3. RANKING FINAL\n4. CANDIDATO RECOMENDADO con justificacion'
    const r = await callAI(prompt, 'Eres PREDA, experto en seleccion de personal. Responde en espanol.')
    if (!r) return
    const txt = r.replace(/\*\*/g, '').replace(/^#{1,4}\s*/gm, '')
    const res = await fetch('/api/informes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'comparacion', proceso_id: procesoId, titulo: 'Comparación: ' + elegidos.map(c => c.nombre).join(' vs '), contenido: txt, datos: { ids: sel } }) })
    const d = await res.json()
    const inf = d.informe || { contenido: txt, titulo: 'Comparación', created_at: new Date().toISOString() }
    setComparacion(inf); setHistorial(h => [inf, ...h])
  }

  const conDims = elegidos.filter(c => c.dimensiones)
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 26px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>Comparar Candidatos</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Compara a los mejores del proceso o a los candidatos que elijas manualmente (2 o más)</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px', background: 'rgba(30,123,232,.06)', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
        <label style={{ margin: 0 }}>Proceso:</label>
        <select value={procesoId} onChange={e => setProcesoId(e.target.value)} style={{ maxWidth: 360, fontSize: 13 }}>
          <option value="">Selecciona un proceso</option>
          {procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 26px' }}>
        {!procesoId ? <div className="empty">Selecciona un proceso para comparar candidatos</div> : evaluados.length < 2 ? <div className="empty">Se necesitan al menos 2 candidatos evaluados en este proceso</div> : (
          <>
            <div className="card">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>Candidatos del proceso ({sel.length} seleccionados)</span>
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'none', letterSpacing: 0 }}>
                  <button className="btn btn-sec" style={{ fontSize: 11, padding: '4px 10px' }} onClick={topN}>Seleccionar los mejores</button>
                  <input type="number" min={2} max={6} value={nTop} onChange={e => setNTop(Math.max(2, Math.min(6, Number(e.target.value) || 2)))} style={{ width: 56, fontSize: 12, padding: '4px 6px' }} />
                  <button className="btn btn-sec" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setSel([])}>Limpiar</button>
                </span>
              </div>
              {evaluados.map(c => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, marginBottom: 5, cursor: 'pointer', background: sel.includes(c.id) ? 'rgba(30,123,232,.12)' : 'var(--bg-panel)', border: '1px solid ' + (sel.includes(c.id) ? 'var(--accent)' : 'var(--border)'), fontSize: 13 }}>
                  <input type="checkbox" checked={sel.includes(c.id)} onChange={() => toggle(c.id)} style={{ width: 'auto' }} />
                  <span style={{ flex: 1, fontWeight: 600 }}>{c.nombre}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>ATS {c.ats_score || '?'}{entPts(c.id) !== null ? ' · Entrev. ' + entPts(c.id) : ''} · {c.etapa}</span>
                  <b style={{ color: sC(c.score || 0), minWidth: 28, textAlign: 'right' }}>{c.score}</b>
                </label>
              ))}
              <div className="btn-row">
                <button className="btn btn-primary" onClick={comparar} disabled={loading || sel.length < 2} style={{ fontSize: 14, padding: '10px 26px' }}>
                  {loading ? <><span className="spin" /> Comparando...</> : 'Comparar ' + (sel.length >= 2 ? sel.length + ' candidatos ' : '') + 'con IA'}
                </button>
              </div>
            </div>

            {elegidos.length >= 2 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px,420px) 1fr', gap: 16, alignItems: 'start' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                  <div className="card-title">Telaraña comparativa (CV)</div>
                  {conDims.length >= 2
                    ? <Radar ejes={DIMS.map(d => d[1])} series={conDims.map((c, i) => ({ nombre: c.nombre, valores: DIMS.map(d => Number(c.dimensiones[d[0]]) || 0), color: COLORES[i % COLORES.length] }))} />
                    : <div className="empty">Estos CV se evaluaron antes de guardar dimensiones; vuelve a analizarlos para ver la telaraña.</div>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 6 }}>
                    {elegidos.map((c, i) => <span key={c.id} style={{ fontSize: 11, color: COLORES[i % COLORES.length], fontWeight: 600 }}>● {c.nombre}</span>)}
                  </div>
                </div>
                <div className="card">
                  <div className="card-title">Cuadro comparativo</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead><tr><th style={{ textAlign: 'left', padding: 6, color: 'var(--text-3)' }}></th>{elegidos.map((c, i) => <th key={c.id} style={{ padding: 6, color: COLORES[i % COLORES.length] }}>{c.nombre.split(' ').slice(0, 2).join(' ')}</th>)}</tr></thead>
                      <tbody>
                        {DIMS.map(([k, l]) => (<tr key={k} style={{ borderTop: '1px solid var(--border)' }}><td style={{ padding: 6 }}>{l}</td>{elegidos.map(c => { const v = c.dimensiones?.[k]; const mx = Math.max(...elegidos.map(x => x.dimensiones?.[k] ?? -1)); return <td key={c.id} style={{ padding: 6, textAlign: 'center', fontWeight: v === mx && v != null ? 800 : 400, color: v == null ? 'var(--text-3)' : sC(v) }}>{v ?? '-'}</td> })}</tr>))}
                        <tr style={{ borderTop: '2px solid var(--border-hi)' }}><td style={{ padding: 6, fontWeight: 700 }}>Score global</td>{elegidos.map(c => <td key={c.id} style={{ padding: 6, textAlign: 'center', fontWeight: 800, color: sC(c.score || 0) }}>{c.score}</td>)}</tr>
                        <tr><td style={{ padding: 6 }}>Entrevista</td>{elegidos.map(c => <td key={c.id} style={{ padding: 6, textAlign: 'center' }}>{entPts(c.id) ?? '-'}</td>)}</tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {comparacion && (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-title">{comparacion.titulo || 'Comparación IA'} · {comparacion.created_at ? new Date(comparacion.created_at).toLocaleString('es-PE') : ''}</div>
                <div style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{comparacion.contenido}</div>
                <div className="btn-row">
                  <button className="btn btn-sec" onClick={() => navigator.clipboard.writeText(comparacion.contenido)}>Copiar</button>
                  <button className="btn btn-sec" onClick={() => window.print()}>Imprimir / PDF</button>
                </div>
              </div>
            )}
            {historial.length > 1 && (
              <div className="card"><div className="card-title">Comparaciones anteriores (guardadas)</div>
                {historial.slice(1).map((h: any) => <button key={h.id} className="btn btn-sec" style={{ fontSize: 12, marginRight: 6, marginBottom: 6 }} onClick={() => setComparacion(h)}>{(h.titulo || 'Comparación').substring(0, 60)} · {new Date(h.created_at).toLocaleDateString('es-PE')}</button>)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
