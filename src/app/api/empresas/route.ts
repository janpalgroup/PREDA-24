import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
// Administracion de empresas (solo admin). Las empresas NO se borran: se desactivan, para no perder datos.
export async function GET() {
  const s = await getSession(); if (!s || s.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { data, error } = await supabaseAdmin().from('preda_empresas').select('*').order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ empresas: data || [] })
}
export async function POST(req: NextRequest) {
  const s = await getSession(); if (!s || s.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json(); const db = supabaseAdmin()
  const campos: any = {}
  for (const k of ['nombre', 'ruc', 'sector', 'contacto', 'email', 'telefono', 'ciudad', 'notas']) if (b[k] !== undefined) campos[k] = String(b[k]).trim()
  if (b.activa !== undefined) campos.activa = !!b.activa
  if (b.id) {
    if (campos.nombre === '') return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    const { data, error } = await db.from('preda_empresas').update(campos).eq('id', b.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ empresa: data })
  }
  if (!campos.nombre) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  const { data, error } = await db.from('preda_empresas').insert({ ...campos, usuario_id: s.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ empresa: data })
}
