import { NextResponse } from 'next/server'
import { getCtx, esCtx, acotar } from '@/lib/alcance'
export async function GET() {
  const c = await getCtx(); if (!esCtx(c)) return c
  const hace3 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const q = await acotar(c, c.db.from('preda_candidatos').select('id,nombre,etapa,ultima_interaccion').lt('ultima_interaccion', hace3).neq('etapa', 'contratado').neq('etapa', 'descartado'))
  const { data } = await q
  return NextResponse.json({ alertas: data || [] })
}
