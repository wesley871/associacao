import { Router } from 'express'
import {
  atualizarFamilia,
  buscarCep,
  cadastrarFamilia,
  inativarPessoa,
  renderCadastrarFamilia,
  renderConsultarFamilias,
  renderEditarFamilia
} from '../controller/familia.controller.js'

const familiaRouter = Router()

familiaRouter.get('/cadastrar', renderCadastrarFamilia)
familiaRouter.post('/cadastrar', cadastrarFamilia)
familiaRouter.get('/consultar', renderConsultarFamilias)
familiaRouter.get('/familias/:codigoFamiliar', renderEditarFamilia)
familiaRouter.post('/familias/:codigoFamiliar', atualizarFamilia)
familiaRouter.post('/familias/:codigoFamiliar/pessoas/:idPessoa/inativar', inativarPessoa)
familiaRouter.get('/api/cep/:cep', buscarCep)

export default familiaRouter
