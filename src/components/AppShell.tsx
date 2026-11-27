'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import CuentaMenu from '@/components/CuentaMenu'
export type NavSec = { s: string; i: { href: string; l: string; e: string }[] }
// Estructura común: barra superior + menú lateral (en celular se abre con el botón ☰) + contenido a pantalla completa.
export default function AppShell({ badge, badgeStyle, nav, user, pie, children }: { badge: string; badgeStyle?: React.CSSProperties; nav: NavSec[]; user: any; pie?: React.ReactNode; children: React.ReactNode }) {
  const router = useRouter(); const path = usePathname(); const [abierto, setAbierto] = useState(false)
  useEffect(() => { setAbierto(false) }, [path])
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/') }
  return (
    <div className="shell">
      <div className="topbar no-print">
        <button className="btn btn-sec menu-btn" style={{ padding: '5px 10px', fontSize: 16 }} onClick={() => setAbierto(!abierto)} aria-label="Menú">☰</button>
        <button className="btn btn-sec" style={{ fontSize: 11, padding: '4px 9px' }} onClick={() => router.push('/modulos')}>← <span className="hide-sm">Módulos</span></button>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 2 }}>PRE<span style={{ color: 'var(--accent)' }}>DA</span></div>
        <span className="hide-sm" style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: 'var(--adim)', color: 'var(--accent2)', ...badgeStyle }}>{badge}</span>
        <div style={{ flex: 1 }} />
        <span className="hide-sm" style={{ fontSize: 12, fontWeight: 600 }}>{user?.nombre}</span>
        <CuentaMenu />
        <button className="btn btn-sec" style={{ fontSize: 11, padding: '4px 9px' }} onClick={logout}>Salir</button>
      </div>
      <div className="shell-body">
        <div className={'overlay no-print' + (abierto ? ' open' : '')} onClick={() => setAbierto(false)} />
        <div className={'sidebar no-print' + (abierto ? ' open' : '')}>
          {nav.map(sec => (
            <div key={sec.s}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-3)', padding: '9px 8px 3px', textTransform: 'uppercase' }}>{sec.s}</div>
              {sec.i.map(it => <button key={it.href} className={'navbtn' + (path === it.href ? ' act' : '')} onClick={() => router.push(it.href)}><span style={{ width: 18, textAlign: 'center' }}>{it.e}</span>{it.l}</button>)}
            </div>
          ))}
          {pie && <div style={{ marginTop: 'auto', paddingTop: 9, borderTop: '1px solid var(--border)' }}>{pie}</div>}
        </div>
        <div className="shell-main">{children}</div>
      </div>
    </div>
  )
}
