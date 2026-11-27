import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { groqChat } from '@/lib/groq'
import { supabaseAdmin } from '@/lib/supabase'
import { clasificarLink, limpiarUrl, verificarLink, enParalelo } from '@/lib/ofertas'

export const runtime = 'nodejs'
export const maxDuration = 60

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function searchJooble(cargo: string, ub: string, key: string, sector: string): Promise<any[]> {
  const kws = sector === 'estatal' ? [cargo + ' convocatoria CAS', cargo + ' entidad publica'] : [cargo]
  const all: any[] = []
  for (const kw of kws) {
    try {
      const r = await fetch('https://jooble.org/api/' + key, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords: kw, location: ub, resultonpage: 25, page: 1 }), signal: AbortSignal.timeout(8000) })
      if (!r.ok) continue
      const d = await r.json()
      ;(d.jobs || []).forEach((j: any) => all.push(j))
    } catch {}
    await sleep(80)
  }
  return all
}

function consultasGoogle(cargo: string, city: string, sector: string): string[] {
  const c = '"' + cargo + '"'
  if (sector === 'estatal') return [
    c + ' ' + city + ' convocatoria CAS (site:gob.pe OR site:servir.gob.pe)',
    c + ' proceso de seleccion bases (site:gob.pe) filetype:pdf',
  ]
  return [
    c + ' ' + city + ' (site:pe.computrabajo.com/ofertas-de-trabajo OR site:bumeran.com.pe/empleos OR site:laborum.pe/empleos)',
    c + ' ' + city + ' (site:linkedin.com/jobs/view OR site:pe.indeed.com/viewjob OR site:aptitus.com/ofertas-de-empleo)',
  ]
}

async function searchGoogle(qs: string[], gk: string, cx: string): Promise<any[]> {
  const all: any[] = []
  for (const q of qs) {
    try {
      const r = await fetch('https://www.googleapis.com/customsearch/v1?key=' + gk + '&cx=' + cx + '&q=' + encodeURIComponent(q) + '&num=10&dateRestrict=d45', { signal: AbortSignal.timeout(8000) })
      const d = await r.json()
      if (d.error) console.error('Google CSE:', d.error.message)
      ;(d.items || []).forEach((x: any) => all.push(x))
    } catch (e: any) { console.error('Google:', e.message) }
    await sleep(100)
  }
  return all
}

function modalidadDe(txt: string): string {
  if (/remoto|remote|home.?office|teletrabajo/i.test(txt)) return 'Remoto'
  if (/h[íi]brido|hybrid|semipresencial/i.test(txt)) return 'Hibrido'
  return 'Presencial'
}

function ofertaDeGoogle(item: any, cargo: string, sector: string, c: ReturnType<typeof clasificarLink>) {
  const snip = String(item.snippet || '').replace(/\s+/g, ' ')
  const t0 = String(item.title || cargo)
  let empresa = ''
  const m1 = t0.match(/ en (.+?)(?: - [A-Za-zÁÉÍÓÚáéíóúñ ,]+)?$/), m2 = t0.match(/^(.+?) busca personas para el cargo de (.+?)(?: en .*)?$/i)
  let titulo = t0
  if (m2) { empresa = m2[1]; titulo = m2[2] } else if (m1 && /computrabajo/i.test(c.plataforma)) empresa = m1[1]
  titulo = titulo.replace(/^(Empleo de|Trabajos? de)\s*/i, '').replace(/\s*[-|·]\s*(LinkedIn|Bumeran|Computrabajo|Indeed(\.com)?|Aptitus|Laborum|Jobs?|Empleos?).*$/i, '').replace(/\s+-\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+\d{4}$/i, '').trim()
  return { titulo, empresa, ubicacion: '', modalidad: modalidadDe(snip + t0), salario: 'No especificado', descripcion: snip.substring(0, 260), plataforma: c.plataforma, dias_publicado: null, link_postular: c.url, requisitos: [], sector, tipo: 'oferta_formal', fuente: 'google' }
}

