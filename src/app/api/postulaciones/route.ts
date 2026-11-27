import { NextRequest, NextResponse } from 'next/server'
import { getCtx, esCtx } from '@/lib/alcance'
export async function GET(req: NextRequest) {
  const c = await getCtx(); if(!esCtx(c)) return c
  const eid = req.nextUrl.searchParams.get('expediente_id')
  let q = c.db.from('preda_postulaciones').select('*').eq('empresa_id',c.eid).order('created_at',{ascending:false})
  if (eid) q = q.eq('expediente_id',eid)
  else if (!c.jefe) q = q.eq('usuario_id',c.s.id)
  const {data,error} = await q
  if (error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({postulaciones:data||[]})
}
export async function POST(req: NextRequest) {
  const c = await getCtx(); if(!esCtx(c)) return c
  const body = await req.json()
  if (body.id) {
    const {id,empresa_id:_e,usuario_id:_u,...u} = body
    const {data,error} = await c.db.from('preda_postulaciones').update({...u,updated_at:new Date().toISOString()}).eq('id',id).eq('empresa_id',c.eid).select().single()
    if (error) return NextResponse.json({error:error.message},{status:500})
    return NextResponse.json({postulacion:data})
  }
  const {data,error} = await c.db.from('preda_postulaciones').insert({...body,empresa_id:c.eid,usuario_id:c.s.id}).select().single()
  if (error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({postulacion:data})
}
export async function DELETE(req: NextRequest) {
  const c = await getCtx(); if(!esCtx(c)) return c
  const {id} = await req.json()
  const {error} = await c.db.from('preda_postulaciones').delete().eq('id',id).eq('empresa_id',c.eid)
  if (error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({ok:true})
}
