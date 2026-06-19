import { Router } from 'express'
import {
  createUser,
  deleteUser,
  login,
  logout,
  renderLogin,
  renderUserSettings,
  updateUser
} from '../controller/user.controller.js'

export const publicUserRouter = Router()
export const protectedUserRouter = Router()

publicUserRouter.get('/login', renderLogin)
publicUserRouter.post('/login', login)

protectedUserRouter.post('/logout', logout)
protectedUserRouter.get('/configuracoes/usuarios', renderUserSettings)
protectedUserRouter.post('/configuracoes/usuarios', createUser)
protectedUserRouter.post('/configuracoes/usuarios/:uuid/editar', updateUser)
protectedUserRouter.post('/configuracoes/usuarios/:uuid/excluir', deleteUser)
