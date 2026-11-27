import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
export async function GET() {
  const s = await getSession(); if(!s) return NextResponse.json({error:'No autenticado'},{status:401})
  const {data} = await supabaseAdmin().from('preda_config').select('clave,valor')
  const config: Record<string,string> = {}
  data?.forEach((r:any) => { config[r.clave] = r.valor || '' })
  return NextResponse.json({config})
}
export async function POST(req: NextRequest) {
  const s = await getSession(); if(!s) return NextResponse.json({error:'No autenticado'},{status:401})
  const {clave,valor} = await req.json()
  const {error} = await supabaseAdmin().from('preda_config').upsert({clave,valor,updated_at:new Date().toISOString()},{onConflict:'clave'})
  if (error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({ok:true})
}
