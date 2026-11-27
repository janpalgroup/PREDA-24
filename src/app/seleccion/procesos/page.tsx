'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAI } from '@/hooks/useAI'
import { extraerJson } from '@/lib/pruebas'
const VACIO = { nombre: '', empresa: '', cargo: '', deadline: '', modalidad: 'Presencial', ciudad: 'Lima', estado: 'activo', vacantes: '1', salario: '', objetivo: '', responsabilidades: '', formacion: '', experiencia: '', competencias: '', requisitos: '' }
// El perfil se guarda estructurado (perfil) y también como texto (descripcion) para que lo usen entrevista, ATS, pruebas y ofertas.
function componer(f: any) {
  return [f.objetivo && 'OBJETIVO DEL PUESTO: ' + f.objetivo, f.responsabilidades && 'RESPONSABILIDADES:\n' + f.responsabilidades, f.formacion && 'FORMACIÓN: ' + f.formacion, f.experiencia && 'EXPERIENCIA: ' + f.experiencia, f.competencias && 'COMPETENCIAS: ' + f.competencias].filter(Boolean).join('\n\n')
}
export default function ProcesosPage() {
  const router = useRouter(); const { callAI, loading } = useAI()
  const [procesos, setProcesos] = useState<any[]>([]); const [conteo, setConteo] = useState<Record<string, number>>({})
  const [form, setForm] = useState<any>(VACIO); const [editId, setEditId] = useState<string | null>(null)
  const [show, setShow] = useState(false); const [saving, setSaving] = useState(false)
  useEffect(() => { load() }, [])
  function load() {
    fetch('/api/procesos').then(r => r.json()).then(d => setProcesos(d.procesos || []))
    fetch('/api/candidatos').then(r => r.json()).then(d => { const c: Record<string, number> = {}; (d.candidatos || []).forEach((x: any) => { if (x.proceso_id) c[x.proceso_id] = (c[x.proceso_id] || 0) + 1 }); setConteo(c) })
  }
  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }))
  function editar(p: any) { const pf = p.perfil || {}; setForm({ ...VACIO, nombre: p.nombre || '', empresa: p.empresa || '', cargo: p.cargo || '', deadline: p.deadline || '', modalidad: p.modalidad || 'Presencial', ciudad: p.ciudad || '', estado: p.estado || 'activo', requisitos: p.requisitos || '', vacantes: pf.vacantes || '1', salario: pf.salario || '', objetivo: pf.objetivo || '', responsabilidades: pf.responsabilidades || (pf.objetivo ? '' : p.descripcion || ''), formacion: pf.formacion || '', experiencia: pf.experiencia || '', competencias: pf.competencias || '' }); setEditId(p.id); setShow(true); window.scrollTo(0, 0) }
  function nuevo() { setForm(VACIO); setEditId(null); setShow(!show) }
  async function genPerfil() {
    if (!form.cargo.trim()) { alert('Escribe primero el cargo principal'); return }
    const r = await callAI('Crea el PERFIL DEL PUESTO para el cargo "' + form.cargo + '"' + (form.empresa ? ' en la empresa "' + form.empresa + '"' : '') + ' (Perú).\nResponde SOLO un JSON con estas claves de texto: {"objetivo":"2 líneas","responsabilidades":"5-7 viñetas separadas por salto de línea, cada una iniciada con - ","formacion":"...","experiencia":"...","competencias":"5-6 competencias separadas por coma","keywords":"12-15 palabras clave ATS separadas por coma"}', 'Eres PREDA, experto en selección de personal. Respondes solo con el JSON pedido.')
    const j = r ? extraerJson(r) : null
    if (!j) { alert('La IA no devolvió el formato esperado. Inténtalo de nuevo.'); return }
    const t = (x: any) => Array.isArray(x) ? x.join('\n') : String(x || '').replace(/\*\*/g, '')
    setForm((f: any) => ({ ...f, objetivo: t(j.objetivo), responsabilidades: t(j.responsabilidades), formacion: t(j.formacion), experiencia: t(j.experiencia), competencias: t(j.competencias), requisitos: t(j.keywords) || f.requisitos }))
  }
  async function save() {
    if (!form.nombre.trim()) { alert('El nombre del proceso es obligatorio'); return }
    if (!form.cargo.trim()) { alert('El cargo es obligatorio'); return }
    if (!form.responsabilidades.trim() && !form.objetivo.trim()) { alert('Ingresa el perfil requerido para la plaza (responsabilidades u objetivo del puesto). Puedes usar "Generar perfil con IA".'); return }
    setSaving(true)
    const perfil = { vacantes: form.vacantes, salario: form.salario, objetivo: form.objetivo, responsabilidades: form.responsabilidades, formacion: form.formacion, experiencia: form.experiencia, competencias: form.competencias }
    const body: any = { nombre: form.nombre, empresa: form.empresa, cargo: form.cargo, deadline: form.deadline, modalidad: form.modalidad, ciudad: form.ciudad, estado: form.estado, requisitos: form.requisitos, descripcion: componer(form), perfil }
    if (editId) body.id = editId
    const r = await fetch('/api/procesos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const d = await r.json()
    setSaving(false)
    if (!r.ok) { alert(d.error || 'No se pudo guardar'); return }
    setShow(false); setEditId(null); setForm(VACIO); load()
    if (!editId && d.proceso) { try { localStorage.setItem('preda_proceso', d.proceso.id) } catch {} }
  }
  async function estado(p: any, e: string) { await fetch('/api/procesos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, estado: e }) }); load() }
  async function del(p: any) { if (!confirm('¿Eliminar el proceso "' + p.nombre + '"? Los candidatos quedarán sin proceso. Esta acción no se puede deshacer.')) return; await fetch('/api/procesos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id }) }); load() }
  const ir = (ruta: string, p: any) => router.push('/seleccion/' + ruta + '?proceso=' + p.id)
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 26px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div><div style={{ fontSize: 20, fontWeight: 600 }}>Mis Procesos</div><div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Paso 1: crea el proceso con el perfil de la plaza. Luego: oferta en redes → carga de CVs → candidatos → entrevista → comparar → shortlist</div></div>
        <button className="btn btn-primary" onClick={nuevo}>+ Nuevo Proceso</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 26px' }}>
        {show && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">{editId ? 'Editar proceso' : 'Nuevo proceso'}</div>
            <div className="g2">
              <div className="field"><label>Nombre del proceso *</label><input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="EJECUTIVO COMERCIAL SENIOR - DIC 2026" /></div>
              <div className="field"><label>Cliente / área solicitante</label><input value={form.empresa} onChange={e => set('empresa', e.target.value)} /></div>
              <div className="field"><label>Cargo principal *</label><input value={form.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Jefe de Ventas" /></div>
              <div className="field"><label>N.º de vacantes</label><input type="number" min={1} value={form.vacantes} onChange={e => set('vacantes', e.target.value)} /></div>
              <div className="field"><label>Fecha límite</label><input value={form.deadline} onChange={e => set('deadline', e.target.value)} placeholder="31 de diciembre 2026" /></div>
              <div className="field"><label>Remuneración</label><input value={form.salario} onChange={e => set('salario', e.target.value)} placeholder="S/ 3,500 - 4,500 + comisiones" /></div>
              <div className="field"><label>Modalidad</label><select value={form.modalidad} onChange={e => set('modalidad', e.target.value)}><option>Presencial</option><option>Remoto</option><option>Hibrido</option></select></div>
              <div className="field"><label>Ciudad</label><input value={form.ciudad} onChange={e => set('ciudad', e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0 6px' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Perfil requerido para la plaza</div>
              <button className="btn btn-sec" style={{ fontSize: 11, padding: '4px 10px' }} onClick={genPerfil} disabled={loading}>{loading ? <><span className="spin" /> Generando...</> : '🤖 Generar perfil con IA'}</button>
            </div>
            <div className="field"><label>Objetivo del puesto</label><textarea value={form.objetivo} onChange={e => set('objetivo', e.target.value)} style={{ minHeight: 50 }} /></div>
            <div className="field"><label>Responsabilidades *</label><textarea value={form.responsabilidades} onChange={e => set('responsabilidades', e.target.value)} style={{ minHeight: 110 }} placeholder="- Gestionar la cartera de clientes..." /></div>
            <div className="g2">
              <div className="field"><label>Formación</label><textarea value={form.formacion} onChange={e => set('formacion', e.target.value)} style={{ minHeight: 55 }} /></div>
              <div className="field"><label>Experiencia</label><textarea value={form.experiencia} onChange={e => set('experiencia', e.target.value)} style={{ minHeight: 55 }} /></div>
            </div>
            <div className="field"><label>Competencias</label><input value={form.competencias} onChange={e => set('competencias', e.target.value)} placeholder="Liderazgo, orientación a resultados..." /></div>
            <div className="field"><label>Keywords ATS (filtros al analizar CVs)</label><textarea value={form.requisitos} onChange={e => set('requisitos', e.target.value)} placeholder="CRM, KPIs, B2B, ventas consultivas..." style={{ minHeight: 50 }} /></div>
            <div className="btn-row"><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <><span className="spin" /> Guardando...</> : editId ? 'Guardar cambios' : 'Crear proceso'}</button><button className="btn btn-sec" onClick={() => { setShow(false); setEditId(null) }}>Cancelar</button></div>
          </div>
        )}
        {procesos.length === 0 ? <div className="empty">Sin procesos. Crea el primero.</div> : procesos.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.estado === 'activo' ? 'var(--ok)' : 'var(--text-3)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.nombre} <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 400 }}>({p.estado})</span></div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{[p.empresa, p.cargo, p.deadline].filter(Boolean).join(' · ')} · <b style={{ color: 'var(--accent2)' }}>{conteo[p.id] || 0} candidato(s)</b></div>
              </div>
              <button className="btn btn-sec" style={{ fontSize: 11, padding: '4px 9px' }} onClick={() => editar(p)}>Editar perfil</button>
              <button className="btn btn-sec" style={{ fontSize: 11, padding: '4px 9px' }} onClick={() => ir('oferta', p)}>📝 Oferta</button>
              <button className="btn btn-sec" style={{ fontSize: 11, padding: '4px 9px' }} onClick={() => ir('cv', p)}>📄 Cargar CV</button>
              <button className="btn btn-sec" style={{ fontSize: 11, padding: '4px 9px' }} onClick={() => ir('candidatos', p)}>👥 Candidatos</button>
              <button className="btn btn-sec" style={{ fontSize: 11, padding: '4px 9px' }} onClick={() => estado(p, p.estado === 'activo' ? 'cerrado' : 'activo')}>{p.estado === 'activo' ? 'Cerrar' : 'Reactivar'}</button>
              <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => del(p)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
