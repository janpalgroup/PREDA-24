'use client'
import AccesosPanel from '@/components/AccesosPanel'
import EmpresasPanel from '@/components/EmpresasPanel'
import { useEffect, useState } from 'react'
export default function ConfigPage() {
  const[config,setConfig]=useState<Record<string,string>>({})
  const[loading,setLoading]=useState(true)
  const[saving,setSaving]=useState<string|null>(null)
  const[msgs,setMsgs]=useState<Record<string,string>>({})
  const[groqSt,setGroqSt]=useState<'idle'|'testing'|'ok'|'err'>('idle')
  const[groqMsg,setGroqMsg]=useState('')
  useEffect(()=>{fetch('/api/config-sistema').then(r=>r.json()).then(d=>{if(d.config)setConfig(d.config);setLoading(false)})},[])
  async function save(clave:string,valor:string){setSaving(clave);const res=await fetch('/api/config-sistema',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clave,valor})});const d=await res.json();if(d.ok){setConfig(prev=>({...prev,[clave]:valor}));setMsgs(prev=>({...prev,[clave]:'Guardado'}));setTimeout(()=>setMsgs(prev=>({...prev,[clave]:''})),2500)}else setMsgs(prev=>({...prev,[clave]:'Error: '+d.error}));setSaving(null)}
  async function testGroq(){const key=(document.getElementById('f_groq') as HTMLInputElement)?.value||config.groq_api_key||'';if(!key){setGroqSt('err');setGroqMsg('Ingresa la API Key primero');return};setGroqSt('testing');setGroqMsg('Probando conexion...')
    try{const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:'Responde solo: OK',system:'Responde solo la palabra OK',max_tokens:10})});const d=await res.json();if(res.ok&&d.result){setGroqSt('ok');setGroqMsg('Conectado — llama-3.3-70b-versatile activo')}else{setGroqSt('err');setGroqMsg('Error: '+(d.error||'sin respuesta'))}}catch(e:any){setGroqSt('err');setGroqMsg('Error: '+e.message)}}
  function Saved({k}:{k:string}){return msgs[k]?<span style={{fontSize:12,color:msgs[k].startsWith('Error')?'var(--err)':'var(--ok)'}}>{msgs[k]}</span>:null}
  const DEFAULT_PLANTILLA='NOMBRE\nCARGO | CARGO\nTelefono · Email · LinkedIn\n\nRESUMEN EJECUTIVO\n\nPALABRAS CLAVE / COMPETENCIAS\n\nEXPERIENCIA PROFESIONAL\n\nEDUCACION\n\nCAPACITACIONES Y CERTIFICACIONES\n\nINFORMACION ADICIONAL\nIdiomas:\nTecnologia:\nDisponibilidad:'
  if(loading)return<div className="empty"><span className="spin"/></div>
  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'14px 26px 10px',borderBottom:'1px solid var(--border)'}}><div style={{fontSize:20,fontWeight:600}}>Configuracion del Sistema</div><div style={{fontSize:12,color:'var(--text-3)',marginTop:4}}>API Keys · Busqueda de empleos · Parametros ATS · Plantilla CV</div></div>
      <div style={{flex:1,overflowY:'auto',padding:'18px 26px'}}><div className="cfg-cols">

        <EmpresasPanel/>
      <AccesosPanel/>
      {/* DNI/RUC info */}
        <div style={{marginBottom:18,padding:'14px 18px',borderRadius:10,background:'rgba(26,173,110,.08)',border:'1px solid rgba(26,173,110,.3)'}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--ok)',marginBottom:8}}>Busqueda de DNI y RUC — Activa sin configuracion adicional</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
            {[['apis.net.pe — RENIEC','DNI a nombre completo','Principal'],['apis.net.pe — SUNAT','RUC a razon social','Principal'],['e-consultaruc.sunat.gob.pe','RUC consulta oficial SUNAT','Fallback'],['consulta.pe — RENIEC','DNI fallback','Fallback'],['DuckDuckGo','Telefonos y emails publicos','Adicional']].map(([n,d,e])=>(
              <div key={n} style={{padding:'8px 10px',borderRadius:7,background:'var(--bg-panel)',border:'1px solid var(--border)'}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}><span style={{fontSize:12,fontWeight:600,color:'var(--text-1)',flex:1}}>{n}</span><span style={{padding:'1px 6px',borderRadius:20,fontSize:9,fontWeight:600,background:e==='Principal'?'rgba(26,173,110,.2)':e==='Fallback'?'rgba(30,123,232,.15)':'rgba(232,160,32,.15)',color:e==='Principal'?'var(--ok)':e==='Fallback'?'var(--accent2)':'var(--warn)'}}>{e}</span></div>
                <div style={{fontSize:11,color:'var(--text-3)'}}>{d}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:'var(--text-3)',marginTop:8}}>No necesitas instalar adaptadores ni APIs externas para buscar DNI/RUC.</div>
        </div>

        {/* GROQ */}
        <div style={{fontSize:11,fontWeight:700,color:'var(--warn)',marginBottom:8,textTransform:'uppercase',letterSpacing:1}}>Motor de IA — Groq</div>
        <div className="card" style={{marginBottom:18}}>
          <div className="card-title" style={{display:'flex',alignItems:'center',gap:8}}>Groq API Key{groqSt==='ok'&&<span style={{padding:'2px 8px',borderRadius:20,fontSize:10,background:'rgba(26,173,110,.15)',color:'var(--ok)',fontWeight:600}}>CONECTADO</span>}</div>
          <div style={{fontSize:12,color:'var(--text-3)',marginBottom:8}}>Obtenla gratis en <a href="https://console.groq.com" target="_blank" style={{color:'var(--accent2)'}}>console.groq.com</a>. Debe comenzar con gsk_</div>
          <input id="f_groq" type="password" defaultValue={config.groq_api_key||''} placeholder="gsk_..."/>
          <div className="btn-row" style={{marginTop:8,marginBottom:groqSt!=='idle'?10:0}}>
            <button className="btn btn-primary" style={{fontSize:13}} disabled={saving==='groq_api_key'} onClick={()=>{const v=(document.getElementById('f_groq') as HTMLInputElement).value;save('groq_api_key',v)}}>{saving==='groq_api_key'?<><span className="spin"/> Guardando...</>:'Guardar'}</button>
            <button className="btn btn-sec" style={{fontSize:13}} onClick={testGroq} disabled={groqSt==='testing'}>Probar conexion</button>
            <Saved k="groq_api_key"/>
          </div>
          {groqSt!=='idle'&&<div style={{padding:'8px 12px',borderRadius:8,fontSize:12,display:'flex',alignItems:'center',gap:8,background:groqSt==='ok'?'rgba(26,173,110,.1)':groqSt==='err'?'rgba(232,64,64,.1)':'rgba(30,123,232,.1)',border:'1px solid '+(groqSt==='ok'?'var(--ok)':groqSt==='err'?'var(--err)':'var(--border)'),color:groqSt==='ok'?'var(--ok)':groqSt==='err'?'var(--err)':'var(--accent2)'}}>
            {groqSt==='testing'&&<span className="spin"/>}{groqMsg}
          </div>}
        </div>

        {/* JOOBLE */}
        <div style={{fontSize:11,fontWeight:700,color:'var(--warn)',marginBottom:8,textTransform:'uppercase',letterSpacing:1}}>Busqueda Real de Empleo</div>
        <div className="card" style={{marginBottom:10,border:config.decolecta_token?'1px solid rgba(26,173,110,.4)':'1px solid var(--warn)'}}>
          <div className="card-title" style={{display:'flex',alignItems:'center',gap:8}}>Token consulta DNI (RENIEC) y RUC (SUNAT) — plan gratuito<span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:600,background:config.decolecta_token?'rgba(26,173,110,.15)':'rgba(232,160,32,.15)',color:config.decolecta_token?'var(--ok)':'var(--warn)'}}>{config.decolecta_token?'Configurado':'Falta'}</span></div>
          <div style={{fontSize:12,color:'var(--text-3)',marginBottom:8,lineHeight:1.7}}>1. Regístrate gratis en <a href="https://decolecta.com" target="_blank" style={{color:'var(--accent2)'}}>decolecta.com</a> (antes apis.net.pe) → 2. En tu perfil genera el token → 3. Pégalo aquí. Sin token la búsqueda por DNI/RUC suele fallar. El plan gratuito tiene cuota limitada.</div>
          <input id="f_decolecta" type="password" defaultValue={config.decolecta_token||''} placeholder="Token de Decolecta"/>
          <div className="btn-row" style={{marginTop:8}}><button className="btn btn-ok" style={{fontSize:13}} disabled={saving==='decolecta_token'} onClick={()=>{const v=(document.getElementById('f_decolecta') as HTMLInputElement).value;save('decolecta_token',v)}}>{saving==='decolecta_token'?'Guardando...':'Guardar token'}</button></div>
        </div>
        <div className="card" style={{marginBottom:10,border:config.jooble_api_key?'1px solid rgba(26,173,110,.4)':'1px solid var(--border)'}}>
          <div className="card-title" style={{display:'flex',alignItems:'center',gap:8}}>Jooble API Key — GRATIS — links directos a cada oferta<span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:600,background:config.jooble_api_key?'rgba(26,173,110,.15)':'rgba(232,160,32,.15)',color:config.jooble_api_key?'var(--ok)':'var(--warn)'}}>{config.jooble_api_key?'ACTIVA':'Sin configurar'}</span></div>
          <div style={{fontSize:12,color:'var(--text-3)',marginBottom:8,lineHeight:1.7}}>1. Entra a <a href="https://jooble.org/api/about" target="_blank" style={{color:'var(--accent2)'}}>jooble.org/api/about</a> → completa el formulario → recibes la key por email<br/>2. Pega la key aqui → Guardar → las busquedas mostraran links directos a cada oferta real</div>
          <input id="f_jooble" type="password" defaultValue={config.jooble_api_key||''} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"/>
          <div className="btn-row" style={{marginTop:8}}><button className="btn btn-ok" style={{fontSize:13}} disabled={saving==='jooble_api_key'} onClick={()=>{const v=(document.getElementById('f_jooble') as HTMLInputElement).value;save('jooble_api_key',v)}}>{saving==='jooble_api_key'?<><span className="spin"/> Guardando...</>:'Guardar Jooble Key'}</button><Saved k="jooble_api_key"/></div>
        </div>

        {/* GOOGLE */}
        <div className="info-box" style={{marginBottom:10,fontSize:12}}>Google Custom Search (opcional, GRATIS 100/dia): busca en LinkedIn Hiring, sector estatal y mas.<br/><a href="https://console.cloud.google.com/apis/credentials" target="_blank" style={{color:'var(--accent2)'}}>console.cloud.google.com</a> → API Key → habilitar Custom Search JSON API. Luego <a href="https://programmablesearchengine.google.com" target="_blank" style={{color:'var(--accent2)'}}>programmablesearchengine.google.com</a> → nuevo motor → copiar ID.</div>
        <div className="card" style={{marginBottom:8}}>
          <div className="card-title" style={{display:'flex',alignItems:'center',gap:8}}>Google API Key{config.google_api_key&&<span style={{padding:'2px 7px',borderRadius:20,fontSize:10,background:'rgba(26,173,110,.15)',color:'var(--ok)',fontWeight:600}}>OK</span>}</div>
          <input id="f_gkey" type="password" defaultValue={config.google_api_key||''} placeholder="AIzaSy..."/>
          <div className="btn-row" style={{marginTop:8}}><button className="btn btn-primary" style={{fontSize:13}} disabled={saving==='google_api_key'} onClick={()=>{const v=(document.getElementById('f_gkey') as HTMLInputElement).value;save('google_api_key',v)}}>{saving==='google_api_key'?<><span className="spin"/> Guardando...</>:'Guardar'}</button><Saved k="google_api_key"/></div>
        </div>
        <div className="card" style={{marginBottom:18}}>
          <div className="card-title" style={{display:'flex',alignItems:'center',gap:8}}>Google CSE ID{config.google_cse_id&&<span style={{padding:'2px 7px',borderRadius:20,fontSize:10,background:'rgba(26,173,110,.15)',color:'var(--ok)',fontWeight:600}}>OK</span>}</div>
          <input id="f_gcse" type="text" defaultValue={config.google_cse_id||''} placeholder="017576662512468239146:omuauf2yvap"/>
          <div className="btn-row" style={{marginTop:8}}><button className="btn btn-primary" style={{fontSize:13}} disabled={saving==='google_cse_id'} onClick={()=>{const v=(document.getElementById('f_gcse') as HTMLInputElement).value;save('google_cse_id',v)}}>{saving==='google_cse_id'?<><span className="spin"/> Guardando...</>:'Guardar'}</button><Saved k="google_cse_id"/></div>
          {config.google_api_key&&config.google_cse_id&&<div style={{marginTop:8,padding:'7px 11px',borderRadius:8,background:'rgba(26,173,110,.1)',border:'1px solid var(--ok)',fontSize:12,color:'var(--ok)'}}>Google Custom Search activo — busqueda en LinkedIn Hiring, sector estatal y mas</div>}
        </div>

        {/* PARAMETROS ATS */}
        <div style={{fontSize:11,fontWeight:700,color:'var(--warn)',marginBottom:8,textTransform:'uppercase',letterSpacing:1}}>Parametros ATS</div>
        <div className="card" style={{marginBottom:18}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
            {[{k:'umbral_ats',l:'Puntaje minimo ATS',ph:'60'},{k:'umbral_ofertas',l:'Compatibilidad min %',ph:'90'},{k:'dias_alerta',l:'Dias sin contacto',ph:'3'}].map(f=>(
              <div key={f.k}><div style={{fontSize:12,fontWeight:600,marginBottom:5}}>{f.l}</div>
                <input id={'f_'+f.k} type="number" defaultValue={config[f.k]||f.ph} style={{width:'100%',marginBottom:6}}/>
                <div style={{display:'flex',gap:6,alignItems:'center'}}><button className="btn btn-primary" style={{fontSize:11,padding:'4px 9px'}} disabled={saving===f.k} onClick={()=>{const v=(document.getElementById('f_'+f.k) as HTMLInputElement).value;save(f.k,v)}}>{saving===f.k?<><span className="spin"/>...</>:'Guardar'}</button><Saved k={f.k}/></div>
              </div>
            ))}
          </div>
        </div>

        {/* PLANTILLA CV */}
        <div style={{fontSize:11,fontWeight:700,color:'var(--warn)',marginBottom:8,textTransform:'uppercase',letterSpacing:1}}>Plantilla CV Harvard</div>
        <div className="card">
          <div className="card-title">Estructura del CV</div>
          <div style={{fontSize:12,color:'var(--text-3)',marginBottom:8}}>La IA rellenara esta plantilla. Competencias en parrafo corrido separado por · (compatible ATS).</div>
          <textarea id="f_plantilla" defaultValue={config.cv_plantilla||DEFAULT_PLANTILLA} style={{minHeight:200,fontFamily:'monospace',fontSize:12,marginBottom:8}}/>
          <div className="btn-row">
            <button className="btn btn-primary" style={{fontSize:13}} disabled={saving==='cv_plantilla'} onClick={()=>{const v=(document.getElementById('f_plantilla') as HTMLTextAreaElement).value;save('cv_plantilla',v)}}>{saving==='cv_plantilla'?<><span className="spin"/> Guardando...</>:'Guardar plantilla'}</button>
            <button className="btn btn-sec" style={{fontSize:12}} onClick={()=>{const el=document.getElementById('f_plantilla') as HTMLTextAreaElement;if(el)el.value=DEFAULT_PLANTILLA}}>Restaurar default</button>
            <Saved k="cv_plantilla"/>
          </div>
        </div>
      </div></div>
    </div>
  )
}
