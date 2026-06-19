import {
  addParticipante,
  createProjeto,
  findActiveCadastro,
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

export function consultarProjetos(search = '') {
  return listProjetos(search)
}

export function obterProjetoDetalhado(id) {
  const projeto = findProjetoById(Number(id))

  if (!projeto) {
    return null
  }

  return {
    ...projeto,
    participantes: listParticipantes(projeto.id)
  }
}

export function cadastrarProjeto({ nome, descricao, inicio, fim }) {
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

  const saved = createProjeto(projeto)

  return {
    ok: true,
    message: 'Projeto cadastrado com sucesso.',
    projeto: saved
  }
}

export function editarProjeto({ id, nome, descricao, inicio, fim }) {
  const currentProjeto = findProjetoById(Number(id))

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
    projeto: updateProjeto(projeto)
  }
}

export function excluirProjeto(id) {
  const projeto = findProjetoById(Number(id))

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
    projeto: inactivateProjeto(Number(id), today())
  }
}

export function incluirParticipante({ idProjeto, cpf, inicio }) {
  const projeto = findProjetoById(Number(idProjeto))

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

  const pessoa = findPessoaByCpf(onlyNumbers(cpf))

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

  if (findActiveCadastro({ idProjeto: Number(idProjeto), idPessoa: pessoa.id })) {
    return {
      ok: false,
      message: 'Essa pessoa já participa deste projeto.'
    }
  }

  addParticipante({
    idProjeto: Number(idProjeto),
    idPessoa: pessoa.id,
    inicio: normalizeText(inicio) || today()
  })

  return {
    ok: true,
    message: 'Participante adicionado com sucesso.'
  }
}

export function removerParticipante({ idProjeto, idCadastro }) {
  const projeto = findProjetoById(Number(idProjeto))

  if (!projeto) {
    return {
      ok: false,
      message: 'Projeto não encontrado.'
    }
  }

  inactivateParticipante({
    idCadastro: Number(idCadastro),
    fim: today()
  })

  return {
    ok: true,
    message: 'Participante removido do projeto.'
  }
}
