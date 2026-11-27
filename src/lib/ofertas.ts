// Clasificacion y verificacion de enlaces de ofertas laborales.
// Regla de oro: solo se entrega el enlace de UN aviso concreto, nunca el de una lista, buscador o portada.

export type Clasif = { plataforma: string; directo: boolean; url: string; motivo?: string }

const TRACKING = /^(utm_|trk|trackingid|refid|position|pagenum|fbclid|gclid|from|origin|src|ref$|tracking)/i

type Regla = { nombre: string; host: RegExp; aviso: RegExp; lista?: RegExp }
const REGLAS: Regla[] = [
  { nombre: 'Computrabajo', host: /(^|\.)computrabajo\.com(\.pe)?$/i, aviso: /^\/ofertas-de-trabajo\/oferta-de-trabajo-de-.+-[0-9a-f]{32}\/?$/i },
  { nombre: 'Bumeran', host: /(^|\.)bumeran\.com\.pe$/i, aviso: /^\/empleos\/[^/]+-\d{6,}\.html$/i },
  { nombre: 'Laborum', host: /(^|\.)laborum\.pe$/i, aviso: /^\/empleos\/[^/]+-\d{6,}\.html$/i },
  { nombre: 'LinkedIn', host: /(^|\.)linkedin\.com$/i, aviso: /^\/jobs\/view\/([^/]+-)?\d{6,}\/?$/i },
  { nombre: 'Indeed', host: /(^|\.)indeed\.com$/i, aviso: /^\/(viewjob|rc\/clk|pagead\/clk)\/?$/i },
  { nombre: 'Aptitus', host: /(^|\.)aptitus\.com$/i, aviso: /^\/ofertas-de-empleo\/[^/]+-\d{4,}\/?$/i },
  { nombre: 'Trabajando.pe', host: /(^|\.)trabajando\.pe$|(^|\.)trabajando\.com$/i, aviso: /^\/trabajo-empleo\/.+-\d{4,}\/?$/i },
  { nombre: 'Jooble', host: /(^|\.)jooble\.org$/i, aviso: /^\/(desc|jdp)\/-?\d{5,}/i },
]

export function limpiarUrl(u: string): string {
  try {
    const x = new URL(u.trim())
    x.hash = ''
    const keep = new URLSearchParams()
    x.searchParams.forEach((v, k) => {
      if (x.hostname.includes('indeed') && (k === 'jk' || k === 'vjk')) keep.set('jk', v)
      else if (!TRACKING.test(k) && (x.hostname.includes('indeed') ? false : false)) keep.set(k, v)
    })
    // Para todos los portales conocidos el aviso se identifica por la ruta (o por jk en Indeed): se descartan los parametros.
    const conocido = REGLAS.some(r => r.host.test(x.hostname))
    x.search = conocido ? keep.toString() : (() => { const k2 = new URLSearchParams(); x.searchParams.forEach((v, k) => { if (!TRACKING.test(k)) k2.set(k, v) }); return k2.toString() })()
    return x.toString()
  } catch { return u }
}

const LISTADO = /(\/buscar|\/search|\/empleos-busqueda|\/empleos-modalidad|\/empleos-|\/trabajo-de-|\/trabajos-de-|\/jobs\/[^/]+-empleos|\/empleos-en|\/categoria|\/empresas?\/|\/companies|\/salaries|\/cmp\/|\/q-|[?&]q=|[?&]query=|[?&]s=|\/page\/\d+|\/empleos$|\/trabajo$|\/ofertas$)/i

export function clasificarLink(urlRaw: string, sector = 'privado'): Clasif {
  const url = limpiarUrl(urlRaw)
  let u: URL
  try { u = new URL(url) } catch { return { plataforma: 'Web', directo: false, url, motivo: 'URL invalida' } }
  const host = u.hostname.replace(/^www\./, '')
  const path = u.pathname

  if (sector === 'estatal' || /\.gob\.pe$/i.test(host)) {
    const gob = /\.gob\.pe$/i.test(host)
    if (gob) {
      const plat = /servir\.gob\.pe$/i.test(host) ? 'SERVIR / Talento Peru' : /empleosperu\.gob\.pe$/i.test(host) ? 'EmpleosPeru' : 'Entidad publica (' + host + ')'
      const esPdf = /\.(pdf|docx?)$/i.test(path)
      const palabras = /(convocatoria|cas\b|concurso|proceso|bases|oferta|empleo|vacante|cpc|cp-?\d)/i.test(path)
      const profundo = path.split('/').filter(Boolean).length >= 2
      const esLista = /(buscar|search|listado|ofertas_ext\.xhtml|index\.(php|html)$)|[?&]q=/i.test(path + u.search)
      if ((esPdf || (palabras && profundo)) && !esLista) return { plataforma: plat, directo: true, url }
      return { plataforma: plat, directo: false, url, motivo: 'Portada o listado de entidad publica' }
    }
  }

  const r = REGLAS.find(x => x.host.test(host))
  if (!r) return { plataforma: host, directo: false, url, motivo: 'Portal no reconocido: no se puede garantizar que sea un aviso concreto' }
  if (r.nombre === 'Indeed') {
    const ok = /^\/(viewjob)\/?$/i.test(path) && /[?&]jk=[0-9a-f]{8,}/i.test(u.search)
    return ok ? { plataforma: r.nombre, directo: true, url } : { plataforma: r.nombre, directo: false, url, motivo: 'No es un aviso concreto' }
  }
  if (LISTADO.test(path + u.search) && !r.aviso.test(path)) return { plataforma: r.nombre, directo: false, url, motivo: 'Pagina de listado o busqueda' }
  return r.aviso.test(path) ? { plataforma: r.nombre, directo: true, url } : { plataforma: r.nombre, directo: false, url, motivo: 'No tiene la forma de un aviso concreto' }
}

