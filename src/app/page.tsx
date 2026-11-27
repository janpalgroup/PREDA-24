'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('admin@preda.com')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [empresas, setEmpresas] = useState<any[]>([])
  const [empresaId, setEmpresaId] = useState('')
  const [empAviso, setEmpAviso] = useState('')
  const [empCargado, setEmpCargado] = useState(false)
  useEffect(() => {
    fetch('/api/auth/session').then(r=>r.json()).then(d=>{ if(d.user&&d.user.empresa_id) router.push('/modulos') })
    fetch('/api/auth/empresas?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(d=>{
      const e=d.empresas||[]; setEmpresas(e); setEmpCargado(true)
      setEmpAviso(d.error?d.error:d.migracion_pendiente?'La base de datos aún no está actualizada: ejecuta ejecutar_en_supabase_v20.sql en Supabase (SQL Editor) y recarga.':e.length===0?'No hay empresas creadas.':'')
      let ult=''; try{ult=localStorage.getItem('preda_empresa')||''}catch{}
      setEmpresaId(e.find((x:any)=>x.id===ult)?.id||e[0]?.id||'')
    }).catch(()=>{setEmpCargado(true);setEmpAviso('No se pudo conectar con el servidor. Revisa tu conexión y las variables de Supabase en Vercel.')})
  },[])
  async function login(e: any) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,empresa_id:empresaId})})
      const d = await res.json()
      if (d.ok) { try{localStorage.setItem('preda_empresa',empresaId)}catch{}; router.push('/modulos') }
      else setError(d.error||'Error de autenticación')
    } catch(ex:any){ setError('Error: '+ex.message) }
    setLoading(false)
  }
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:20}}>
      <div style={{marginBottom:24,textAlign:'center'}}>
        <div style={{fontSize:32,fontWeight:800,letterSpacing:4,marginBottom:4}}>PRE<span style={{color:'var(--accent)'}}>DA</span></div>
        <div style={{fontSize:11,color:'var(--text-3)',letterSpacing:2,textTransform:'uppercase'}}>Suite Integral de Gestión del Talento</div>
      </div>
      <div className="card" style={{width:'100%',maxWidth:380}}>
        <div style={{fontSize:12,fontWeight:600,color:'var(--text-3)',letterSpacing:1,textTransform:'uppercase',marginBottom:16,textAlign:'center'}}>Iniciar Sesión</div>
        <form onSubmit={login}>
          <div className="field"><label>Empresa</label>
            <select value={empresaId} onChange={e=>setEmpresaId(e.target.value)}>
              {empresas.length===0&&<option value="">{empCargado?'Sin empresas disponibles':'Cargando empresas...'}</option>}
              {empresas.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
            {empAviso&&<div style={{fontSize:11,color:'var(--warn)',marginTop:5,lineHeight:1.5}}>{empAviso}</div>}
          </div>
          <div className="field"><label>Correo electrónico</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></div>
          <div className="field"><label>Contraseña</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></div>
          {error&&<div style={{color:'var(--err)',fontSize:12,marginBottom:10,padding:'8px 10px',background:'rgba(232,64,64,.1)',borderRadius:6,border:'1px solid rgba(232,64,64,.3)'}}>{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading||!empresaId} style={{width:'100%',justifyContent:'center',padding:'11px',fontSize:14}}>
            {loading?<><span className="spin"/> Ingresando...</>:'Ingresar a PREDA'}
          </button>
        </form>
      </div>
      <div style={{marginTop:24,fontSize:11,color:'var(--text-3)'}}>PREDA Suite v2 · Powered by Groq AI</div>
    </div>
  )
}
