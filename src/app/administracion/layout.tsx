'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell, { NavSec } from '@/components/AppShell'
const NAV: NavSec[] = [{ s: 'ADMINISTRACIÓN', i: [{ href: '/administracion/config', l: 'Configuración', e: '⚙️' }, { href: '/administracion/usuarios', l: 'Usuarios', e: '👑' }] }]
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const [user, setUser] = useState<any>(null)
  useEffect(() => { fetch('/api/auth/session').then(r => r.json()).then(d => { if (!d.user || !d.user.empresa_id) { router.push('/'); return } setUser(d.user) }) }, [])
  return <AppShell badge="ADMINISTRACIÓN" badgeStyle={{ background: 'rgba(232,160,32,.15)', color: 'var(--warn)' }} nav={NAV} user={user}>{children}</AppShell>
}