export type Verif = {
  estado: 'verificado' | 'no_verificable' | 'caido'
  detalle?: string
  titulo?: string; empresa?: string; ubicacion?: string; salario?: string; valido_hasta?: string; publicado?: string
}

const CADUCADO = /(oferta (ya )?no (est[aá] )?disponible|esta oferta (ha )?(expir|caduc|finaliz|cerr)|aviso (ha )?(expir|caduc|finaliz)|ya no (est[aá] )?(disponible|acepta)|no longer (available|accepting)|this job (has )?expired|job (is )?no longer|vacante (cerrada|finalizada)|oferta finalizada|proceso (cerrado|finalizado)|publicaci[oó]n (finalizada|expirada))/i

function extraerJobPosting(html: string): any | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    try {
      const j = JSON.parse(m[1].trim())
      const arr = Array.isArray(j) ? j : (j['@graph'] ? j['@graph'] : [j])
      const jp = arr.find((x: any) => x && (x['@type'] === 'JobPosting' || (Array.isArray(x['@type']) && x['@type'].includes('JobPosting'))))
      if (jp) return jp
    } catch {}
  }
  return null
}

export function analizarHtmlAviso(html: string): Verif {
  const jp = extraerJobPosting(html)
  if (jp) {
    const vt = jp.validThrough ? new Date(jp.validThrough) : null
    if (vt && !isNaN(vt.getTime()) && vt.getTime() < Date.now() - 86400000) return { estado: 'caido', detalle: 'La vigencia del aviso ya vencio (' + String(jp.validThrough).substring(0, 10) + ')' }
    const loc = jp.jobLocation ? (Array.isArray(jp.jobLocation) ? jp.jobLocation[0] : jp.jobLocation) : null
    const addr = loc?.address
    const sal = jp.baseSalary?.value
    return {
      estado: 'verificado', detalle: 'Aviso confirmado en la pagina (datos estructurados del portal)',
      titulo: jp.title ? String(jp.title).substring(0, 160) : undefined,
      empresa: jp.hiringOrganization?.name ? String(jp.hiringOrganization.name).substring(0, 120) : undefined,
      ubicacion: addr ? [addr.addressLocality, addr.addressRegion].filter(Boolean).join(', ') : undefined,
      salario: sal && (sal.minValue || sal.value) ? String(sal.minValue || sal.value) + (sal.maxValue ? ' - ' + sal.maxValue : '') + ' ' + (jp.baseSalary?.currency || '') : undefined,
      valido_hasta: jp.validThrough ? String(jp.validThrough).substring(0, 10) : undefined,
      publicado: jp.datePosted ? String(jp.datePosted).substring(0, 10) : undefined,
    }
  }
  const txt = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
  if (CADUCADO.test(txt)) return { estado: 'caido', detalle: 'El portal indica que el aviso ya no esta disponible' }
  return { estado: 'verificado', detalle: 'La pagina del aviso responde y no indica vencimiento' }
}

// Abre el aviso desde el servidor para confirmar que existe y sigue vigente.
export async function verificarLink(url: string, timeoutMs = 6500): Promise<Verif> {
  try {
    const res = await fetch(url, {
      redirect: 'follow', signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'es-PE,es;q=0.9', Accept: 'text/html,application/xhtml+xml' },
    })
    if (res.status === 404 || res.status === 410) return { estado: 'caido', detalle: 'El aviso ya no existe (HTTP ' + res.status + ')' }
    if (res.status === 403 || res.status === 429 || res.status === 999 || res.status === 401) return { estado: 'no_verificable', detalle: 'El portal no permite verificar automaticamente; el enlace es el del aviso' }
    if (!res.ok) return { estado: 'no_verificable', detalle: 'El portal respondio HTTP ' + res.status }
    // Si el portal nos llevo a una pagina distinta (listado/login), el aviso ya no esta
    const finalUrl = res.url || url
    const fc = clasificarLink(finalUrl, /\.gob\.pe/i.test(finalUrl) ? 'estatal' : 'privado')
    let mismoPortal = true
    try { mismoPortal = new URL(finalUrl).hostname === new URL(url).hostname } catch {}
    if (mismoPortal && !fc.directo && !/\.(pdf|docx?)$/i.test(finalUrl)) return { estado: 'caido', detalle: 'El portal redirige a una pagina general: el aviso ya no esta activo' }
    const ctype = res.headers.get('content-type') || ''
    if (/pdf|msword|officedocument/i.test(ctype)) return { estado: 'verificado', detalle: 'Documento de convocatoria accesible' }
    const html = (await res.text()).substring(0, 400000)
    return analizarHtmlAviso(html)
  } catch (e: any) {
    return { estado: 'no_verificable', detalle: 'No se pudo abrir desde el servidor (' + (e.name === 'TimeoutError' ? 'tiempo agotado' : e.message) + ')' }
  }
}

export async function enParalelo<T, R>(items: T[], limite: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limite, items.length) }, async () => {
    while (true) { const i = next++; if (i >= items.length) break; out[i] = await fn(items[i], i) }
  })
  await Promise.all(workers)
  return out
}
