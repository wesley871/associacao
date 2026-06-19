import { hashPassword, shouldRehashPassword, verifyPassword } from '../../../utils/password.util.js'
import { signToken } from '../../../utils/jwt.util.js'
import {
  countUsers,
  createUser,
  deleteUser,
  findAuthByUuid,
  findByLogin,
  findByUuid,
  listUsers,
  updateUser,
  updatePasswordHash
} from '../repository/user.repository.js'

const DEFAULT_ADMIN_LOGIN = process.env.DEFAULT_ADMIN_LOGIN ?? 'admin'
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD ?? 'admin123'

function normalizeLogin(login = '') {
  return login.trim()
}

function isUniqueConstraintError(error) {
  return error?.code === 'ERR_SQLITE_CONSTRAINT_UNIQUE'
    || error?.message?.includes('UNIQUE constraint failed')
}

export function ensureDefaultAdmin() {
  if (countUsers() > 0) {
    return null
  }

  return createUser({
    login: DEFAULT_ADMIN_LOGIN,
    hash: hashPassword(DEFAULT_ADMIN_PASSWORD)
  })
}

export function authenticateUser({ login, password }) {
  if (!login || !password) {
    return null
  }

  const user = findByLogin(login)

  if (!user || !verifyPassword(password, user.hash)) {
    return null
  }

  if (shouldRehashPassword(user.hash)) {
    updatePasswordHash(user.uuid, hashPassword(password))
  }

  const token = signToken({
    sub: user.uuid,
    login: user.login
  })

  return {
    token,
    user: {
      uuid: user.uuid,
      login: user.login,
      idPessoa: user.idPessoa
    }
  }
}

export function findUserByUuid(uuid) {
  if (!uuid) {
    return null
  }

  return findByUuid(uuid)
}

export function getUserManagementData(editUuid = null) {
  const users = listUsers()
  const editUser = editUuid ? findByUuid(editUuid) : null

  return {
    users,
    editUser
  }
}

export function createSystemUser({ login, password }) {
  const normalizedLogin = normalizeLogin(login)

  if (!normalizedLogin || !password) {
    return {
      ok: false,
      message: 'Informe login e senha para cadastrar o usuário.'
    }
  }

  try {
    createUser({
      login: normalizedLogin,
      hash: hashPassword(password)
    })

    return {
      ok: true,
      message: 'Usuário cadastrado com sucesso.'
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: 'Já existe um usuário com esse login.'
      }
    }

    throw error
  }
}

export function updateSystemUser({ uuid, login, password }) {
  const currentUser = findAuthByUuid(uuid)
  const normalizedLogin = normalizeLogin(login)
  const nextPassword = password?.trim()

  if (!currentUser) {
    return {
      ok: false,
      message: 'Usuário não encontrado.'
    }
  }

  if (!normalizedLogin) {
    return {
      ok: false,
      message: 'Informe o login do usuário.'
    }
  }

  try {
    updateUser({
      uuid,
      login: normalizedLogin,
      hash: nextPassword ? hashPassword(nextPassword) : null
    })

    return {
      ok: true,
      message: 'Usuário atualizado com sucesso.'
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: 'Já existe um usuário com esse login.'
      }
    }

    throw error
  }
}

export function deleteSystemUser({ uuid, currentUserUuid }) {
  const user = findByUuid(uuid)

  if (!user) {
    return {
      ok: false,
      message: 'Usuário não encontrado.'
    }
  }

  if (uuid === currentUserUuid) {
    return {
      ok: false,
      message: 'Você não pode apagar o usuário que está usando agora.'
    }
  }

  if (countUsers() <= 1) {
    return {
      ok: false,
      message: 'Não é possível apagar o último usuário do sistema.'
    }
  }

  deleteUser(uuid)

  return {
    ok: true,
    message: 'Usuário apagado com sucesso.'
  }
}
