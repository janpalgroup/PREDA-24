// Catalogo de formularios y pruebas. Reactivos escritos para PREDA (no copiados de pruebas comerciales).
// Las claves de respuesta viven solo en el servidor: al candidato se le envia la version "publica" (sin claves).
export type Item = { q: string; o?: string[]; correcta?: number; dim?: string; inv?: boolean; desir?: boolean; exp?: string }
export type Prueba = { id: string; titulo: string; tipo: 'likert' | 'mcq' | 'abierta' | 'ficha'; tiempo: number; instr: string; items: Item[]; ia?: boolean }
export type CatItem = { id: string; titulo: string; desc: string; tiempo: number; ia: boolean; grupo: string }

export const CATALOGO: CatItem[] = [
  { id: 'ficha', titulo: 'Ficha de datos personales', desc: 'Datos personales, contacto, estudios, experiencia, referencias, expectativas y declaración jurada.', tiempo: 10, ia: false, grupo: 'Formulario' },
  { id: 'personalidad', titulo: 'Personalidad laboral (Big Five)', desc: '25 afirmaciones: responsabilidad, apertura, extraversión, amabilidad y estabilidad emocional.', tiempo: 8, ia: false, grupo: 'Psicotécnico' },
  { id: 'integridad', titulo: 'Integridad y ética laboral', desc: '15 afirmaciones sobre honestidad, normas y confidencialidad (incluye control de deseabilidad social).', tiempo: 6, ia: false, grupo: 'Psicotécnico' },
  { id: 'num', titulo: 'Razonamiento numérico', desc: '12 problemas (porcentajes, regla de tres, series, promedios). Generados con respuesta calculada.', tiempo: 15, ia: false, grupo: 'Psicotécnico' },
  { id: 'logico', titulo: 'Razonamiento lógico', desc: '10 reactivos: series numéricas y de letras, orden y deducción.', tiempo: 12, ia: false, grupo: 'Psicotécnico' },
  { id: 'verbal', titulo: 'Razonamiento verbal', desc: '10 reactivos: sinónimos, antónimos, analogías y comprensión de términos.', tiempo: 8, ia: false, grupo: 'Psicotécnico' },
  { id: 'situacional', titulo: 'Juicio situacional del cargo (IA)', desc: 'Casos de trabajo reales del cargo con 4 opciones; la IA los redacta según las responsabilidades.', tiempo: 15, ia: true, grupo: 'Específica del cargo' },
  { id: 'tecnica', titulo: 'Conocimientos técnicos del cargo (IA)', desc: 'Preguntas de alternativa múltiple sobre las funciones del puesto, redactadas por la IA.', tiempo: 20, ia: true, grupo: 'Específica del cargo' },
  { id: 'caso', titulo: 'Caso práctico abierto (IA)', desc: 'Dos casos de respuesta escrita; la IA ayuda a evaluarlos con criterios del cargo.', tiempo: 25, ia: true, grupo: 'Específica del cargo' },
]

