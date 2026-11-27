'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAI } from '@/hooks/useAI'
import { useProcesoActivo } from '@/hooks/useProcesoActivo'
const PLATAFORMAS = [
  { id: 'linkedin', nombre: 'LinkedIn', ind: 'Publicación de LinkedIn: tono profesional, 150-220 palabras, gancho en la primera línea, viñetas con responsabilidades y requisitos, llamada a postular y 4-6 hashtags.' },
  { id: 'facebook', nombre: 'Facebook / Instagram', ind: 'Publicación para Facebook e Instagram: tono cercano, 80-130 palabras, emojis moderados (máx. 5), datos clave en viñetas, llamada a postular y 3-5 hashtags.' },
  { id: 'portal', nombre: 'Computrabajo / Bumeran (aviso)', ind: 'Aviso completo para portal de empleo con secciones: TÍTULO, DESCRIPCIÓN DEL PUESTO, FUNCIONES, REQUISITOS, OFRECEMOS, MODALIDAD Y UBICACIÓN, CÓMO POSTULAR. Formal y claro.' },
  { id: 'whatsapp', nombre: 'WhatsApp / Telegram (difusión)', ind: 'Mensaje breve de difusión para WhatsApp: máx. 7 líneas, cordial, con los datos esenciales (cargo, lugar, sueldo si existe, requisito clave) y cómo postular.' },
]
export default function OfertaPage() {
  const router = useRouter(); const { callAI, loading } = useAI()
  const { procesos, procesoId, setProcesoId, proceso } = useProcesoActivo()
  const [contacto, setContacto] = useState(''); const [textos, setTextos] = useState<Record<string, string>>({})
  const [guardados, setGuardados] = useState<any[]>([]); const [busy, setBusy] = useState(''); const [msg, setMsg] = useState('')
  useEffect(() => {
    setTextos({}); setGuardados([]); setMsg('')
    if (!procesoId) return
    fetch('/api/informes?tipo=oferta&proceso_id=' + procesoId).then(r => r.json()).then(d => {
      const g = d.informes || []; setGuardados(g)
      const t: Record<string, string> = {}; for (const p of PLATAFORMAS) { const h = g.find((x: any) => x.datos?.plataforma === p.id); if (h) t[p.id] = h.contenido }
      setTextos(t)
    })
  }, [procesoId])
  async function generar(ids: string[]) {
    if (!proceso) { alert('Primero elige el proceso'); return }
    const pf = proceso.perfil || {}
    const ctx = 'Cargo: ' + proceso.cargo + '\nEmpresa/cliente: ' + (proceso.empresa || 'confidencial') + '\nCiudad: ' + (proceso.ciudad || '') + ' | Modalidad: ' + (proceso.modalidad || '') + '\nVacantes: ' + (pf.vacantes || '1') + (pf.salario ? '\nRemuneración: ' + pf.salario : '') + (proceso.deadline ? '\nFecha límite: ' + proceso.deadline : '') + '\n\nPERFIL DEL PUESTO:\n' + String(proceso.descripcion || '').substring(0, 2500) + '\n\nKeywords: ' + (proceso.requisitos || '') + '\nCómo postular: ' + (contacto || '(indicar "envía tu CV por mensaje directo")')
    for (const id of ids) {
      const pl = PLATAFORMAS.find(x => x.id === id)!; setBusy(id)
      const r = await callAI(ctx + '\n\nRedacta: ' + pl.ind + '\nUsa SOLO los datos de arriba; no inventes sueldo, beneficios ni requisitos. Devuelve únicamente el texto listo para publicar, en español, sin comentarios.', 'Eres PREDA, experto en marca empleadora y reclutamiento en Perú.')
      if (r) setTextos(t => ({ ...t, [id]: r.replace(/\*\*/g, '') }))
    }
    setBusy('')
  }
  async function guardar(id: string) {
    const pl = PLATAFORMAS.find(x => x.id === id)!; if (!textos[id]) return
    const r = await fetch('/api/informes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'oferta', proceso_id: procesoId, titulo: 'Oferta ' + pl.nombre + ' — ' + proceso?.nombre, contenido: textos[id], datos: { plataforma: id } }) })
    setMsg(r.ok ? 'Guardado: ' + pl.nombre : 'No se pudo guardar')
  }
  const copiar = (id: string) => { navigator.clipboard.writeText(textos[id] || ''); setMsg('Copiado: ' + PLATAFORMAS.find(p => p.id === id)?.nombre) }
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 26px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div><div style={{ fontSize: 20, fontWeight: 600 }}>Crear Oferta para redes y portales</div><div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Paso 2: la IA redacta la publicación a partir del perfil del proceso (LinkedIn, Facebook, Computrabajo/Bumeran, WhatsApp)</div></div>
        <button className="btn btn-sec" style={{ fontSize: 13 }} onClick={() => router.push('/seleccion/procesos')}>Ver procesos</button>
      </div>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px', background: 'rgba(30,123,232,.06)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <select value={procesoId} onChange={e => setProcesoId(e.target.value)} style={{ maxWidth: 380, fontSize: 13 }}><option value="">Selecciona el proceso...</option>{procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
        <input value={contacto} onChange={e => setContacto(e.target.value)} placeholder="Cómo postular: correo, enlace o WhatsApp" style={{ maxWidth: 320, fontSize: 13 }} />
        <button className="btn btn-primary" style={{ fontSize: 13 }} disabled={!procesoId || loading} onClick={() => generar(PLATAFORMAS.map(p => p.id))}>{loading ? <><span className="spin" /> Generando...</> : '🤖 Generar las 4 ofertas'}</button>
        {msg && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{msg}</span>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 26px' }}>
        {!proceso ? <div className="empty">Crea o elige un proceso con su perfil para generar la oferta</div> : (
          <>
            <div className="info-box" style={{ fontSize: 12, marginBottom: 12 }}><b>{proceso.cargo}</b> · {proceso.empresa || ''} · {proceso.ciudad || ''} {proceso.modalidad ? '· ' + proceso.modalidad : ''}. La oferta se basa en el perfil del proceso; para cambiarla edita el perfil en "Mis Procesos".</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))', gap: 14 }}>
              {PLATAFORMAS.map(p => (
                <div key={p.id} className="card">
                  <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>{p.nombre}</span>
                    <button className="btn btn-sec" style={{ fontSize: 11, padding: '3px 9px' }} disabled={!!busy || loading} onClick={() => generar([p.id])}>{busy === p.id ? <span className="spin" /> : textos[p.id] ? 'Regenerar' : 'Generar'}</button></div>
                  <textarea value={textos[p.id] || ''} onChange={e => setTextos(t => ({ ...t, [p.id]: e.target.value }))} style={{ minHeight: 230, fontSize: 12, lineHeight: 1.6 }} placeholder="Aquí aparecerá la oferta; puedes editarla antes de copiarla." />
                  <div className="btn-row" style={{ marginTop: 8 }}><button className="btn btn-ok" style={{ fontSize: 12 }} disabled={!textos[p.id]} onClick={() => copiar(p.id)}>Copiar</button><button className="btn btn-sec" style={{ fontSize: 12 }} disabled={!textos[p.id]} onClick={() => guardar(p.id)}>Guardar en el proceso</button></div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10 }}>El sistema no publica solo: copia el texto y pégalo en cada red o portal. Lo guardado queda asociado al proceso.</div>
            {guardados.length > 0 && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{guardados.length} versión(es) guardada(s) para este proceso.</div>}
          </>
        )}
      </div>
    </div>
  )
}
