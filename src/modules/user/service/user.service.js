import { hashPassword, shouldRehashPassword, verifyPassword } from '../../../utils/password.util.js'
import { signToken } from '../../../utils/jwt.util.js'
import { isUniqueConstraintError } from '../../../configs/db.config.js'
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

export async function ensureDefaultAdmin() {
  if (await countUsers() > 0) {
    return null
  }

  return await createUser({
    login: DEFAULT_ADMIN_LOGIN,
    hash: hashPassword(DEFAULT_ADMIN_PASSWORD)
  })
}

export async function authenticateUser({ login, password }) {
  if (!login || !password) {
    return null
  }

  const user = await findByLogin(login)

  if (!user || !verifyPassword(password, user.hash)) {
    return null
  }

  if (shouldRehashPassword(user.hash)) {
    await updatePasswordHash(user.uuid, hashPassword(password))
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

export async function findUserByUuid(uuid) {
  if (!uuid) {
    return null
  }

  return await findByUuid(uuid)
}

export async function getUserManagementData(editUuid = null) {
  const users = await listUsers()
  const editUser = editUuid ? await findByUuid(editUuid) : null

  return {
    users,
    editUser
  }
}

export async function createSystemUser({ login, password }) {
  const normalizedLogin = normalizeLogin(login)

  if (!normalizedLogin || !password) {
    return {
      ok: false,
      message: 'Informe login e senha para cadastrar o usuário.'
    }
  }

  try {
    await createUser({
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

export async function updateSystemUser({ uuid, login, password }) {
  const currentUser = await findAuthByUuid(uuid)
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
    await updateUser({
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

export async function deleteSystemUser({ uuid, currentUserUuid }) {
  const user = await findByUuid(uuid)

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

  if (await countUsers() <= 1) {
    return {
      ok: false,
      message: 'Não é possível apagar o último usuário do sistema.'
    }
  }

  await deleteUser(uuid)

  return {
    ok: true,
    message: 'Usuário apagado com sucesso.'
  }
}
