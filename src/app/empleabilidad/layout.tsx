'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { claveDeRuta, tieneModulo, primeraRuta } from '@/lib/permisos'
import AppShell, { NavSec } from '@/components/AppShell'
const NAV: NavSec[] = [
  { s: 'CANDIDATO', i: [{ href: '/empleabilidad/expediente', l: 'Mi Expediente', e: '🗂️' }, { href: '/empleabilidad/perfil', l: 'Perfil a Buscar', e: '🎯' }] },
  { s: 'BÚSQUEDA', i: [{ href: '/empleabilidad/ofertas', l: 'Buscar Ofertas', e: '🔎' }, { href: '/empleabilidad/entrevista', l: 'Pre-Entrevista', e: '🎙️' }, { href: '/empleabilidad/cv', l: 'CV Harvard / ATS', e: '📄' }, { href: '/empleabilidad/verificaciones', l: 'Verificaciones', e: '🔍' }] },
  { s: 'POSTULACIONES', i: [{ href: '/empleabilidad/postulaciones', l: 'Mis Postulaciones', e: '📨' }, { href: '/empleabilidad/seguimiento', l: 'Seguimiento', e: '📌' }, { href: '/empleabilidad/reportes', l: 'Mi Reporte', e: '📈' }] },
]
export default function EmpLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const [user, setUser] = useState<any>(null)
  useEffect(() => { fetch('/api/auth/session').then(r => r.json()).then(d => { if (!d.user || !d.user.empresa_id) { router.push('/'); return } setUser(d.user) }) }, [])
  const ok = (href: string) => { const k = claveDeRuta(href); return !!user && !!k && (user.permisos || []).includes(k) }
  const nav = NAV.map(sec => ({ ...sec, i: sec.i.filter(it => ok(it.href)) })).filter(sec => sec.i.length > 0)
  const pie = user && tieneModulo(user.permisos || [], 'seleccion') ? <button className="navbtn" style={{ color: 'var(--accent2)' }} onClick={() => router.push(primeraRuta(user.permisos || [], 'seleccion') || '/modulos')}><span style={{ width: 18, textAlign: 'center' }}>👥</span>Ir a Selección</button> : null
  return <AppShell badge="EMPLEABILIDAD" badgeStyle={{ background: 'rgba(40,200,140,.15)', color: 'var(--ok)' }} nav={nav} user={user} pie={pie}>{children}</AppShell>
}
