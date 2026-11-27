'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAI } from '@/hooks/useAI'
import { elegirExpediente } from '@/hooks/useExpediente'

const RUBROS = ['Ventas y comercial', 'Atención al cliente', 'Administración', 'Finanzas y contabilidad', 'Recursos humanos', 'Logística y almacén', 'Tecnología / TI', 'Marketing y publicidad', 'Banca y seguros', 'Inmobiliario', 'Automotriz', 'Minería', 'Construcción', 'Salud', 'Educación', 'Retail', 'Gastronomía y turismo', 'Telecomunicaciones', 'Manufactura', 'Sector público']
const DISPONIBILIDAD = ['Inmediata', 'En 15 días', 'En 30 días', 'En 60 días', 'Solo medio tiempo', 'Freelance / por proyecto']
const VACIO: any = { dni: '', nombre: '', email: '', telefono: '', ciudad: 'Lima', distrito: '', pais: 'Peru', linkedin: '', facebook: '', instagram: '', tiktok: '', portafolio: '', cargos_objetivo: [], rubros: [], resumen: '', disponibilidad: 'Inmediata', modalidad: 'Presencial', pretension_salarial: '' }

function Chips({ valores, onChange, sugerencias, placeholder }: { valores: string[]; onChange: (v: string[]) => void; sugerencias?: string[]; placeholder: string }) {
  const [txt, setTxt] = useState('')
  const add = (v: string) => { const t = v.trim(); if (t && !valores.some(x => x.toLowerCase() === t.toLowerCase())) onChange([...valores, t]); setTxt('') }
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {valores.map(v => <span key={v} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, background: 'var(--adim)', color: 'var(--accent2)', display: 'inline-flex', gap: 6, alignItems: 'center' }}>{v}<b style={{ cursor: 'pointer' }} onClick={() => onChange(valores.filter(x => x !== v))}>×</b></span>)}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(txt) } }} placeholder={placeholder} style={{ fontSize: 13 }} />
        <button type="button" className="btn btn-sec" style={{ fontSize: 12 }} onClick={() => add(txt)}>Agregar</button>
      </div>
      {sugerencias && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
        {sugerencias.filter(s => !valores.includes(s)).map(s => <span key={s} onClick={() => add(s)} style={{ cursor: 'pointer', padding: '2px 9px', borderRadius: 20, fontSize: 11, border: '1px solid var(--border)', color: 'var(--text-3)' }}>+ {s}</span>)}
      </div>}
    </div>
  )
}

