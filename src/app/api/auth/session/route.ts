import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { efectivos } from '@/lib/permisos'
export async function GET() {
  const s = await getSession()
  if (!s) return NextResponse.json({ user: null })
  let rol = s.rol, nombre = s.nombre, permisos: any = null, activo = true, empresas: any = null
  const db = supabaseAdmin()
  try {
    let r: any = await db.from('preda_usuarios').select('rol,nombre,activo,permisos,empresas').eq('id', s.id).single()
    if (r.error) r = await db.from('preda_usuarios').select('rol,nombre,activo').eq('id', s.id).single()
    if (r.data) { rol = r.data.rol; nombre = r.data.nombre; activo = r.data.activo !== false; permisos = r.data.permisos ?? null; empresas = r.data.empresas ?? null }
  } catch {}
  if (!activo) return NextResponse.json({ user: null })
  // empresas a las que puede cambiar
  let disp: any[] = []
  try {
    let q: any = await db.from('preda_empresas').select('id,nombre,activa').order('nombre')
    if (q.error) q = await db.from('preda_empresas').select('id,nombre').order('nombre')
    disp = (q.data || []).filter((e: any) => e.activa !== false && (rol === 'admin' || (Array.isArray(empresas) && empresas.includes(e.id)))).map((e: any) => ({ id: e.id, nombre: e.nombre }))
  } catch {}
  return NextResponse.json({ user: { id: s.id, email: s.email, nombre, rol, permisos: efectivos(rol, permisos), personalizado: Array.isArray(permisos), empresa_id: s.empresa_id || null, empresa: s.empresa_nombre || null, empresas: disp } })
}