// ---------- Ficha ----------
export type Campo = { k: string; l: string; t: 'text' | 'date' | 'number' | 'select' | 'textarea' | 'check'; req?: boolean; op?: string[] }
export const FICHA: { sec: string; campos: Campo[] }[] = [
  { sec: 'Datos personales', campos: [
    { k: 'nombres', l: 'Nombres', t: 'text', req: true }, { k: 'apellidos', l: 'Apellidos', t: 'text', req: true },
    { k: 'dni', l: 'DNI / Documento', t: 'text', req: true }, { k: 'fecha_nac', l: 'Fecha de nacimiento', t: 'date', req: true },
    { k: 'lugar_nac', l: 'Lugar de nacimiento', t: 'text' }, { k: 'nacionalidad', l: 'Nacionalidad', t: 'text' },
    { k: 'estado_civil', l: 'Estado civil', t: 'select', op: ['Soltero(a)', 'Casado(a)', 'Conviviente', 'Divorciado(a)', 'Viudo(a)'] },
    { k: 'hijos', l: 'N.º de hijos', t: 'number' } ] },
  { sec: 'Contacto', campos: [
    { k: 'direccion', l: 'Dirección', t: 'text', req: true }, { k: 'distrito', l: 'Distrito', t: 'text', req: true }, { k: 'ciudad', l: 'Ciudad', t: 'text' },
    { k: 'telefono', l: 'Celular', t: 'text', req: true }, { k: 'email', l: 'Correo electrónico', t: 'text', req: true } ] },
  { sec: 'Contacto de emergencia', campos: [
    { k: 'emerg_nombre', l: 'Nombre', t: 'text' }, { k: 'emerg_parentesco', l: 'Parentesco', t: 'text' }, { k: 'emerg_tel', l: 'Teléfono', t: 'text' } ] },
  { sec: 'Formación', campos: [
    { k: 'nivel_educ', l: 'Último nivel alcanzado', t: 'select', req: true, op: ['Secundaria', 'Técnico (incompleto)', 'Técnico (completo)', 'Universitario (incompleto)', 'Universitario (completo)', 'Bachiller', 'Titulado', 'Maestría', 'Doctorado'] },
    { k: 'carrera', l: 'Carrera / especialidad', t: 'text' }, { k: 'institucion', l: 'Institución', t: 'text' }, { k: 'anio_egreso', l: 'Año de egreso', t: 'text' },
    { k: 'idiomas', l: 'Idiomas y nivel', t: 'text' }, { k: 'ofimatica', l: 'Herramientas / software que domina', t: 'text' },
    { k: 'licencia', l: 'Licencia de conducir', t: 'select', op: ['No tengo', 'A-I', 'A-IIa', 'A-IIb', 'A-IIIa', 'A-IIIb', 'A-IIIc', 'B'] } ] },
  { sec: 'Última experiencia laboral', campos: [
    { k: 'exp_empresa', l: 'Empresa', t: 'text' }, { k: 'exp_cargo', l: 'Cargo', t: 'text' }, { k: 'exp_periodo', l: 'Periodo (inicio - fin)', t: 'text' },
    { k: 'exp_funciones', l: 'Principales funciones', t: 'textarea' }, { k: 'exp_motivo', l: 'Motivo de salida', t: 'text' } ] },
  { sec: 'Referencias laborales', campos: [
    { k: 'ref1_nombre', l: 'Referencia 1 - Nombre', t: 'text' }, { k: 'ref1_cargo', l: 'Referencia 1 - Cargo / empresa', t: 'text' }, { k: 'ref1_tel', l: 'Referencia 1 - Teléfono', t: 'text' },
    { k: 'ref2_nombre', l: 'Referencia 2 - Nombre', t: 'text' }, { k: 'ref2_cargo', l: 'Referencia 2 - Cargo / empresa', t: 'text' }, { k: 'ref2_tel', l: 'Referencia 2 - Teléfono', t: 'text' } ] },
  { sec: 'Expectativas', campos: [
    { k: 'pretension', l: 'Pretensión salarial (S/ mensual)', t: 'text', req: true },
    { k: 'disponibilidad', l: 'Disponibilidad para incorporarse', t: 'select', req: true, op: ['Inmediata', 'En 15 días', 'En 30 días', 'Más de 30 días'] },
    { k: 'turnos', l: '¿Disponible para turnos rotativos / fines de semana?', t: 'select', op: ['Sí', 'No', 'Depende'] },
    { k: 'viajar', l: '¿Disponible para viajar?', t: 'select', op: ['Sí', 'No', 'Ocasionalmente'] },
    { k: 'como_se_entero', l: '¿Cómo se enteró de la vacante?', t: 'text' } ] },
  { sec: 'Declaraciones', campos: [
    { k: 'acepta_veracidad', l: 'Declaro que la información proporcionada es veraz y autorizo su verificación.', t: 'check', req: true },
    { k: 'acepta_datos', l: 'Autorizo el tratamiento de mis datos personales para este proceso de selección conforme a la Ley N.º 29733 (Protección de Datos Personales).', t: 'check', req: true } ] },
]
export const FICHA_CAMPOS: Campo[] = FICHA.flatMap(s => s.campos)

