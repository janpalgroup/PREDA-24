'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useExpediente } from '@/hooks/useExpediente'

export default function OfertasPage() {
  const router = useRouter()
  const { exp, cargando } = useExpediente()
  const [cargos, setCargos] = useState<string[]>([])
  const [extra, setExtra] = useState('')
  const [sector, setSector] = useState('privado')
  const [pais, setPais] = useState('Peru')
  const [depto, setDepto] = useState('Lima')
  const [distrito, setDistrito] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [res, setRes] = useState<any>(null)
  const [fecha, setFecha] = useState('')
  const [error, setError] = useState('')
  const [plat, setPlat] = useState('Todas')
  const [minCompat, setMinCompat] = useState(0)
  const [soloVerif, setSoloVerif] = useState(false)
  const [postuladas, setPostuladas] = useState<Record<string, string>>({})
  const [copiado, setCopiado] = useState('')

  const sugeridos: string[] = Array.from(new Set([...(exp?.cargos_objetivo || []), ...((exp?.analisis_perfil?.posiciones || []).map((p: any) => p.cargo))])) as string[]

  useEffect(() => {
    if (!exp) return
    setCargos((exp.cargos_objetivo || []).slice(0, 4)); setDepto(exp.ciudad || 'Lima'); setDistrito(exp.distrito || ''); setPais(exp.pais || 'Peru')
    fetch('/api/informes?tipo=busqueda_ofertas&expediente_id=' + exp.id).then(r => r.json()).then(d => {
      const u = (d.informes || [])[0]; if (u?.datos) { setRes(u.datos); setFecha(u.created_at) }
    })
    fetch('/api/postulaciones?expediente_id=' + exp.id).then(r => r.json()).then(d => {
      const m: Record<string, string> = {}; (d.postulaciones || []).forEach((p: any) => { if (p.link) m[p.link] = p.id }); setPostuladas(m)
    })
  }, [exp?.id])

  const toggle = (c: string) => setCargos(p => p.includes(c) ? p.filter(x => x !== c) : p.length >= 4 ? p : [...p, c])

  async function buscar() {
    if (!cargos.length) { setError('Elige al menos un cargo (máximo 4)'); return }
    if (!exp?.cv_texto) { setError('El candidato no tiene CV. Cárgalo en “Perfil a Buscar”.'); return }
    setBuscando(true); setError(''); setRes(null)
    try {
      const r = await fetch('/api/buscar-ofertas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cargos, pais, departamento: depto, distrito, cvTexto: exp.cv_texto, sector, perfil: { rubros: exp.rubros, modalidad: exp.modalidad, pretension: exp.pretension_salarial, disponibilidad: exp.disponibilidad } }) })
      const d = await r.json()
      if (!r.ok || d.error) throw new Error(d.error || 'Error en la búsqueda')
      setRes(d); setFecha(new Date().toISOString()); setPlat('Todas')
      if (d.ok && d.ofertas) fetch('/api/informes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'busqueda_ofertas', expediente_id: exp.id, titulo: 'Ofertas: ' + cargos.join(', '), contenido: d.total + ' ofertas', datos: d }) })
    } catch (e: any) { setError(e.message) }
    setBuscando(false)
  }

  async function marcarPostulada(o: any) {
    const id = postuladas[o.link_postular]
    if (id) {
      if (!confirm('¿Quitar esta oferta de las postulaciones?')) return
      await fetch('/api/postulaciones', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      setPostuladas(p => { const n = { ...p }; delete n[o.link_postular]; return n }); return
    }
    const r = await fetch('/api/postulaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expediente_id: exp.id, plataforma: o.plataforma, empresa: o.empresa, cargo: o.titulo, link: o.link_postular, compatibilidad: o.compatibilidad, fecha_postulacion: new Date().toLocaleDateString('es-PE'), estado: 'postulado' }) })
    const d = await r.json(); if (d.postulacion) setPostuladas(p => ({ ...p, [o.link_postular]: d.postulacion.id }))
  }
  function copiar(link: string) { navigator.clipboard.writeText(link); setCopiado(link); setTimeout(() => setCopiado(''), 1500) }

  if (cargando) return <div className="empty"><span className="spin" /></div>
  if (!exp) return <div style={{ padding: 40 }}><div className="card" style={{ maxWidth: 520 }}><div className="card-title">Primero elige al candidato</div><button className="btn btn-ok" onClick={() => router.push('/empleabilidad/expediente')}>Ir a Mi Expediente</button></div></div>

  const ofertas: any[] = (res?.ofertas || []).filter((o: any) => (plat === 'Todas' || o.plataforma === plat) && (o.compatibilidad || 0) >= minCompat && (!soloVerif || o.estado_link === 'verificado'))
  const cc = (c: number) => c >= 80 ? 'var(--ok)' : c >= 60 ? 'var(--warn)' : 'var(--err)'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 26px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>Buscar Ofertas</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Candidato: <b style={{ color: 'var(--ok)' }}>{exp.nombre}</b> — cada resultado trae el enlace exacto del aviso, listo para postular con un clic</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 26px' }}>
        <div className="card">
          <div className="card-title">Qué buscar</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>Cargos (máx. 4) — salen del perfil y del análisis del CV</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {Array.from(new Set([...sugeridos, ...cargos])).map(c => <span key={c} onClick={() => toggle(c)} style={{ cursor: 'pointer', padding: '5px 12px', borderRadius: 20, fontSize: 12, border: '1px solid ' + (cargos.includes(c) ? 'var(--ok)' : 'var(--border)'), background: cargos.includes(c) ? 'rgba(26,173,110,.15)' : 'transparent', color: cargos.includes(c) ? 'var(--ok)' : 'var(--text-2)', fontWeight: cargos.includes(c) ? 700 : 400 }}>{cargos.includes(c) ? '✔ ' : ''}{c}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 6, maxWidth: 380, marginBottom: 12 }}>
            <input value={extra} onChange={e => setExtra(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && extra.trim()) { toggle(extra.trim()); setExtra('') } }} placeholder="Otro cargo + Enter" style={{ fontSize: 13 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0 12px' }}>
            <div className="field"><label>Sector</label><select value={sector} onChange={e => setSector(e.target.value)}><option value="privado">Empresas privadas</option><option value="estatal">Entidades estatales (CAS, SERVIR…)</option><option value="ambos">Ambos</option></select></div>
            <div className="field"><label>País</label><input value={pais} onChange={e => setPais(e.target.value)} /></div>
            <div className="field"><label>Departamento</label><input value={depto} onChange={e => setDepto(e.target.value)} /></div>
            <div className="field"><label>Distrito (opcional)</label><input value={distrito} onChange={e => setDistrito(e.target.value)} /></div>
          </div>
          {!exp.cv_texto && <div className="info-box" style={{ color: 'var(--warn)' }}>Este candidato no tiene CV. Cárgalo en “Perfil a Buscar”.</div>}
          <button className="btn btn-ok" onClick={buscar} disabled={buscando || !cargos.length} style={{ fontSize: 14, padding: '10px 26px' }}>{buscando ? <><span className="spin" /> Buscando y verificando avisos (hasta 1 min)...</> : 'Buscar ofertas con enlace directo'}</button>
          {error && <div style={{ color: 'var(--err)', fontSize: 13, marginTop: 8 }}>{error}</div>}
        </div>

        {res?.sin_api && <div className="card" style={{ border: '1px solid var(--warn)' }}><div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{res.mensaje}</div></div>}
        {res?.ok && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', margin: '4px 0 10px' }}>
              <b style={{ fontSize: 14 }}>{res.total} ofertas con enlace directo</b>
              <span style={{ fontSize: 12, color: 'var(--ok)' }}>✔ {res.verificadas || 0} verificadas</span>
              {fecha && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Búsqueda del {new Date(fecha).toLocaleString('es-PE')} (guardada)</span>}
              <select value={plat} onChange={e => setPlat(e.target.value)} style={{ maxWidth: 190, fontSize: 12 }}><option>Todas</option>{(res.plataformas || []).map((p: string) => <option key={p}>{p}</option>)}</select>
              <label style={{ margin: 0, fontSize: 12 }}>Compat. mín <input type="number" value={minCompat} onChange={e => setMinCompat(Number(e.target.value))} style={{ width: 56, fontSize: 12 }} /></label>
              <label style={{ margin: 0, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><input type="checkbox" checked={soloVerif} onChange={e => setSoloVerif(e.target.checked)} style={{ width: 'auto' }} />Solo verificadas</label>
            </div>
            {(res.descartados > 0 || res.caidos > 0) && <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>Se descartaron {res.descartados || 0} resultados que no eran el enlace de un aviso concreto (listas, buscadores o portadas){res.caidos ? ' y ' + res.caidos + ' avisos que ya no están vigentes' : ''}.</div>}
            {res.aviso && <div className="info-box">{res.aviso}</div>}
            {ofertas.map((o: any) => {
              const post = !!postuladas[o.link_postular]
              return (
                <div key={o.id || o.link_postular} className="card" style={{ margin: '0 0 10px', border: post ? '1px solid var(--ok)' : '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, background: 'var(--adim)', color: 'var(--accent2)', fontWeight: 700 }}>{o.plataforma}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, border: '1px solid var(--border)', color: 'var(--text-3)' }}>{o.modalidad}</span>
                        {o.estado_link === 'verificado' ? <span title={o.detalle_link} style={{ fontSize: 11, color: 'var(--ok)', fontWeight: 700 }}>✔ Aviso verificado</span> : <span title={o.detalle_link} style={{ fontSize: 11, color: 'var(--warn)' }}>Enlace directo (no verificable automáticamente)</span>}
                        {o.dias_publicado != null && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Hace {o.dias_publicado} día{o.dias_publicado !== 1 ? 's' : ''}</span>}
                        {o.valido_hasta && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Vigente hasta {o.valido_hasta}</span>}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{o.titulo}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{o.empresa || 'Empresa no indicada'}{o.ubicacion ? ' · ' + o.ubicacion : ''}</div>
                      {o.salario && o.salario !== 'No especificado' && <div style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>{o.salario}</div>}
                      {o.descripcion && <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, marginTop: 3 }}>{o.descripcion}</div>}
                      {o.razon && <div style={{ fontSize: 12, color: cc(o.compatibilidad), fontStyle: 'italic', marginTop: 3 }}>{o.razon}</div>}
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 70 }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: cc(o.compatibilidad) }}>{o.compatibilidad}%</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>COMPAT.</div>
                      <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2, color: o.recomendacion?.includes('Postular') ? 'var(--ok)' : o.recomendacion?.includes('Mejorar') ? 'var(--warn)' : 'var(--err)' }}>{o.recomendacion}</div>
                    </div>
                  </div>
                  <div className="btn-row" style={{ marginTop: 8, alignItems: 'center' }}>
                    <a href={o.link_postular} target="_blank" rel="noopener noreferrer" className="btn btn-ok" style={{ textDecoration: 'none', fontSize: 13, padding: '8px 18px' }}>Postular ahora →</a>
                    <button className="btn btn-sec" style={{ fontSize: 12 }} onClick={() => copiar(o.link_postular)}>{copiado === o.link_postular ? '¡Copiado!' : 'Copiar enlace'}</button>
                    <button className="btn btn-sec" style={{ fontSize: 12, color: post ? 'var(--ok)' : undefined }} onClick={() => marcarPostulada(o)}>{post ? '✔ Postulada (clic para quitar)' : 'Marcar como postulada'}</button>
                    <span style={{ fontSize: 10, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 }} title={o.link_postular}>{o.link_postular.replace(/^https?:\/\/(www\.)?/, '')}</span>
                  </div>
                </div>
              )
            })}
            {ofertas.length === 0 && res.total > 0 && <div className="empty">Ninguna oferta cumple los filtros actuales</div>}
          </>
        )}
      </div>
    </div>
  )
}
