import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { groqChat } from '@/lib/groq'
import { supabaseAdmin } from '@/lib/supabase'
async function callGroq(prompt: string, system: string, apiKey: string): Promise<string> {
  return groqChat([{role:'system',content:system},{role:'user',content:prompt}],3500,apiKey)
}
export async function POST(req: NextRequest) {
  const s = await getSession(); if(!s) return NextResponse.json({error:'No autenticado'},{status:401})
  const {cvText,nombre,cargo,proceso,keywords} = await req.json()
  if (!cvText) return NextResponse.json({error:'CV requerido'},{status:400})
  let rawKey = process.env.NEXT_PUBLIC_GROQ_API_KEY||''
  try { const {data} = await supabaseAdmin().from('preda_config').select('valor').eq('clave','groq_api_key').single(); if(data?.valor&&!rawKey) rawKey=data.valor } catch {}
  const apiKey = rawKey.replace(/^Bearer\s+/i,'').replace(/\s+/g,'').trim()
  if (!apiKey.startsWith('gsk_')) return NextResponse.json({error:'Groq API Key no configurada'},{status:500})
  const SYSTEM = `Eres PREDA, sistema experto en evaluacion integral de candidatos para RRHH latinoamericano.
Evaluas CVs en 6 dimensiones con pesos especificos:
1. EXPERIENCIA LABORAL (35%): anos, relevancia, progresion, logros cuantificados
2. FORMACION ACADEMICA (20%): nivel educativo, institucion, pertinencia al cargo
3. CAPACITACIONES Y CERTIFICACIONES (15%): cursos, certificaciones, idiomas
4. COMPETENCIAS TECNICAS ATS (15%): keywords exactas del perfil requerido
5. COMPETENCIAS BLANDAS (10%): liderazgo, comunicacion, trabajo en equipo
6. PRESENTACION DEL CV (5%): claridad, orden, datos completos
Responde siempre en espanol con analisis detallado y puntajes numericos exactos.`
  const prompt = 'Realiza una EVALUACION INTEGRAL del CV para el cargo "' + (cargo||'no especificado') + '"' +
    (proceso?' del proceso "'+proceso+'"':'') + '.\n\n' +
    (keywords?'KEYWORDS REQUERIDAS: '+keywords+'\n\n':'') +
    'CV DE: '+(nombre||'Candidato')+'\n---\n'+cvText.substring(0,6000)+'\n---\n\n' +
    'Evalua CADA dimension:\n\n' +
    '### 1. EXPERIENCIA LABORAL (35%)\n- Anos de experiencia total y relevante:\n- Progresion de carrera:\n- Logros cuantificados:\n- Sectores:\n- PUNTUACION: XX/100 - Peso: XX/35\n\n' +
    '### 2. FORMACION ACADEMICA (20%)\n- Nivel educativo y titulos:\n- Instituciones:\n- Pertinencia al cargo:\n- PUNTUACION: XX/100 - Peso: XX/20\n\n' +
    '### 3. CAPACITACIONES Y CERTIFICACIONES (15%)\n- Cursos y diplomados relevantes:\n- Certificaciones vigentes:\n- Idiomas con nivel:\n- PUNTUACION: XX/100 - Peso: XX/15\n\n' +
    '### 4. COMPETENCIAS TECNICAS ATS (15%)\n- Keywords encontradas en el CV:\n- Keywords ausentes:\n- PUNTUACION ATS: XX/100 - Peso: XX/15\n\n' +
    '### 5. COMPETENCIAS BLANDAS (10%)\n- Competencias inferidas:\n- PUNTUACION: XX/100 - Peso: XX/10\n\n' +
    '### 6. PRESENTACION DEL CV (5%)\n- Claridad, orden, datos completos:\n- PUNTUACION: XX/100 - Peso: XX/5\n\n' +
    '## RESULTADO FINAL\nPUNTAJE GLOBAL: XX/100\nPUNTAJE ATS: XX/100\nNIVEL: Bajo/Medio/Alto/Sobresaliente\n\n' +
    '## FORTALEZAS PRINCIPALES\n## AREAS DE MEJORA\n## RECOMENDACION FINAL\n\n' +
    'REGLAS DE FORMATO: NO uses tablas ni simbolos | ni negritas **. Usa solo texto y guiones.\n' +
    'AL FINAL, en la ultima linea, escribe exactamente: SCORES_JSON: {"exp":N,"form":N,"cap":N,"ats":N,"blandas":N,"pres":N} con N entero 0-100 para cada dimension.'
  try {
    let raw = await callGroq(prompt, SYSTEM, apiKey)
    let sc: any = null
    const jm = raw.match(/SCORES_JSON\s*:?\s*(\{[^}]*\})/i)
    if (jm) { try { sc = JSON.parse(jm[1]) } catch {} }
    let resultado = raw.replace(/SCORES_JSON[\s\S]*$/i,'').replace(/\*\*/g,'').replace(/^[ \t]*\|?[-:| ]{3,}\|?[ \t]*$/gm,'').replace(/^\|[ \t]*/gm,'').replace(/[ \t]*\|[ \t]*$/gm,'').replace(/[ \t]*\|[ \t]*/g,' — ').replace(/^#{1,4}\s*/gm,'').trim()
    const n = (v:any)=>Math.max(0,Math.min(100,Math.round(Number(v)||0)))
    let score = 0, atsScore = 0
    let dims: any = null
    if (sc) {
      const e=n(sc.exp),f=n(sc.form),c=n(sc.cap),a=n(sc.ats),b=n(sc.blandas),p=n(sc.pres)
      score = Math.round(e*0.35+f*0.20+c*0.15+a*0.15+b*0.10+p*0.05); atsScore = a; dims = {exp:e,form:f,cap:c,ats:a,blandas:b,pres:p}
    } else {
      const nums = [...raw.replace(/\*\*/g,'').matchAll(/PUNTUACI[OÓ]N(?:\s*ATS)?[^0-9\n]{0,15}(\d{1,3})\s*\/\s*100/gi)].map(m=>n(m[1]))
      if (nums.length>=6) { const w=[0.35,0.20,0.15,0.15,0.10,0.05]; score=Math.round(nums.slice(0,6).reduce((t,v,i)=>t+v*w[i],0)); atsScore=nums[3]; dims={exp:nums[0],form:nums[1],cap:nums[2],ats:nums[3],blandas:nums[4],pres:nums[5]} }
      else {
        const t = raw.replace(/\*\*/g,'')
        const gm = t.match(/PUNTAJE GLOBAL[^0-9]{0,15}(\d{1,3})/i), am = t.match(/PUNTAJE ATS[^0-9]{0,15}(\d{1,3})/i)
        score = gm?n(gm[1]):0; atsScore = am?n(am[1]):0
      }
    }
    const rm = resultado.match(/RECOMENDACI[OÓ]N FINAL([\s\S]*)$/i)
    const resumen = (rm ? rm[1] : resultado.slice(-600)).replace(/^[\s:.-]+/,'').trim().substring(0,700)
    return NextResponse.json({resultado,score,atsScore,dimensiones:dims,resumen,ok:true})
  } catch(e:any){ return NextResponse.json({error:e.message},{status:500}) }
}
