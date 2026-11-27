import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { publica, puntuar, FICHA, FICHA_CAMPOS } from '@/lib/pruebas'
// Ruta PUBLICA (el candidato no inicia sesion): el acceso lo da el token unico y secreto del enlace.
export const dynamic = 'force-dynamic'
const bad = (m: string, st = 400) => NextResponse.json({ error: m }, { status: st })
async function cargar(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null
  const { data } = await supabaseAdmin().from('preda_evaluaciones').select('*').eq('token', token).single()
  return data
}
export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const ev = await cargar(params.token); if (!ev) return bad('Enlace no válido', 404)
  if (ev.expira && new Date(ev.expira).getTime() < Date.now()) return bad('Este enlace venció. Solicita uno nuevo a RR.HH.', 410)
  const { data: c } = await supabaseAdmin().from('preda_candidatos').select('nombre').eq('id', ev.candidato_id).single()
  const hechas = Object.keys(ev.resultados || {})
  const prefill = ev.ficha ? ev.ficha : (ev.respuestas || {}).ficha || {}
  return NextResponse.json({ titulo: ev.titulo, nombre: c?.nombre || '', estado: ev.estado, completadas: hechas, pruebas: (ev.pruebas || []).map(publica), ficha_def: FICHA, ficha_prev: prefill })
}
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const ev = await cargar(params.token); if (!ev) return bad('Enlace no válido', 404)
  if (ev.expira && new Date(ev.expira).getTime() < Date.now()) return bad('Este enlace venció', 410)
  const b = await req.json().catch(() => ({}))
  const prueba = (ev.pruebas || []).find((p: any) => p.id === b.prueba_id); if (!prueba) return bad('Prueba no encontrada')
  const resultados = { ...(ev.resultados || {}) }
  if (resultados[prueba.id]) return bad('Esta prueba ya fue enviada y no puede modificarse', 409)
  let resp = b.respuestas
  if (prueba.tipo === 'ficha') {
    const clean: any = {}; FICHA_CAMPOS.forEach(c => { const v = resp?.[c.k]; clean[c.k] = c.t === 'check' ? v === true : String(v ?? '').substring(0, 400).trim() }); resp = clean
  } else if (prueba.tipo === 'abierta') resp = (Array.isArray(resp) ? resp : []).slice(0, prueba.items.length).map((x: any) => String(x || '').substring(0, 4000))
  else resp = (Array.isArray(resp) ? resp : []).slice(0, prueba.items.length).map((x: any) => (x === null || x === '' || x === undefined) ? -1 : Number(x))
  const res = puntuar(prueba, resp)
  if (prueba.tipo === 'ficha' && !res.completa) return NextResponse.json({ error: 'Faltan campos obligatorios', faltan: res.faltan }, { status: 422 })
  resultados[prueba.id] = res
  const respuestas = { ...(ev.respuestas || {}), [prueba.id]: resp }
  const todas = (ev.pruebas || []).every((p: any) => resultados[p.id])
  const upd: any = { resultados, respuestas, estado: todas ? 'completada' : 'en_curso' }
  if (todas) upd.completado_at = new Date().toISOString()
  if (prueba.tipo === 'ficha') upd.ficha = resp
  const db = supabaseAdmin()
  const { error } = await db.from('preda_evaluaciones').update(upd).eq('id', ev.id)
  if (error) return bad('No se pudo guardar. Intenta de nuevo.', 500)
  // Completa datos del candidato solo si estaban vacios (nunca pisa lo que RR.HH. ya tenia)
  if (prueba.tipo === 'ficha' && ev.candidato_id) {
    try {
      const { data: c } = await db.from('preda_candidatos').select('dni,telefono,email').eq('id', ev.candidato_id).single()
      const p: any = {}
      if (c && !c.dni && resp.dni) p.dni = resp.dni; if (c && !c.telefono && resp.telefono) p.telefono = resp.telefono; if (c && !c.email && resp.email) p.email = resp.email
      if (Object.keys(p).length) await db.from('preda_candidatos').update(p).eq('id', ev.candidato_id)
    } catch {}
  }
  // El candidato no ve puntajes ni claves
  return NextResponse.json({ ok: true, completada: todas })
}
