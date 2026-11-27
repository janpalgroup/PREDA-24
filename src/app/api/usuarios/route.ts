import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { TODAS } from '@/lib/permisos'
import bcrypt from 'bcryptjs'
const ROLES = ['admin', 'supervisor', 'gerencia', 'analista']
export async function GET() {
  const s = await getSession(); if (!s || s.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = supabaseAdmin()
  let r: any = await db.from('preda_usuarios').select('id,nombre,email,rol,activo,permisos,empresas,created_at').order('created_at', { ascending: false })
  if (r.error) r = await db.from('preda_usuarios').select('id,nombre,email,rol,activo,created_at').order('created_at', { ascending: false })
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  return NextResponse.json({ usuarios: r.data || [] })
}
export async function POST(req: NextRequest) {
  const s = await getSession(); if (!s || s.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const body = await req.json()
  const db = supabaseAdmin()
  if (body.password !== undefined && body.password !== '' && String(body.password).length < 8) return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  if (body.rol !== undefined && !ROLES.includes(body.rol)) return NextResponse.json({ error: 'Rol invalido' }, { status: 400 })
  if (body.permisos !== undefined && body.permisos !== null) {
    if (!Array.isArray(body.permisos)) return NextResponse.json({ error: 'permisos debe ser una lista' }, { status: 400 })
    body.permisos = body.permisos.filter((k: any) => TODAS.includes(k))
  }
  if (body.empresas !== undefined && body.empresas !== null) {
    if (!Array.isArray(body.empresas)) return NextResponse.json({ error: 'empresas debe ser una lista' }, { status: 400 })
    const { data: ex } = await db.from('preda_empresas').select('id'); const ok = (ex || []).map((e: any) => e.id)
    body.empresas = body.empresas.filter((x: any) => ok.includes(x))
  }
  if (body.id) {
    const { id, password, ...u } = body
    if (id === s.id && (u.activo === false || (u.rol && u.rol !== 'admin'))) return NextResponse.json({ error: 'No puedes desactivarte ni quitarte el rol de administrador a ti mismo' }, { status: 400 })
    const updates: any = { ...u, updated_at: new Date().toISOString() }
    if (password) updates.password = await bcrypt.hash(password, 10)
    let r: any = await db.from('preda_usuarios').update(updates).eq('id', id).select('id,nombre,email,rol,activo,permisos,empresas').single()
    if (r.error && /permisos|empresas/.test(r.error.message)) {
      return NextResponse.json({ error: 'Falta una columna: ejecuta ejecutar_en_supabase_v20.sql en Supabase.' }, { status: 500 })
    }
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
    return NextResponse.json({ usuario: r.data })
  }
  if (!body.nombre || !body.email) return NextResponse.json({ error: 'Nombre y email requeridos' }, { status: 400 })
  const hash = await bcrypt.hash(body.password || 'Preda2025!', 10)
  const row: any = { nombre: body.nombre, email: String(body.email).toLowerCase().trim(), rol: body.rol || 'analista', password: hash }
  if (body.permisos !== undefined) row.permisos = body.permisos
  if (body.empresas !== undefined) row.empresas = body.empresas
  const { data, error } = await db.from('preda_usuarios').insert(row).select('id,nombre,email,rol,activo').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ usuario: data })
}
