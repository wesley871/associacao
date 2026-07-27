import { Router } from 'express'
import {
  atualizarPreCadastro,
  criarPreCadastro,
  moverParaCadastroCompleto,
  renderConsultarPreCadastros,
  renderEditarPreCadastro,
  renderPreCadastro
} from '../controller/pre-cadastro.controller.js'

const preCadastroRouter = Router()

preCadastroRouter.get('/pre-cadastro', renderPreCadastro)
preCadastroRouter.post('/pre-cadastro', criarPreCadastro)
preCadastroRouter.get('/pre-cadastros', renderConsultarPreCadastros)
preCadastroRouter.get('/pre-cadastros/:id', renderEditarPreCadastro)
preCadastroRouter.post('/pre-cadastros/:id', atualizarPreCadastro)
preCadastroRouter.post('/pre-cadastros/:id/concluir', moverParaCadastroCompleto)

export default preCadastroRouter
