import {
  createDistribuicao,
  findCadastroAtivoById,
  findDistribuicaoByCadastroAndData,
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

export async function listarProjetosParaDistribuicao() {
  return await listProjetosAtivos()
}

export async function obterDistribuicaoDoProjeto(idProjeto, data = today()) {
  const projeto = await findProjetoAtivoById(Number(idProjeto))
  const dataSelecionada = normalizeDate(data) || today()

  if (!projeto) {
    return null
  }

  return {
    projeto,
    participantes: await listParticipantesDistribuicao(projeto.id, dataSelecionada),
    dataSelecionada
  }
}

export async function registrarDistribuicao({ idCadastro, data }) {
  const cadastro = await findCadastroAtivoById(Number(idCadastro))

  if (!cadastro) {
    return {
      ok: false,
      message: 'Participante ativo não encontrado para este projeto.'
    }
  }

  const dataDistribuicao = normalizeDate(data) || today()

  if (await findDistribuicaoByCadastroAndData({ idCadastro: cadastro.id, data: dataDistribuicao })) {
    return {
      ok: false,
      message: 'A retirada desse participante já foi registrada nesta data.',
      idProjeto: cadastro.idProjeto,
      data: dataDistribuicao
    }
  }

  await createDistribuicao({
    idCadastro: cadastro.id,
    data: dataDistribuicao
  })

  return {
    ok: true,
    message: 'Retirada registrada com sucesso.',
    idProjeto: cadastro.idProjeto,
    data: dataDistribuicao
  }
}
