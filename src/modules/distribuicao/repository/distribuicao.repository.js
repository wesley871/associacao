import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where
} from 'firebase/firestore/lite'
import { createUniqueConstraintError } from '../../../configs/db.config.js'
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

export async function listProjetosAtivos() {
  const snapshots = await getDocs(query(projetos, where('ativo', '==', 1)))
  const rows = []

  for (const projetoSnapshot of snapshots.docs) {
    const projeto = mapProjeto(projetoSnapshot)
    const participantes = await getDocs(query(cadastros, where('id_projeto', '==', projeto.id)))

    rows.push({
      id: projeto.id,
      nome: projeto.nome,
      inicio: projeto.inicio,
      fim: projeto.fim,
      totalParticipantes: participantes.docs.filter((item) => (item.data().ativo ?? 1) === 1).length
    })
  }

  return rows.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
}

export async function findProjetoAtivoById(idProjeto) {
  const snapshot = await getDoc(doc(firestore, 'Projeto', idProjeto))

  if (!snapshot.exists()) {
    return null
  }

  const projeto = mapProjeto(snapshot)
  return projeto.ativo ? projeto : null
}

export async function listParticipantesDistribuicao(idProjeto, data) {
  const cadastroSnapshots = await getDocs(query(cadastros, where('id_projeto', '==', idProjeto)))
  const rows = []

  for (const cadastroSnapshot of cadastroSnapshots.docs) {
    const cadastro = mapCadastro(cadastroSnapshot)

    if (!cadastro.ativo) {
      continue
    }

    const pessoaSnapshot = await getDoc(doc(firestore, 'Pessoa', cadastro.idPessoa))

    if (!pessoaSnapshot.exists()) {
      continue
    }

    const pessoa = mapPessoa(pessoaSnapshot)

    if (!pessoa.ativo) {
      continue
    }

    const distribuicao = await findDistribuicaoByCadastroAndData({
      idCadastro: cadastro.id,
      data
    })

    rows.push({
      idCadastro: cadastro.id,
      inicio: cadastro.inicio,
      nome: pessoa.nome,
      cpf: pessoa.cpf,
      codigoFamiliar: pessoa.codigoFamiliar,
      dataDistribuicao: distribuicao?.data ?? null
    })
  }

  return rows.sort((a, b) => {
    const distribuicaoDiff = Number(Boolean(a.dataDistribuicao)) - Number(Boolean(b.dataDistribuicao))
    return distribuicaoDiff || a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  })
}

export async function findDistribuicaoByCadastroAndData({ idCadastro, data }) {
  const snapshots = await getDocs(query(distribuicoes, where('id_cadastro', '==', idCadastro), limit(20)))
  const snapshot = snapshots.docs.find((item) => item.data().data === data)

  if (!snapshot) {
    return null
  }

  return {
    id: snapshot.id,
    idCadastro: snapshot.data().id_cadastro,
    data: snapshot.data().data
  }
}

export async function findCadastroAtivoById(idCadastro) {
  const snapshot = await getDoc(doc(firestore, 'Cadastro', idCadastro))

  if (!snapshot.exists()) {
    return null
  }

  const cadastro = mapCadastro(snapshot)
  const pessoaSnapshot = await getDoc(doc(firestore, 'Pessoa', cadastro.idPessoa))
  const pessoaAtiva = pessoaSnapshot.exists() ? (pessoaSnapshot.data().ativo ?? 1) : 0

  if (!cadastro.ativo || !pessoaAtiva) {
    return null
  }

  return {
    id: cadastro.id,
    idProjeto: cadastro.idProjeto,
    idPessoa: cadastro.idPessoa,
    ativo: cadastro.ativo,
    pessoaAtiva
  }
}

export async function createDistribuicao({ idCadastro, data }) {
  if (await findDistribuicaoByCadastroAndData({ idCadastro, data })) {
    throw createUniqueConstraintError('Distribuição já registrada para este cadastro e data.')
  }

  const result = await addDoc(distribuicoes, {
    id_cadastro: idCadastro,
    data
  })

  return result.id
}
