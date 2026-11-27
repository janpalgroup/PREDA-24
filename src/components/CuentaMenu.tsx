'use client'
import { useEffect, useState } from 'react'
// Boton "Contraseña" + ventana para cambiar la contraseña propia (disponible para todos los usuarios)
export default function CuentaMenu() {
  const [abierto, setAbierto] = useState(false)
  const [menu, setMenu] = useState(false)
  const [tema, setTema] = useState<'light' | 'dark'>('dark')
  useEffect(() => { setTema(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark') }, [])
  function alternarTema() { const t = tema === 'light' ? 'dark' : 'light'; setTema(t); document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('preda_tema', t) } catch {} }
  const [emp, setEmp] = useState<any>(null)
  useEffect(() => { fetch('/api/auth/session').then(r => r.json()).then(d => setEmp(d.user || null)).catch(() => {}) }, [])
  async function cambiarEmpresa(id: string) {
    if (!id || id === emp?.empresa_id) return
    const r = await fetch('/api/auth/empresa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empresa_id: id }) })
    if (r.ok) { try { localStorage.setItem('preda_empresa', id); localStorage.removeItem('preda_proceso') } catch {} window.location.href = '/modulos' } else { const d = await r.json(); alert(d.error || 'No se pudo cambiar') }
  }
  const [actual, setActual] = useState(''); const [nueva, setNueva] = useState(''); const [conf, setConf] = useState('')
  const [msg, setMsg] = useState(''); const [ok, setOk] = useState(false); const [guardando, setGuardando] = useState(false)
  function cerrar() { setAbierto(false); setActual(''); setNueva(''); setConf(''); setMsg(''); setOk(false) }
  async function guardar() {
    setMsg('')
    if (nueva.length < 8) { setMsg('La nueva contraseña debe tener al menos 8 caracteres'); return }
    if (nueva !== conf) { setMsg('La confirmación no coincide'); return }
    setGuardando(true)
    try {
      const r = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current: actual, nueva }) })
      const d = await r.json()
      if (r.ok && d.ok) { setOk(true); setMsg('Contraseña actualizada correctamente'); setActual(''); setNueva(''); setConf('') }
      else setMsg(d.error || 'No se pudo cambiar la contraseña')
    } catch (e: any) { setMsg(e.message) }
    setGuardando(false)
  }
  return (
    <>
      {emp?.empresa && (emp.empresas?.length > 1
        ? <select value={emp.empresa_id} onChange={e => cambiarEmpresa(e.target.value)} title="Cambiar de empresa" style={{ width: 'auto', fontSize: 11, padding: '3px 6px' }}>{emp.empresas.map((x: any) => <option key={x.id} value={x.id}>🏢 {x.nombre}</option>)}</select>
        : <span style={{ fontSize: 11, color: 'var(--text-3)' }}>🏢 {emp.empresa}</span>)}
      <div style={{ position: 'relative' }} className="no-print">
        <button className="btn btn-sec" style={{ fontSize: 11, padding: '4px 9px' }} onClick={() => setMenu(!menu)} title="Configuración">⚙ <span className="hide-sm">Configuración</span></button>
        {menu && <>
          <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
          <div className="menu-pop" style={{ zIndex: 999 }}>
            <button className="navbtn" onClick={() => { setMenu(false); setAbierto(true) }}>🔑 Cambiar contraseña</button>
            <button className="navbtn" onClick={alternarTema}>{tema === 'light' ? '🌙 Modo oscuro' : '☀️ Modo claro'}</button>
          </div>
        </>}
      </div>
      {abierto && (
        <div className="no-print" onClick={cerrar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 380, margin: 0 }}>
            <div className="card-title">Cambiar mi contraseña</div>
            <div className="field"><label>Contraseña actual</label><input type="password" value={actual} onChange={e => setActual(e.target.value)} autoComplete="current-password" /></div>
            <div className="field"><label>Nueva contraseña (mínimo 8 caracteres)</label><input type="password" value={nueva} onChange={e => setNueva(e.target.value)} autoComplete="new-password" /></div>
            <div className="field"><label>Repite la nueva contraseña</label><input type="password" value={conf} onChange={e => setConf(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') guardar() }} autoComplete="new-password" /></div>
            {msg && <div style={{ fontSize: 12, marginBottom: 8, color: ok ? 'var(--ok)' : 'var(--err)' }}>{msg}</div>}
            <div className="btn-row" style={{ marginTop: 0 }}>
              <button className="btn btn-primary" onClick={guardar} disabled={guardando || ok}>{guardando ? 'Guardando...' : 'Cambiar contraseña'}</button>
              <button className="btn btn-sec" onClick={cerrar}>{ok ? 'Cerrar' : 'Cancelar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
