import { NextRequest, NextResponse } from 'next/server'
import { getCtx, esCtx, puedeProceso, acotar, Ctx } from '@/lib/alcance'
const CAMPOS = ['nombre', 'email', 'telefono', 'dni', 'cargo', 'score', 'ats_score', 'etapa', 'cv_text', 'resultado', 'cv_mejorado', 'datos_dni', 'aprobado', 'fecha', 'dimensiones', 'resumen', 'archivo_cv', 'proceso_id', 'ultima_interaccion', 'origen_candidato_id']
const pick = (b: any) => { const o: any = {}; for (const k of CAMPOS) if (b[k] !== undefined) o[k] = b[k]; return o }
async function puedeCand(c: Ctx, cand: any) {
  if (!cand || cand.empresa_id !== c.eid) return false
  if (c.jefe) return true
  return cand.proceso_id ? puedeProceso(c, cand.proceso_id) : cand.usuario_id === c.s.id
}
export async function GET(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const proceso_id = req.nextUrl.searchParams.get('proceso_id'); const id = req.nextUrl.searchParams.get('id')
  if (id) {
    const { data, error } = await c.db.from('preda_candidatos').select('*').eq('id', id).single()
    if (error || !(await puedeCand(c, data))) return NextResponse.json({ error: 'Candidato no disponible' }, { status: 404 })
    return NextResponse.json({ candidato: data })
  }
  const base = c.db.from('preda_candidatos').select('*').order('created_at', { ascending: false })
  const q = await acotar(c, base, { proceso_id })
  if (!q) return NextResponse.json({ error: 'Proceso no disponible' }, { status: 403 })
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ candidatos: data || [] })
}
export async function POST(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const body = await req.json()
  if (body.id) {
    const { data: cur } = await c.db.from('preda_candidatos').select('id,empresa_id,proceso_id,usuario_id').eq('id', body.id).single()
    if (!(await puedeCand(c, cur))) return NextResponse.json({ error: 'Candidato no disponible' }, { status: 403 })
    const up = pick(body)
    if (up.proceso_id && up.proceso_id !== cur!.proceso_id && !(await puedeProceso(c, up.proceso_id))) return NextResponse.json({ error: 'Proceso destino no disponible' }, { status: 403 })
    const { data, error } = await c.db.from('preda_candidatos').update({ ...up, updated_at: new Date().toISOString() }).eq('id', body.id).eq('empresa_id', c.eid).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ candidato: data })
  }
  if (!body.proceso_id) return NextResponse.json({ error: 'Elige el proceso al que pertenece el candidato' }, { status: 400 })
  if (!(await puedeProceso(c, body.proceso_id))) return NextResponse.json({ error: 'Proceso no disponible' }, { status: 403 })
  if (!String(body.nombre || '').trim()) return NextResponse.json({ error: 'Falta el nombre del candidato' }, { status: 400 })
  const { data, error } = await c.db.from('preda_candidatos').insert({ ...pick(body), empresa_id: c.eid, usuario_id: c.s.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ candidato: data })
}
export async function DELETE(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const { id } = await req.json()
  const { data: cur } = await c.db.from('preda_candidatos').select('id,empresa_id,proceso_id,usuario_id').eq('id', id).single()
  if (!(await puedeCand(c, cur))) return NextResponse.json({ error: 'Candidato no disponible' }, { status: 403 })
  const { error } = await c.db.from('preda_candidatos').delete().eq('id', id).eq('empresa_id', c.eid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
