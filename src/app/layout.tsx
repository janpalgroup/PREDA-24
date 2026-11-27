import type { Metadata, Viewport } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'PREDA Suite v2', description: 'Suite Integral de Gestión del Talento' }
export const viewport: Viewport = { width: 'device-width', initialScale: 1 }
// Aplica el tema guardado antes de pintar (evita parpadeo)
const TEMA = "try{var t=localStorage.getItem('preda_tema');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}"
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: TEMA }} /></head><body>{children}</body></html>
}
