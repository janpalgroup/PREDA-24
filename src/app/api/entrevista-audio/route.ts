import { NextRequest, NextResponse } from 'next/server'
import { getCtx, esCtx } from '@/lib/alcance'
import { supabaseAdmin } from '@/lib/supabase'
import { getGroqKey } from '@/lib/groq'
export const runtime = 'nodejs'
export const maxDuration = 60
const BUCKET = 'preda-audio'
// POST multipart: audio, entrevista_key, idx  -> guarda el audio y devuelve la transcripcion
export async function POST(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const fd = await req.formData()
  const file = fd.get('audio') as File | null
  const key = String(fd.get('key') || 'sin-id').replace(/[^a-zA-Z0-9_-]/g, '')
  const idx = String(fd.get('idx') || '0').replace(/\D/g, '')
  if (!file || file.size < 500) return NextResponse.json({ error: 'No se recibio audio (muy corto o vacio)' }, { status: 400 })
  const buf = Buffer.from(await file.arrayBuffer())
  const type = file.type || 'audio/webm'
  const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : type.includes('wav') ? 'wav' : 'webm'
  const path = c.eid + '/' + key + '/p' + idx + '-' + Date.now() + '.' + ext
  const db = c.db
  let audioPath: string | null = null
  let storageError = ''
  try {
    let up = await db.storage.from(BUCKET).upload(path, buf, { contentType: type, upsert: true })
    if (up.error && /not found|bucket/i.test(up.error.message)) {
      await db.storage.createBucket(BUCKET, { public: false })
      up = await db.storage.from(BUCKET).upload(path, buf, { contentType: type, upsert: true })
    }
    if (up.error) storageError = up.error.message; else audioPath = path
  } catch (e: any) { storageError = e.message }
  // Transcripcion con Groq Whisper (gratis con la misma API key)
  let transcript = '', trError = ''
  try {
    const apiKey = await getGroqKey()
    if (!apiKey.startsWith('gsk_')) throw new Error('Groq API Key no configurada')
    const f = new FormData()
    f.append('file', new Blob([buf], { type }), 'respuesta.' + ext)
    f.append('model', 'whisper-large-v3-turbo')
    f.append('language', 'es')
    f.append('response_format', 'json')
    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + apiKey }, body: f })
    const d: any = await r.json().catch(() => ({}))
    if (d.error) throw new Error(d.error.message)
    transcript = String(d.text || '').trim()
  } catch (e: any) { trError = e.message }
  return NextResponse.json({ ok: true, audio_path: audioPath, transcript, transcript_error: trError, storage_error: storageError })
}
// GET ?path=  -> URL firmada temporal para escuchar el audio
export async function GET(req: NextRequest) {
  const c = await getCtx(); if (!esCtx(c)) return c
  const path = req.nextUrl.searchParams.get('path') || ''
  if (!path) return NextResponse.json({ error: 'path requerido' }, { status: 400 })
  // Solo audios de la empresa. Los grabados antes del multiempresa (sin prefijo) se validan por su candidato/proceso.
  if (!path.startsWith(c.eid + '/')) {
    const first = path.split('/')[0]; let ok = false
    if (/^[0-9a-f-]{36}$/i.test(first) && path.split('/').length === 2) {
      const a = await c.db.from('preda_candidatos').select('empresa_id').eq('id', first).single()
      const b2 = a.data ? null : await c.db.from('preda_procesos').select('empresa_id').eq('id', first).single()
      ok = (a.data?.empresa_id || b2?.data?.empresa_id) === c.eid
    }
    if (!ok) return NextResponse.json({ error: 'Audio no disponible' }, { status: 403 })
  }
  const { data, error } = await c.db.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ url: data.signedUrl })
}
