import { NextRequest, NextResponse } from 'next/server'
import { getCtx, esCtx } from '@/lib/alcance'
export async function GET(req: NextRequest) {
  const c = await getCtx(); if(!esCtx(c)) return c
  const id  = req.nextUrl.searchParams.get('id')
  const dni = (req.nextUrl.searchParams.get('dni')||'').replace(/\D/g,'')
  const db  = c.db
  // Busqueda por DNI en toda la base (no solo los del usuario)
  if (dni) {
    const {data,error} = await db.from('preda_expedientes').select('*').eq('empresa_id',c.eid).eq('dni',dni).order('updated_at',{ascending:false}).limit(1)
    if (error) return NextResponse.json({error:error.message},{status:500})
    return NextResponse.json({expediente:(data||[])[0]||null,encontrado:!!(data&&data.length)})
  }
  if (id) {
    const {data,error} = await db.from('preda_expedientes').select('*').eq('id',id).eq('empresa_id',c.eid).single()
    if (error) return NextResponse.json({error:error.message},{status:500})
    return NextResponse.json({expediente:data})
  }
  let q = db.from('preda_expedientes').select('*').eq('empresa_id',c.eid).order('updated_at',{ascending:false})
  const {data,error} = await q
  if (error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({expedientes:data||[]})
}
export async function POST(req: NextRequest) {
  const c = await getCtx(); if(!esCtx(c)) return c
  const body = await req.json()
  const db   = c.db
  if (body.id) {
    const {id,empresa_id:_e,usuario_id:_u,...updates} = body
    const {data,error} = await db.from('preda_expedientes').update({...updates,updated_at:new Date().toISOString()}).eq('id',id).eq('empresa_id',c.eid).select().single()
    if (error) return NextResponse.json({error:error.message},{status:500})
    return NextResponse.json({expediente:data})
  }
  if (body.dni) {
    body.dni = String(body.dni).replace(/\D/g,'')
    const {data:ex} = await db.from('preda_expedientes').select('*').eq('empresa_id',c.eid).eq('dni',body.dni).limit(1)
    if (ex && ex.length) return NextResponse.json({expediente:ex[0],existente:true})
  }
  const {data,error} = await db.from('preda_expedientes').insert({...body,empresa_id:c.eid,usuario_id:c.s.id}).select().single()
  if (error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({expediente:data})
}
export async function DELETE(req: NextRequest) {
  const c = await getCtx(); if(!esCtx(c)) return c
  const {id} = await req.json()
  const {error} = await c.db.from('preda_expedientes').delete().eq('id',id).eq('empresa_id',c.eid)
  if (error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({ok:true})
}
