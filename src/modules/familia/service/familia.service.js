import { isUniqueConstraintError } from '../../../configs/db.config.js'
import {
  countActivePessoasByFamilia,
  findFamiliaByCodigo,
  inactivatePessoa,
  listFamilias,
  saveFamilia,
  updateFamilia
} from '../repository/familia.repository.js'

function onlyNumbers(value = '') {
  return String(value).replace(/\D/g, '')
}

function toArray(value) {
  if (!value) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

function normalizeDate(value = '') {
  return String(value).trim()
}

function parseBrazilianDate(value = '') {
  if (value.includes('-')) {
    const [year, month, day] = value.split('-').map(Number)

    if (!day || !month || !year) {
      return null
    }

    return new Date(year, month - 1, day)
  }

  const [day, month, year] = value.split('/').map(Number)

  if (!day || !month || !year) {
    return null
  }

  return new Date(year, month - 1, day)
}

function isUnderAge(value = '') {
  const birthDate = parseBrazilianDate(value)

  if (!birthDate) {
    return false
  }

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1
  }

  return age < 18
}

export function buildFamiliaFromForm(body) {
  const nomes = toArray(body.familiarNome)
  const cpfs = toArray(body.familiarCpf)
  const nascimentos = toArray(body.familiarNascimento)
  const parentescos = toArray(body.familiarParentesco)
  const responsavelIndex = Number(body.responsavelFamiliar ?? 0)

  return {
    codigoFamiliar: onlyNumbers(body.codigoFamiliar),
    dataEntrevista: normalizeDate(body.dataEntrevista),
    folhaResumo: normalizeDate(body.folhaResumo),
    telefoneResponsavel: onlyNumbers(body.telefoneResponsavel),
    endereco: {
      cep: onlyNumbers(body.cep),
      logradouro: body.logradouro?.trim() ?? '',
      tipo: body.tipo?.trim() ?? '',
      nome: body.nome?.trim() ?? '',
      numero: body.numero?.trim() ?? '',
      complemento: body.complemento?.trim() ?? '',
      unidade: body.unidade?.trim() ?? '',
      bairro: body.bairro?.trim() ?? '',
      localidade: body.localidade?.trim() ?? '',
      uf: body.uf?.trim() ?? '',
      estado: body.estado?.trim() ?? '',
      regiao: body.regiao?.trim() ?? '',
      ibge: body.ibge?.trim() ?? '',
      gia: body.gia?.trim() ?? '',
      ddd: body.ddd?.trim() ?? '',
      siafi: body.siafi?.trim() ?? '',
      referencia: body.referencia?.trim() ?? ''
    },
    familiares: nomes
      .map((nomeCompleto, index) => ({
        responsavelFamiliar: index === responsavelIndex,
        parentesco: index === 0 ? '' : parentescos[index]?.trim() ?? '',
        nomeCompleto: nomeCompleto?.trim() ?? '',
        cpf: cpfs[index]?.trim() ?? '',
        nascimento: normalizeDate(nascimentos[index]),
        menor: isUnderAge(nascimentos[index])
      }))
      .filter((familiar) => familiar.nomeCompleto || familiar.cpf || familiar.nascimento)
  }
}

export function buildFamiliaEditFromForm(body) {
  const ids = toArray(body.pessoaId)
  const nomes = toArray(body.familiarNome)
  const cpfs = toArray(body.familiarCpf)
  const nascimentos = toArray(body.familiarNascimento)

  return {
    codigoFamiliar: onlyNumbers(body.codigoFamiliar),
    dataEntrevista: normalizeDate(body.dataEntrevista),
    folhaResumo: normalizeDate(body.folhaResumo),
    telefoneResponsavel: onlyNumbers(body.telefoneResponsavel),
    endereco: {
      cep: onlyNumbers(body.cep),
      logradouro: body.logradouro?.trim() ?? '',
      numero: body.numero?.trim() ?? '',
      complemento: body.complemento?.trim() ?? '',
      bairro: body.bairro?.trim() ?? '',
      localidade: body.localidade?.trim() ?? '',
      uf: body.uf?.trim() ?? '',
      estado: body.estado?.trim() ?? '',
      regiao: body.regiao?.trim() ?? '',
      ibge: body.ibge?.trim() ?? '',
      gia: body.gia?.trim() ?? '',
      ddd: body.ddd?.trim() ?? '',
      siafi: body.siafi?.trim() ?? '',
      referencia: body.referencia?.trim() ?? ''
    },
    familiares: nomes
      .map((nomeCompleto, index) => ({
        id: ids[index] ? Number(ids[index]) : null,
        responsavelFamiliar: index === 0,
        nomeCompleto: nomeCompleto?.trim() ?? '',
        cpf: cpfs[index]?.trim() ?? '',
        nascimento: normalizeDate(nascimentos[index]),
        menor: isUnderAge(nascimentos[index])
      }))
      .filter((familiar) => familiar.id || familiar.nomeCompleto || familiar.cpf || familiar.nascimento)
  }
}

export async function cadastrarFamilia(cadastro) {
  try {
    const saved = await saveFamilia(cadastro)

    return {
      ok: true,
      message: `Família cadastrada com ${saved.pessoas.length} pessoa(s).`,
      saved
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: 'Já existe uma pessoa cadastrada com um dos CPFs informados.'
      }
    }

    throw error
  }
}

export async function consultarFamilias(search = '') {
  return await listFamilias(search)
}

export async function obterFamilia(codigoFamiliar) {
  return await findFamiliaByCodigo(onlyNumbers(codigoFamiliar))
}

export async function editarFamilia(codigoAtual, cadastro) {
  const hasInvalidFamiliar = cadastro.familiares.some((familiar) => {
    return !familiar.nomeCompleto || !familiar.cpf || !familiar.nascimento
  })

  if (!cadastro.codigoFamiliar || !cadastro.dataEntrevista || !cadastro.folhaResumo || !cadastro.telefoneResponsavel || hasInvalidFamiliar) {
    return {
      ok: false,
      message: 'Informe código familiar, datas, telefone do responsável, nome, CPF e nascimento de todas as pessoas.'
    }
  }

  try {
    const familia = await updateFamilia(onlyNumbers(codigoAtual), cadastro)

    if (!familia) {
      return {
        ok: false,
        message: 'Família não encontrada.'
      }
    }

    return {
      ok: true,
      message: 'Família atualizada com sucesso.',
      familia
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: 'Já existe uma pessoa cadastrada com um dos CPFs informados.'
      }
    }

    throw error
  }
}

export async function inativarPessoaDaFamilia({ codigoFamiliar, idPessoa }) {
  const codigo = onlyNumbers(codigoFamiliar)

  if (await countActivePessoasByFamilia(codigo) <= 1) {
    return {
      ok: false,
      message: 'Não é possível inativar a última pessoa ativa da família.'
    }
  }

  await inactivatePessoa(Number(idPessoa))

  return {
    ok: true,
    message: 'Pessoa inativada com sucesso.'
  }
}

export async function consultarCep(cep) {
  const cepLimpo = onlyNumbers(cep)

  if (cepLimpo.length !== 8) {
    return {
      ok: false,
      status: 400,
      data: { error: 'Informe um CEP com 8 dígitos.' }
    }
  }

  const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
  const data = await response.json()

  if (!response.ok || data.erro) {
    return {
      ok: false,
      status: response.status === 200 ? 404 : response.status,
      data: { error: 'CEP não encontrado.' }
    }
  }

  return {
    ok: true,
    status: 200,
    data
  }
}
