import { verifyToken } from '../utils/jwt.util.js'
import { findUserByUuid } from '../modules/user/service/user.service.js'

const AUTH_COOKIE_NAME = 'auth_token'

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce((cookies, cookie) => {
      const [name, ...value] = cookie.split('=')
      cookies[name] = decodeURIComponent(value.join('='))
      return cookies
    }, {})
}

function getToken(req) {
  const authorization = req.headers.authorization ?? ''

  if (authorization.startsWith('Bearer ')) {
    return authorization.replace('Bearer ', '').trim()
  }

  return parseCookies(req.headers.cookie)[AUTH_COOKIE_NAME]
}

function wantsJson(req) {
  return req.xhr || req.headers.accept?.includes('application/json')
}

export async function requireAuth(req, res, next) {
  const payload = verifyToken(getToken(req))

  if (!payload) {
    if (wantsJson(req)) {
      res.status(401).json({ error: 'Não autorizado.' })
      return
    }

    res.redirect('/login')
    return
  }

  const user = await findUserByUuid(payload.sub)

  if (!user) {
    if (wantsJson(req)) {
      res.status(401).json({ error: 'Usuário não encontrado.' })
      return
    }

    res.redirect('/login')
    return
  }

  req.user = user
  next()
}
