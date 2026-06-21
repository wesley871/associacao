import db from '../../../configs/db.config.js'

async function insertEndereco(conn, endereco) {
  const result = await conn.run(`
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
    RETURNING id
  `, [
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
  ])

  return Number(result.lastInsertRowid)
}

async function insertPessoa(conn, cadastro, familiar) {
  const result = await conn.run(`
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
    RETURNING id
  `, [
    cadastro.codigoFamiliar,
    familiar.nomeCompleto,
    familiar.cpf,
    familiar.nascimento,
    cadastro.dataEntrevista,
    cadastro.folhaResumo,
    familiar.responsavelFamiliar ? 1 : 0,
    familiar.menor ? 1 : 0
  ])

  return Number(result.lastInsertRowid)
}

async function linkPessoaEndereco(conn, idPessoa, idEndereco) {
  await conn.run(`
    INSERT INTO Pessoa_Endereco (id_pessoa, id_endereco)
    VALUES (?, ?)
  `, [idPessoa, idEndereco])
}

async function insertTelefoneResponsavel(conn, idPessoa, telefone = '') {
  if (!telefone) {
    return null
  }

  const result = await conn.run(`
    INSERT INTO Telefone (descricao, numero, principal, whatsapp, ativo)
    VALUES (?, ?, 1, 1, 1)
    RETURNING id
  `, ['Responsável familiar', telefone])
  const idTelefone = Number(result.lastInsertRowid)

  await conn.run(`
    INSERT INTO Pessoa_Contato (id_pessoa, id_telefone)
    VALUES (?, ?)
  `, [idPessoa, idTelefone])

  return idTelefone
}

async function findTelefoneResponsavel(conn, idPessoa) {
  return conn.get(`
    SELECT t.id, t.numero
    FROM Telefone t
    INNER JOIN Pessoa_Contato pc ON pc.id_telefone = t.id
    WHERE pc.id_pessoa = ? AND t.ativo = 1
    ORDER BY t.principal DESC, t.id ASC
    LIMIT 1
  `, [idPessoa])
}

async function upsertTelefoneResponsavel(conn, idPessoa, telefone = '') {
  const currentTelefone = await findTelefoneResponsavel(conn, idPessoa)

  if (currentTelefone) {
    await conn.run(`
      UPDATE Telefone
      SET numero = ?
      WHERE id = ?
    `, [telefone, currentTelefone.id])

    return currentTelefone.id
  }

  return insertTelefoneResponsavel(conn, idPessoa, telefone)
}

export async function saveFamilia(cadastro) {
  return db.transaction(async (conn) => {
    const idEndereco = await insertEndereco(conn, cadastro.endereco)
    const pessoas = []

    for (const familiar of cadastro.familiares) {
      const idPessoa = await insertPessoa(conn, cadastro, familiar)
      await linkPessoaEndereco(conn, idPessoa, idEndereco)

      if (familiar.responsavelFamiliar) {
        await insertTelefoneResponsavel(conn, idPessoa, cadastro.telefoneResponsavel)
      }

      pessoas.push({
        id: idPessoa,
        nome: familiar.nomeCompleto,
        cpf: familiar.cpf
      })
    }

    return {
      idEndereco,
      pessoas
    }
  })
}

export async function listFamilias(search = '') {
  const term = `%${search.trim()}%`

  return db.all(`
    SELECT
      p.codigo_familiar AS "codigoFamiliar",
      MAX(CASE WHEN p.responsavel_familiar = 1 THEN p.nome ELSE NULL END) AS responsavel,
      MAX(p.data_cadunico) AS "dataEntrevista",
      MAX(p.folha_resumo) AS "folhaResumo",
      COUNT(*) AS "totalPessoas",
      SUM(CASE WHEN p.ativo = 1 THEN 1 ELSE 0 END) AS "pessoasAtivas"
    FROM Pessoa p
    WHERE p.codigo_familiar IN (
      SELECT DISTINCT codigo_familiar
      FROM Pessoa
      WHERE codigo_familiar LIKE ? OR cpf LIKE ?
    )
    GROUP BY p.codigo_familiar
    ORDER BY p.codigo_familiar DESC
  `, [term, term])
}

export async function findFamiliaByCodigo(codigoFamiliar, conn = db) {
  const pessoas = await conn.all(`
    SELECT
      id,
      codigo_familiar AS "codigoFamiliar",
      nome,
      cpf,
      nascimento,
      data_cadunico AS "dataEntrevista",
      folha_resumo AS "folhaResumo",
      responsavel_familiar AS "responsavelFamiliar",
      menor,
      ativo
    FROM Pessoa
    WHERE codigo_familiar = ?
    ORDER BY responsavel_familiar DESC, id ASC
  `, [codigoFamiliar])

  if (pessoas.length === 0) {
    return null
  }

  const endereco = await conn.get(`
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
  `, [codigoFamiliar])
  const responsavel = pessoas.find((pessoa) => pessoa.responsavelFamiliar)
  const telefoneResponsavel = responsavel
    ? (await findTelefoneResponsavel(conn, responsavel.id))?.numero ?? ''
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

async function updateEndereco(conn, idEndereco, endereco) {
  if (!idEndereco) {
    return
  }

  await conn.run(`
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
  `, [
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
  ])
}

async function updatePessoa(conn, cadastro, pessoa) {
  await conn.run(`
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
  `, [
    cadastro.codigoFamiliar,
    pessoa.nomeCompleto,
    pessoa.cpf,
    pessoa.nascimento,
    cadastro.dataEntrevista,
    cadastro.folhaResumo,
    pessoa.responsavelFamiliar ? 1 : 0,
    pessoa.menor ? 1 : 0,
    pessoa.id
  ])
}

export async function updateFamilia(codigoAtual, cadastro) {
  return db.transaction(async (conn) => {
    const familiaAtual = await findFamiliaByCodigo(codigoAtual, conn)

    if (!familiaAtual) {
      return null
    }

    const idEndereco = familiaAtual.endereco?.id

    await updateEndereco(conn, idEndereco, cadastro.endereco)

    for (const pessoa of cadastro.familiares) {
      if (pessoa.id) {
        await updatePessoa(conn, cadastro, pessoa)
        continue
      }

      const idPessoa = await insertPessoa(conn, cadastro, pessoa)

      if (idEndereco) {
        await linkPessoaEndereco(conn, idPessoa, idEndereco)
      }

      pessoa.id = idPessoa
    }

    const responsavel = cadastro.familiares.find((pessoa) => pessoa.responsavelFamiliar)

    if (responsavel) {
      await upsertTelefoneResponsavel(conn, responsavel.id, cadastro.telefoneResponsavel)
    }

    return findFamiliaByCodigo(cadastro.codigoFamiliar, conn)
  })
}

export async function countActivePessoasByFamilia(codigoFamiliar) {
  const row = await db.get(`
    SELECT COUNT(*) AS total
    FROM Pessoa
    WHERE codigo_familiar = ? AND ativo = 1
  `, [codigoFamiliar])

  return Number(row.total)
}

export async function inactivatePessoa(idPessoa) {
  return db.run(`
    UPDATE Pessoa
    SET ativo = 0
    WHERE id = ?
  `, [idPessoa])
}