// ---------- Utilidades ----------
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
function ri(r: () => number, a: number, b: number) { return a + Math.floor(r() * (b - a + 1)) }
function pick<T>(r: () => number, arr: T[]): T { return arr[Math.floor(r() * arr.length)] }
function shuffle<T>(r: () => number, arr: T[]): T[] { const x = arr.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = x[i]; x[i] = x[j]; x[j] = t } return x }
// Arma un reactivo con la respuesta correcta + distractores distintos, y baraja las opciones.
function mcq(r: () => number, q: string, correcta: string, distract: string[], exp?: string): Item {
  const uniq: string[] = []
  for (const d of distract) if (d !== correcta && uniq.indexOf(d) < 0) uniq.push(d)
  const op = shuffle(r, [correcta].concat(uniq.slice(0, 3)))
  return { q, o: op, correcta: op.indexOf(correcta), exp }
}
const n2 = (x: number) => String(Math.round(x * 100) / 100)
function numDistract(r: () => number, ans: number, fmt: (x: number) => string = n2): string[] {
  const set: number[] = []
  const cand = [ans + 1, ans - 1, ans + 2, ans - 2, ans * 2, Math.round(ans / 2), ans + 10, ans - 10, ans + 5, ans - 5, Math.round(ans * 1.1), Math.round(ans * 0.9)]
  for (const c of shuffle(r, cand)) { if (c !== ans && c > 0 && set.indexOf(c) < 0) set.push(c); if (set.length >= 5) break }
  return set.map(fmt)
}

// ---------- Banco: personalidad ----------
const P: [string, string, boolean][] = [
  ['resp', 'Cumplo mis plazos aun cuando nadie me supervisa.', false], ['resp', 'Antes de empezar una tarea reviso que tengo todo lo necesario.', false], ['resp', 'Suelo dejar tareas a medias.', true], ['resp', 'Mantengo mi espacio de trabajo ordenado.', false], ['resp', 'A veces llego tarde a mis compromisos.', true],
  ['aper', 'Disfruto aprender cosas nuevas aunque no las necesite.', false], ['aper', 'Me gusta probar formas distintas de hacer mi trabajo.', false], ['aper', 'Prefiero rutinas que no cambien nunca.', true], ['aper', 'Me interesan temas ajenos a mi área.', false], ['aper', 'Me incomodan las ideas poco convencionales.', true],
  ['extr', 'Me resulta fácil iniciar conversaciones con desconocidos.', false], ['extr', 'Me siento cómodo hablando frente a un grupo.', false], ['extr', 'Prefiero trabajar solo la mayor parte del tiempo.', true], ['extr', 'Tomo la iniciativa en las reuniones.', false], ['extr', 'En eventos sociales suelo quedarme en silencio.', true],
  ['amab', 'Me intereso por cómo se sienten mis compañeros.', false], ['amab', 'Estoy dispuesto a ceder para llegar a un acuerdo.', false], ['amab', 'Cuando alguien se equivoca me cuesta disimular mi molestia.', true], ['amab', 'Ayudo a otros aunque no me lo pidan.', false], ['amab', 'Desconfío de las intenciones de la gente.', true],
  ['esta', 'Mantengo la calma bajo presión.', false], ['esta', 'Me recupero rápido de un contratiempo.', false], ['esta', 'Me preocupo en exceso por cosas pequeñas.', true], ['esta', 'Las críticas me afectan durante varios días.', true], ['esta', 'Rara vez me siento abrumado por mi carga de trabajo.', false],
]
export const DIM_NOMBRES: Record<string, string> = { resp: 'Responsabilidad', aper: 'Apertura al cambio', extr: 'Extraversión', amab: 'Amabilidad', esta: 'Estabilidad emocional', int: 'Integridad' }
const INTEG: [string, boolean, boolean][] = [
  ['Está bien llevarse útiles de la oficina si son de poco valor.', true, false], ['Informaría a mi jefe si descubro un error mío que nadie notó.', false, false],
  ['Si un compañero incumple las normas de seguridad, se lo haría saber.', false, false], ['A veces es aceptable exagerar las horas trabajadas en un reporte.', true, false],
  ['Cumplo las reglas aunque considere que no tienen sentido.', false, false], ['Si me dieran un vuelto de más por error, lo devolvería.', false, false],
  ['Faltar al trabajo con una excusa falsa es algo común y no es grave.', true, false], ['Guardo reserva de la información confidencial de mi empleador.', false, false],
  ['Aceptaría un regalo de un proveedor a cambio de una preferencia.', true, false], ['Asumo la responsabilidad cuando algo sale mal en mi área.', false, false],
  ['Nunca he dicho una mentira, ni siquiera pequeña.', false, true], ['Jamás he sentido molestia hacia un compañero de trabajo.', false, true], ['Siempre hago lo correcto, sin excepción.', false, true],
  ['Copiar la idea de un colega sin mencionarlo es válido si nadie lo nota.', true, false], ['Prefiero perder una venta antes que engañar a un cliente.', false, false],
]
const LIK = ['Totalmente en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Totalmente de acuerdo']

