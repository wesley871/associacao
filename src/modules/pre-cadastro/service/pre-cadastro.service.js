import { cadastrarFamilia } from '../../familia/service/familia.service.js'
import {
  completePreCadastro,
  findPreCadastroById,
  listPreCadastros,
  savePreCadastro,
  updatePreCadastro
} from '../repository/pre-cadastro.repository.js'

function onlyNumbers(value = '') {
  return String(value).replace(/\D/g, '')
}

function normalizeText(value = '') {
  return String(value).trim()
}

function normalizeNumber(value = '') {
  if (String(value).trim() === '') {
    return null
  }

  const normalized = Number(String(value).replace(/\D/g, ''))
  return Number.isFinite(normalized) ? normalized : 0
}

export function buildPreCadastroFromForm(body) {
  return {
    cadastroCompleto: {
      codigoFamiliar: onlyNumbers(body.codigoFamiliar),
      dataEntrevista: normalizeText(body.dataEntrevista),
      folhaResumo: normalizeText(body.folhaResumo)
    },
    pessoa: {
      nome: normalizeText(body.nome),
      cpf: onlyNumbers(body.cpf),
      nis: onlyNumbers(body.nis),
      telefone: onlyNumbers(body.telefone),
      nascimento: normalizeText(body.nascimento)
    },
    familia: {
      totalPessoas: normalizeNumber(body.totalPessoas),
      faixaEtaria: {
        homens: {
          ate6: normalizeNumber(body.homensAte6),
          de7a15: normalizeNumber(body.homens7a15),
          de16a17: normalizeNumber(body.homens16a17),
          de18a64: normalizeNumber(body.homens18a64),
          acima65: normalizeNumber(body.homens65Mais)
        },
        mulheres: {
          ate6: normalizeNumber(body.mulheresAte6),
          de7a15: normalizeNumber(body.mulheres7a15),
          de16a17: normalizeNumber(body.mulheres16a17),
          de18a64: normalizeNumber(body.mulheres18a64),
          acima65: normalizeNumber(body.mulheres65Mais)
        }
      }
    },
    endereco: {
      cep: onlyNumbers(body.cep),
      logradouro: normalizeText(body.logradouro),
      numero: normalizeText(body.numero),
      complemento: normalizeText(body.complemento),
      unidade: normalizeText(body.unidade),
      bairro: normalizeText(body.bairro),
      localidade: normalizeText(body.localidade),
      uf: normalizeText(body.uf).toUpperCase(),
      estado: normalizeText(body.estado),
      regiao: normalizeText(body.regiao),
      ibge: onlyNumbers(body.ibge),
      gia: onlyNumbers(body.gia),
      ddd: onlyNumbers(body.ddd),
      siafi: onlyNumbers(body.siafi),
      referencia: normalizeText(body.referencia)
    }
  }
}

export async function cadastrarPreCadastro(preCadastro) {
  const saved = await savePreCadastro(preCadastro)

  return {
    ok: true,
    message: 'Pré-cadastro salvo com sucesso.',
    saved
  }
}

export async function consultarPreCadastros(search = '') {
  return await listPreCadastros(search)
}

export async function obterPreCadastro(id) {
  if (!id) {
    return null
  }

  return await findPreCadastroById(id)
}

export async function editarPreCadastro(id, preCadastro) {
  const current = await findPreCadastroById(id)

  if (!current) {
    return {
      ok: false,
      message: 'Pré-cadastro não encontrado.'
    }
  }

  if (current.status === 'concluido') {
    return {
      ok: false,
      message: 'Este pré-cadastro já foi concluído.'
    }
  }

  const saved = await updatePreCadastro(id, preCadastro)

  return {
    ok: true,
    message: 'Pré-cadastro atualizado com sucesso.',
    saved
  }
}

function parseDate(value = '') {
  const [year, month, day] = String(value).split('-').map(Number)

  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day)
}

function isUnderAge(value = '') {
  const birthDate = parseDate(value)

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

function validateCadastroCompleto(preCadastro) {
  const missing = []

  if (!preCadastro.cadastroCompleto?.codigoFamiliar) missing.push('código familiar')
  if (!preCadastro.cadastroCompleto?.dataEntrevista) missing.push('data da entrevista')
  if (!preCadastro.cadastroCompleto?.folhaResumo) missing.push('folha resumo')
  if (!preCadastro.pessoa?.nome) missing.push('nome')
  if (!preCadastro.pessoa?.cpf) missing.push('CPF')
  if (!preCadastro.pessoa?.nascimento) missing.push('nascimento')
  if (!preCadastro.pessoa?.telefone) missing.push('telefone')

  return missing
}

function buildFamiliaFromPreCadastro(preCadastro) {
  return {
    codigoFamiliar: preCadastro.cadastroCompleto.codigoFamiliar,
    dataEntrevista: preCadastro.cadastroCompleto.dataEntrevista,
    folhaResumo: preCadastro.cadastroCompleto.folhaResumo,
    telefoneResponsavel: preCadastro.pessoa.telefone,
    endereco: preCadastro.endereco,
    familiares: [{
      responsavelFamiliar: true,
      parentesco: '',
      nomeCompleto: preCadastro.pessoa.nome,
      cpf: preCadastro.pessoa.cpf,
      nascimento: preCadastro.pessoa.nascimento,
      menor: isUnderAge(preCadastro.pessoa.nascimento)
    }]
  }
}

export async function concluirPreCadastro(id) {
  const preCadastro = await findPreCadastroById(id)

  if (!preCadastro) {
    return {
      ok: false,
      message: 'Pré-cadastro não encontrado.'
    }
  }

  if (preCadastro.status === 'concluido') {
    return {
      ok: false,
      message: 'Este pré-cadastro já foi concluído.'
    }
  }

  const missing = validateCadastroCompleto(preCadastro)

  if (missing.length > 0) {
    return {
      ok: false,
      message: `Complete os campos obrigatórios antes de mover: ${missing.join(', ')}.`
    }
  }

  const result = await cadastrarFamilia(buildFamiliaFromPreCadastro(preCadastro))

  if (!result.ok) {
    return result
  }

  await completePreCadastro(id, {
    codigoFamiliarConcluido: preCadastro.cadastroCompleto.codigoFamiliar
  })

  return {
    ok: true,
    message: 'Pré-cadastro movido para cadastro completo.',
    codigoFamiliar: preCadastro.cadastroCompleto.codigoFamiliar
  }
}
