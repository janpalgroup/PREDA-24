// Alcance de datos: cada consulta queda limitada a la EMPRESA de la sesion y, para analistas,
// a los procesos que ellos mismos crearon. Admin / supervisor / gerencia ven todos los procesos de la empresa.
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
export type Ctx = { s: any; eid: string; jefe: boolean; db: ReturnType<typeof supabaseAdmin> }
export const noAuth = () => NextResponse.json({ error: 'No autenticado' }, { status: 401 })
export const sinEmpresa = () => NextResponse.json({ error: 'Sesión sin empresa: cierra sesión y vuelve a ingresar eligiendo la empresa' }, { status: 401 })
export async function getCtx(): Promise<Ctx | NextResponse> {
  const s = await getSession(); if (!s) return noAuth()
  if (!s.empresa_id) return sinEmpresa()
  const db = supabaseAdmin()
  // Estado ACTUAL del usuario: rol, activo y empresas permitidas (los cambios del administrador rigen al instante)
  let r: any = await db.from('preda_usuarios').select('rol,activo,empresas').eq('id', s.id).single()
  if (r.error && /empresas/.test(r.error.message)) r = await db.from('preda_usuarios').select('rol,activo').eq('id', s.id).single()
  if (!r.data) return noAuth()
  if (r.data.activo === false) return NextResponse.json({ error: 'Usuario desactivado' }, { status: 401 })
  const rol = r.data.rol || s.rol
  if (rol !== 'admin' && Array.isArray(r.data.empresas) && !r.data.empresas.includes(s.empresa_id)) return NextResponse.json({ error: 'Sin acceso a esta empresa' }, { status: 403 })
  return { s: { ...s, rol }, eid: s.empresa_id, jefe: rol !== 'analista', db }
}
export const esCtx = (x: any): x is Ctx => !(x instanceof NextResponse)
// ids de procesos que el usuario puede ver (null = todos los de la empresa)
export async function procesosVisibles(c: Ctx): Promise<string[] | null> {
  if (c.jefe) return null
  const { data } = await c.db.from('preda_procesos').select('id').eq('empresa_id', c.eid).eq('usuario_id', c.s.id)
  return (data || []).map((x: any) => x.id)
}
// ¿puede el usuario operar sobre este proceso?
export async function puedeProceso(c: Ctx, procesoId: string | null | undefined): Promise<boolean> {
  if (!procesoId) return c.jefe
  const { data } = await c.db.from('preda_procesos').select('id,empresa_id,usuario_id').eq('id', procesoId).single()
  if (!data || data.empresa_id !== c.eid) return false
  return c.jefe || data.usuario_id === c.s.id
}
// Aplica el alcance a una consulta de una tabla con empresa_id y proceso_id
export async function acotar(c: Ctx, q: any, opts: { proceso_id?: string | null; propio?: boolean } = {}) {
  q = q.eq('empresa_id', c.eid)
  if (opts.proceso_id) {
    if (!(await puedeProceso(c, opts.proceso_id))) return null
    return q.eq('proceso_id', opts.proceso_id)
  }
  const ids = await procesosVisibles(c)
  if (ids) q = ids.length ? q.or('proceso_id.in.(' + ids.join(',') + '),usuario_id.eq.' + c.s.id) : q.eq('usuario_id', c.s.id)
  return q
}
