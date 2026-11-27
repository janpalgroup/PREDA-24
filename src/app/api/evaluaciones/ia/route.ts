import { NextRequest, NextResponse } from 'next/server'
import { getCtx, esCtx } from '@/lib/alcance'
import { groqChat, getGroqKey } from '@/lib/groq'
import { supabaseAdmin } from '@/lib/supabase'
import { CATALOGO, extraerJson, normalizarMcq, normalizarAbiertas, DIM_NOMBRES } from '@/lib/pruebas'
const SYS = 'Eres un psicólogo organizacional peruano experto en selección de personal. Respondes en español y SOLO con lo que se te pide.'
export async function POST(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const b = await req.json(); const key = await getGroqKey()
  if (!key.startsWith('gsk_')) return NextResponse.json({ error: 'Groq API Key no configurada (Administración → Configuración)' }, { status: 500 })
  try {
    if (b.accion === 'recomendar') {
      const lista = CATALOGO.map(c => c.id + ' = ' + c.titulo).join('\n')
      const p = 'Cargo: ' + (b.cargo || '') + '\nResponsabilidades / requisitos:\n' + String(b.responsabilidades || '').substring(0, 2500) +
        '\n\nPruebas disponibles (usa SOLO estos id):\n' + lista +
        '\n\nRecomienda entre 3 y 6 pruebas pertinentes para este cargo (la ficha casi siempre va). Para cada una da un motivo de una línea ligado a las responsabilidades.' +
        '\nResponde SOLO un JSON: {"resumen":"perfil del cargo en 1 línea","recomendadas":[{"id":"...","motivo":"..."}]}'
      const j = extraerJson(await groqChat([{ role: 'system', content: SYS }, { role: 'user', content: p }], 1200, key))
      const rec = (j?.recomendadas || []).filter((r: any) => CATALOGO.some(c => c.id === r?.id)).map((r: any) => ({ id: r.id, motivo: String(r.motivo || '').replace(/\*\*/g, '') }))
      if (!rec.length) return NextResponse.json({ error: 'La IA no devolvió recomendaciones válidas. Intenta de nuevo.' }, { status: 502 })
      return NextResponse.json({ resumen: String(j?.resumen || ''), recomendadas: rec })
    }
    if (b.accion === 'generar') {
      const out: Record<string, any> = {}; const err: string[] = []
      const ctx = 'Cargo: ' + (b.cargo || '') + '\nResponsabilidades / requisitos:\n' + String(b.responsabilidades || '').substring(0, 2500)
      for (const id of (b.ids || [])) {
        let p = ''
        if (id === 'situacional') p = ctx + '\n\nCrea 6 situaciones laborales breves y realistas de este cargo (Perú). Cada una con 4 acciones posibles, de las cuales exactamente una es la más adecuada. Varía la posición de la correcta.\nSOLO JSON: [{"q":"situación y pregunta","o":["a","b","c","d"],"correcta":0,"exp":"por qué"}] (correcta = índice 0-3).'
        else if (id === 'tecnica') p = ctx + '\n\nCrea 10 preguntas técnicas de alternativa múltiple sobre conocimientos necesarios para este cargo, nivel acorde al puesto. Una sola correcta, 3 distractores plausibles. Varía la posición de la correcta.\nSOLO JSON: [{"q":"...","o":["a","b","c","d"],"correcta":0,"exp":"..."}] (correcta = índice 0-3).'
        else if (id === 'caso') p = ctx + '\n\nCrea 2 casos prácticos de respuesta escrita para este cargo, con datos concretos. Incluye criterios de evaluación.\nSOLO JSON: [{"q":"enunciado del caso","criterios":["criterio 1","criterio 2","criterio 3"]}]'
        else continue
        try {
          const j = extraerJson(await groqChat([{ role: 'system', content: SYS }, { role: 'user', content: p }], 3500, key))
          const items = id === 'caso' ? normalizarAbiertas(j) : normalizarMcq(j)
          if (items.length) out[id] = items; else err.push(id)
        } catch (e: any) { err.push(id + ': ' + e.message) }
      }
      return NextResponse.json({ ia: out, errores: err })
    }
    if (b.accion === 'analizar') {
      const { data: ev } = await supabaseAdmin().from('preda_evaluaciones').select('*').eq('id', b.id).eq('empresa_id', c.eid).single()
      if (!ev || !(c.jefe || ev.created_by === c.s.id)) return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 })
      const { data: cand } = await supabaseAdmin().from('preda_candidatos').select('nombre,cargo').eq('id', ev.candidato_id).single()
      let t = 'Candidato: ' + (cand?.nombre || '') + ' | Cargo: ' + (b.cargo || cand?.cargo || '') + '\n'
      const R = ev.resultados || {}
      for (const p of ev.pruebas || []) {
        const r = R[p.id]; if (!r) { t += '\n[' + p.titulo + '] no completada\n'; continue }
        if (p.tipo === 'likert') t += '\n[' + p.titulo + '] ' + Object.keys(r.dimensiones || {}).map(d => (DIM_NOMBRES[d] || d) + ' ' + r.dimensiones[d] + '/100').join(', ') + (r.alerta_deseabilidad ? ' | ALERTA: respuestas posiblemente socialmente deseables' : '') + '\n'
        else if (p.tipo === 'mcq') t += '\n[' + p.titulo + '] ' + r.correctas + '/' + r.total + ' correctas (' + r.porcentaje + '%)\n'
        else if (p.tipo === 'abierta') {
          const resp = (ev.respuestas || {})[p.id] || []
          t += '\n[' + p.titulo + ']\n' + (p.items || []).map((it: any, i: number) => 'Caso: ' + it.q + '\nCriterios: ' + (it.exp || '') + '\nRespuesta: ' + String(resp[i] || '(sin respuesta)').substring(0, 1500)).join('\n---\n') + '\n'
        }
      }
      if (ev.ficha) t += '\nFicha: pretensión ' + (ev.ficha.pretension || '-') + ', disponibilidad ' + (ev.ficha.disponibilidad || '-') + ', nivel ' + (ev.ficha.nivel_educ || '-') + '\n'
      const p = t + '\nEscribe un informe breve para RR.HH. (máx. 350 palabras) en español con: 1) Resumen de resultados, 2) Fortalezas, 3) Aspectos a validar en entrevista, 4) Evaluación de los casos abiertos si los hay (puntaje 0-10 por caso con justificación), 5) Recomendación (avanzar / avanzar con reservas / no avanzar). Aclara que son pruebas sin supervisión y que los resultados son orientativos, no un diagnóstico psicológico. No inventes datos que no estén arriba.'
      const informe = (await groqChat([{ role: 'system', content: SYS }, { role: 'user', content: p }], 1800, key)).replace(/\*\*/g, '')
      await supabaseAdmin().from('preda_evaluaciones').update({ analisis_ia: informe }).eq('id', ev.id)
      await supabaseAdmin().from('preda_informes').insert({ tipo: 'evaluacion', proceso_id: ev.proceso_id, candidato_id: ev.candidato_id, empresa_id: c.eid, usuario_id: c.s.id, titulo: 'Informe de pruebas — ' + (cand?.nombre || ''), contenido: informe, datos: { resultados: R } })
      return NextResponse.json({ analisis: informe })
    }
    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
