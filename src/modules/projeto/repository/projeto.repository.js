import db from '../../../configs/db.config.js'

export async function listProjetos(search = '') {
  const term = `%${search.trim()}%`

  return db.all(`
    SELECT
      p.id,
      p.nome,
      p.descricao,
      p.inicio,
      p.fim,
      p.ativo,
      COUNT(c.id) AS "totalParticipantes",
      SUM(CASE WHEN c.ativo = 1 THEN 1 ELSE 0 END) AS "participantesAtivos"
    FROM Projeto p
    LEFT JOIN Cadastro c ON c.id_projeto = p.id
    WHERE p.nome LIKE ?
    GROUP BY p.id, p.nome, p.descricao, p.inicio, p.fim, p.ativo
    ORDER BY p.ativo DESC, p.nome COLLATE NOCASE
  `, [term])
}

export async function findProjetoById(id) {
  return db.get(`
    SELECT id, nome, descricao, inicio, fim, ativo
    FROM Projeto
    WHERE id = ?
  `, [id])
}

export async function createProjeto({ nome, descricao, inicio, fim = null }) {
  const result = await db.run(`
    INSERT INTO Projeto (nome, descricao, inicio, fim, ativo)
    VALUES (?, ?, ?, ?, 1)
    RETURNING id
  `, [nome, descricao, inicio, fim])

  return findProjetoById(Number(result.lastInsertRowid))
}

export async function updateProjeto({ id, nome, descricao, inicio, fim = null }) {
  await db.run(`
    UPDATE Projeto
    SET nome = ?, descricao = ?, inicio = ?, fim = ?
    WHERE id = ?
  `, [nome, descricao, inicio, fim, id])

  return findProjetoById(id)
}

export async function inactivateProjeto(id, fim) {
  return db.transaction(async (conn) => {
    await conn.run(`
      UPDATE Projeto
      SET ativo = 0, fim = COALESCE(?, fim)
      WHERE id = ?
    `, [fim, id])

    await conn.run(`
      UPDATE Cadastro
      SET ativo = 0, fim = COALESCE(fim, ?)
      WHERE id_projeto = ? AND ativo = 1
    `, [fim, id])

    return conn.get(`
      SELECT id, nome, descricao, inicio, fim, ativo
      FROM Projeto
      WHERE id = ?
    `, [id])
  })
}

export async function findPessoaByCpf(cpf) {
  return db.get(`
    SELECT id, codigo_familiar AS "codigoFamiliar", nome, cpf, ativo
    FROM Pessoa
    WHERE cpf = ?
  `, [cpf])
}

export async function findActiveCadastro({ idProjeto, idPessoa }) {
  return db.get(`
    SELECT id, id_projeto AS "idProjeto", id_pessoa AS "idPessoa", inicio, fim, ativo
    FROM Cadastro
    WHERE id_projeto = ? AND id_pessoa = ? AND ativo = 1
  `, [idProjeto, idPessoa])
}

export async function findCadastroById({ idProjeto, idCadastro }) {
  return db.get(`
    SELECT id, id_projeto AS "idProjeto", id_pessoa AS "idPessoa", inicio, fim, ativo
    FROM Cadastro
    WHERE id = ? AND id_projeto = ?
  `, [idCadastro, idProjeto])
}

export async function addParticipante({ idProjeto, idPessoa, inicio }) {
  const result = await db.run(`
    INSERT INTO Cadastro (id_projeto, id_pessoa, inicio, fim, ativo)
    VALUES (?, ?, ?, NULL, 1)
    RETURNING id
  `, [idProjeto, idPessoa, inicio])

  return Number(result.lastInsertRowid)
}

export async function listParticipantes(idProjeto) {
  return db.all(`
    SELECT
      c.id,
      c.inicio,
      c.fim,
      c.ativo,
      p.id AS "idPessoa",
      p.codigo_familiar AS "codigoFamiliar",
      p.nome,
      p.cpf,
      p.ativo AS "pessoaAtiva",
      COUNT(d.id) AS "totalDistribuicoes"
    FROM Cadastro c
    INNER JOIN Pessoa p ON p.id = c.id_pessoa
    LEFT JOIN Distribuicao d ON d.id_cadastro = c.id
    WHERE c.id_projeto = ?
    GROUP BY c.id, c.inicio, c.fim, c.ativo, p.id, p.codigo_familiar, p.nome, p.cpf, p.ativo
    ORDER BY c.ativo DESC, p.nome COLLATE NOCASE
  `, [idProjeto])
}

export async function inactivateParticipante({ idCadastro, fim }) {
  return db.run(`
    UPDATE Cadastro
    SET ativo = 0, fim = ?
    WHERE id = ?
  `, [fim, idCadastro])
}

export async function countDistribuicoesByCadastro(idCadastro) {
  const row = await db.get(`
    SELECT COUNT(*) AS total
    FROM Distribuicao
    WHERE id_cadastro = ?
  `, [idCadastro])

  return Number(row.total)
}

export async function deleteParticipante(idCadastro) {
  return db.run(`
    DELETE FROM Cadastro
    WHERE id = ?
  `, [idCadastro])
}
