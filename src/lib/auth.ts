import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'preda-secret-2025')
export async function createToken(payload: any) {
  return new SignJWT(payload).setProtectedHeader({alg:'HS256'}).setExpirationTime('8h').sign(SECRET)
}
export async function getSession() {
  try {
    const token = cookies().get('preda_token')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, SECRET)
    return payload as any
  } catch { return null }
}
