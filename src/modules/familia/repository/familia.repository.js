import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where
} from 'firebase/firestore/lite'
import { createUniqueConstraintError } from '../../../configs/db.config.js'
import { firestore } from '../../../utils/firebase.util.js'

const pessoas = collection(firestore, 'Pessoa')
const enderecos = collection(firestore, 'Endereco')
const pessoaEnderecos = collection(firestore, 'Pessoa_Endereco')
const telefones = collection(firestore, 'Telefone')
const pessoaContatos = collection(firestore, 'Pessoa_Contato')

function mapPessoa(snapshot) {
  const data = snapshot.data()

  return {
    id: snapshot.id,
    codigoFamiliar: data.codigo_familiar ?? '',
    nome: data.nome ?? '',
    cpf: data.cpf ?? '',
    nascimento: data.nascimento ?? '',
    dataEntrevista: data.data_cadunico ?? '',
    folhaResumo: data.folha_resumo ?? '',
    responsavelFamiliar: data.responsavel_familiar ?? 0,
    menor: data.menor ?? 0,
    ativo: data.ativo ?? 1
  }
}

function mapEndereco(snapshot) {
  const data = snapshot.data()

  return {
    id: snapshot.id,
    cep: data.cep ?? '',
    logradouro: data.logradouro ?? '',
    numero: data.numero ?? '',
    complemento: data.complemento ?? '',
    bairro: data.bairro ?? '',
    localidade: data.localidade ?? '',
    uf: data.uf ?? '',
    estado: data.estado ?? '',
    regiao: data.regiao ?? '',
    ibge: data.ibge ?? '',
    gia: data.gia ?? '',
    ddd: data.ddd ?? '',
    siafi: data.siafi ?? '',
    referencia: data.descricao ?? '',
    ativo: data.ativo ?? 1
  }
}

async function findPessoaSnapshotByCpf(cpf) {
  const snapshots = await getDocs(query(pessoas, where('cpf', '==', cpf), limit(1)))
  return snapshots.docs[0] ?? null
}

async function assertUniqueCpf(cpf, currentId = null) {
  const snapshot = await findPessoaSnapshotByCpf(cpf)

  if (snapshot && snapshot.id !== currentId) {
    throw createUniqueConstraintError('CPF já cadastrado.')
  }
}

async function insertEndereco(endereco) {
  const result = await addDoc(enderecos, {
    cep: endereco.cep ?? '',
    logradouro: endereco.logradouro || [endereco.tipo, endereco.nome].filter(Boolean).join(' '),
    numero: endereco.numero ?? '',
    complemento: endereco.complemento ?? '',
    bairro: endereco.bairro ?? '',
    localidade: endereco.localidade ?? '',
    uf: endereco.uf ?? '',
    estado: endereco.estado ?? '',
    regiao: endereco.regiao ?? '',
    ibge: endereco.ibge ?? '',
    gia: endereco.gia ?? '',
    ddd: endereco.ddd ?? '',
    siafi: endereco.siafi ?? '',
    descricao: endereco.referencia ?? '',
    ativo: 1
  })

  return result.id
}

async function insertPessoa(cadastro, familiar) {
  await assertUniqueCpf(familiar.cpf)

  const result = await addDoc(pessoas, {
    codigo_familiar: cadastro.codigoFamiliar ?? '',
    nome: familiar.nomeCompleto ?? '',
    cpf: familiar.cpf ?? '',
    nascimento: familiar.nascimento ?? '',
    data_cadunico: cadastro.dataEntrevista ?? '',
    folha_resumo: cadastro.folhaResumo ?? '',
    responsavel_familiar: familiar.responsavelFamiliar ? 1 : 0,
    menor: familiar.menor ? 1 : 0,
    ativo: 1
  })

  return result.id
}

async function linkPessoaEndereco(idPessoa, idEndereco) {
  await addDoc(pessoaEnderecos, {
    id_pessoa: idPessoa,
    id_endereco: idEndereco
  })
}

