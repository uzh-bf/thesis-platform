import JWT from 'jsonwebtoken'
import { DefaultJWT, JWTDecodeParams, JWTEncodeParams } from 'next-auth/jwt'

export async function decode({ token, secret }: JWTDecodeParams) {
  if (!token) return null
  return JWT.verify(token, secret) as DefaultJWT
}

export async function encode({ token, secret }: JWTEncodeParams) {
  return JWT.sign(token ?? {}, secret)
}
