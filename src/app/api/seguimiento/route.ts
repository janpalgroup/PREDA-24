import { NextRequest, NextResponse } from 'next/server'
import { getCtx, esCtx } from '@/lib/alcance'
export async function GET(req: NextRequest) {
  const c = await getCtx(); if(!esCtx(c)) return c
  const pid = req.nextUrl.searchParams.get('postulacion_id')
  let q = c.db.from('preda_seguimiento').select('*').eq('empresa_id',c.eid).order('created_at',{ascending:false})
  if (pid) q = q.eq('postulacion_id',pid)
  const {data,error} = await q
  if (error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({seguimientos:data||[]})
}
export async function POST(req: NextRequest) {
  const c = await getCtx(); if(!esCtx(c)) return c
  const body = await req.json()
  const {data,error} = await c.db.from('preda_seguimiento').insert({...body,empresa_id:c.eid,usuario_id:c.s.id}).select().single()
  if (error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({seguimiento:data})
}