async function insertTelefoneResponsavel(idPessoa, telefone = '') {
  if (!telefone) {
    return null
  }

  const telefoneRef = await addDoc(telefones, {
    descricao: 'Responsável familiar',
    numero: telefone,
    principal: 1,
    whatsapp: 1,
    ativo: 1
  })

  await addDoc(pessoaContatos, {
    id_pessoa: idPessoa,
    id_telefone: telefoneRef.id
  })

  return telefoneRef.id
}

async function findTelefoneResponsavel(idPessoa) {
  const contatos = await getDocs(query(pessoaContatos, where('id_pessoa', '==', idPessoa)))
  const telefonesAtivos = []

  for (const contato of contatos.docs) {
    const telefoneId = contato.data().id_telefone
    const telefoneSnapshot = await getDoc(doc(firestore, 'Telefone', telefoneId))

    if (telefoneSnapshot.exists() && (telefoneSnapshot.data().ativo ?? 1) === 1) {
      telefonesAtivos.push({
        id: telefoneSnapshot.id,
        numero: telefoneSnapshot.data().numero ?? '',
        principal: telefoneSnapshot.data().principal ?? 1
      })
    }
  }

  return telefonesAtivos.sort((a, b) => b.principal - a.principal)[0] ?? null
}

async function upsertTelefoneResponsavel(idPessoa, telefone = '') {
  const currentTelefone = await findTelefoneResponsavel(idPessoa)

  if (currentTelefone) {
    await updateDoc(doc(firestore, 'Telefone', currentTelefone.id), { numero: telefone })
    return currentTelefone.id
  }

  return insertTelefoneResponsavel(idPessoa, telefone)
}

export async function saveFamilia(cadastro) {
  const idEndereco = await insertEndereco(cadastro.endereco)
  const savedPessoas = []

  for (const familiar of cadastro.familiares) {
    const idPessoa = await insertPessoa(cadastro, familiar)
    await linkPessoaEndereco(idPessoa, idEndereco)

    if (familiar.responsavelFamiliar) {
      await insertTelefoneResponsavel(idPessoa, cadastro.telefoneResponsavel)
    }

    savedPessoas.push({
      id: idPessoa,
      nome: familiar.nomeCompleto,
      cpf: familiar.cpf
    })
  }

  return {
    idEndereco,
    pessoas: savedPessoas
  }
}

export async function listFamilias(search = '') {
  const term = search.trim()
  const snapshots = await getDocs(pessoas)
  const allPessoas = snapshots.docs.map(mapPessoa)
  const matchedCodigos = new Set(
    allPessoas
      .filter((pessoa) => !term || pessoa.codigoFamiliar.includes(term) || pessoa.cpf.includes(term))
      .map((pessoa) => pessoa.codigoFamiliar)
  )
  const familias = new Map()

  allPessoas
    .filter((pessoa) => matchedCodigos.has(pessoa.codigoFamiliar))
    .forEach((pessoa) => {
      const current = familias.get(pessoa.codigoFamiliar) ?? {
        codigoFamiliar: pessoa.codigoFamiliar,
        responsavel: null,
        dataEntrevista: pessoa.dataEntrevista,
        folhaResumo: pessoa.folhaResumo,
        totalPessoas: 0,
        pessoasAtivas: 0
      }

      if (pessoa.responsavelFamiliar) {
        current.responsavel = pessoa.nome
      }

      current.totalPessoas += 1
      current.pessoasAtivas += pessoa.ativo ? 1 : 0
      familias.set(pessoa.codigoFamiliar, current)
    })

  return [...familias.values()].sort((a, b) => b.codigoFamiliar.localeCompare(a.codigoFamiliar))
}