export default function ExpedientePage() {
  const router = useRouter()
  const { callAI, loading } = useAI()
  const [vista, setVista] = useState<'lista' | 'detalle'>('lista')
  const [lista, setLista] = useState<any[]>([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [dniBusq, setDniBusq] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [exp, setExp] = useState<any>(VACIO)
  const [nuevo, setNuevo] = useState(false)
  const [tab, setTab] = useState<'datos' | 'redes' | 'objetivo' | 'cv'>('datos')
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { cargarLista() }, [])
  async function cargarLista() {
    setCargandoLista(true)
    const r = await fetch('/api/expediente'); const d = await r.json()
    setLista(d.expedientes || []); setCargandoLista(false)
  }
  const set = (k: string, v: any) => setExp((p: any) => ({ ...p, [k]: v }))
  const norm = (e: any) => ({ ...VACIO, ...e, cargos_objetivo: Array.isArray(e.cargos_objetivo) && e.cargos_objetivo.length ? e.cargos_objetivo : (e.cargo_objetivo ? [e.cargo_objetivo] : []), rubros: Array.isArray(e.rubros) && e.rubros.length ? e.rubros : (e.rubro ? String(e.rubro).split(/,\s*/).filter(Boolean) : []) })

  function abrir(e: any) { setExp(norm(e)); setNuevo(false); setTab('datos'); setMsg(''); setVista('detalle') }
  function nuevoManual() { setExp({ ...VACIO }); setNuevo(true); setTab('datos'); setMsg(''); setAviso(''); setVista('detalle') }

  // 1) Busca el DNI en nuestra base. 2) Si no existe, consulta RENIEC y arma un borrador nuevo.
  async function buscarPorDni() {
    const dni = dniBusq.replace(/\D/g, '')
    if (dni.length !== 8) { setAviso('Ingresa un DNI de 8 dígitos'); return }
    setBuscando(true); setAviso('Buscando en la base de candidatos...')
    try {
      const r = await fetch('/api/expediente?dni=' + dni); const d = await r.json()
      if (d.expediente) { setBuscando(false); setAviso(''); abrir(d.expediente); return }
      setAviso('No está en la base. Consultando RENIEC...')
      const rr = await fetch('/api/verificar-dni', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dni }) })
      const dd = await rr.json()
      const base = { ...VACIO, dni }
      if (dd.success && dd.nombre_completo) {
        base.nombre = dd.nombre_completo
        if (dd.emails?.[0]) base.email = dd.emails[0]
        if (dd.telefonos?.[0]) base.telefono = String(dd.telefonos[0])
        base.datos_dni = dd
        setAviso('Candidato nuevo: se cargaron los datos de RENIEC. Completa el expediente y pulsa Guardar.')
      } else {
        setAviso('Candidato nuevo. RENIEC no devolvió datos (' + (dd.error || 'sin respuesta') + (dd.detalle && dd.detalle.length ? ' — ' + dd.detalle.map((x: any) => x.fuente + ': ' + x.motivo).join(' | ') : '') + '): complétalos manualmente y pulsa Guardar.')
      }
      setExp(base); setNuevo(true); setTab('datos'); setMsg(''); setVista('detalle')
    } catch (e: any) { setAviso('Error: ' + e.message) }
    setBuscando(false)
  }

  async function guardar() {
    if (!exp.nombre?.trim()) { setMsg('El nombre es obligatorio'); return }
    setGuardando(true); setMsg('')
    const body: any = { ...exp, cargo_objetivo: exp.cargos_objetivo?.[0] || exp.cargo_objetivo || '', rubro: (exp.rubros || []).join(', ') }
    try {
      const r = await fetch('/api/expediente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      if (d.expediente) {
        if (d.existente && nuevo) { setMsg('Ese DNI ya existía en la base: se abrió el expediente guardado.'); setExp(norm(d.expediente)) }
        else { setExp(norm(d.expediente)); setMsg('Guardado ' + new Date().toLocaleTimeString('es-PE')) }
        setNuevo(false); cargarLista()
      } else setMsg('Error: ' + (d.error || 'no se pudo guardar'))
    } catch (e: any) { setMsg('Error: ' + e.message) }
    setGuardando(false)
  }

  async function redactarResumen() {
    const cv = (exp.cv_texto || '').substring(0, 3500)
    const r = await callAI('Redacta un RESUMEN PROFESIONAL de 4 a 5 líneas en primera persona implícita (estilo CV, sin "yo"), para:\nNombre: ' + exp.nombre + '\nCargos objetivo: ' + (exp.cargos_objetivo || []).join(', ') + '\nRubros: ' + (exp.rubros || []).join(', ') + '\n' + (cv ? 'CV:\n' + cv + '\n' : '') + '\nSolo el texto del resumen, sin títulos, sin inventar datos que no estén.', 'Eres PREDA, experto en CV y empleabilidad. Responde en español.')
    if (r) set('resumen', r.replace(/\*\*/g, '').trim())
  }
  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este expediente definitivamente? Esta acción no se puede deshacer.')) return
    await fetch('/api/expediente', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setVista('lista'); cargarLista()
  }
  function usar(ruta: string) { elegirExpediente(exp.id); router.push(ruta) }

  const filtrados = lista.filter(e => !filtro || (e.nombre || '').toLowerCase().includes(filtro.toLowerCase()) || (e.dni || '').includes(filtro) || (e.cargo_objetivo || '').toLowerCase().includes(filtro.toLowerCase()))
  const tabBtn = (k: any, l: string) => <button key={k} onClick={() => setTab(k)} style={{ padding: '9px 16px', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer', color: tab === k ? 'var(--ok)' : 'var(--text-3)', borderBottom: tab === k ? '2px solid var(--ok)' : '2px solid transparent', fontFamily: 'var(--font)', fontWeight: tab === k ? 600 : 400 }}>{l}</button>

  if (vista === 'lista') return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 26px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>Mi Expediente</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Busca al candidato por DNI. Si no está en la base, se crea su expediente con los datos de RENIEC.</div>
      </div>
      <div style={{ padding: '14px 26px', background: 'rgba(26,173,110,.05)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={dniBusq} onChange={e => setDniBusq(e.target.value.replace(/\D/g, '').slice(0, 8))} onKeyDown={e => { if (e.key === 'Enter') buscarPorDni() }} placeholder="DNI del candidato (8 dígitos)" inputMode="numeric" style={{ maxWidth: 260, fontSize: 15, letterSpacing: 2 }} />
          <button className="btn btn-ok" onClick={buscarPorDni} disabled={buscando || dniBusq.length !== 8} style={{ fontSize: 14, padding: '10px 22px' }}>{buscando ? <><span className="spin" /> Buscando...</> : 'Buscar por DNI'}</button>
          <button className="btn btn-sec" onClick={nuevoManual} style={{ fontSize: 13 }}>+ Nuevo sin DNI</button>
        </div>
        {aviso && <div style={{ fontSize: 12, marginTop: 8, color: aviso.startsWith('Error') ? 'var(--err)' : 'var(--accent2)' }}>{aviso}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 26px', borderBottom: '1px solid var(--border)' }}>
        <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Filtrar la base por nombre, DNI o cargo..." style={{ maxWidth: 340, fontSize: 13 }} />
        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{filtrados.length} candidatos en la base</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 26px' }}>
        {cargandoLista ? <div className="empty"><span className="spin" /></div> : filtrados.length === 0 ? <div className="empty">Sin candidatos. Busca un DNI arriba para crear el primero.</div> : filtrados.map(e => (
          <div key={e.id} className="card" style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => abrir(e)}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(26,173,110,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--ok)' }}>{(e.nombre || '?')[0].toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{e.nombre}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{e.cargo_objetivo || 'Sin cargo objetivo'}{e.dni ? ' · DNI ' + e.dni : ''}{e.ciudad ? ' · ' + e.ciudad : ''}</div>
            </div>
            <span style={{ fontSize: 11, color: e.cv_texto ? 'var(--ok)' : 'var(--warn)' }}>{e.cv_texto ? '✔ CV cargado' : 'Sin CV'}</span>
            {e.score_empleabilidad != null && <b style={{ color: 'var(--accent2)' }}>{e.score_empleabilidad}</b>}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '12px 26px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-sec" style={{ fontSize: 12 }} onClick={() => { setVista('lista'); cargarLista() }}>← Base de candidatos</button>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{exp.nombre || 'Nuevo candidato'}</div>
        {nuevo && <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: 'rgba(232,160,32,.15)', color: 'var(--warn)', fontWeight: 700 }}>NUEVO — sin guardar</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: msg.startsWith('Error') || msg.startsWith('El nombre') ? 'var(--err)' : 'var(--ok)' }}>{msg}</span>
          <button className="btn btn-ok" onClick={guardar} disabled={guardando} style={{ fontSize: 13 }}>{guardando ? 'Guardando...' : 'Guardar expediente'}</button>
        </div>
      </div>
      {aviso && nuevo && <div style={{ padding: '8px 26px', fontSize: 12, background: 'rgba(30,123,232,.06)', color: 'var(--accent2)' }}>{aviso}</div>}
      <div style={{ display: 'flex', gap: 2, padding: '0 26px', borderBottom: '1px solid var(--border)' }}>
        {tabBtn('datos', 'Datos básicos')}{tabBtn('redes', 'Redes sociales')}{tabBtn('objetivo', 'Objetivo laboral')}{tabBtn('cv', 'CV y siguiente paso')}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 26px' }}>
        {tab === 'datos' && (
          <div className="card">
            <div className="card-title">Datos básicos</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="field"><label>DNI</label><input value={exp.dni || ''} onChange={e => set('dni', e.target.value.replace(/\D/g, '').slice(0, 8))} disabled={!nuevo && !!exp.id && !!exp.dni} /></div>
              <div className="field"><label>Nombre completo *</label><input value={exp.nombre || ''} onChange={e => set('nombre', e.target.value)} /></div>
              <div className="field"><label>Correo electrónico</label><input value={exp.email || ''} onChange={e => set('email', e.target.value)} /></div>
              <div className="field"><label>Teléfono / WhatsApp</label><input value={exp.telefono || ''} onChange={e => set('telefono', e.target.value)} /></div>
              <div className="field"><label>País</label><input value={exp.pais || ''} onChange={e => set('pais', e.target.value)} /></div>
              <div className="field"><label>Departamento / ciudad</label><input value={exp.ciudad || ''} onChange={e => set('ciudad', e.target.value)} /></div>
              <div className="field"><label>Distrito</label><input value={exp.distrito || ''} onChange={e => set('distrito', e.target.value)} /></div>
            </div>
          </div>
        )}
        {tab === 'redes' && (
          <div className="card">
            <div className="card-title">Redes sociales y presencia web</div>
            {[['linkedin', 'LinkedIn', 'https://linkedin.com/in/...'], ['facebook', 'Facebook', 'https://facebook.com/...'], ['instagram', 'Instagram', '@usuario o enlace'], ['tiktok', 'TikTok', '@usuario o enlace'], ['portafolio', 'Portafolio / web personal', 'https://...']].map(([k, l, ph]) => (
              <div className="field" key={k}><label>{l}</label><input value={exp[k] || ''} onChange={e => set(k, e.target.value)} placeholder={ph} /></div>
            ))}
          </div>
        )}
        {tab === 'objetivo' && (
          <div className="card">
            <div className="card-title">Objetivo laboral</div>
            <div className="field"><label>Cargos objetivo (los que busca)</label><Chips valores={exp.cargos_objetivo || []} onChange={v => set('cargos_objetivo', v)} placeholder="Ej: Jefe de ventas — Enter para agregar" /></div>
            <div className="field"><label>Rubros / sectores a buscar</label><Chips valores={exp.rubros || []} onChange={v => set('rubros', v)} sugerencias={RUBROS} placeholder="Otro rubro..." /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 14px' }}>
              <div className="field"><label>Disponibilidad</label><select value={exp.disponibilidad || ''} onChange={e => set('disponibilidad', e.target.value)}>{DISPONIBILIDAD.map(d => <option key={d}>{d}</option>)}</select></div>
              <div className="field"><label>Modalidad preferida</label><select value={exp.modalidad || 'Presencial'} onChange={e => set('modalidad', e.target.value)}>{['Presencial', 'Híbrido', 'Remoto', 'Indistinto'].map(d => <option key={d}>{d}</option>)}</select></div>
              <div className="field"><label>Pretensión salarial (S/)</label><input value={exp.pretension_salarial || ''} onChange={e => set('pretension_salarial', e.target.value)} placeholder="Ej: 3500 - 4500" /></div>
            </div>
            <div className="field"><label>Resumen profesional</label>
              <textarea value={exp.resumen || ''} onChange={e => set('resumen', e.target.value)} style={{ minHeight: 110 }} placeholder="Resumen de 4-5 líneas..." />
              <button className="btn btn-sec" style={{ fontSize: 12, marginTop: 6 }} onClick={redactarResumen} disabled={loading || !exp.nombre}>{loading ? <><span className="spin" /> Redactando...</> : 'Redactar con IA'}</button>
            </div>
          </div>
        )}
        {tab === 'cv' && (
          <div className="card">
            <div className="card-title">CV y siguiente paso</div>
            <div style={{ fontSize: 13, marginBottom: 10 }}>{exp.cv_texto ? <span style={{ color: 'var(--ok)' }}>✔ CV cargado{exp.cv_archivo ? ': ' + exp.cv_archivo : ''}{exp.cv_actualizado ? ' · ' + new Date(exp.cv_actualizado).toLocaleDateString('es-PE') : ''}</span> : <span style={{ color: 'var(--warn)' }}>Todavía no tiene CV. Se carga una sola vez en “Perfil a Buscar” y lo usan todos los módulos.</span>}</div>
            {nuevo || !exp.id ? <div className="info-box">Guarda el expediente para continuar con el CV.</div> : (
              <div className="btn-row" style={{ marginTop: 0 }}>
                <button className="btn btn-primary" onClick={() => usar('/empleabilidad/perfil')}>1. Perfil a buscar (cargar y analizar CV) →</button>
                <button className="btn btn-sec" onClick={() => usar('/empleabilidad/ofertas')}>2. Buscar ofertas</button>
                <button className="btn btn-sec" onClick={() => usar('/empleabilidad/entrevista')}>3. Pre-entrevista</button>
              </div>
            )}
            {exp.id && <div style={{ marginTop: 24 }}><button className="btn btn-danger" style={{ fontSize: 12 }} onClick={() => eliminar(exp.id)}>Eliminar expediente</button></div>}
          </div>
        )}
      </div>
    </div>
  )
}
