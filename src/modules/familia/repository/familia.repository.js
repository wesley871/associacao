import db from '../../../configs/db.config.js'

function runInTransaction(callback) {
  db.exec('BEGIN')

  try {
    const result = callback()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function insertEndereco(endereco) {
  const result = db.prepare(`
    INSERT INTO Endereco (
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      localidade,
      uf,
      estado,
      regiao,
      ibge,
      gia,
      ddd,
      siafi,
      descricao
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    endereco.cep,
    endereco.logradouro || [endereco.tipo, endereco.nome].filter(Boolean).join(' '),
    endereco.numero,
    endereco.complemento,
    endereco.bairro,
    endereco.localidade,
    endereco.uf,
    endereco.estado,
    endereco.regiao,
    endereco.ibge,
    endereco.gia,
    endereco.ddd,
    endereco.siafi,
    endereco.referencia
  )

  return Number(result.lastInsertRowid)
}

function insertPessoa(cadastro, familiar) {
  const result = db.prepare(`
    INSERT INTO Pessoa (
      codigo_familiar,
      nome,
      cpf,
      nascimento,
      data_cadunico,
      folha_resumo,
      responsavel_familiar,
      menor
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    cadastro.codigoFamiliar,
    familiar.nomeCompleto,
    familiar.cpf,
    familiar.nascimento,
    cadastro.dataEntrevista,
    cadastro.folhaResumo,
    familiar.responsavelFamiliar ? 1 : 0,
    familiar.menor ? 1 : 0
  )

  return Number(result.lastInsertRowid)
}

function linkPessoaEndereco(idPessoa, idEndereco) {
  db.prepare(`
    INSERT INTO Pessoa_Endereco (id_pessoa, id_endereco)
    VALUES (?, ?)
  `).run(idPessoa, idEndereco)
}

function insertTelefoneResponsavel(idPessoa, telefone = '') {
  if (!telefone) {
    return null
  }

  const result = db.prepare(`
    INSERT INTO Telefone (descricao, numero, principal, whatsapp, ativo)
    VALUES (?, ?, 1, 1, 1)
  `).run('Responsável familiar', telefone)
  const idTelefone = Number(result.lastInsertRowid)

  db.prepare(`
    INSERT INTO Pessoa_Contato (id_pessoa, id_telefone)
    VALUES (?, ?)
  `).run(idPessoa, idTelefone)

  return idTelefone
}

function findTelefoneResponsavel(idPessoa) {
  return db.prepare(`
    SELECT t.id, t.numero
    FROM Telefone t
    INNER JOIN Pessoa_Contato pc ON pc.id_telefone = t.id
    WHERE pc.id_pessoa = ? AND t.ativo = 1
    ORDER BY t.principal DESC, t.id ASC
    LIMIT 1
  `).get(idPessoa)
}

function upsertTelefoneResponsavel(idPessoa, telefone = '') {
  const currentTelefone = findTelefoneResponsavel(idPessoa)

  if (currentTelefone) {
    db.prepare(`
      UPDATE Telefone
      SET numero = ?
      WHERE id = ?
    `).run(telefone, currentTelefone.id)

    return currentTelefone.id
  }

  return insertTelefoneResponsavel(idPessoa, telefone)
}

export function saveFamilia(cadastro) {
  return runInTransaction(() => {
    const idEndereco = insertEndereco(cadastro.endereco)
    const pessoas = cadastro.familiares.map((familiar) => {
      const idPessoa = insertPessoa(cadastro, familiar)
      linkPessoaEndereco(idPessoa, idEndereco)

      if (familiar.responsavelFamiliar) {
        insertTelefoneResponsavel(idPessoa, cadastro.telefoneResponsavel)
      }

      return {
        id: idPessoa,
        nome: familiar.nomeCompleto,
        cpf: familiar.cpf
      }
    })

    return {
      idEndereco,
      pessoas
    }
  })
}

export function listFamilias(search = '') {
  const term = `%${search.trim()}%`

  return db.prepare(`
    SELECT
      p.codigo_familiar AS codigoFamiliar,
      MAX(CASE WHEN p.responsavel_familiar = 1 THEN p.nome ELSE NULL END) AS responsavel,
      MAX(p.data_cadunico) AS dataEntrevista,
      MAX(p.folha_resumo) AS folhaResumo,
      COUNT(*) AS totalPessoas,
      SUM(CASE WHEN p.ativo = 1 THEN 1 ELSE 0 END) AS pessoasAtivas
    FROM Pessoa p
    WHERE p.codigo_familiar IN (
      SELECT DISTINCT codigo_familiar
      FROM Pessoa
      WHERE codigo_familiar LIKE ? OR cpf LIKE ?
    )
    GROUP BY p.codigo_familiar
    ORDER BY p.codigo_familiar DESC
  `).all(term, term)
}

export function findFamiliaByCodigo(codigoFamiliar) {
  const pessoas = db.prepare(`
    SELECT
      id,
      codigo_familiar AS codigoFamiliar,
      nome,
      cpf,
      nascimento,
      data_cadunico AS dataEntrevista,
      folha_resumo AS folhaResumo,
      responsavel_familiar AS responsavelFamiliar,
      menor,
      ativo
    FROM Pessoa
    WHERE codigo_familiar = ?
    ORDER BY responsavel_familiar DESC, id ASC
  `).all(codigoFamiliar)

  if (pessoas.length === 0) {
    return null
  }

  const endereco = db.prepare(`
    SELECT
      e.id,
      e.cep,
      e.logradouro,
      e.numero,
      e.complemento,
      e.bairro,
      e.localidade,
      e.uf,
      e.estado,
      e.regiao,
      e.ibge,
      e.gia,
      e.ddd,
      e.siafi,
      e.descricao AS referencia,
      e.ativo
    FROM Endereco e
    INNER JOIN Pessoa_Endereco pe ON pe.id_endereco = e.id
    INNER JOIN Pessoa p ON p.id = pe.id_pessoa
    WHERE p.codigo_familiar = ?
    ORDER BY e.id ASC
    LIMIT 1
  `).get(codigoFamiliar)
  const responsavel = pessoas.find((pessoa) => pessoa.responsavelFamiliar)
  const telefoneResponsavel = responsavel
    ? findTelefoneResponsavel(responsavel.id)?.numero ?? ''
    : ''

  return {
    codigoFamiliar,
    dataEntrevista: pessoas[0].dataEntrevista,
    folhaResumo: pessoas[0].folhaResumo,
    telefoneResponsavel,
    endereco,
    pessoas
  }
}

function updateEndereco(idEndereco, endereco) {
  if (!idEndereco) {
    return
  }

  db.prepare(`
    UPDATE Endereco
    SET
      cep = ?,
      logradouro = ?,
      numero = ?,
      complemento = ?,
      bairro = ?,
      localidade = ?,
      uf = ?,
      estado = ?,
      regiao = ?,
      ibge = ?,
      gia = ?,
      ddd = ?,
      siafi = ?,
      descricao = ?
    WHERE id = ?
  `).run(
    endereco.cep,
    endereco.logradouro,
    endereco.numero,
    endereco.complemento,
    endereco.bairro,
    endereco.localidade,
    endereco.uf,
    endereco.estado,
    endereco.regiao,
    endereco.ibge,
    endereco.gia,
    endereco.ddd,
    endereco.siafi,
    endereco.referencia,
    idEndereco
  )
}

function updatePessoa(cadastro, pessoa) {
  db.prepare(`
    UPDATE Pessoa
    SET
      codigo_familiar = ?,
      nome = ?,
      cpf = ?,
      nascimento = ?,
      data_cadunico = ?,
      folha_resumo = ?,
      responsavel_familiar = ?,
      menor = ?
    WHERE id = ?
  `).run(
    cadastro.codigoFamiliar,
    pessoa.nomeCompleto,
    pessoa.cpf,
    pessoa.nascimento,
    cadastro.dataEntrevista,
    cadastro.folhaResumo,
    pessoa.responsavelFamiliar ? 1 : 0,
    pessoa.menor ? 1 : 0,
    pessoa.id
  )
}

export function updateFamilia(codigoAtual, cadastro) {
  return runInTransaction(() => {
    const familiaAtual = findFamiliaByCodigo(codigoAtual)

    if (!familiaAtual) {
      return null
    }

    updateEndereco(familiaAtual.endereco?.id, cadastro.endereco)
    cadastro.familiares.forEach((pessoa) => updatePessoa(cadastro, pessoa))
    const responsavel = cadastro.familiares.find((pessoa) => pessoa.responsavelFamiliar)

    if (responsavel) {
      upsertTelefoneResponsavel(responsavel.id, cadastro.telefoneResponsavel)
    }

    return findFamiliaByCodigo(cadastro.codigoFamiliar)
  })
}

export function countActivePessoasByFamilia(codigoFamiliar) {
  return db.prepare(`
    SELECT COUNT(*) AS total
    FROM Pessoa
    WHERE codigo_familiar = ? AND ativo = 1
  `).get(codigoFamiliar).total
}

export function inactivatePessoa(idPessoa) {
  return db.prepare(`
    UPDATE Pessoa
    SET ativo = 0
    WHERE id = ?
  `).run(idPessoa)
}
