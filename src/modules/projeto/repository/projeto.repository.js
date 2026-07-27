import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where
} from 'firebase/firestore/lite'
import { firestore } from '../../../utils/firebase.util.js'

const projetos = collection(firestore, 'Projeto')
const pessoas = collection(firestore, 'Pessoa')
const cadastros = collection(firestore, 'Cadastro')
const distribuicoes = collection(firestore, 'Distribuicao')

function mapProjeto(snapshot) {
  const data = snapshot.data()

  return {
    id: snapshot.id,
    nome: data.nome ?? '',
    descricao: data.descricao ?? '',
    inicio: data.inicio ?? '',
    fim: data.fim ?? null,
    ativo: data.ativo ?? 1
  }
}

function mapPessoa(snapshot) {
  const data = snapshot.data()

  return {
    id: snapshot.id,
    codigoFamiliar: data.codigo_familiar ?? '',
    nome: data.nome ?? '',
    cpf: data.cpf ?? '',
    ativo: data.ativo ?? 1
  }
}

function mapCadastro(snapshot) {
  const data = snapshot.data()

  return {
    id: snapshot.id,
    idProjeto: data.id_projeto ?? '',
    idPessoa: data.id_pessoa ?? '',
    inicio: data.inicio ?? '',
    fim: data.fim ?? null,
    ativo: data.ativo ?? 1
  }
}

async function listCadastrosByProjeto(idProjeto) {
  const snapshots = await getDocs(query(cadastros, where('id_projeto', '==', idProjeto)))
  return snapshots.docs.map(mapCadastro)
}

async function getPessoa(idPessoa) {
  const snapshot = await getDoc(doc(firestore, 'Pessoa', idPessoa))
  return snapshot.exists() ? mapPessoa(snapshot) : null
}

export async function listProjetos(search = '') {
  const term = search.trim().toLocaleLowerCase('pt-BR')
  const snapshots = await getDocs(projetos)
  const allProjetos = snapshots.docs
    .map(mapProjeto)
    .filter((projeto) => projeto.nome.toLocaleLowerCase('pt-BR').includes(term))

  const projetosComTotais = []

  for (const projeto of allProjetos) {
    const participantes = await listCadastrosByProjeto(projeto.id)

    projetosComTotais.push({
      ...projeto,
      totalParticipantes: participantes.length,
      participantesAtivos: participantes.filter((participante) => participante.ativo).length
    })
  }

  return projetosComTotais.sort((a, b) => {
    const ativoDiff = Number(b.ativo) - Number(a.ativo)
    return ativoDiff || a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  })
}

export async function findProjetoById(id) {
  const snapshot = await getDoc(doc(firestore, 'Projeto', id))
  return snapshot.exists() ? mapProjeto(snapshot) : null
}

export async function createProjeto({ nome, descricao, inicio, fim = null }) {
  const result = await addDoc(projetos, {
    nome: nome ?? '',
    descricao: descricao ?? '',
    inicio: inicio ?? '',
    fim,
    ativo: 1
  })

  return findProjetoById(result.id)
}

export async function updateProjeto({ id, nome, descricao, inicio, fim = null }) {
  await updateDoc(doc(firestore, 'Projeto', id), {
    nome: nome ?? '',
    descricao: descricao ?? '',
    inicio: inicio ?? '',
    fim
  })

  return findProjetoById(id)
}

export async function inactivateProjeto(id, fim) {
  await updateDoc(doc(firestore, 'Projeto', id), {
    ativo: 0,
    fim
  })

  const participantes = await listCadastrosByProjeto(id)

  for (const participante of participantes.filter((cadastro) => cadastro.ativo)) {
    await updateDoc(doc(firestore, 'Cadastro', participante.id), {
      ativo: 0,
      fim: participante.fim ?? fim
    })
  }

  return findProjetoById(id)
}

export async function findPessoaByCpf(cpf) {
  const snapshots = await getDocs(query(pessoas, where('cpf', '==', cpf), limit(1)))
  const snapshot = snapshots.docs[0]

  return snapshot ? mapPessoa(snapshot) : null
}

export async function findActiveCadastro({ idProjeto, idPessoa }) {
  const snapshots = await getDocs(query(cadastros, where('id_projeto', '==', idProjeto)))
  const snapshot = snapshots.docs.find((item) => {
    const data = item.data()
    return data.id_pessoa === idPessoa && (data.ativo ?? 1) === 1
  })

  return snapshot ? mapCadastro(snapshot) : null
}

export async function findCadastroById({ idProjeto, idCadastro }) {
  const snapshot = await getDoc(doc(firestore, 'Cadastro', idCadastro))

  if (!snapshot.exists()) {
    return null
  }

  const cadastro = mapCadastro(snapshot)
  return cadastro.idProjeto === idProjeto ? cadastro : null
}

export async function addParticipante({ idProjeto, idPessoa, inicio }) {
  const result = await addDoc(cadastros, {
    id_projeto: idProjeto,
    id_pessoa: idPessoa,
    inicio: inicio ?? '',
    fim: null,
    ativo: 1
  })

  return result.id
}

export async function listParticipantes(idProjeto) {
  const participantes = await listCadastrosByProjeto(idProjeto)
  const rows = []

  for (const participante of participantes) {
    const pessoa = await getPessoa(participante.idPessoa)

    if (!pessoa) {
      continue
    }

    rows.push({
      id: participante.id,
      inicio: participante.inicio,
      fim: participante.fim,
      ativo: participante.ativo,
      idPessoa: pessoa.id,
      codigoFamiliar: pessoa.codigoFamiliar,
      nome: pessoa.nome,
      cpf: pessoa.cpf,
      pessoaAtiva: pessoa.ativo,
      totalDistribuicoes: await countDistribuicoesByCadastro(participante.id)
    })
  }

  return rows.sort((a, b) => {
    const ativoDiff = Number(b.ativo) - Number(a.ativo)
    return ativoDiff || a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  })
}

export async function inactivateParticipante({ idCadastro, fim }) {
  await updateDoc(doc(firestore, 'Cadastro', idCadastro), {
    ativo: 0,
    fim
  })

  return true
}

export async function countDistribuicoesByCadastro(idCadastro) {
  const snapshots = await getDocs(query(distribuicoes, where('id_cadastro', '==', idCadastro)))
  return snapshots.size
}

export async function deleteParticipante(idCadastro) {
  await deleteDoc(doc(firestore, 'Cadastro', idCadastro))
  return true
}
