// Catalogo de accesos (compartido por servidor, middleware y pantallas). Sin dependencias.
export type Pagina = { k: string; l: string }
export type Modulo = { id: string; nombre: string; paginas: Pagina[] }
export const MODULOS: Modulo[] = [
  { id: 'seleccion', nombre: 'Selección de Personal', paginas: [
    { k: 'dashboard', l: 'Dashboard' }, { k: 'procesos', l: 'Mis Procesos' }, { k: 'oferta', l: 'Crear Oferta' },
    { k: 'cv', l: 'Analizar CV' }, { k: 'masiva', l: 'Carga Masiva' }, { k: 'candidatos', l: 'Candidatos' },
    { k: 'entrevista', l: 'Entrevista IA' }, { k: 'comparar', l: 'Comparar' }, { k: 'shortlist', l: 'Shortlist' },
    { k: 'verificaciones', l: 'Verificaciones' }, { k: 'emails', l: 'Emails, formularios y pruebas' }, { k: 'reportes', l: 'Reportes' },
  ] },
  { id: 'empleabilidad', nombre: 'Empleabilidad', paginas: [
    { k: 'expediente', l: 'Mi Expediente' }, { k: 'perfil', l: 'Perfil a Buscar' }, { k: 'ofertas', l: 'Buscar Ofertas' },
    { k: 'entrevista', l: 'Pre-Entrevista' }, { k: 'cv', l: 'CV Harvard / ATS' }, { k: 'verificaciones', l: 'Verificaciones' },
    { k: 'postulaciones', l: 'Mis Postulaciones' }, { k: 'seguimiento', l: 'Seguimiento' }, { k: 'reportes', l: 'Mi Reporte' },
  ] },
]
export const TODAS: string[] = MODULOS.flatMap(m => m.paginas.map(p => m.id + ':' + p.k))
export const clavesDe = (modulo: string): string[] => TODAS.filter(k => k.startsWith(modulo + ':'))

// Accesos por defecto segun el rol (si el administrador no personalizo el checklist del usuario)
export function porDefectoRol(rol: string): string[] {
  if (rol === 'analista') return clavesDe('seleccion')
  return TODAS
}
// El administrador siempre tiene todo (para no bloquearse). Los demas: su checklist, o el del rol si no tiene.
export function efectivos(rol: string, permisos: any): string[] {
  if (rol === 'admin') return TODAS
  if (Array.isArray(permisos)) return permisos.filter((k: any) => TODAS.includes(k))
  return porDefectoRol(rol)
}
export const tieneModulo = (ef: string[], modulo: string) => ef.some(k => k.startsWith(modulo + ':'))
export function claveDeRuta(pathname: string): string | null {
  const p = pathname.split('/').filter(Boolean)
  if (p.length < 2) return null
  return p[0] + ':' + p[1]
}
export function primeraRuta(ef: string[], modulo: string): string | null {
  const m = MODULOS.find(x => x.id === modulo); if (!m) return null
  const p = m.paginas.find(x => ef.includes(modulo + ':' + x.k))
  return p ? '/' + modulo + '/' + p.k : null
}
