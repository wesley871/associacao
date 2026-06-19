import { Router } from 'express'
import {
  processarImagem,
  redirectToLogin,
  renderCadastroAutomatico,
  renderHome
} from '../controller/home.controller.js'

export const publicHomeRouter = Router()
export const protectedHomeRouter = Router()

publicHomeRouter.get('/', redirectToLogin)

protectedHomeRouter.get('/home', renderHome)
protectedHomeRouter.get('/cadastro-automatico', renderCadastroAutomatico)
protectedHomeRouter.post('/img', processarImagem)
