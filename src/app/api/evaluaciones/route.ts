import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getCtx, esCtx, puedeProceso, acotar } from '@/lib/alcance'
import { construir, CATALOGO } from '@/lib/pruebas'
export async function GET(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const pid = req.nextUrl.searchParams.get('proceso_id'); const cid = req.nextUrl.searchParams.get('candidato_id')
  let q = await acotar(c, c.db.from('preda_evaluaciones').select('id,token,candidato_id,proceso_id,titulo,estado,resultados,ficha,analisis_ia,expira,created_at,completado_at,pruebas').order('created_at', { ascending: false }), { proceso_id: pid })
  if (!q) return NextResponse.json({ error: 'Proceso no disponible' }, { status: 403 })
  if (cid) q = q.eq('candidato_id', cid)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: /preda_evaluaciones/.test(error.message) ? 'Falta ejecutar ejecutar_en_supabase_v19.sql en Supabase' : error.message }, { status: 500 })
  // al panel interno solo se le envian titulos/ids de pruebas (no las claves)
  const rows = (data || []).map((r: any) => ({ ...r, pruebas: (r.pruebas || []).map((p: any) => ({ id: p.id, titulo: p.titulo, tipo: p.tipo, n: (p.items || []).length })) }))
  return NextResponse.json({ evaluaciones: rows })
}
export async function POST(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const b = await req.json()
  const ids: string[] = (b.ids || []).filter((x: string) => CATALOGO.some(c => c.id === x))
  const cands: string[] = b.candidatos || []
  if (!ids.length) return NextResponse.json({ error: 'Selecciona al menos una prueba o formulario' }, { status: 400 })
  if (!cands.length) return NextResponse.json({ error: 'Selecciona al menos un candidato' }, { status: 400 })
  const dias = Math.min(Math.max(Number(b.dias) || 14, 1), 60)
  if (!b.proceso_id || !(await puedeProceso(c, b.proceso_id))) return NextResponse.json({ error: 'Proceso no disponible' }, { status: 403 })
  const db = c.db
  const { data: cs } = await db.from('preda_candidatos').select('id,nombre').in('id', cands).eq('empresa_id', c.eid).eq('proceso_id', b.proceso_id)
  const out: any[] = []
  for (const cd of cs || []) {
    const seed = Math.floor(Math.random() * 1e9)
    const pruebas = construir(ids, b.ia || {}, seed)
    if (!pruebas.length) return NextResponse.json({ error: 'Las pruebas con IA no tienen preguntas: genera y revisa las preguntas primero' }, { status: 400 })
    const token = randomBytes(18).toString('base64url')
    const row = { token, candidato_id: cd.id, proceso_id: b.proceso_id || null, titulo: b.titulo || 'Evaluación', pruebas, estado: 'pendiente', empresa_id: c.eid, expira: new Date(Date.now() + dias * 86400000).toISOString(), created_by: c.s.id }
    const { data, error } = await db.from('preda_evaluaciones').insert(row).select('id,token,candidato_id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    out.push({ ...data, nombre: cd.nombre })
  }
  return NextResponse.json({ creadas: out })
}
// Solo se elimina cuando el usuario lo pide manualmente
export async function DELETE(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const id = req.nextUrl.searchParams.get('id'); if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  const { data: cur } = await c.db.from('preda_evaluaciones').select('id,empresa_id,proceso_id,created_by').eq('id', id).single()
  if (!cur || cur.empresa_id !== c.eid || !(c.jefe || cur.created_by === c.s.id)) return NextResponse.json({ error: 'No disponible' }, { status: 403 })
  const { error } = await c.db.from('preda_evaluaciones').delete().eq('id', id).eq('empresa_id', c.eid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
