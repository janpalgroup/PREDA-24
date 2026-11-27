'use client'
import { useEffect, useState } from 'react'
import { useAI } from '@/hooks/useAI'
import { useProcesoActivo } from '@/hooks/useProcesoActivo'
import Radar from '@/components/Radar'

const DIMS: [string, string][] = [['exp', 'Experiencia'], ['form', 'Formación'], ['cap', 'Capacitación'], ['ats', 'ATS'], ['blandas', 'Blandas'], ['pres', 'Presentación']]
const EJES_PERFIL: [string, string][] = [['comunicacion', 'Comunicación'], ['liderazgo', 'Liderazgo'], ['confiabilidad', 'Confiabilidad'], ['integridad', 'Integridad'], ['estabilidad', 'Estab. emocional'], ['resultados', 'Resultados'], ['equipo', 'Equipo'], ['adaptabilidad', 'Adaptabilidad']]
const ETAPAS = ['cv', 'entrevista', 'shortlist', 'oferta', 'contratado', 'descartado']
const COLS: Record<string, string> = { cv: '#2a8fff', entrevista: '#e8a020', shortlist: '#a855f7', oferta: '#1aad6e', contratado: '#10b981', descartado: '#e84040' }
const COLORES = ['#2a8fff', '#1aad6e', '#e8a020', '#a855f7', '#e84040']

