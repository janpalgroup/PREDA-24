'use client'
import { useEffect, useState } from 'react'
import { MODULOS, TODAS, porDefectoRol } from '@/lib/permisos'
// Lista de verificación para activar/desactivar el acceso a cada módulo y página por usuario
export default function AccesosPanel() {
  const [usuarios, setUsuarios] = useState<any[]>([]); const [sel, setSel] = useState(''); const [marc, setMarc] = useState<string[]>([])
  const [empresas, setEmpresas] = useState<any[]>([]); const [fEmp, setFEmp] = useState('')
  const [cargando, setCargando] = useState(true); const [guardando, setGuardando] = useState(false); const [msg, setMsg] = useState('')
  async function cargar(mantener?: string) {
    setCargando(true)
    try {
      try { const re = await fetch('/api/empresas', { cache: 'no-store' }); const de = await re.json(); setEmpresas(de.empresas || []) } catch {}
      const r = await fetch('/api/usuarios'); const d = await r.json()
      const us = (d.usuarios || []).filter((u: any) => u.rol !== 'admin'); setUsuarios(us)
      const id = mantener || sel || (us[0]?.id || ''); setSel(id); aplicar(us, id)
    } catch (e: any) { setMsg(e.message) }
    setCargando(false)
  }
  function aplicar(us: any[], id: string) {
    const u = us.find(x => x.id === id); if (!u) { setMarc([]); return }
    setMarc(Array.isArray(u.permisos) ? u.permisos.filter((k: string) => TODAS.includes(k)) : porDefectoRol(u.rol))
  }
  useEffect(() => { cargar() }, [])
  const nomEmp = (x: any) => (Array.isArray(x.empresas) ? x.empresas : []).map((id: string) => empresas.find((e: any) => e.id === id)?.nombre || '?').join(', ') || 'Sin empresa'
  const visibles = usuarios.filter(x => !fEmp || (Array.isArray(x.empresas) ? x.empresas : []).includes(fEmp))
  const u = usuarios.find(x => x.id === sel)
  const personalizado = !!u && Array.isArray(u.permisos)
  function toggle(k: string) { setMarc(m => m.includes(k) ? m.filter(x => x !== k) : [...m, k]) }
  function modulo(id: string, on: boolean) { const ks = TODAS.filter(k => k.startsWith(id + ':')); setMarc(m => on ? Array.from(new Set(m.concat(ks))) : m.filter(k => !ks.includes(k))) }
  async function guardar(valor: string[] | null) {
    if (!u) return
    setGuardando(true); setMsg('')
    try {
      const r = await fetch('/api/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, permisos: valor }) })
      const d = await r.json()
      if (!r.ok) setMsg('Error: ' + (d.error || r.status))
      else { setMsg(valor === null ? 'Restablecido a los accesos por defecto del rol' : 'Accesos guardados. Se aplican en segundos (el usuario puede recargar la página).'); await cargar(u.id) }
    } catch (e: any) { setMsg('Error: ' + e.message) }
    setGuardando(false)
  }
  return (
    <div className="card">
      <div className="card-title">🔐 Accesos por usuario (módulos y páginas)</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>Marca con ✔ lo que cada usuario puede usar. Los administradores siempre tienen acceso total. Administración es solo para administradores.</div>
      {cargando ? <span className="spin" /> : usuarios.length === 0 ? <div style={{ fontSize: 12 }}>No hay usuarios no administradores.</div> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <div className="field"><label>Filtrar por empresa</label>
              <select value={fEmp} onChange={e => setFEmp(e.target.value)}><option value="">Todas las empresas</option>{empresas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select>
            </div>
            <div className="field"><label>Usuario</label>
              <select value={sel} onChange={e => { setSel(e.target.value); aplicar(usuarios, e.target.value); setMsg('') }}>
                {visibles.map(x => <option key={x.id} value={x.id}>{x.nombre} — {x.rol} — 🏢 {nomEmp(x)}{x.activo ? '' : ' (inactivo)'}</option>)}
              </select>
            </div>
          </div>
          {u && <div style={{ fontSize: 12, marginBottom: 6 }}>🏢 Empresa(s) de <b>{u.nombre}</b>: <b style={{ color: 'var(--accent2)' }}>{nomEmp(u)}</b></div>}
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>{personalizado ? 'Este usuario tiene accesos personalizados.' : 'Este usuario usa los accesos por defecto de su rol.'}</div>
          {MODULOS.map(m => {
            const ks = TODAS.filter(k => k.startsWith(m.id + ':')); const n = ks.filter(k => marc.includes(k)).length
            return (
              <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={n === ks.length} ref={el => { if (el) el.indeterminate = n > 0 && n < ks.length }} onChange={e => modulo(m.id, e.target.checked)} style={{ width: 'auto' }} />
                  {m.nombre} <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-3)' }}>({n}/{ks.length})</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 4, marginTop: 8 }}>
                  {m.paginas.map(p => (
                    <label key={p.k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={marc.includes(m.id + ':' + p.k)} onChange={() => toggle(m.id + ':' + p.k)} style={{ width: 'auto' }} />{p.l}
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
          {marc.length === 0 && <div style={{ fontSize: 12, color: 'var(--warn)', marginBottom: 8 }}>⚠ Sin ninguna página marcada el usuario no podrá usar el sistema.</div>}
          {msg && <div style={{ fontSize: 12, marginBottom: 8, color: msg.startsWith('Error') ? 'var(--err)' : 'var(--ok)' }}>{msg}</div>}
          <div className="btn-row" style={{ marginTop: 0 }}>
            <button className="btn btn-primary" disabled={guardando} onClick={() => guardar(marc)}>{guardando ? 'Guardando...' : 'Guardar accesos'}</button>
            <button className="btn btn-sec" disabled={guardando || !personalizado} onClick={() => guardar(null)}>Volver a por defecto del rol</button>
          </div>
          <div style={{ marginTop: 14, overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead><tr style={{ textAlign: 'left', color: 'var(--text-3)' }}><th style={{ padding: 4 }}>Usuario</th><th>Rol</th><th>Selección</th><th>Empleabilidad</th></tr></thead>
              <tbody>{usuarios.map(x => {
                const ef: string[] = Array.isArray(x.permisos) ? x.permisos : porDefectoRol(x.rol)
                const c = (id: string) => ef.filter(k => k.startsWith(id + ':')).length + '/' + TODAS.filter(k => k.startsWith(id + ':')).length
                return <tr key={x.id} style={{ borderTop: '1px solid var(--border)' }}><td style={{ padding: 4 }}>{x.nombre}{Array.isArray(x.permisos) ? ' ✎' : ''}</td><td>{x.rol}</td><td>{c('seleccion')}</td><td>{c('empleabilidad')}</td></tr>
              })}</tbody>
            </table>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>✎ = accesos personalizados</div>
          </div>
        </>
      )}
    </div>
  )
}
