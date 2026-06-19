import {
  createDistribuicao,
  findCadastroAtivoById,
  findDistribuicaoByCadastro,
  findProjetoAtivoById,
  listParticipantesDistribuicao,
  listProjetosAtivos
} from '../repository/distribuicao.repository.js'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeDate(value = '') {
  return String(value).trim()
}

export function listarProjetosParaDistribuicao() {
  return listProjetosAtivos()
}

export function obterDistribuicaoDoProjeto(idProjeto) {
  const projeto = findProjetoAtivoById(Number(idProjeto))

  if (!projeto) {
    return null
  }

  return {
    projeto,
    participantes: listParticipantesDistribuicao(projeto.id),
    dataAtual: today()
  }
}

export function registrarDistribuicao({ idCadastro, data }) {
  const cadastro = findCadastroAtivoById(Number(idCadastro))

  if (!cadastro) {
    return {
      ok: false,
      message: 'Participante ativo não encontrado para este projeto.'
    }
  }

  if (findDistribuicaoByCadastro(cadastro.id)) {
    return {
      ok: false,
      message: 'A retirada desse participante já foi registrada.'
    }
  }

  const dataDistribuicao = normalizeDate(data) || today()

  createDistribuicao({
    idCadastro: cadastro.id,
    data: dataDistribuicao
  })

  return {
    ok: true,
    message: 'Retirada registrada com sucesso.',
    idProjeto: cadastro.idProjeto
  }
}
