import { NextRequest, NextResponse } from 'next/server'
import { getCtx, esCtx, puedeProceso } from '@/lib/alcance'
const CAMPOS = ['nombre', 'empresa', 'cargo', 'deadline', 'estado', 'modalidad', 'ciudad', 'descripcion', 'requisitos', 'perfil']
const pick = (b: any) => { const o: any = {}; for (const k of CAMPOS) if (b[k] !== undefined) o[k] = b[k]; return o }
export async function GET(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const id = req.nextUrl.searchParams.get('id')
  if (id) {
    if (!(await puedeProceso(c, id))) return NextResponse.json({ error: 'Proceso no disponible' }, { status: 404 })
    const { data, error } = await c.db.from('preda_procesos').select('*').eq('id', id).single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ proceso: data })
  }
  let q = c.db.from('preda_procesos').select('*').eq('empresa_id', c.eid).order('created_at', { ascending: false })
  if (!c.jefe) q = q.eq('usuario_id', c.s.id)   // analista: solo los procesos que él creó
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ procesos: data || [], puede_recomendar: c.jefe })
}
export async function POST(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const body = await req.json()
  if (body.id) {
    if (!(await puedeProceso(c, body.id))) return NextResponse.json({ error: 'Proceso no disponible' }, { status: 403 })
    const { data, error } = await c.db.from('preda_procesos').update({ ...pick(body), updated_at: new Date().toISOString() }).eq('id', body.id).eq('empresa_id', c.eid).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ proceso: data })
  }
  if (!String(body.nombre || '').trim()) return NextResponse.json({ error: 'El nombre del proceso es obligatorio' }, { status: 400 })
  const { data, error } = await c.db.from('preda_procesos').insert({ ...pick(body), empresa_id: c.eid, usuario_id: c.s.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ proceso: data })
}
export async function DELETE(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const { id } = await req.json()
  if (!(await puedeProceso(c, id))) return NextResponse.json({ error: 'Proceso no disponible' }, { status: 403 })
  const { error } = await c.db.from('preda_procesos').delete().eq('id', id).eq('empresa_id', c.eid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
