import { Router } from 'express'
import {
  registrarRetirada,
  renderDistribuicaoProjeto,
  renderDistribuicoes
} from '../controller/distribuicao.controller.js'

const distribuicaoRouter = Router()

distribuicaoRouter.get('/distribuicoes', renderDistribuicoes)
distribuicaoRouter.get('/distribuicoes/:idProjeto', renderDistribuicaoProjeto)
distribuicaoRouter.post('/distribuicoes/:idProjeto/participantes/:idCadastro', registrarRetirada)

export default distribuicaoRouter