// ---------- Generadores ----------
function genNum(seed: number): Item[] {
  const r = rng(seed); const out: Item[] = []
  { const p = pick(r, [10, 15, 20, 25, 30, 40, 60]); const N = 20 * ri(r, 5, 40); const a = p * N / 100; out.push(mcq(r, '¿Cuánto es el ' + p + '% de ' + N + '?', String(a), numDistract(r, a), p + '% de ' + N + ' = ' + a)) }
  { const u = ri(r, 3, 12); const a = ri(r, 3, 9); const b = a + ri(r, 2, 8); out.push(mcq(r, a + ' cuadernos cuestan S/ ' + (a * u) + '. ¿Cuánto cuestan ' + b + ' cuadernos iguales?', 'S/ ' + (b * u), numDistract(r, b * u).map(x => 'S/ ' + x), 'Precio unitario S/ ' + u)) }
  { const s = ri(r, 2, 9); const a0 = ri(r, 1, 20); const ans = a0 + 5 * s; out.push(mcq(r, 'Complete la serie: ' + [0, 1, 2, 3, 4].map(i => a0 + i * s).join(', ') + ', ...', String(ans), numDistract(r, ans), 'Aumenta de ' + s + ' en ' + s)) }
  { const f = pick(r, [2, 3]); const a0 = ri(r, 1, 4); const sq = [0, 1, 2, 3, 4].map(i => a0 * Math.pow(f, i)); const ans = a0 * Math.pow(f, 5); out.push(mcq(r, 'Complete la serie: ' + sq.join(', ') + ', ...', String(ans), numDistract(r, ans), 'Cada término se multiplica por ' + f)) }
  { const m = ri(r, 10, 40); const d1 = ri(r, 2, 9); const d2 = ri(r, 1, 9); const arr = [m - d1, m + d1, m - d2, m + d2]; out.push(mcq(r, 'Cuatro ventas diarias fueron ' + shuffle(r, arr).join(', ') + '. ¿Cuál es el promedio?', String(m), numDistract(r, m), 'La suma es ' + 4 * m)) }
  { const P0 = 20 * ri(r, 5, 25); const d = pick(r, [10, 20, 25, 30, 40]); const ans = P0 * (100 - d) / 100; out.push(mcq(r, 'Un artículo cuesta S/ ' + P0 + ' y tiene ' + d + '% de descuento. ¿Cuál es el precio final?', 'S/ ' + n2(ans), numDistract(r, ans).map(x => 'S/ ' + x), 'Precio final = ' + P0 + ' × ' + (100 - d) + '%')) }
  { const v = pick(r, [40, 50, 60, 80]); const t = ri(r, 2, 6); out.push(mcq(r, 'Un vehículo viaja a ' + v + ' km/h durante ' + t + ' horas. ¿Qué distancia recorre?', v * t + ' km', numDistract(r, v * t).map(x => x + ' km'), 'Distancia = velocidad × tiempo')) }
  { const S = 100 * ri(r, 12, 40); const p = pick(r, [5, 10, 15, 20, 25]); const ans = S * (100 + p) / 100; out.push(mcq(r, 'Un sueldo de S/ ' + S + ' aumenta ' + p + '%. ¿Cuál es el nuevo sueldo?', 'S/ ' + n2(ans), numDistract(r, ans).map(x => 'S/ ' + x), S + ' × ' + (100 + p) + '%')) }
  { const den = pick(r, [3, 4, 5, 6, 8]); const num = ri(r, 1, den - 1); const N = den * ri(r, 4, 15); const ans = N / den * num; out.push(mcq(r, '¿Cuánto es ' + num + '/' + den + ' de ' + N + '?', String(ans), numDistract(r, ans), N + ' ÷ ' + den + ' × ' + num)) }
  { const x = ri(r, 1, 4), y = ri(r, 2, 6); const k = ri(r, 3, 9); const S = (x + y) * k * 10; const ans = Math.max(x, y) * k * 10; out.push(mcq(r, 'Se reparten S/ ' + S + ' en la razón ' + x + ' : ' + y + '. ¿Cuánto recibe la parte mayor?', 'S/ ' + ans, numDistract(r, ans).map(v => 'S/ ' + v), 'Cada parte vale S/ ' + k * 10)) }
  { const a0 = ri(r, 2, 9); const st = ri(r, 2, 5); const arr: number[] = []; let u = a0, w = 50; for (let i = 0; i < 3; i++) { arr.push(u); arr.push(w); u += st; w -= st } const ans = u; out.push(mcq(r, 'Complete la serie alternada: ' + arr.join(', ') + ', ...', String(ans), numDistract(r, ans), 'Hay dos series intercaladas; la que sube de ' + st + ' en ' + st + ' continúa con ' + ans)) }
  { const x = ri(r, 3, 15), a = ri(r, 2, 6), b = ri(r, 1, 20); out.push(mcq(r, 'Si ' + a + 'x + ' + b + ' = ' + (a * x + b) + ', ¿cuánto vale x?', String(x), numDistract(r, x), 'x = (' + (a * x + b) + ' − ' + b + ') ÷ ' + a)) }
  return out
}
function genLogico(seed: number): Item[] {
  const r = rng(seed + 7); const out: Item[] = []
  { const a0 = ri(r, 2, 5); const arr = [0, 1, 2, 3, 4].map(i => (a0 + i) * (a0 + i)); const ans = (a0 + 5) * (a0 + 5); out.push(mcq(r, 'Complete la serie: ' + arr.join(', ') + ', ...', String(ans), numDistract(r, ans), 'Son cuadrados consecutivos')) }
  { const d0 = ri(r, 1, 3); const a0 = ri(r, 1, 6); const arr = [a0]; let d = d0; for (let i = 0; i < 4; i++) { arr.push(arr[arr.length - 1] + d); d++ } const ans = arr[arr.length - 1] + d; out.push(mcq(r, 'Complete la serie: ' + arr.join(', ') + ', ...', String(ans), numDistract(r, ans), 'La diferencia aumenta de 1 en 1')) }
  { const x = ri(r, 1, 6), y = ri(r, 1, 6); const arr = [x, y]; for (let i = 0; i < 4; i++) arr.push(arr[arr.length - 1] + arr[arr.length - 2]); const ans = arr[arr.length - 1] + arr[arr.length - 2]; out.push(mcq(r, 'Complete la serie: ' + arr.join(', ') + ', ...', String(ans), numDistract(r, ans), 'Cada término es la suma de los dos anteriores')) }
  const AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let k = 0; k < 2; k++) { const st = ri(r, 2, 3); const s0 = ri(r, 0, 6); const arr = [0, 1, 2, 3, 4].map(i => AB[s0 + i * st]); const ans = AB[s0 + 5 * st]; const ds = [AB[s0 + 5 * st + 1], AB[s0 + 5 * st - 1], AB[s0 + 4 * st + 1], AB[s0 + 6 * st]]; out.push(mcq(r, 'Complete la serie de letras: ' + arr.join(', ') + ', ...', ans, ds.filter(Boolean), 'Se avanza ' + st + ' letras cada vez')) }
  { const a0 = ri(r, 3, 8); const arr = [a0, a0 * 2, a0 * 2 + 3, (a0 * 2 + 3) * 2, (a0 * 2 + 3) * 2 + 3]; const ans = arr[4] * 2; out.push(mcq(r, 'Complete la serie: ' + arr.join(', ') + ', ...', String(ans), numDistract(r, ans), 'Se alterna × 2 y + 3')) }
  out.push(mcq(r, 'Si todos los A son B y todos los B son C, entonces:', 'Todos los A son C', ['Todos los C son A', 'Ningún A es C', 'Algunos C no son B'], 'Transitividad'))
  out.push(mcq(r, 'Ana es mayor que Beto y Beto es mayor que Carla. ¿Quién es el menor de los tres?', 'Carla', ['Ana', 'Beto', 'No se puede saber'], 'Ana > Beto > Carla'))
  out.push(mcq(r, 'María tiene el doble de la edad de Luis. Si Luis tiene 12 años, ¿cuál es la suma de sus edades?', '36', ['24', '30', '48'], '12 + 24'))
  out.push(mcq(r, 'Hoy es martes. ¿Qué día de la semana será dentro de 10 días?', 'Viernes', ['Jueves', 'Sábado', 'Miércoles'], '10 = 7 + 3; martes + 3 = viernes'))
  return out.slice(0, 10)
}
function genVerbal(seed: number): Item[] {
  const r = rng(seed + 13)
  const B: [string, string, string[]][] = [
    ['Sinónimo de DILIGENTE:', 'Aplicado', ['Perezoso', 'Distraído', 'Tímido']], ['Antónimo de ESCASO:', 'Abundante', ['Raro', 'Pequeño', 'Limitado']],
    ['Sinónimo de MITIGAR:', 'Atenuar', ['Agravar', 'Ocultar', 'Postergar']], ['Antónimo de TRANSPARENTE:', 'Opaco', ['Claro', 'Limpio', 'Frágil']],
    ['MÉDICO es a HOSPITAL como PROFESOR es a:', 'Colegio', ['Libro', 'Alumno', 'Pizarra']], ['OJO es a VER como OÍDO es a:', 'Oír', ['Sonido', 'Hablar', 'Música']],
    ['La gerente ___ la reunión porque faltaba quórum.', 'suspendió', ['suspendieron', 'suspender', 'suspendiendo']], ['¿Qué palabra NO pertenece al grupo? Rojo, Azul, Verde, Mesa', 'Mesa', ['Rojo', 'Azul', 'Verde']],
    ['Sinónimo de RATIFICAR:', 'Confirmar', ['Negar', 'Modificar', 'Olvidar']], ['PRESCINDIR significa:', 'Dejar de contar con algo o alguien', ['Exigir algo con urgencia', 'Elegir entre varias opciones', 'Repetir una tarea']],
  ]
  return B.map(b => mcq(r, b[0], b[1], b[2]))
}

