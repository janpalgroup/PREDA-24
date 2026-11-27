import { NextRequest, NextResponse } from 'next/server'
import { getSession, createToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
// Cambiar de empresa sin cerrar sesion (solo a las que el usuario tiene asignadas)
export async function POST(req: NextRequest) {
  const s = await getSession(); if (!s) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { empresa_id } = await req.json()
  const db = supabaseAdmin()
  const { data: u } = await db.from('preda_usuarios').select('rol,activo,empresas,nombre,email').eq('id', s.id).single()
  if (!u || u.activo === false) return NextResponse.json({ error: 'Usuario no válido' }, { status: 401 })
  let er: any = await db.from('preda_empresas').select('id,nombre,activa').eq('id', empresa_id).single()
  if (er.error) er = await db.from('preda_empresas').select('id,nombre').eq('id', empresa_id).single()
  const emp = er.data
  if (!emp || emp.activa === false) return NextResponse.json({ error: 'Empresa no disponible' }, { status: 403 })
  if (u.rol !== 'admin' && !(Array.isArray(u.empresas) && u.empresas.includes(emp.id))) return NextResponse.json({ error: 'Sin acceso a esa empresa' }, { status: 403 })
  const token = await createToken({ id: s.id, email: u.email, nombre: u.nombre, rol: u.rol, empresa_id: emp.id, empresa_nombre: emp.nombre })
  const res = NextResponse.json({ ok: true })
  res.cookies.set('preda_token', token, { httpOnly: true, maxAge: 28800, path: '/', sameSite: 'lax' })
  return res
}
