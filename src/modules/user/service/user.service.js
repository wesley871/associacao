import { signInWithEmailAndPassword } from 'firebase/auth'
import { signToken } from '../../../utils/jwt.util.js'
import { firebaseAuth } from '../../../utils/firebase.util.js'

const DEFAULT_ADMIN_LOGIN = process.env.DEFAULT_ADMIN_LOGIN ?? 'admin@associacao.com.br'

function normalizeLogin(login = '') {
  return login.trim()
}

function buildUserFromFirebaseUser(user) {
  return {
    uuid: user.uid,
    login: user.email,
    idPessoa: null
  }
}

export async function ensureDefaultAdmin() {
  return null
}

export async function authenticateUser({ login, password }) {
  const normalizedLogin = normalizeLogin(login)

  if (!normalizedLogin || !password) {
    return null
  }

  try {
    const credential = await signInWithEmailAndPassword(firebaseAuth, normalizedLogin, password)
    const user = buildUserFromFirebaseUser(credential.user)
    const token = signToken({
      sub: user.uuid,
      login: user.login
    })

    return {
      token,
      user
    }
  } catch {
    return null
  }
}

export async function findUserByUuid(uuid, login = null) {
  if (!uuid) {
    return null
  }

  return {
    uuid,
    login: login ?? uuid,
    idPessoa: null
  }
}

export async function getUserManagementData(editUuid = null, currentUser = null) {
  const users = currentUser
    ? [currentUser]
    : [{
      uuid: 'firebase-auth',
      login: DEFAULT_ADMIN_LOGIN,
      idPessoa: null
    }]
  const editUser = editUuid ? users.find((user) => user.uuid === editUuid) ?? null : null

  return {
    users,
    editUser
  }
}

export async function createSystemUser() {
  return {
    ok: false,
    message: 'Crie novos usuários pelo Firebase Authentication.'
  }
}

export async function updateSystemUser() {
  return {
    ok: false,
    message: 'Edite usuários pelo Firebase Authentication.'
  }
}

export async function deleteSystemUser() {
  return {
    ok: false,
    message: 'Apague usuários pelo Firebase Authentication.'
  }
}
