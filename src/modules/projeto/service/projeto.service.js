import {
  addParticipante,
  countDistribuicoesByCadastro,
  createProjeto,
  deleteParticipante,
  findActiveCadastro,
  findCadastroById,
  findPessoaByCpf,
  findProjetoById,
  inactivateParticipante,
  inactivateProjeto,
  listParticipantes,
  listProjetos,
  updateProjeto
} from '../repository/projeto.repository.js'

function normalizeText(value = '') {
  return String(value).trim()
}

function onlyNumbers(value = '') {
  return String(value).replace(/\D/g, '')
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export async function consultarProjetos(search = '') {
  return await listProjetos(search)
}

export async function obterProjetoDetalhado(id) {
  const projeto = await findProjetoById(Number(id))

  if (!projeto) {
    return null
  }

  return {
    ...projeto,
    participantes: await listParticipantes(projeto.id)
  }
}

export async function cadastrarProjeto({ nome, descricao, inicio, fim }) {
  const projeto = {
    nome: normalizeText(nome),
    descricao: normalizeText(descricao),
    inicio: normalizeText(inicio),
    fim: normalizeText(fim) || null
  }

  if (!projeto.nome || !projeto.inicio) {
    return {
      ok: false,
      message: 'Informe nome e data de início do projeto.'
    }
  }

  const saved = await createProjeto(projeto)

  return {
    ok: true,
    message: 'Projeto cadastrado com sucesso.',
    projeto: saved
  }
}

export async function editarProjeto({ id, nome, descricao, inicio, fim }) {
  const currentProjeto = await findProjetoById(Number(id))

  if (!currentProjeto) {
    return {
      ok: false,
      message: 'Projeto não encontrado.'
    }
  }

  const projeto = {
    id: Number(id),
    nome: normalizeText(nome),
    descricao: normalizeText(descricao),
    inicio: normalizeText(inicio),
    fim: normalizeText(fim) || null
  }

  if (!projeto.nome || !projeto.inicio) {
    return {
      ok: false,
      message: 'Informe nome e data de início do projeto.'
    }
  }

  return {
    ok: true,
    message: 'Projeto atualizado com sucesso.',
    projeto: await updateProjeto(projeto)
  }
}

export async function excluirProjeto(id) {
  const projeto = await findProjetoById(Number(id))

  if (!projeto) {
    return {
      ok: false,
      message: 'Projeto não encontrado.'
    }
  }

  if (!projeto.ativo) {
    return {
      ok: false,
      message: 'Este projeto já está inativo.'
    }
  }

  return {
    ok: true,
    message: 'Projeto inativado com sucesso.',
    projeto: await inactivateProjeto(Number(id), today())
  }
}

export async function incluirParticipante({ idProjeto, cpf, inicio }) {
  const projeto = await findProjetoById(Number(idProjeto))

  if (!projeto) {
    return {
      ok: false,
      message: 'Projeto não encontrado.'
    }
  }

  if (!projeto.ativo) {
    return {
      ok: false,
      message: 'Não é possível adicionar participante em projeto inativo.'
    }
  }

  const pessoa = await findPessoaByCpf(onlyNumbers(cpf))

  if (!pessoa) {
    return {
      ok: false,
      message: 'Nenhuma pessoa foi encontrada com esse CPF.'
    }
  }

  if (!pessoa.ativo) {
    return {
      ok: false,
      message: 'Essa pessoa está inativa e não pode entrar no projeto.'
    }
  }

  if (await findActiveCadastro({ idProjeto: Number(idProjeto), idPessoa: pessoa.id })) {
    return {
      ok: false,
      message: 'Essa pessoa já participa deste projeto.'
    }
  }

  await addParticipante({
    idProjeto: Number(idProjeto),
    idPessoa: pessoa.id,
    inicio: normalizeText(inicio) || today()
  })

  return {
    ok: true,
    message: 'Participante adicionado com sucesso.'
  }
}

export async function removerParticipante({ idProjeto, idCadastro }) {
  const projeto = await findProjetoById(Number(idProjeto))

  if (!projeto) {
    return {
      ok: false,
      message: 'Projeto não encontrado.'
    }
  }

  await inactivateParticipante({
    idCadastro: Number(idCadastro),
    fim: today()
  })

  return {
    ok: true,
    message: 'Participante removido do projeto.'
  }
}

export async function excluirParticipante({ idProjeto, idCadastro }) {
  const projeto = await findProjetoById(Number(idProjeto))

  if (!projeto) {
    return {
      ok: false,
      message: 'Projeto não encontrado.'
    }
  }

  const cadastro = await findCadastroById({
    idProjeto: Number(idProjeto),
    idCadastro: Number(idCadastro)
  })

  if (!cadastro) {
    return {
      ok: false,
      message: 'Participante não encontrado neste projeto.'
    }
  }

  if (await countDistribuicoesByCadastro(cadastro.id) > 0) {
    return {
      ok: false,
      message: 'Não é possível excluir participante com retirada registrada. Use a remoção para encerrar o vínculo.'
    }
  }

  await deleteParticipante(cadastro.id)

  return {
    ok: true,
    message: 'Participante excluído do projeto.'
  }
}
