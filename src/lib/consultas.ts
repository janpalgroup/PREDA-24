// Consulta de DNI (RENIEC) y RUC (SUNAT) mediante APIs gratuitas de terceros.
// Proveedor principal: Decolecta (antes apis.net.pe) -> https://decolecta.com (token gratuito al registrarse).
import { supabaseAdmin } from '@/lib/supabase'
export type Falla = { fuente: string; motivo: string }
export async function getTokenConsulta(): Promise<string> {
  let raw = process.env.DECOLECTA_TOKEN || ''
  if (!raw) {
    try { const { data } = await supabaseAdmin().from('preda_config').select('valor').eq('clave', 'decolecta_token').single(); if (data?.valor) raw = data.valor } catch {}
  }
  return raw.replace(/^Bearer\s+/i, '').replace(/\s+/g, '').trim()
}
async function pedir(url: string, token: string, ms = 8000): Promise<any> {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, signal: AbortSignal.timeout(ms), cache: 'no-store' })
  const txt = await res.text(); let j: any = null; try { j = JSON.parse(txt) } catch {}
  if (!res.ok) {
    const msg = j?.message || j?.error || txt.substring(0, 120)
    throw new Error('HTTP ' + res.status + (res.status === 401 || res.status === 403 ? ' (token inválido o vencido)' : res.status === 429 ? ' (se agotó la cuota gratuita)' : res.status === 404 ? ' (no encontrado)' : '') + (msg ? ': ' + msg : ''))
  }
  if (!j) throw new Error('Respuesta no válida')
  return j
}
const t = (x: any) => String(x ?? '').trim()
export function mapDni(d: any, fuente: string) {
  const o = d?.data && typeof d.data === 'object' ? d.data : d
  const nombres = t(o.first_name ?? o.nombres), pat = t(o.first_last_name ?? o.apellidoPaterno ?? o.apellido_paterno), mat = t(o.second_last_name ?? o.apellidoMaterno ?? o.apellido_materno)
  let completo = [nombres, pat, mat].filter(Boolean).join(' ')
  if (!completo) completo = t(o.nombreCompleto ?? o.nombre_completo ?? o.full_name ?? o.nombre)
  if (!completo) throw new Error('El servicio respondió sin datos para ese DNI')
  return { success: true, nombre_completo: completo, nombres, apellido_paterno: pat, apellido_materno: mat, fuente }
}
export function mapRuc(d: any, ruc: string, fuente: string) {
  const o = d?.data && typeof d.data === 'object' ? d.data : d
  const rs = t(o.razon_social ?? o.razonSocial ?? o.nombre ?? o.ddpRazonSocial)
  if (!rs) throw new Error('El servicio respondió sin datos para ese RUC')
  return { success: true, tipo: 'ruc', ruc, razon_social: rs, estado: t(o.estado ?? o.ddpEstado), condicion: t(o.condicion ?? o.ddpCondicion), direccion: t(o.direccion ?? o.domicilioFiscal ?? o.ddpDireccion), actividad: t(o.actividad_economica ?? o.actividadEconomica), fuentes: [fuente] }
}
export async function consultarDni(dni: string, token: string) {
  const fallas: Falla[] = []
  const intentos: [string, () => Promise<any>][] = []
  if (token) {
    intentos.push(['RENIEC (Decolecta)', async () => mapDni(await pedir('https://api.decolecta.com/v1/reniec/dni?numero=' + dni, token), 'RENIEC (Decolecta)')])
    intentos.push(['RENIEC (apis.net.pe)', async () => mapDni(await pedir('https://api.apis.net.pe/v2/reniec/dni?numero=' + dni, token), 'RENIEC (apis.net.pe)')])
  }
  intentos.push(['RENIEC (consulta.pe)', async () => mapDni(await pedir('https://api.consulta.pe/reniec/dni/' + dni, ''), 'RENIEC (consulta.pe)')])
  for (const [fuente, fn] of intentos) { try { return { ok: await fn(), fallas } } catch (e: any) { fallas.push({ fuente, motivo: e.name === 'TimeoutError' ? 'tiempo agotado' : e.message }) } }
  return { ok: null, fallas }
}
export async function consultarRuc(ruc: string, token: string) {
  const fallas: Falla[] = []
  const intentos: [string, () => Promise<any>][] = []
  if (token) {
    intentos.push(['SUNAT (Decolecta)', async () => mapRuc(await pedir('https://api.decolecta.com/v1/sunat/ruc?numero=' + ruc, token), ruc, 'SUNAT (Decolecta)')])
    intentos.push(['SUNAT (apis.net.pe)', async () => mapRuc(await pedir('https://api.apis.net.pe/v2/sunat/ruc?numero=' + ruc, token), ruc, 'SUNAT (apis.net.pe)')])
  }
  intentos.push(['SUNAT (consulta pública)', async () => mapRuc(await pedir('https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/jaxrs/consultaRuc/obtenerRuc?ruc=' + ruc, '', 9000), ruc, 'SUNAT (consulta pública)')])
  for (const [fuente, fn] of intentos) { try { return { ok: await fn(), fallas } } catch (e: any) { fallas.push({ fuente, motivo: e.name === 'TimeoutError' ? 'tiempo agotado' : e.message }) } }
  return { ok: null, fallas }
}
