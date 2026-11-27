import { useEffect, useState } from 'react'
// Proceso "activo" compartido entre todas las páginas de Selección (se recuerda al cambiar de página).
// Prioridad: ?proceso=ID en la URL > último usado > primer proceso activo.
export function useProcesoActivo() {
  const [procesos, setProcesos] = useState<any[]>([])
  const [procesoId, setPid] = useState('')
  const [cargado, setCargado] = useState(false)
  const [puedeRecomendar, setPuedeRecomendar] = useState(false)
  function setProcesoId(id: string) { setPid(id); try { localStorage.setItem('preda_proceso', id) } catch {} }
  function recargar() { return fetch('/api/procesos').then(r => r.json()).then(d => { setProcesos(d.procesos || []); setPuedeRecomendar(!!d.puede_recomendar); return d.procesos || [] }) }
  useEffect(() => {
    recargar().then((lista: any[]) => {
      let want = ''
      try { want = new URLSearchParams(window.location.search).get('proceso') || '' } catch {}
      if (!want) { try { want = localStorage.getItem('preda_proceso') || '' } catch {} }
      const ok = lista.find(p => p.id === want) || lista.find(p => p.estado === 'activo') || lista[0]
      if (ok) setProcesoId(ok.id)
      setCargado(true)
    }).catch(() => setCargado(true))
  }, [])
  const proceso = procesos.find(p => p.id === procesoId)
  return { procesos, procesoId, setProcesoId, proceso, cargado, recargar, puedeRecomendar }
}
