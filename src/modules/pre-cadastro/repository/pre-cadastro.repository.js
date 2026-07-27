import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc
} from 'firebase/firestore/lite'
import { firestore } from '../../../utils/firebase.util.js'

const preCadastros = collection(firestore, 'PreCadastro')

function mapPreCadastro(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data()
  }
}

export async function savePreCadastro(preCadastro) {
  const result = await addDoc(preCadastros, {
    ...preCadastro,
    criadoEm: new Date().toISOString(),
    status: 'pendente'
  })

  return {
    id: result.id,
    ...preCadastro
  }
}

export async function listPreCadastros(search = '') {
  const term = search.trim().toLocaleLowerCase('pt-BR')
  const snapshots = await getDocs(preCadastros)

  return snapshots.docs
    .map(mapPreCadastro)
    .filter((preCadastro) => {
      if (preCadastro.status === 'concluido') {
        return false
      }

      if (!term) {
        return true
      }

      return [
        preCadastro.pessoa?.nome,
        preCadastro.pessoa?.cpf,
        preCadastro.pessoa?.nis,
        preCadastro.endereco?.cep
      ].some((value) => String(value ?? '').toLocaleLowerCase('pt-BR').includes(term))
    })
    .sort((a, b) => String(b.criadoEm ?? '').localeCompare(String(a.criadoEm ?? '')))
}

export async function findPreCadastroById(id) {
  const snapshot = await getDoc(doc(firestore, 'PreCadastro', id))
  return snapshot.exists() ? mapPreCadastro(snapshot) : null
}

export async function updatePreCadastro(id, preCadastro) {
  await updateDoc(doc(firestore, 'PreCadastro', id), {
    ...preCadastro,
    atualizadoEm: new Date().toISOString()
  })

  return findPreCadastroById(id)
}

export async function completePreCadastro(id, metadata) {
  await updateDoc(doc(firestore, 'PreCadastro', id), {
    status: 'concluido',
    concluidoEm: new Date().toISOString(),
    ...metadata
  })

  return findPreCadastroById(id)
}
