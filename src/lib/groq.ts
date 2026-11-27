const MODELS = [
  process.env.GROQ_MODEL || '',
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.1-8b-instant',
].filter(Boolean)
export async function groqChat(messages: any[], max_tokens: number, apiKey: string): Promise<string> {
  let lastErr = 'Sin respuesta de Groq'
  for (const model of MODELS) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({ model, max_tokens, messages }),
    })
    const d = await res.json().catch(() => ({} as any))
    if (!d.error && d.choices?.[0]?.message?.content != null) return d.choices[0].message.content
    lastErr = d.error?.message || ('HTTP ' + res.status)
    if (!/model|decommission|access|not exist|not found|rate|limit|capacity/i.test(lastErr)) break
  }
  throw new Error(lastErr)
}

import { supabaseAdmin } from '@/lib/supabase'
export async function getGroqKey(): Promise<string> {
  let raw = process.env.NEXT_PUBLIC_GROQ_API_KEY || ''
  if (!raw) {
    try {
      const { data } = await supabaseAdmin().from('preda_config').select('valor').eq('clave', 'groq_api_key').single()
      if (data?.valor) raw = data.valor
    } catch {}
  }
  return raw.replace(/^Bearer\s+/i, '').replace(/\s+/g, '').trim()
}
