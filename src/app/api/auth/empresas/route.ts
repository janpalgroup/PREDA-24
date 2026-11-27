import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
// Publica: lista de empresas activas para el selector del login (solo id y nombre)
// Detecta si la clave configurada en Vercel es realmente la service_role (y no la anon)
function rolDeClave(): string {
  try { const p = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').split('.')[1]; return JSON.parse(Buffer.from(p, 'base64').toString()).role || '' } catch { return '' }
}
export async function GET() {
  const db = supabaseAdmin()
  const rol = rolDeClave()
  try {
    let r: any = await db.from('preda_empresas').select('id,nombre,activa').order('nombre')
    if (r.error) r = await db.from('preda_empresas').select('id,nombre').order('nombre')
    if (r.error) {
      const clave = rol && rol !== 'service_role' ? ' La variable SUPABASE_SERVICE_ROLE_KEY de Vercel contiene la clave "' + rol + '": debe ser la clave service_role (Supabase → Settings → API).' : ''
      return NextResponse.json({ empresas: [], error: 'No se pudo leer la tabla de empresas (' + r.error.message + ').' + clave + ' Ejecuta ejecutar_en_supabase_v20.sql en Supabase y recarga.' })
    }
    let rows = (r.data || []).filter((e: any) => e.activa !== false)
    if (!(r.data || []).length) {
      const ins = await db.from('preda_empresas').insert({ nombre: 'PREDA CONSULTORES' }).select('id,nombre').single()
      if (ins.data) rows = [ins.data]
    }
    // ¿ya se ejecutó la migración v20? (columna empresa_id en candidatos)
    const chk = await db.from('preda_candidatos').select('empresa_id').limit(1)
    const pendiente = !!chk.error && /empresa_id/.test(chk.error.message)
    return NextResponse.json({ empresas: rows.map((e: any) => ({ id: e.id, nombre: e.nombre })), migracion_pendiente: pendiente })
  } catch (e: any) { return NextResponse.json({ empresas: [], error: e.message }) }
}
