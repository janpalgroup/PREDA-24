import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { generateCvDocx, generateCvPdf } from '@/lib/cv-generator'
export async function POST(req: NextRequest) {
  const s = await getSession(); if(!s) return NextResponse.json({error:'No autenticado'},{status:401})
  const { formato, nombre, cargos, phone, email, linkedin, keywords, cvText } = await req.json()
  if (!cvText) return NextResponse.json({error:'CV requerido'},{status:400})
  try {
    if (formato==='pdf') {
      const buf = await generateCvPdf({nombre,cargos,phone,email,linkedin,keywords,cvText})
      return new NextResponse(buf,{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="CV.pdf"'}})
    }
    const buf = await generateCvDocx({nombre,cargos,phone,email,linkedin,keywords,cvText})
    return new NextResponse(buf,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':'attachment; filename="CV.docx"'}})
  } catch(e:any){ return NextResponse.json({error:e.message},{status:500}) }
}
