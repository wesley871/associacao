import {
  authenticateUser,
  createSystemUser,
  deleteSystemUser,
  getUserManagementData,
  updateSystemUser
} from '../service/user.service.js'

const AUTH_COOKIE_NAME = 'auth_token'
const COOKIE_MAX_AGE = 1000 * 60 * 60 * 8

function redirectWithFeedback(res, path, feedback) {
  const status = feedback.ok ? 'success' : 'error'
  const message = encodeURIComponent(feedback.message)

  res.redirect(`${path}?${status}=${message}`)
}

export function renderLogin(req, res) {
  res.render('login', {
    error: req.query.error ? 'Login ou senha inválidos.' : null
  }, (err, html) => {
    if (err) {
      res.status(500).send(err.message)
      return
    }

    res.status(200).send(html)
  })
}

export function login(req, res) {
  const auth = authenticateUser({
    login: req.body.login,
    password: req.body.password
  })

  if (!auth) {
    res.redirect('/login?error=1')
    return
  }

  res.cookie(AUTH_COOKIE_NAME, auth.token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE
  })

  res.redirect('/home')
}

export function logout(req, res) {
  res.clearCookie(AUTH_COOKIE_NAME)
  res.redirect('/login')
}

export function renderUserSettings(req, res) {
  const { users, editUser } = getUserManagementData(req.query.edit)

  res.render('configuracoes-usuarios', {
    users,
    editUser,
    currentUser: req.user,
    success: req.query.success ?? null,
    error: req.query.error ?? null
  }, (err, html) => {
    if (err) {
      res.status(500).send(err.message)
      return
    }

    res.status(200).send(html)
  })
}

export function createUser(req, res) {
  const feedback = createSystemUser({
    login: req.body.login,
    password: req.body.password
  })

  redirectWithFeedback(res, '/configuracoes/usuarios', feedback)
}

export function updateUser(req, res) {
  const feedback = updateSystemUser({
    uuid: req.params.uuid,
    login: req.body.login,
    password: req.body.password
  })

  redirectWithFeedback(res, '/configuracoes/usuarios', feedback)
}

export function deleteUser(req, res) {
  const feedback = deleteSystemUser({
    uuid: req.params.uuid,
    currentUserUuid: req.user.uuid
  })

  redirectWithFeedback(res, '/configuracoes/usuarios', feedback)
}
