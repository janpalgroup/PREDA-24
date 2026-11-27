import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { efectivos, tieneModulo, claveDeRuta } from '@/lib/permisos'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'preda-secret-2025')
type U = { rol: string; activo: boolean; permisos: any }
const cache = new Map<string, { t: number; u: U }>()

// Lee el estado ACTUAL del usuario (rol, activo, permisos) para que los cambios del administrador rijan enseguida.
async function usuarioFresco(id: string): Promise<U | null | 'borrado'> {
  const hit = cache.get(id)
  if (hit && Date.now() - hit.t < 15000) return hit.u
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key) return null
  for (const cols of ['rol,activo,permisos', 'rol,activo']) {
    try {
      const r = await fetch(base + '/rest/v1/preda_usuarios?id=eq.' + encodeURIComponent(id) + '&select=' + cols, { headers: { apikey: key, Authorization: 'Bearer ' + key }, signal: AbortSignal.timeout(2500), cache: 'no-store' })
      if (!r.ok) continue
      const rows = await r.json()
      if (!Array.isArray(rows)) continue
      if (rows.length === 0) return 'borrado'
      const u: U = { rol: rows[0].rol, activo: rows[0].activo !== false, permisos: rows[0].permisos ?? null }
      cache.set(id, { t: Date.now(), u }); return u
    } catch {}
  }
  return null
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isApi = path.startsWith('/api/')
  let id = '', rolJwt = '', emp = ''
  try {
    const t = req.cookies.get('preda_token')?.value
    if (t) { const { payload } = await jwtVerify(t, SECRET); id = String((payload as any).id || ''); rolJwt = String((payload as any).rol || ''); emp = String((payload as any).empresa_id || '') }
  } catch {}
  const salir = () => { const res = NextResponse.redirect(new URL('/', req.url)); res.cookies.delete('preda_token'); return res }
  const sinPermiso = () => isApi ? NextResponse.json({ error: 'Sin permiso para este modulo' }, { status: 403 }) : NextResponse.redirect(new URL('/modulos', req.url))
  if (!rolJwt || !id || !emp) return isApi ? NextResponse.json({ error: 'No autenticado' }, { status: 401 }) : NextResponse.redirect(new URL('/', req.url))

  let rol = rolJwt, permisos: any = null
  const u = await usuarioFresco(id)
  if (u === 'borrado') return isApi ? NextResponse.json({ error: 'Usuario inexistente' }, { status: 401 }) : salir()
  if (u) {
    if (!u.activo) return isApi ? NextResponse.json({ error: 'Usuario desactivado' }, { status: 401 }) : salir()
    rol = u.rol; permisos = u.permisos
  }
  const ef = efectivos(rol, permisos)

  if (path.startsWith('/administracion') || path.startsWith('/api/config-sistema')) return rol === 'admin' ? NextResponse.next() : sinPermiso()
  if (path.startsWith('/seleccion') || path.startsWith('/empleabilidad')) {
    const k = claveDeRuta(path)
    return k && ef.includes(k) ? NextResponse.next() : sinPermiso()
  }
  // APIs propias de Empleabilidad
  return tieneModulo(ef, 'empleabilidad') ? NextResponse.next() : sinPermiso()
}
export const config = {
  matcher: [
    '/seleccion/:path*', '/empleabilidad/:path*', '/administracion/:path*',
    '/api/expediente/:path*', '/api/postulaciones/:path*', '/api/seguimiento/:path*',
    '/api/buscar-ofertas/:path*', '/api/alertas/:path*', '/api/cv-download/:path*', '/api/config-sistema/:path*',
  ],
}