function ofertaDeJooble(job: any, sector: string, c: ReturnType<typeof clasificarLink>) {
  const txt = (job.snippet || '') + ' ' + (job.title || '')
  return { titulo: String(job.title || '').replace(/<[^>]+>/g, '').trim(), empresa: job.company || '', ubicacion: job.location || '', modalidad: modalidadDe(txt), salario: job.salary || 'No especificado', descripcion: String(job.snippet || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().substring(0, 260), plataforma: 'Jooble', dias_publicado: null, link_postular: c.url, requisitos: [], sector, tipo: 'oferta_formal', fuente: 'jooble' }
}

export async function POST(req: NextRequest) {
  const s = await getSession(); if (!s) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const b = await req.json()
  const cargos: string[] = (Array.isArray(b.cargos) && b.cargos.length ? b.cargos : [b.cargo]).map((x: any) => String(x || '').trim()).filter(Boolean).slice(0, 4)
  const { pais, departamento, distrito, cvTexto, perfil } = b
  const sector: string = b.sector || 'privado'
  const verificar = b.verificar !== false
  if (!cargos.length) return NextResponse.json({ error: 'Cargo requerido' }, { status: 400 })
  if (!cvTexto) return NextResponse.json({ error: 'CV requerido' }, { status: 400 })
  const t0 = Date.now()

  let groqKey = (process.env.NEXT_PUBLIC_GROQ_API_KEY || '').replace(/^Bearer\s+/i, '').trim()
  let joobleKey = process.env.JOOBLE_API_KEY || '', googleKey = process.env.GOOGLE_API_KEY || '', googleCse = process.env.GOOGLE_CSE_ID || ''
  try {
    const { data: cfg } = await supabaseAdmin().from('preda_config').select('clave,valor').in('clave', ['groq_api_key', 'jooble_api_key', 'google_api_key', 'google_cse_id'])
    cfg?.forEach((c: any) => {
      if (c.clave === 'groq_api_key' && !groqKey) groqKey = String(c.valor || '').replace(/^Bearer\s+/i, '').trim()
      if (c.clave === 'jooble_api_key' && !joobleKey) joobleKey = c.valor
      if (c.clave === 'google_api_key' && !googleKey) googleKey = c.valor
      if (c.clave === 'google_cse_id' && !googleCse) googleCse = c.valor
    })
  } catch {}
  if (!groqKey?.startsWith('gsk_')) return NextResponse.json({ error: 'Groq API Key no configurada' }, { status: 500 })

  const ub = [distrito, departamento, pais].filter(Boolean).join(', ')
  const city = String(departamento || distrito || 'Lima').trim()
  const sectores = sector === 'ambos' ? ['privado', 'estatal'] : [sector]

  // 1) Recoger candidatos de todas las fuentes y cargos
  const crudos: any[] = []
  for (const sec of sectores) {
    for (const cargo of cargos) {
      if (joobleKey) {
        try { (await searchJooble(cargo, ub, joobleKey, sec)).forEach(j => { if (j.link) crudos.push({ origen: 'jooble', sec, cargo, item: j, url: j.link }) }) } catch {}
      }
      if (googleKey && googleCse) {
        try { (await searchGoogle(consultasGoogle(cargo, city, sec), googleKey, googleCse)).forEach(i => { if (i.link) crudos.push({ origen: 'google', sec, cargo, item: i, url: i.link }) }) } catch {}
      }
    }
  }
  if (!joobleKey && !(googleKey && googleCse)) {
    return NextResponse.json({ ok: false, sin_api: true, mensaje: 'Para buscar ofertas REALES configura al menos una fuente en Administracion → Configuracion:\n1. GOOGLE CUSTOM SEARCH (API Key + ID de buscador): busca en Computrabajo, Bumeran, LinkedIn, Indeed, Aptitus, Laborum y portales del Estado.\n2. JOOBLE API (gratis): jooble.org/api/about' })
  }

  // 2) Solo se aceptan enlaces de UN aviso concreto
  const vistos = new Set<string>(); const directas: any[] = []; let descartados = 0; const ejemplosDescartados: string[] = []
  for (const r of crudos) {
    const c = clasificarLink(r.url, r.sec)
    if (!c.directo) { descartados++; if (ejemplosDescartados.length < 4) ejemplosDescartados.push(c.plataforma + ': ' + (c.motivo || '')); continue }
    const key = limpiarUrl(c.url).toLowerCase()
    if (vistos.has(key)) continue
    vistos.add(key)
    directas.push(r.origen === 'jooble' ? ofertaDeJooble(r.item, r.sec, c) : ofertaDeGoogle(r.item, r.cargo, r.sec, c))
  }
  // Variedad por plataforma: maximo 10 por portal, 48 en total
  const cont: Record<string, number> = {}
  const raw = directas.filter(o => { cont[o.plataforma] = (cont[o.plataforma] || 0) + 1; return cont[o.plataforma] <= 10 }).slice(0, 48)
  if (raw.length === 0) {
    return NextResponse.json({ ok: true, cargo: cargos.join(', '), cargos, ubicacion: ub, sector, total: 0, ofertas: [], plataformas: [], porPlataforma: {}, descartados, aviso: 'Se encontraron ' + crudos.length + ' resultados pero ninguno era el enlace de un aviso concreto (eran listados, buscadores o portadas), asi que se descartaron. Prueba con otro cargo o ampliando la ubicacion.' })
  }

  // 3) Compatibilidad con el CV y perfil (lotes en paralelo)
  const cvR = String(cvTexto).substring(0, 2200)
  const prefs = perfil ? 'PREFERENCIAS: ' + JSON.stringify(perfil).substring(0, 400) + '\n' : ''
  const lotes: any[][] = []
  for (let i = 0; i < raw.length; i += 8) lotes.push(raw.slice(i, i + 8))
  const evals = await enParalelo(lotes, 3, async (lote, li) => {
    const prompt = 'Evalua la compatibilidad del CV con cada oferta.\n\nCV:\n' + cvR + '\n' + prefs + '\nOFERTAS:\n' + lote.map((o: any, idx: number) => 'OFERTA ' + (idx + 1) + ': ' + o.titulo + ' en ' + (o.empresa || 'empresa') + '\n' + (o.descripcion || '')).join('\n\n') + '\n\nResponde SOLO JSON: [{"oferta":N,"compatibilidad":0-100,"razon":"razon breve","recomendacion":"Postular ahora|Mejorar CV|No recomendado"}]'
    try {
      const t = await groqChat([{ role: 'system', content: 'PREDA matching laboral. Responde SOLO JSON valido.' }, { role: 'user', content: prompt }], 1800, groqKey)
      const a = t.indexOf('['), z = t.lastIndexOf(']')
      return JSON.parse(a >= 0 && z > a ? t.slice(a, z + 1) : t) as any[]
    } catch { return [] as any[] }
  })
  let resultados: any[] = []
  lotes.forEach((lote, li) => lote.forEach((o: any, idx: number) => {
    const ev = evals[li] || []
    const e = ev.find((x: any) => Number(x.oferta) === idx + 1) || ev[idx] || {}
    resultados.push({ ...o, id: 'o_' + li + '_' + idx + '_' + Date.now(), compatibilidad: Math.max(0, Math.min(100, Number(e.compatibilidad) || 0)), razon: e.razon || '', recomendacion: e.recomendacion || '', checklist: false })
  }))
  resultados.sort((a, b2) => (b2.compatibilidad || 0) - (a.compatibilidad || 0))

  // 4) Verificar que el aviso exista y siga vigente (los mejores primero, con tope de tiempo)
  let caidos = 0
  if (verificar) {
    const tope = resultados.slice(0, 30)
    await enParalelo(tope, 6, async (o) => {
      if (Date.now() - t0 > 48000) { o.estado_link = 'no_verificable'; o.detalle_link = 'No se alcanzo a verificar por tiempo'; return }
      const v = await verificarLink(o.link_postular)
      o.estado_link = v.estado; o.detalle_link = v.detalle || ''
      if (v.estado === 'verificado') {
        if (v.titulo) o.titulo = v.titulo
        if (v.empresa) o.empresa = v.empresa
        if (v.ubicacion) o.ubicacion = v.ubicacion
        if (v.salario && o.salario === 'No especificado') o.salario = v.salario
        if (v.valido_hasta) o.valido_hasta = v.valido_hasta
        if (v.publicado) { o.publicado = v.publicado; const d = Math.floor((Date.now() - new Date(v.publicado).getTime()) / 86400000); if (!isNaN(d) && d >= 0) o.dias_publicado = d }
      }
    })
    resultados.slice(30).forEach(o => { o.estado_link = 'no_verificable'; o.detalle_link = 'Enlace directo al aviso (no se verifico por limite de tiempo)' })
    const antes = resultados.length
    resultados = resultados.filter(o => o.estado_link !== 'caido')
    caidos = antes - resultados.length
  }
  const por: Record<string, any[]> = {}
  resultados.forEach(o => { const p = o.plataforma || 'Otras'; (por[p] = por[p] || []).push(o) })
  const metodo = joobleKey && googleKey && googleCse ? 'jooble_y_google' : joobleKey ? 'jooble_real' : 'google_real'
  return NextResponse.json({
    ok: true, cargo: cargos.join(', '), cargos, ubicacion: ub, metodo, sector, total: resultados.length,
    verificadas: resultados.filter(o => o.estado_link === 'verificado').length,
    ofertasAltas: resultados.filter(o => o.compatibilidad >= 90).length,
    descartados, caidos, plataformas: Object.keys(por), porPlataforma: por, ofertas: resultados,
  })
}
