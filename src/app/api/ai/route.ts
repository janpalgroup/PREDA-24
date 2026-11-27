import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { groqChat } from '@/lib/groq'
import { supabaseAdmin } from '@/lib/supabase'
export async function POST(req: NextRequest) {
  const s = await getSession(); if(!s) return NextResponse.json({error:'No autenticado'},{status:401})
  const { prompt, system, max_tokens } = await req.json()
  let rawKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || ''
  try {
    const {data} = await supabaseAdmin().from('preda_config').select('valor').eq('clave','groq_api_key').single()
    if (data?.valor && !rawKey) rawKey = data.valor
  } catch {}
  const apiKey = rawKey.replace(/^Bearer\s+/i,'').replace(/\s+/g,'').trim()
  if (!apiKey.startsWith('gsk_')) return NextResponse.json({error:'Groq API Key no configurada'},{status:500})
  try {
    const result = await groqChat([{role:'system',content:system||'Eres PREDA, experto en RRHH latinoamericano. Responde en español.'},{role:'user',content:prompt}],max_tokens||2500,apiKey)
    return NextResponse.json({result})
  } catch(e:any){ return NextResponse.json({error:e.message},{status:500}) }
}
