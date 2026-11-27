import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'
export async function POST(req: NextRequest) {
  const { email, password, empresa_id } = await req.json()
  try {
    const db = supabaseAdmin()
    const { data, error } = await db.from('preda_usuarios').select('*').eq('email', String(email || '').toLowerCase().trim()).eq('activo', true).single()
    if (error || !data) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 })
    const ok = await bcrypt.compare(password || '', data.password)
    if (!ok) return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
    if (!empresa_id) return NextResponse.json({ error: 'Selecciona la empresa' }, { status: 400 })
    let er: any = await db.from('preda_empresas').select('id,nombre,activa').eq('id', empresa_id).single()
    if (er.error) er = await db.from('preda_empresas').select('id,nombre').eq('id', empresa_id).single()
    const emp = er.data
    if (!emp || emp.activa === false) return NextResponse.json({ error: 'Empresa no disponible' }, { status: 403 })
    if (data.rol !== 'admin' && !(Array.isArray(data.empresas) && data.empresas.includes(emp.id)))
      return NextResponse.json({ error: 'No tienes acceso a la empresa "' + emp.nombre + '". Pide al administrador que te la asigne.' }, { status: 403 })
    const token = await createToken({ id: data.id, email: data.email, nombre: data.nombre, rol: data.rol, empresa_id: emp.id, empresa_nombre: emp.nombre })
    const res = NextResponse.json({ ok: true, user: { id: data.id, email: data.email, nombre: data.nombre, rol: data.rol, empresa: emp.nombre } })
    res.cookies.set('preda_token', token, { httpOnly: true, maxAge: 28800, path: '/', sameSite: 'lax' })
    return res
  } catch (e: any) { return NextResponse.json({ error: 'Error BD: ' + e.message + '. Ejecuta ejecutar_en_supabase_v20.sql' }, { status: 500 }) }
}
