'use client'
import { useEffect, useState } from 'react'
// Alta y edición de empresas (clientes) que usan el sistema. No se borran: se desactivan para no perder datos.
export default function EmpresasPanel() {
  const [emps, setEmps] = useState<any[]>([]); const [cargando, setCargando] = useState(true); const [msg, setMsg] = useState('')
  const [f, setF] = useState({ nombre: '', ruc: '', sector: '', contacto: '', email: '' }); const [guardando, setGuardando] = useState(false)
  const [edit, setEdit] = useState<string | null>(null); const [ed, setEd] = useState<any>({})
  async function cargar() { setCargando(true); const r = await fetch('/api/empresas'); const d = await r.json(); if (r.ok) setEmps(d.empresas || []); else setMsg('Error: ' + d.error); setCargando(false) }
  useEffect(() => { cargar() }, [])
  async function post(b: any) { const r = await fetch('/api/empresas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); const d = await r.json(); if (!r.ok) { setMsg('Error: ' + (d.error || r.status)); return false } return true }
  async function crear() {
    if (!f.nombre.trim()) { setMsg('Error: escribe el nombre de la empresa'); return }
    setGuardando(true); setMsg('')
    if (await post(f)) { setF({ nombre: '', ruc: '', sector: '', contacto: '', email: '' }); setMsg('Empresa creada. Ya aparece en el login; asígnala a los usuarios en Gestión de Usuarios.'); await cargar() }
    setGuardando(false)
  }
  async function guardarEd(id: string) { if (await post({ id, ...ed })) { setEdit(null); setMsg('Empresa actualizada'); cargar() } }
  async function activar(e: any) {
    if (e.activa !== false && !confirm('¿Desactivar "' + e.nombre + '"? Nadie podrá ingresar a ella, pero sus datos se conservan.')) return
    if (await post({ id: e.id, activa: e.activa === false })) cargar()
  }
  return (
    <div className="card">
      <div className="card-title">🏢 Empresas</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>Cada empresa tiene sus propios procesos, candidatos, expedientes e informes. Los usuarios eligen la empresa al iniciar sesión. Los administradores pueden entrar a todas.</div>
      {cargando ? <span className="spin" /> : emps.map(e => (
        <div key={e.id} style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
          {edit === e.id ? (
            <div>
              <div className="g2">
                <div className="field"><label>Nombre</label><input value={ed.nombre ?? e.nombre} onChange={x => setEd({ ...ed, nombre: x.target.value })} /></div>
                <div className="field"><label>RUC</label><input value={ed.ruc ?? e.ruc ?? ''} onChange={x => setEd({ ...ed, ruc: x.target.value })} /></div>
                <div className="field"><label>Sector</label><input value={ed.sector ?? e.sector ?? ''} onChange={x => setEd({ ...ed, sector: x.target.value })} /></div>
                <div className="field"><label>Contacto</label><input value={ed.contacto ?? e.contacto ?? ''} onChange={x => setEd({ ...ed, contacto: x.target.value })} /></div>
              </div>
              <div className="btn-row" style={{ marginTop: 0 }}><button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => guardarEd(e.id)}>Guardar</button><button className="btn btn-sec" style={{ fontSize: 12 }} onClick={() => setEdit(null)}>Cancelar</button></div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{e.nombre}</div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>{[e.ruc && 'RUC ' + e.ruc, e.sector, e.contacto].filter(Boolean).join(' · ') || 'Sin más datos'}</div></div>
              <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: e.activa !== false ? 'rgba(26,173,110,.15)' : 'rgba(232,64,64,.15)', color: e.activa !== false ? 'var(--ok)' : 'var(--err)' }}>{e.activa !== false ? 'Activa' : 'Inactiva'}</span>
              <button className="btn btn-sec" style={{ fontSize: 11, padding: '3px 9px' }} onClick={() => { setEdit(e.id); setEd({}) }}>Editar</button>
              <button className="btn btn-sec" style={{ fontSize: 11, padding: '3px 9px' }} onClick={() => activar(e)}>{e.activa !== false ? 'Desactivar' : 'Activar'}</button>
            </div>
          )}
        </div>
      ))}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Nueva empresa</div>
        <div className="g2">
          <div className="field"><label>Nombre *</label><input value={f.nombre} onChange={x => setF({ ...f, nombre: x.target.value })} placeholder="Razón social o nombre comercial" /></div>
          <div className="field"><label>RUC</label><input value={f.ruc} onChange={x => setF({ ...f, ruc: x.target.value })} /></div>
          <div className="field"><label>Sector</label><input value={f.sector} onChange={x => setF({ ...f, sector: x.target.value })} /></div>
          <div className="field"><label>Contacto</label><input value={f.contacto} onChange={x => setF({ ...f, contacto: x.target.value })} /></div>
        </div>
        {msg && <div style={{ fontSize: 12, marginBottom: 8, color: msg.startsWith('Error') ? 'var(--err)' : 'var(--ok)' }}>{msg}</div>}
        <button className="btn btn-primary" onClick={crear} disabled={guardando}>{guardando ? 'Creando...' : '+ Crear empresa'}</button>
      </div>
    </div>
  )
}
