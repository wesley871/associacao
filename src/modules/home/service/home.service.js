import fs from 'node:fs/promises'
import { createWorker } from 'tesseract.js'

function limparValor(valor = '') {
  return valor
    .replace(/^[>:.\-\s]+/g, '')
    .replace(/[—–]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function capturar(texto, regex) {
  const match = texto.match(regex)
  return match ? limparValor(match[1]) : ''
}

function capturarNumero(texto, regex) {
  return capturar(texto, regex).replace(/\D/g, '')
}

function capturarFamiliares(texto) {
  const blocoFamiliares = texto.split(/(?:I[Vl]|W)\s*[-.]?\s*COMPONENTES DA FAM[IÍ]LIA/i)[1] ?? texto
  const registros = [...blocoFamiliares.matchAll(
    /4[.,]02\s*-?\s*Nome Completo:\s*([\s\S]*?)\s*5[.,]02\s*-?\s*CPF:\s*([\d.-]+)\s*4[.,]08\s*-?\s*Data de Nascimento:?\s*\D*(\d{2}\/\d{2}\/\d{4})/gi
  )]
  const parentescos = [...blocoFamiliares.matchAll(
    /4[.,]07\s*-?\s*Parentesco com Respons[aá]vel\s*([^\n]+)/gi
  )].map((match) => limparValor(match[1]))

  return registros.map((match, index) => {
    const familiar = {
      nomeCompleto: limparValor(match[1]),
      cpf: limparValor(match[2]),
      nascimento: limparValor(match[3])
    }

    if (index === 0) {
      return {
        responsavelFamiliar: true,
        ...familiar
      }
    }

    return {
      parentesco: parentescos[index - 1] ?? '',
      ...familiar
    }
  })
}

export function parseCadastroUnicoText(texto = '') {
  const textoNormalizado = texto
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')

  return {
    codigoFamiliar: capturarNumero(textoNormalizado, /1[.,]01\s*C[oó]digo familiar:?\s*\D*([\d.-]+)/i),
    dataEntrevista: capturar(textoNormalizado, /1[.,]10\s*Data da entrevista:?\s*\D*(\d{2}\/\d{2}\/\d{4})/i),
    endereco: {
      bairro: capturar(textoNormalizado, /1[.,]11\s*-?\s*Localidade:\s*([^\n]+)/i),
      tipo: capturar(textoNormalizado, /1[.,]12\s*-?\s*Tipo:\s*([\s\S]*?)(?=\s*1[.,]13\s*-?\s*T[ií]tulo:)/i),
      nome: capturar(textoNormalizado, /1[.,]14\s*-?\s*Nome:\s*([^\n]+)/i),
      numero: capturarNumero(textoNormalizado, /1[.,]15\s*-?\s*N[uú]mero:\s*([\s\S]*?)(?=\s*1[.,]16\s*-?\s*Complemento do N[uú]mero:)/i),
      complemento: capturar(textoNormalizado, /1[.,]17\s*-?\s*Complemento Adicional:\s*([^\n]+)/i),
      cep: capturarNumero(textoNormalizado, /1[.,]18\s*-?\s*Cep:\s*\D*([\d.-]+)/i),
      referencia: capturar(textoNormalizado, /1[.,]20\s*-?\s*Refer[eê]ncia para Localiza[cç][aã]o:\s*([^\n]+)/i)
    },
    familiares: capturarFamiliares(textoNormalizado)
  }
}

export async function extrairCadastroDaImagem(filePath) {
  const file = await fs.readFile(filePath)
  const worker = await createWorker('por')

  try {
    const data = await worker.recognize(file)
    return parseCadastroUnicoText(data.data.text)
  } finally {
    await worker.terminate()
  }
}
