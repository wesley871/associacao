import { Router } from 'express'
import {
  adicionarParticipante,
  apagarParticipante,
  atualizarProjeto,
  criarProjeto,
  inativarParticipante,
  inativarProjeto,
  renderDetalheProjeto,
  renderEditarProjeto,
  renderNovoProjeto,
  renderProjetos
} from '../controller/projeto.controller.js'

const projetoRouter = Router()

projetoRouter.get('/projetos', renderProjetos)
projetoRouter.get('/projetos/novo', renderNovoProjeto)
projetoRouter.post('/projetos/novo', criarProjeto)
projetoRouter.get('/projetos/:id', renderDetalheProjeto)
projetoRouter.get('/projetos/:id/editar', renderEditarProjeto)
projetoRouter.post('/projetos/:id/editar', atualizarProjeto)
projetoRouter.post('/projetos/:id/excluir', inativarProjeto)
projetoRouter.post('/projetos/:id/participantes', adicionarParticipante)
projetoRouter.post('/projetos/:id/participantes/:idCadastro/remover', inativarParticipante)
projetoRouter.post('/projetos/:id/participantes/:idCadastro/excluir', apagarParticipante)

export default projetoRouter