export async function findFamiliaByCodigo(codigoFamiliar) {
  const snapshots = await getDocs(query(pessoas, where('codigo_familiar', '==', codigoFamiliar)))
  const familiaPessoas = snapshots.docs
    .map(mapPessoa)
    .sort((a, b) => {
      const responsavelDiff = Number(b.responsavelFamiliar) - Number(a.responsavelFamiliar)
      return responsavelDiff || a.id.localeCompare(b.id)
    })

  if (familiaPessoas.length === 0) {
    return null
  }

  const endereco = await findEnderecoByPessoa(familiaPessoas[0].id)
  const responsavel = familiaPessoas.find((pessoa) => pessoa.responsavelFamiliar)
  const telefoneResponsavel = responsavel
    ? (await findTelefoneResponsavel(responsavel.id))?.numero ?? ''
    : ''

  return {
    codigoFamiliar,
    dataEntrevista: familiaPessoas[0].dataEntrevista,
    folhaResumo: familiaPessoas[0].folhaResumo,
    telefoneResponsavel,
    endereco,
    pessoas: familiaPessoas
  }
}

async function findEnderecoByPessoa(idPessoa) {
  const links = await getDocs(query(pessoaEnderecos, where('id_pessoa', '==', idPessoa), limit(1)))
  const link = links.docs[0]

  if (!link) {
    return null
  }

  const enderecoSnapshot = await getDoc(doc(firestore, 'Endereco', link.data().id_endereco))
  return enderecoSnapshot.exists() ? mapEndereco(enderecoSnapshot) : null
}

async function updateEndereco(idEndereco, endereco) {
  if (!idEndereco) {
    return
  }

  await updateDoc(doc(firestore, 'Endereco', idEndereco), {
    cep: endereco.cep ?? '',
    logradouro: endereco.logradouro ?? '',
    numero: endereco.numero ?? '',
    complemento: endereco.complemento ?? '',
    bairro: endereco.bairro ?? '',
    localidade: endereco.localidade ?? '',
    uf: endereco.uf ?? '',
    estado: endereco.estado ?? '',
    regiao: endereco.regiao ?? '',
    ibge: endereco.ibge ?? '',
    gia: endereco.gia ?? '',
    ddd: endereco.ddd ?? '',
    siafi: endereco.siafi ?? '',
    descricao: endereco.referencia ?? ''
  })
}

async function updatePessoa(cadastro, pessoa) {
  await assertUniqueCpf(pessoa.cpf, pessoa.id)

  await updateDoc(doc(firestore, 'Pessoa', pessoa.id), {
    codigo_familiar: cadastro.codigoFamiliar ?? '',
    nome: pessoa.nomeCompleto ?? '',
    cpf: pessoa.cpf ?? '',
    nascimento: pessoa.nascimento ?? '',
    data_cadunico: cadastro.dataEntrevista ?? '',
    folha_resumo: cadastro.folhaResumo ?? '',
    responsavel_familiar: pessoa.responsavelFamiliar ? 1 : 0,
    menor: pessoa.menor ? 1 : 0
  })
}

export async function updateFamilia(codigoAtual, cadastro) {
  const familiaAtual = await findFamiliaByCodigo(codigoAtual)

  if (!familiaAtual) {
    return null
  }

  const idEndereco = familiaAtual.endereco?.id

  await updateEndereco(idEndereco, cadastro.endereco)

  for (const pessoa of cadastro.familiares) {
    if (pessoa.id) {
      await updatePessoa(cadastro, pessoa)
      continue
    }

    const idPessoa = await insertPessoa(cadastro, pessoa)

    if (idEndereco) {
      await linkPessoaEndereco(idPessoa, idEndereco)
    }

    pessoa.id = idPessoa
  }

  const responsavel = cadastro.familiares.find((pessoa) => pessoa.responsavelFamiliar)

  if (responsavel?.id) {
    await upsertTelefoneResponsavel(responsavel.id, cadastro.telefoneResponsavel)
  }

  return findFamiliaByCodigo(cadastro.codigoFamiliar)
}

export async function countActivePessoasByFamilia(codigoFamiliar) {
  const familia = await findFamiliaByCodigo(codigoFamiliar)
  return familia?.pessoas.filter((pessoa) => pessoa.ativo).length ?? 0
}

export async function inactivatePessoa(idPessoa) {
  await updateDoc(doc(firestore, 'Pessoa', idPessoa), { ativo: 0 })
  return true
}
