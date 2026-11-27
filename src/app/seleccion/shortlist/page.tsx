'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAI } from '@/hooks/useAI'
import { useProcesoActivo } from '@/hooks/useProcesoActivo'

export default function ShortlistPage() {
  const router = useRouter()
  const { callAI, loading } = useAI()
  const { procesos, procesoId, setProcesoId } = useProcesoActivo()
  const [candidatos, setCandidatos] = useState<any[]>([])
  const [entrevistas, setEntrevistas] = useState<any[]>([])
  const [minScore, setMinScore] = useState(70)
  const [minAts, setMinAts] = useState(0)
  const [maxN, setMaxN] = useState(10)
  const [informe, setInforme] = useState<any>(null)
  const [moviendo, setMoviendo] = useState(false)

  useEffect(() => {
    setInforme(null)
    if (!procesoId) { setCandidatos([]); return }
    fetch('/api/candidatos?proceso_id=' + procesoId).then(r => r.json()).then(d => setCandidatos(d.candidatos || []))
    fetch('/api/entrevistas?proceso_id=' + procesoId).then(r => r.json()).then(d => setEntrevistas(d.entrevistas || []))
    fetch('/api/informes?tipo=shortlist&proceso_id=' + procesoId).then(r => r.json()).then(d => setInforme((d.informes || [])[0] || null))
  }, [procesoId])

  const entPts = (id: string) => { const e = entrevistas.find(x => x.candidato_id === id && x.puntaje != null); return e ? e.puntaje as number : null }
  const rank = (c: any) => { const en = entPts(c.id); return en !== null ? Math.round((c.score || 0) * 0.6 + en * 0.4) : (c.score || 0) }
  const shortlist = candidatos
    .filter(c => c.etapa !== 'descartado' && (c.score || 0) >= minScore && (c.ats_score || 0) >= minAts)
    .sort((a, b) => rank(b) - rank(a)).slice(0, maxN)
  const proc = procesos.find(p => p.id === procesoId)

  async function genInforme() {
    if (!shortlist.length) { alert('Sin candidatos en el shortlist'); return }
    const lista = shortlist.map((c, i) =>
      (i + 1) + '. ' + c.nombre + ' — CV ' + c.score + '/100, ATS ' + (c.ats_score || 'N/D') + '/100' + (entPts(c.id) !== null ? ', Entrevista ' + entPts(c.id) + '/100' : '') + ', Ranking ' + rank(c) +
      '\n   Resumen: ' + (c.resumen || String(c.resultado || '').substring(0, 300))
    ).join('\n')
    const prompt =
      'Genera el INFORME EJECUTIVO DE SHORTLIST para el proceso "' + (proc?.nombre || '') + '", cargo "' + (proc?.cargo || '') + '"' + (proc?.empresa ? ' de ' + proc.empresa : '') + '.\n\n' +
      'FILTROS APLICADOS: score CV >= ' + minScore + (minAts ? ', ATS >= ' + minAts : '') + '. Total evaluados: ' + candidatos.length + '.\n\n' +
      'CANDIDATOS EN SHORTLIST:\n' + lista + '\n\n' +
      'Entrega, sin tablas ni negritas:\n1. RESUMEN EJECUTIVO\n2. RANKING con justificacion\n3. TOP 3 RECOMENDADOS\n4. RIESGOS Y PUNTOS A VERIFICAR EN ENTREVISTA FINAL\n5. SIGUIENTE PASO'
    const r = await callAI(prompt, 'Eres PREDA, experto en seleccion de personal. Responde en espanol.')
    if (!r) return
    const txt = r.replace(/\*\*/g, '').replace(/^#{1,4}\s*/gm, '')
    const res = await fetch('/api/informes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'shortlist', proceso_id: procesoId, titulo: 'Shortlist — ' + (proc?.nombre || ''), contenido: txt, datos: { ids: shortlist.map(c => c.id), minScore, minAts } }) })
    const d = await res.json()
    setInforme(d.informe || { contenido: txt, created_at: new Date().toISOString() })
  }

  async function moverAShortlist() {
    if (!shortlist.length) return
    if (!confirm('Mover ' + shortlist.length + ' candidatos a la etapa "shortlist"?')) return
    setMoviendo(true)
    await Promise.all(shortlist.map(c => fetch('/api/candidatos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, etapa: 'shortlist' }) })))
    setCandidatos(prev => prev.map(c => shortlist.some(s => s.id === c.id) ? { ...c, etapa: 'shortlist' } : c))
    setMoviendo(false)
  }

  const sC = (s: number) => s >= 80 ? 'var(--ok)' : s >= 60 ? 'var(--warn)' : 'var(--err)'
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 26px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>Shortlist</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Filtra los mejores candidatos y genera el informe ejecutivo con IA (queda guardado)</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px', background: 'rgba(30,123,232,.06)', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
        <select value={procesoId} onChange={e => setProcesoId(e.target.value)} style={{ maxWidth: 340, fontSize: 13 }}>
          <option value="">Selecciona proceso</option>
          {procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <label style={{ margin: 0, fontSize: 12 }}>Score CV mín:</label>
        <input type="number" value={minScore} onChange={e => setMinScore(Number(e.target.value))} style={{ width: 62, fontSize: 13 }} />
        <label style={{ margin: 0, fontSize: 12 }}>ATS mín:</label>
        <input type="number" value={minAts} onChange={e => setMinAts(Number(e.target.value))} style={{ width: 62, fontSize: 13 }} />
        <label style={{ margin: 0, fontSize: 12 }}>Máx:</label>
        <input type="number" value={maxN} onChange={e => setMaxN(Math.max(1, Number(e.target.value) || 1))} style={{ width: 56, fontSize: 13 }} />
        {procesoId && <span style={{ fontSize: 13, color: 'var(--accent2)', fontWeight: 600 }}>{shortlist.length} en shortlist</span>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 26px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>
        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span>Shortlist — {proc?.nombre}</span>
            <span style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sec" style={{ fontSize: 12 }} onClick={moverAShortlist} disabled={moviendo || !shortlist.length}>Mover a etapa shortlist</button>
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={genInforme} disabled={loading || !shortlist.length}>{loading ? <><span className="spin" />...</> : 'Informe IA'}</button>
            </span>
          </div>
          {!procesoId ? <div className="empty">Selecciona un proceso</div> :
            shortlist.length === 0 ? <div className="empty">Sin candidatos con esos filtros</div> :
              shortlist.map((c, i) => (
                <div key={c.id} className="card" style={{ margin: '0 0 8px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--adim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--accent2)' }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{c.nombre}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>ATS {c.ats_score || '?'}{entPts(c.id) !== null ? ' · Entrevista ' + entPts(c.id) : ''} · {c.etapa}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 800, color: sC(rank(c)) }}>{rank(c)}</div><div style={{ fontSize: 9, color: 'var(--text-3)' }}>RANKING</div></div>
                    <button className="btn btn-sec" style={{ fontSize: 11, padding: '4px 9px' }} onClick={() => router.push('/seleccion/entrevista')}>Entrevistar</button>
                  </div>
                </div>
              ))}
        </div>
        <div className="card">
          <div className="card-title">Informe Ejecutivo{informe?.created_at ? ' · ' + new Date(informe.created_at).toLocaleString('es-PE') : ''}</div>
          {!informe ? <div className="empty" style={{ padding: 40 }}>Genera el informe con IA</div> : (
            <>
              <div style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 520, overflowY: 'auto' }}>{informe.contenido}</div>
              <div className="btn-row">
                <button className="btn btn-sec" onClick={() => navigator.clipboard.writeText(informe.contenido)}>Copiar</button>
                <button className="btn btn-sec" onClick={() => { const b = new Blob([informe.contenido], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'Shortlist.txt'; a.click() }}>Descargar</button>
                <button className="btn btn-sec" onClick={() => window.print()}>Imprimir / PDF</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