export default function ReportesPage() {
  const { callAI, loading } = useAI()
  const { procesos, procesoId, setProcesoId } = useProcesoActivo()
  const [candidatos, setCandidatos] = useState<any[]>([])
  const [entrevistas, setEntrevistas] = useState<any[]>([])
  const [informes, setInformes] = useState<any[]>([])
  const [reporte, setReporte] = useState<any>(null)
  const [abierto, setAbierto] = useState<string | null>(null)

  useEffect(() => {
    setReporte(null); setInformes([]); setCandidatos([]); setEntrevistas([])
    if (!procesoId) return
    fetch('/api/candidatos?proceso_id=' + procesoId).then(r => r.json()).then(d => setCandidatos(d.candidatos || []))
    fetch('/api/entrevistas?proceso_id=' + procesoId).then(r => r.json()).then(d => setEntrevistas(d.entrevistas || []))
    fetch('/api/informes?proceso_id=' + procesoId).then(r => r.json()).then(d => {
      const all = d.informes || []; setInformes(all)
      setReporte(all.find((x: any) => x.tipo === 'reporte') || null)
    })
  }, [procesoId])

  const proc = procesos.find(p => p.id === procesoId)
  const cands = procesoId ? candidatos.filter(c => c.proceso_id === procesoId) : candidatos
  const ent = (id: string) => entrevistas.find(e => e.candidato_id === id)
  const entPts = (id: string) => { const e = entrevistas.find(x => x.candidato_id === id && x.puntaje != null); return e ? e.puntaje as number : null }
  const rank = (c: any) => { const en = entPts(c.id); return en !== null ? Math.round((c.score || 0) * 0.6 + en * 0.4) : (c.score || 0) }
  const evaluados = cands.filter(c => (c.score || 0) > 0)
  const ordenados = [...evaluados].sort((a, b) => rank(b) - rank(a))
  const prom = evaluados.length ? Math.round(evaluados.reduce((a, c) => a + (c.score || 0), 0) / evaluados.length) : 0
  const aprobados = evaluados.filter(c => (c.score || 0) >= 60).length
  const nEntrev = cands.filter(c => entPts(c.id) !== null).length
  const rangos: [string, number, number, string][] = [['0–39', 0, 39, '#e84040'], ['40–59', 40, 59, '#e8a020'], ['60–79', 60, 79, '#2a8fff'], ['80–100', 80, 100, '#1aad6e']]
  const dist = rangos.map(([l, a, b, col]) => ({ l, col, n: evaluados.filter(c => (c.score || 0) >= a && (c.score || 0) <= b).length }))
  const maxDist = Math.max(1, ...dist.map(d => d.n))
  const sC = (s: number) => s >= 60 ? 'var(--ok)' : s >= 40 ? 'var(--warn)' : 'var(--err)'
  const top5 = ordenados.filter(c => c.dimensiones).slice(0, 5)

  async function genReporte() {
    if (!cands.length) { alert('No hay candidatos'); return }
    const lista = ordenados.slice(0, 15).map((c, i) =>
      (i + 1) + '. ' + c.nombre + ' | CV ' + c.score + ' | ATS ' + (c.ats_score || '?') + (entPts(c.id) !== null ? ' | Entrevista ' + entPts(c.id) : '') + ' | Etapa ' + c.etapa + ' | Ranking ' + rank(c) + '\n   ' + (c.resumen || '').substring(0, 250)).join('\n')
    const stats = ETAPAS.map(e => e + ': ' + cands.filter(c => c.etapa === e).length).join(' | ')
    const prompt =
      'Genera el REPORTE EJECUTIVO DE SELECCION DE PERSONAL' + (proc ? ' del proceso "' + proc.nombre + '" (cargo ' + (proc.cargo || '') + ')' : ' (todos los procesos)') + '.\n\n' +
      'ESTADISTICAS: total candidatos ' + cands.length + ', evaluados ' + evaluados.length + ', aprobados (>=60) ' + aprobados + ', promedio ' + prom + ', con entrevista ' + nEntrev + '.\nPIPELINE: ' + stats + '\n\n' +
      'RANKING:\n' + lista + '\n\n' +
      'Entrega, sin tablas ni negritas:\n1. RESUMEN EJECUTIVO\n2. ANALISIS DEL PROCESO (volumen, calidad de la terna, embudo)\n3. EVALUACION POR CANDIDATO (una linea por candidato del ranking)\n4. RECOMENDACION DE CONTRATACION\n5. RIESGOS Y PROXIMOS PASOS'
    const r = await callAI(prompt, 'Eres PREDA, experto en seleccion de personal. Responde en espanol.')
    if (!r) return
    const txt = r.replace(/\*\*/g, '').replace(/^#{1,4}\s*/gm, '')
    const res = await fetch('/api/informes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'reporte', proceso_id: procesoId || null, titulo: 'Reporte — ' + (proc?.nombre || 'todos los procesos'), contenido: txt, datos: { total: cands.length, promedio: prom, aprobados } }) })
    const d = await res.json()
    const inf = d.informe || { contenido: txt, created_at: new Date().toISOString(), tipo: 'reporte' }
    setReporte(inf); setInformes(p => [inf, ...p])
  }

  const docs = informes.filter(i => i.tipo !== 'mensaje')
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="no-print" style={{ padding: '14px 26px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>Reportes de Selección</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Resumen completo del proceso con gráficos y evaluación por candidato. Todo queda guardado.</div>
      </div>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px', background: 'rgba(30,123,232,.06)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <select value={procesoId} onChange={e => setProcesoId(e.target.value)} style={{ maxWidth: 380, fontSize: 13 }}>
          <option value="">Selecciona el proceso...</option>{procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={genReporte} disabled={loading}>{loading ? <><span className="spin" /> Generando...</> : 'Generar reporte IA'}</button>
        <button className="btn btn-sec" style={{ fontSize: 13 }} onClick={() => window.print()}>Imprimir / PDF</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 26px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }} className="print-only">Reporte de selección — {proc?.nombre || 'Todos los procesos'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 16 }}>
          {[{ l: 'Candidatos', v: cands.length, c: 'var(--text-1)' }, { l: 'Evaluados', v: evaluados.length, c: 'var(--accent2)' }, { l: 'Aprobados ≥60', v: aprobados, c: 'var(--ok)' }, { l: 'Puntaje promedio', v: prom, c: sC(prom) }, { l: 'Con entrevista', v: nEntrev, c: 'var(--warn)' }].map(k => (
            <div key={k.l} className="card" style={{ textAlign: 'center', margin: 0 }}><div style={{ fontSize: 24, fontWeight: 800, color: k.c }}>{k.v}</div><div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{k.l}</div></div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div className="card">
            <div className="card-title">Embudo por etapa</div>
            {ETAPAS.map(e => { const n = cands.filter(c => c.etapa === e).length; const pct = cands.length ? Math.round(n / cands.length * 100) : 0; return (
              <div key={e} style={{ marginBottom: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2, textTransform: 'capitalize' }}><span style={{ color: COLS[e], fontWeight: 600 }}>{e}</span><span>{n} ({pct}%)</span></div>
                <div className="sbar"><div className="sfill" style={{ width: pct + '%', background: COLS[e] }} /></div>
              </div>) })}
          </div>
          <div className="card">
            <div className="card-title">Distribución de puntajes CV</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 130, paddingTop: 10 }}>
              {dist.map(d => (
                <div key={d.l} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{d.n}</div>
                  <div style={{ height: Math.max(4, d.n / maxDist * 90), background: d.col, borderRadius: '4px 4px 0 0' }} />
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{d.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="card-title">Telaraña: mejores candidatos (CV)</div>
            {top5.length >= 1 ? <>
              <Radar size={280} ejes={DIMS.map(d => d[1])} series={top5.map((c, i) => ({ nombre: c.nombre, valores: DIMS.map(d => Number(c.dimensiones[d[0]]) || 0), color: COLORES[i] }))} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>{top5.map((c, i) => <span key={c.id} style={{ fontSize: 10, color: COLORES[i], fontWeight: 600 }}>● {c.nombre.split(' ').slice(0, 2).join(' ')}</span>)}</div>
            </> : <div className="empty" style={{ padding: 20 }}>Sin dimensiones guardadas</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Evaluación por candidato (ranking = 60% CV + 40% entrevista)</div>
          {ordenados.length === 0 ? <div className="empty">Sin candidatos evaluados</div> : ordenados.map((c, i) => {
            const e = ent(c.id); const abierta = abierto === c.id
            return (
              <div key={c.id} style={{ borderTop: i ? '1px solid var(--border)' : 'none', padding: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setAbierto(abierta ? null : c.id)}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--adim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent2)' }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{c.nombre}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.cargo || ''} · {c.etapa}</div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>CV <b style={{ color: sC(c.score || 0) }}>{c.score}</b> · ATS <b>{c.ats_score || '?'}</b> · Entrev. <b>{entPts(c.id) ?? '-'}</b></span>
                  <div style={{ minWidth: 80 }}><div className="sbar"><div className="sfill" style={{ width: rank(c) + '%', background: sC(rank(c)) }} /></div></div>
                  <b style={{ color: sC(rank(c)), minWidth: 26, textAlign: 'right' }}>{rank(c)}</b>
                </div>
                {(abierta) && (
                  <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      {c.dimensiones && DIMS.map(([k, l]) => (
                        <div key={k} style={{ marginBottom: 5 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span>{l}</span><b>{c.dimensiones[k] ?? '-'}</b></div><div className="sbar"><div className="sfill" style={{ width: (c.dimensiones[k] || 0) + '%', background: sC(c.dimensiones[k] || 0) }} /></div></div>
                      ))}
                      {c.resumen && <div style={{ fontSize: 12, lineHeight: 1.7, marginTop: 8, color: 'var(--text-2)' }}>{c.resumen}</div>}
                    </div>
                    <div>
                      {e?.perfil ? <Radar size={260} ejes={EJES_PERFIL.map(x => x[1])} series={[{ nombre: c.nombre, valores: EJES_PERFIL.map(x => Number(e.perfil[x[0]]) || 0), color: '#a855f7' }]} /> : <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sin entrevista con perfil.</div>}
                    </div>
                    {e?.informe && <div style={{ gridColumn: '1/-1', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', background: 'var(--bg-panel)', padding: 10, borderRadius: 8 }}>{e.informe}</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="card">
          <div className="card-title">Reporte ejecutivo IA{reporte?.created_at ? ' · ' + new Date(reporte.created_at).toLocaleString('es-PE') : ''}</div>
          {!reporte ? <div className="empty" style={{ padding: 30 }}>Genera el reporte con IA</div> : <div style={{ fontSize: 13, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{reporte.contenido}</div>}
        </div>

        {docs.length > 0 && (
          <div className="card no-print">
            <div className="card-title">Documentos guardados de {proc ? 'este proceso' : 'todos los procesos'} ({docs.length})</div>
            {docs.map(d => (
              <details key={d.id} style={{ marginBottom: 6 }}>
                <summary style={{ fontSize: 12, cursor: 'pointer' }}><b style={{ textTransform: 'uppercase', color: 'var(--accent2)', fontSize: 10 }}>{d.tipo}</b> {d.titulo} · {new Date(d.created_at).toLocaleDateString('es-PE')}</summary>
                <div style={{ fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: 8, background: 'var(--bg-panel)', borderRadius: 6, marginTop: 4 }}>{d.contenido}</div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
