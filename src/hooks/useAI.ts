import { useState } from 'react'
export function useAI() {
  const [loading, setLoading] = useState(false)
  async function callAI(prompt: string, system = 'Eres PREDA, experto en RRHH. Responde en español.'): Promise<string|null> {
    setLoading(true)
    try {
      const res = await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,system,max_tokens:3000})})
      const d = await res.json()
      if (!res.ok) { alert('Error IA: '+(d.error||'sin respuesta')); return null }
      return d.result || null
    } catch(e:any){ alert('Error IA: '+e.message); return null }
    finally { setLoading(false) }
  }
  return { callAI, loading }
}