// ---------- Construccion ----------
export function construir(ids: string[], ia: Record<string, any>, seed: number): Prueba[] {
  const out: Prueba[] = []
  for (const id of ids) {
    const cat = CATALOGO.find(c => c.id === id); if (!cat) continue
    const base = { id, titulo: cat.titulo, tiempo: cat.tiempo }
    if (id === 'ficha') out.push({ ...base, tipo: 'ficha', instr: 'Complete sus datos. Los campos con * son obligatorios.', items: [] })
    else if (id === 'personalidad') out.push({ ...base, tipo: 'likert', instr: 'Indique qué tan de acuerdo está con cada afirmación. No hay respuestas buenas ni malas: responda con sinceridad.', items: P.map(p => ({ q: p[1], dim: p[0], inv: p[2], o: LIK })) })
    else if (id === 'integridad') out.push({ ...base, tipo: 'likert', instr: 'Indique qué tan de acuerdo está con cada afirmación. Responda con sinceridad.', items: INTEG.map(p => ({ q: p[0], dim: 'int', inv: p[1], desir: p[2], o: LIK })) })
    else if (id === 'num') out.push({ ...base, tipo: 'mcq', instr: 'Elija la alternativa correcta. Puede usar lápiz y papel; no use calculadora.', items: genNum(seed) })
    else if (id === 'logico') out.push({ ...base, tipo: 'mcq', instr: 'Elija la alternativa correcta.', items: genLogico(seed) })
    else if (id === 'verbal') out.push({ ...base, tipo: 'mcq', instr: 'Elija la alternativa correcta.', items: genVerbal(seed) })
    else if (id === 'situacional' || id === 'tecnica') {
      const items = normalizarMcq(ia[id]); if (items.length) out.push({ ...base, tipo: 'mcq', ia: true, instr: id === 'situacional' ? 'Lea cada situación y elija la acción que usted considera más adecuada.' : 'Elija la alternativa correcta.', items })
    } else if (id === 'caso') {
      const items = normalizarAbiertas(ia[id]); if (items.length) out.push({ ...base, tipo: 'abierta', ia: true, instr: 'Responda con sus propias palabras, de forma clara y concreta.', items })
    }
  }
  return out
}

