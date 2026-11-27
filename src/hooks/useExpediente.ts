'use client'
import { useCallback, useEffect, useState } from 'react'
// Candidato activo de Empleabilidad: se elige una vez en "Mi Expediente" y lo usan todos los modulos.
export function useExpediente() {
  const [exp, setExp] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const recargar = useCallback(async () => {
    let id = ''
    try { id = sessionStorage.getItem('preda_expediente_id') || '' } catch {}
    if (!id) { setExp(null); setCargando(false); return }
    try {
      const r = await fetch('/api/expediente?id=' + id); const d = await r.json()
      setExp(d.expediente || null)
    } catch { setExp(null) }
    setCargando(false)
  }, [])
  useEffect(() => { recargar() }, [recargar])
  async function guardar(patch: any) {
    if (!exp?.id) return null
    const r = await fetch('/api/expediente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: exp.id, ...patch }) })
    const d = await r.json()
    if (d.expediente) { setExp(d.expediente); return d.expediente }
    throw new Error(d.error || 'No se pudo guardar')
  }
  return { exp, setExp, cargando, recargar, guardar }
}
export function elegirExpediente(id: string) { try { sessionStorage.setItem('preda_expediente_id', id) } catch {} }
