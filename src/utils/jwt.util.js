import jwt from 'jsonwebtoken'

const DEFAULT_SECRET = 'troque-este-segredo-em-producao'
const TOKEN_EXPIRATION = '8h'

function getSecret() {
  return process.env.JWT_SECRET ?? DEFAULT_SECRET
}

export function signToken(payload, expiresIn = TOKEN_EXPIRATION) {
  return jwt.sign(payload, getSecret(), {
    algorithm: 'HS256',
    expiresIn
  })
}

export function verifyToken(token = '') {
  try {
    return jwt.verify(token, getSecret(), {
      algorithms: ['HS256']
    })
  } catch {
    return null
  }
}