// Limpia/valida lo que devuelva la IA: nunca se confia en su formato.
export function normalizarMcq(raw: any): Item[] {
  const arr = Array.isArray(raw) ? raw : []
  const out: Item[] = []
  for (const x of arr) {
    const q = String(x?.q || x?.pregunta || '').replace(/\*\*/g, '').trim()
    let o: string[] = Array.isArray(x?.o || x?.opciones) ? (x.o || x.opciones).map((s: any) => String(s).replace(/\*\*/g, '').replace(/^[A-Da-d][\)\.\:]\s*/, '').trim()).filter(Boolean) : []
    let c = Number(x?.correcta ?? x?.respuesta)
    if (!q || o.length < 3) continue
    o = o.slice(0, 4)
    if (!(c >= 0 && c < o.length)) continue
    out.push({ q, o, correcta: Math.floor(c), exp: x?.exp || x?.explicacion ? String(x.exp || x.explicacion).replace(/\*\*/g, '').trim() : undefined })
  }
  return out
}
export function normalizarAbiertas(raw: any): Item[] {
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((x: any) => ({ q: String(typeof x === 'string' ? x : (x?.q || x?.caso || '')).replace(/\*\*/g, '').trim(), exp: x?.criterios ? String(Array.isArray(x.criterios) ? x.criterios.join('; ') : x.criterios) : undefined })).filter((i: Item) => i.q)
}
// Extrae el primer JSON (objeto o arreglo) de una respuesta de IA
export function extraerJson(txt: string): any {
  const t = String(txt || '').replace(/```json|```/gi, '')
  const a = t.search(/[\[{]/); if (a < 0) return null
  const open = t[a], close = open === '[' ? ']' : '}'
  const b = t.lastIndexOf(close); if (b <= a) return null
  try { return JSON.parse(t.slice(a, b + 1)) } catch { return null }
}

// ---------- Version publica (sin claves) ----------
export function publica(p: Prueba): any {
  return { id: p.id, titulo: p.titulo, tipo: p.tipo, tiempo: p.tiempo, instr: p.instr, items: p.items.map(i => ({ q: i.q, o: i.o })) }
}

// ---------- Puntaje (solo servidor) ----------
export function puntuar(p: Prueba, resp: any): any {
  if (p.tipo === 'ficha') {
    const r = resp || {}; const faltan = FICHA_CAMPOS.filter(c => c.req && (c.t === 'check' ? r[c.k] !== true : !String(r[c.k] ?? '').trim())).map(c => c.l)
    return { completa: faltan.length === 0, faltan }
  }
  const arr: any[] = Array.isArray(resp) ? resp : []
  if (p.tipo === 'mcq') {
    let ok = 0; const det: number[] = []
    p.items.forEach((it, i) => { const v = Number(arr[i]); const acierto = Number.isInteger(v) && v === it.correcta; if (acierto) ok++; det.push(acierto ? 1 : 0) })
    return { correctas: ok, total: p.items.length, porcentaje: Math.round(ok / p.items.length * 100), detalle: det, sin_responder: p.items.filter((_, i) => !(Number(arr[i]) >= 0)).length }
  }
  if (p.tipo === 'likert') {
    const sum: Record<string, number> = {}, cnt: Record<string, number> = {}; let dS = 0, dN = 0
    p.items.forEach((it, i) => {
      let v = Number(arr[i]); if (!(v >= 1 && v <= 5)) return
      if (it.desir) { dS += v; dN++; return }
      if (it.inv) v = 6 - v
      const d = it.dim || 'x'; sum[d] = (sum[d] || 0) + v; cnt[d] = (cnt[d] || 0) + 1
    })
    const dims: Record<string, number> = {}
    Object.keys(sum).forEach(d => { dims[d] = Math.round(((sum[d] / cnt[d]) - 1) / 4 * 100) })
    const res: any = { dimensiones: dims, nombres: DIM_NOMBRES }
    if (dN) { const m = dS / dN; res.deseabilidad = Math.round((m - 1) / 4 * 100); res.alerta_deseabilidad = m >= 4.5 }
    return res
  }
  return { respondidas: arr.filter(x => String(x || '').trim().length > 0).length, total: p.items.length }
}
export function nivel(pct: number): string { return pct >= 75 ? 'Alto' : pct >= 50 ? 'Medio' : pct >= 30 ? 'Medio-bajo' : 'Bajo' }
