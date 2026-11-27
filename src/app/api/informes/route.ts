import { NextRequest, NextResponse } from 'next/server'
import { getCtx, esCtx, puedeProceso, acotar } from '@/lib/alcance'
export async function GET(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const sp = req.nextUrl.searchParams
  const base = c.db.from('preda_informes').select('*').order('created_at', { ascending: false }).limit(200)
  let q = await acotar(c, base, { proceso_id: sp.get('proceso_id') })
  if (!q) return NextResponse.json({ error: 'Proceso no disponible' }, { status: 403 })
  if (sp.get('candidato_id')) q = q.eq('candidato_id', sp.get('candidato_id')!)
  if (sp.get('expediente_id')) q = q.eq('expediente_id', sp.get('expediente_id')!)
  if (sp.get('tipo')) q = q.eq('tipo', sp.get('tipo')!)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ informes: data || [] })
}
export async function POST(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const b = await req.json()
  if (b.proceso_id && !(await puedeProceso(c, b.proceso_id))) return NextResponse.json({ error: 'Proceso no disponible' }, { status: 403 })
  const row = { tipo: b.tipo, proceso_id: b.proceso_id || null, candidato_id: b.candidato_id || null, expediente_id: b.expediente_id || null, titulo: b.titulo || null, contenido: b.contenido || '', datos: b.datos || null, usuario_id: c.s.id, empresa_id: c.eid }
  const { data, error } = await c.db.from('preda_informes').insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ informe: data })
}
export async function DELETE(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const { id } = await req.json()
  const { data: cur } = await c.db.from('preda_informes').select('id,empresa_id,proceso_id,usuario_id').eq('id', id).single()
  const ok = cur && cur.empresa_id === c.eid && (c.jefe || cur.usuario_id === c.s.id || (cur.proceso_id && await puedeProceso(c, cur.proceso_id)))
  if (!ok) return NextResponse.json({ error: 'No disponible' }, { status: 403 })
  const { error } = await c.db.from('preda_informes').delete().eq('id', id).eq('empresa_id', c.eid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
