'use client'
import { useState } from 'react'
import { useAI } from '@/hooks/useAI'
export default function VerificacionesEmpPage() {
  const{callAI,loading}=useAI()
  const[tipo,setTipo]=useState<'dni'|'ruc'>('dni')
  const[dni,setDni]=useState('');const[ruc,setRuc]=useState('');const[nombre,setNombre]=useState('');const[datos,setDatos]=useState<any>(null);const[buscando,setBuscando]=useState(false);const[informe,setInforme]=useState('')
  const[manual,setManual]=useState({antecedentes_penales:'Sin antecedentes',antecedentes_policiales:'Sin antecedentes',antecedentes_judiciales:'Sin procesos judiciales',central_riesgo:'Sin deudas',educacion_verificada:'',experiencia_verificada:'',referencias:''})
  async function buscar(){
    const id=tipo==='dni'?dni:ruc
    if(!id||id.length<7){alert('Ingresa un '+tipo.toUpperCase()+' valido');return}
    setBuscando(true);setDatos(null)
    try{
      const res=await fetch('/api/verificar-dni',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(tipo==='dni'?{dni}:{ruc})})
      const d=await res.json();setDatos(d)
      if(d.nombre_completo)setNombre(d.nombre_completo)
      if(d.razon_social)setNombre(d.razon_social)
    }catch(e:any){alert('Error: '+e.message)}
    setBuscando(false)
  }
  async function genInforme(){
    if(!nombre&&!dni){alert('Busca un DNI primero');return}
    const r=await callAI(
      'Genera INFORME PROFESIONAL DE VERIFICACION DE ANTECEDENTES para:\nNombre: '+(nombre||'No especificado')+'\n'+(tipo==='dni'?'DNI: '+dni:'RUC: '+ruc)+'\n\nDATA FUENTES PUBLICAS:\n'+JSON.stringify(datos,null,2)+'\n\nVERIFICACION MANUAL:\nAntecedentes penales: '+manual.antecedentes_penales+'\nAntecedentes policiales: '+manual.antecedentes_policiales+'\nAntecedentes judiciales: '+manual.antecedentes_judiciales+'\nCentral de riesgo: '+manual.central_riesgo+'\nEducacion verificada: '+manual.educacion_verificada+'\nExperiencia verificada: '+manual.experiencia_verificada+'\nReferencias: '+manual.referencias+'\n\n1. DATOS DE IDENTIFICACION VERIFICADOS\n2. RESUMEN DE ANTECEDENTES\n3. VERIFICACION EDUCACION Y EXPERIENCIA\n4. REFERENCIAS\n5. NIVEL DE RIESGO: BAJO/MEDIO/ALTO\n6. RECOMENDACION FINAL: Aprobar/Observado/No contratar',
      'Eres PREDA, experto en verificacion de antecedentes. Responde en espanol profesional.'
    )
    if(r)setInforme(r)
  }
  const rm=informe.match(/NIVEL DE RIESGO[:\s]*(BAJO|MEDIO|ALTO)/i)
  const rc=(v:string)=>v==='BAJO'?'var(--ok)':v==='MEDIO'?'var(--warn)':'var(--err)'
  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'14px 26px 10px',borderBottom:'1px solid var(--border)'}}><div style={{fontSize:20,fontWeight:600}}>Verificaciones de Antecedentes</div><div style={{fontSize:12,color:'var(--text-3)',marginTop:4}}>DNI/RUC → APIs RENIEC/SUNAT automáticas → informe de riesgo IA</div></div>
      <div style={{flex:1,overflowY:'auto',padding:'18px 26px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,alignItems:'start',maxWidth:980}}>
        <div>
          <div className="card" style={{marginBottom:12}}>
            <div className="card-title">Buscar candidato / empresa</div>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <button className={'btn '+(tipo==='dni'?'btn-primary':'btn-sec')} style={{fontSize:13}} onClick={()=>setTipo('dni')}>DNI (Persona)</button>
              <button className={'btn '+(tipo==='ruc'?'btn-primary':'btn-sec')} style={{fontSize:13}} onClick={()=>setTipo('ruc')}>RUC (Empresa)</button>
            </div>
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              {tipo==='dni'?<input value={dni} onChange={e=>setDni(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="DNI 8 digitos" style={{maxWidth:180,fontFamily:'monospace'}} maxLength={8}/>:<input value={ruc} onChange={e=>setRuc(e.target.value.replace(/\D/g,'').slice(0,11))} placeholder="RUC 11 digitos" style={{maxWidth:180,fontFamily:'monospace'}} maxLength={11}/>}
              <button className="btn btn-primary" onClick={buscar} disabled={buscando||(tipo==='dni'?dni.length<7:ruc.length<10)}>{buscando?<><span className="spin"/> Buscando...</>:'Buscar'}</button>
            </div>
            {datos?.success&&(
              <div style={{background:'rgba(26,173,110,.1)',border:'1px solid var(--ok)',borderRadius:8,padding:12,marginBottom:10}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--ok)',marginBottom:6}}>{tipo==='ruc'?'Datos SUNAT':'Datos RENIEC'} encontrados</div>
                {datos.nombre_completo&&<div style={{fontSize:13,marginBottom:2}}><b>Nombre:</b> {datos.nombre_completo}</div>}
                {datos.razon_social&&<div style={{fontSize:13,marginBottom:2}}><b>Razon Social:</b> {datos.razon_social}</div>}
                {datos.estado&&<div style={{fontSize:12,color:'var(--text-2)',marginBottom:2}}><b>Estado:</b> {datos.estado} · {datos.condicion}</div>}
                {datos.direccion&&<div style={{fontSize:12,color:'var(--text-2)',marginBottom:2}}><b>Direccion:</b> {datos.direccion}</div>}
                {datos.emails?.length>0&&<div style={{fontSize:12,color:'var(--text-2)',marginBottom:2}}><b>Emails:</b> {datos.emails.join(', ')}</div>}
                {datos.telefonos?.length>0&&<div style={{fontSize:12,color:'var(--text-2)'}}><b>Telefonos:</b> {datos.telefonos.join(', ')}</div>}
                <div style={{fontSize:10,color:'var(--text-3)',marginTop:5}}>Fuentes: {(datos.fuentes||[]).join(' · ')}</div>
              </div>
            )}
            {datos&&!datos.success&&<div style={{background:'rgba(232,160,32,.1)',border:'1px solid var(--warn)',borderRadius:8,padding:10,marginBottom:10,fontSize:12,color:'var(--warn)'}}>{datos.error||'No encontrado. Ingresa el nombre manualmente.'}{datos.detalle&&datos.detalle.length>0&&<div style={{marginTop:6,fontSize:11,opacity:.9}}>{datos.detalle.map((x:any,i:number)=><div key={i}>• {x.fuente}: {x.motivo}</div>)}</div>}</div>}
            <div className="field"><label>Nombre completo *</label><input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Se autocarga o ingresa manualmente"/></div>
          </div>
          <div className="card">
            <div className="card-title">Verificacion manual</div>
            {[['antecedentes_penales','Antecedentes penales'],['antecedentes_policiales','Antecedentes policiales'],['antecedentes_judiciales','Antecedentes judiciales / REDAM'],['central_riesgo','Central de riesgo / SBS'],['educacion_verificada','Educacion verificada'],['experiencia_verificada','Experiencia laboral verificada'],['referencias','Referencias contactadas']].map(([k,l])=>(
              <div key={k} className="field"><label>{l}</label><input value={(manual as any)[k]} onChange={e=>setManual(m=>({...m,[k]:e.target.value}))} placeholder={l}/></div>
            ))}
            <button className="btn btn-primary" onClick={genInforme} disabled={loading||!nombre} style={{width:'100%',justifyContent:'center',fontSize:14,padding:'10px'}}>{loading?<><span className="spin"/> Generando informe...</>:'Generar informe de riesgo con IA'}</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Informe de Verificacion</div>
          {!informe?<div className="empty" style={{padding:50}}>Busca un DNI o RUC y genera el informe</div>:(
            <>
              {rm&&<div style={{textAlign:'center',padding:16,borderRadius:10,marginBottom:14,background:'rgba(26,173,110,.06)',border:'1px solid '+(rc(rm[1])+'44')}}>
                <div style={{fontSize:36,fontWeight:800,color:rc(rm[1])}}>{rm[1]}</div>
                <div style={{fontSize:11,color:'var(--text-3)'}}>NIVEL DE RIESGO</div>
              </div>}
              <div style={{fontSize:13,lineHeight:1.85,whiteSpace:'pre-wrap',maxHeight:500,overflowY:'auto'}}>{informe}</div>
              <div className="btn-row" style={{marginTop:12}}>
                <button className="btn btn-sec" onClick={()=>navigator.clipboard.writeText(informe)}>Copiar</button>
                <button className="btn btn-sec" onClick={()=>{const b=new Blob([informe],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='Verificacion_'+(nombre||dni||ruc)+'.txt';a.click()}}>Descargar</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
