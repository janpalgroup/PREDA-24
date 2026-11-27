import { NextRequest, NextResponse } from 'next/server'
import { getCtx, esCtx } from '@/lib/alcance'
// Recomendar el CV de un candidato para OTROS procesos activos de la empresa (solo admin / supervisor / gerencia).
const norm = (t: string) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
function coincidencia(cv: string, proc: any) {
  const kws = Array.from(new Set(String(proc.requisitos || '').split(/[,;\n]/).map(k => norm(k).trim()).filter(k => k.length >= 2)))
  const txt = norm(cv)
  const ok = kws.filter(k => txt.includes(k)); const faltan = kws.filter(k => !txt.includes(k))
  return { total: kws.length, score: kws.length ? Math.round(ok.length / kws.length * 100) : 0, encontradas: ok.slice(0, 12), faltan: faltan.slice(0, 8) }
}
export async function POST(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  if (!c.jefe) return NextResponse.json({ error: 'Solo administración, supervisión y gerencia pueden recomendar CVs a otros procesos' }, { status: 403 })
  const b = await req.json()
  const { data: cand } = await c.db.from('preda_candidatos').select('*').eq('id', b.candidato_id).eq('empresa_id', c.eid).single()
  if (!cand) return NextResponse.json({ error: 'Candidato no disponible' }, { status: 404 })
  if (b.accion === 'sugerir') {
    const { data: procs } = await c.db.from('preda_procesos').select('id,nombre,cargo,requisitos,empresa,estado').eq('empresa_id', c.eid).eq('estado', 'activo').neq('id', cand.proceso_id || '00000000-0000-0000-0000-000000000000')
    const { data: ya } = await c.db.from('preda_candidatos').select('proceso_id').eq('empresa_id', c.eid).eq('origen_candidato_id', cand.id)
    const yaIds = (ya || []).map((x: any) => x.proceso_id)
    const lista = (procs || []).map((p: any) => ({ id: p.id, nombre: p.nombre, cargo: p.cargo, empresa: p.empresa, ya_derivado: yaIds.includes(p.id), ...coincidencia(cand.cv_text || '', p) })).sort((a: any, z: any) => z.score - a.score)
    return NextResponse.json({ sugerencias: lista, umbral: 50, tiene_cv: !!(cand.cv_text || '').trim() })
  }
  if (b.accion === 'derivar') {
    const { data: p } = await c.db.from('preda_procesos').select('id,nombre,cargo,estado,empresa_id').eq('id', b.proceso_id).single()
    if (!p || p.empresa_id !== c.eid || p.estado !== 'activo') return NextResponse.json({ error: 'El proceso destino no está activo' }, { status: 400 })
    const { data: dup } = await c.db.from('preda_candidatos').select('id').eq('empresa_id', c.eid).eq('proceso_id', p.id).eq('origen_candidato_id', cand.id).limit(1)
    if (dup && dup.length) return NextResponse.json({ error: 'Este candidato ya fue recomendado a ese proceso' }, { status: 409 })
    const { data: origen } = await c.db.from('preda_procesos').select('nombre').eq('id', cand.proceso_id).single()
    const a = b.analisis || {}
    const nota = 'Recomendado por ' + (c.s.nombre || 'jefatura') + ' desde el proceso "' + (origen?.nombre || 'otro') + '" el ' + new Date().toLocaleDateString('es-PE') + '.'
    const row: any = { nombre: cand.nombre, email: cand.email, telefono: cand.telefono, dni: cand.dni, cargo: p.cargo || cand.cargo, cv_text: cand.cv_text, archivo_cv: cand.archivo_cv, datos_dni: cand.datos_dni, proceso_id: p.id, empresa_id: c.eid, usuario_id: c.s.id, origen_candidato_id: cand.id, etapa: 'cv', fecha: new Date().toLocaleDateString('es-PE'),
      resultado: a.resultado ? nota + '\n\n' + a.resultado : nota, score: a.score ?? null, ats_score: a.ats_score ?? null, dimensiones: a.dimensiones ?? null, resumen: a.resumen ?? null, aprobado: (a.score || 0) >= 60 }
    const { data, error } = await c.db.from('preda_candidatos').insert(row).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ candidato: data })
  }
  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
