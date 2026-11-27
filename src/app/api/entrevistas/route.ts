import { NextRequest, NextResponse } from 'next/server'
import { getCtx, esCtx, puedeProceso, acotar } from '@/lib/alcance'
export async function GET(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const sp = req.nextUrl.searchParams
  const base = c.db.from('preda_entrevistas').select('*').order('updated_at', { ascending: false }).limit(300)
  let q = await acotar(c, base, { proceso_id: sp.get('proceso_id') })
  if (!q) return NextResponse.json({ error: 'Proceso no disponible' }, { status: 403 })
  if (sp.get('id')) q = q.eq('id', sp.get('id')!)
  if (sp.get('candidato_id')) q = q.eq('candidato_id', sp.get('candidato_id')!)
  if (sp.get('expediente_id')) q = q.eq('expediente_id', sp.get('expediente_id')!)
  if (sp.get('modo')) q = q.eq('modo', sp.get('modo')!)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entrevistas: data || [] })
}
export async function POST(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const b = await req.json()
  if (b.proceso_id && !(await puedeProceso(c, b.proceso_id))) return NextResponse.json({ error: 'Proceso no disponible' }, { status: 403 })
  const row: any = {
    proceso_id: b.proceso_id || null, candidato_id: b.candidato_id || null, candidato_nombre: b.candidato_nombre || null,
    cargo: b.cargo || null, tipo: b.tipo || null, preguntas: b.preguntas || [], informe: b.informe ?? null,
    perfil: b.perfil ?? null, puntaje: b.puntaje ?? null,
    expediente_id: b.expediente_id || null, modo: b.modo || 'seleccion', plaza: b.plaza ?? null, updated_at: new Date().toISOString(),
  }
  if (b.id) {
    const { data: cur } = await c.db.from('preda_entrevistas').select('id,empresa_id,proceso_id,usuario_id').eq('id', b.id).single()
    const ok = cur && cur.empresa_id === c.eid && (c.jefe || cur.usuario_id === c.s.id)
    if (!ok) return NextResponse.json({ error: 'Entrevista no disponible' }, { status: 403 })
    const { data, error } = await c.db.from('preda_entrevistas').update(row).eq('id', b.id).eq('empresa_id', c.eid).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ entrevista: data })
  }
  const { data, error } = await c.db.from('preda_entrevistas').insert({ ...row, usuario_id: c.s.id, empresa_id: c.eid }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entrevista: data })
}
export async function DELETE(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const { id } = await req.json()
  const { data: cur } = await c.db.from('preda_entrevistas').select('id,empresa_id,usuario_id').eq('id', id).single()
  if (!cur || cur.empresa_id !== c.eid || !(c.jefe || cur.usuario_id === c.s.id)) return NextResponse.json({ error: 'No disponible' }, { status: 403 })
  const { error } = await c.db.from('preda_entrevistas').delete().eq('id', id).eq('empresa_id', c.eid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
