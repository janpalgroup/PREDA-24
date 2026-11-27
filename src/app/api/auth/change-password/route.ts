import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'
export async function POST(req: NextRequest) {
  const s = await getSession(); if (!s) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { current, nueva } = await req.json()
  if (!current || !nueva) return NextResponse.json({ error: 'Completa los campos' }, { status: 400 })
  if (String(nueva).length < 8) return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  if (nueva === current) return NextResponse.json({ error: 'La nueva contraseña debe ser distinta de la actual' }, { status: 400 })
  const { data } = await supabaseAdmin().from('preda_usuarios').select('password').eq('id', s.id).single()
  if (!data) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  const ok = await bcrypt.compare(current, data.password)
  if (!ok) return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 401 })
  const hash = await bcrypt.hash(nueva, 10)
  const { error } = await supabaseAdmin().from('preda_usuarios').update({ password: hash, updated_at: new Date().toISOString() }).eq('id', s.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
