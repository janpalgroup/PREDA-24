import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { consultarDni, consultarRuc, getTokenConsulta } from '@/lib/consultas'
export const dynamic = 'force-dynamic'
async function duckduckgoContactos(nombre: string) {
  try {
    const q = encodeURIComponent(nombre+' Peru telefono contacto')
    const res = await fetch('https://api.duckduckgo.com/?q='+q+'&format=json&no_redirect=1&no_html=1',{signal:AbortSignal.timeout(5000)})
    const d = await res.json(); const text = JSON.stringify(d)
    const tels   = (text.match(/\+51[\s\-]?9\d{8}|9\d{8}/g)||[]).slice(0,3)
    const emails = (text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)||[]).slice(0,3)
    return {telefonos:[...new Set(tels)] as string[],emails:[...new Set(emails)] as string[]}
  } catch { return {telefonos:[],emails:[]} }
}
export async function POST(req: NextRequest) {
  const s = await getSession(); if(!s) return NextResponse.json({error:'No autenticado'},{status:401})
  const b = await req.json()
  const dni = String(b.dni||'').replace(/\D/g,''); const ruc = String(b.ruc||'').replace(/\D/g,'')
  const token = await getTokenConsulta()
  const aviso = token ? '' : ' Falta el token gratuito: el administrador debe registrarse en decolecta.com y pegarlo en Administración → Configuración.'
  if (b.ruc !== undefined && b.ruc !== '') {
    if (ruc.length !== 11) return NextResponse.json({success:false,error:'El RUC debe tener 11 dígitos'})
    const r = await consultarRuc(ruc, token)
    if (r.ok) return NextResponse.json(r.ok)
    return NextResponse.json({success:false,error:'No se pudo consultar el RUC.'+aviso,ruc,detalle:r.fallas})
  }
  if (dni.length !== 8) return NextResponse.json({success:false,error:'El DNI debe tener 8 dígitos'})
  const r = await consultarDni(dni, token)
  if (!r.ok) return NextResponse.json({success:false,error:'No se pudo consultar el DNI.'+aviso,dni,detalle:r.fallas})
  const contactos = await duckduckgoContactos(r.ok.nombre_completo)
  return NextResponse.json({...r.ok,dni,telefonos:contactos.telefonos,emails:contactos.emails,
    fuentes:[r.ok.fuente,...(contactos.telefonos.length>0?['DuckDuckGo (contactos)']:[])]})
}
