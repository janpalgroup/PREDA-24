'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { claveDeRuta, tieneModulo, primeraRuta } from '@/lib/permisos'
import AppShell, { NavSec } from '@/components/AppShell'
const NAV: NavSec[] = [
  { s: 'PROCESOS', i: [{ href: '/seleccion/dashboard', l: 'Dashboard', e: '📊' }, { href: '/seleccion/procesos', l: 'Mis Procesos', e: '📁' }, { href: '/seleccion/oferta', l: 'Crear Oferta', e: '📝' }] },
  { s: 'SELECCIÓN', i: [{ href: '/seleccion/cv', l: 'Analizar CV', e: '📄' }, { href: '/seleccion/masiva', l: 'Carga Masiva', e: '📦' }, { href: '/seleccion/candidatos', l: 'Candidatos', e: '👥' }, { href: '/seleccion/entrevista', l: 'Entrevista IA', e: '🎙️' }, { href: '/seleccion/comparar', l: 'Comparar', e: '⚖️' }, { href: '/seleccion/shortlist', l: 'Shortlist', e: '🏆' }] },
  { s: 'GESTIÓN', i: [{ href: '/seleccion/verificaciones', l: 'Verificaciones', e: '🔍' }, { href: '/seleccion/emails', l: 'Emails RRHH', e: '✉️' }, { href: '/seleccion/reportes', l: 'Reportes', e: '📈' }] },
  { s: 'ADMIN', i: [{ href: '/administracion/config', l: 'Configuración', e: '⚙️' }, { href: '/administracion/usuarios', l: 'Gestión Usuarios', e: '👑' }] },
]
export default function SeleccionLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const [user, setUser] = useState<any>(null)
  useEffect(() => { fetch('/api/auth/session').then(r => r.json()).then(d => { if (!d.user || !d.user.empresa_id) { router.push('/'); return } setUser(d.user) }) }, [])
  const ok = (href: string) => { if (href.startsWith('/administracion')) return user?.rol === 'admin'; const k = claveDeRuta(href); return !!user && !!k && (user.permisos || []).includes(k) }
  const nav = NAV.map(sec => ({ ...sec, i: sec.i.filter(it => ok(it.href)) })).filter(sec => sec.i.length > 0)
  const pie = user && tieneModulo(user.permisos || [], 'empleabilidad') ? <button className="navbtn" style={{ color: 'var(--ok)' }} onClick={() => router.push(primeraRuta(user.permisos || [], 'empleabilidad') || '/modulos')}><span style={{ width: 18, textAlign: 'center' }}>🧑‍💼</span>Ir a Empleabilidad</button> : null
  return <AppShell badge="SELECCIÓN DE PERSONAL" nav={nav} user={user} pie={pie}>{children}</AppShell>
}
