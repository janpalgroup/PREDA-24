import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
export const runtime = 'nodejs'
export async function POST(req: NextRequest) {
  const s = await getSession(); if(!s) return NextResponse.json({error:'No autenticado'},{status:401})
  const fd   = await req.formData()
  const file = fd.get('file') as File
  if (!file) return NextResponse.json({error:'No se recibió archivo'},{status:400})
  const ext  = file.name.split('.').pop()?.toLowerCase()
  const buf  = Buffer.from(await file.arrayBuffer())
  try {
    let text = ''
    if (ext==='txt') {
      text = buf.toString('utf-8')
    } else if (ext==='pdf') {
      try {
        const { extractText, getDocumentProxy } = await import('unpdf')
        const pdf = await getDocumentProxy(new Uint8Array(buf))
        const r: any = await extractText(pdf, { mergePages: true })
        text = Array.isArray(r.text) ? r.text.join('\n') : (r.text || '')
      } catch (e1: any) {
        const pdfParse = (await import('pdf-parse/lib/pdf-parse.js' as any) as any).default
        const data = await pdfParse(buf)
        text = data.text
      }
      if (!text.trim()) throw new Error('El PDF no tiene texto (parece una imagen escaneada). Pega el texto manualmente.')
    } else if (ext==='docx'||ext==='doc') {
      const mammoth = await import('mammoth')
      const result  = await mammoth.extractRawText({buffer:buf})
      text = result.value
    } else {
      text = buf.toString('utf-8')
    }
    return NextResponse.json({text,chars:text.length,words:text.split(/\s+/).length})
  } catch(e:any){ return NextResponse.json({error:'Error al leer: '+e.message},{status:500}) }
}
