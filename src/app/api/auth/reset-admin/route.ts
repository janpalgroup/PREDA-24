import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const pass   = req.nextUrl.searchParams.get('pass') || 'Admin2025!'
  if (secret !== 'preda-reset-2025') return NextResponse.json({error:'No autorizado'},{status:403})
  const hash = await bcrypt.hash(pass,10)
  const {data,error} = await supabaseAdmin().from('preda_usuarios').upsert({nombre:'Administrador',email:'admin@preda.com',password:hash,rol:'admin',activo:true},{onConflict:'email'}).select().single()
  if (error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({ok:true,email:data.email})
}
