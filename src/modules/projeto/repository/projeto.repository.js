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

export function listProjetos(search = '') {
  const term = `%${search.trim()}%`

  return db.prepare(`
    SELECT
      p.id,
      p.nome,
      p.descricao,
      p.inicio,
      p.fim,
      p.ativo,
      COUNT(c.id) AS totalParticipantes,
      SUM(CASE WHEN c.ativo = 1 THEN 1 ELSE 0 END) AS participantesAtivos
    FROM Projeto p
    LEFT JOIN Cadastro c ON c.id_projeto = p.id
    WHERE p.nome LIKE ?
    GROUP BY p.id
    ORDER BY p.ativo DESC, p.nome COLLATE NOCASE
  `).all(term)
}

export function findProjetoById(id) {
  return db.prepare(`
    SELECT id, nome, descricao, inicio, fim, ativo
    FROM Projeto
    WHERE id = ?
  `).get(id)
}

export function createProjeto({ nome, descricao, inicio, fim = null }) {
  const result = db.prepare(`
    INSERT INTO Projeto (nome, descricao, inicio, fim, ativo)
    VALUES (?, ?, ?, ?, 1)
  `).run(nome, descricao, inicio, fim)

  return findProjetoById(Number(result.lastInsertRowid))
}

export function updateProjeto({ id, nome, descricao, inicio, fim = null }) {
  db.prepare(`
    UPDATE Projeto
    SET nome = ?, descricao = ?, inicio = ?, fim = ?
    WHERE id = ?
  `).run(nome, descricao, inicio, fim, id)

  return findProjetoById(id)
}

export function inactivateProjeto(id, fim) {
  return runInTransaction(() => {
    db.prepare(`
      UPDATE Projeto
      SET ativo = 0, fim = COALESCE(?, fim)
      WHERE id = ?
    `).run(fim, id)

    db.prepare(`
      UPDATE Cadastro
      SET ativo = 0, fim = COALESCE(fim, ?)
      WHERE id_projeto = ? AND ativo = 1
    `).run(fim, id)

    return findProjetoById(id)
  })
}

export function findPessoaByCpf(cpf) {
  return db.prepare(`
    SELECT id, codigo_familiar AS codigoFamiliar, nome, cpf, ativo
    FROM Pessoa
    WHERE cpf = ?
  `).get(cpf)
}

export function findActiveCadastro({ idProjeto, idPessoa }) {
  return db.prepare(`
    SELECT id, id_projeto AS idProjeto, id_pessoa AS idPessoa, inicio, fim, ativo
    FROM Cadastro
    WHERE id_projeto = ? AND id_pessoa = ? AND ativo = 1
  `).get(idProjeto, idPessoa)
}

export function addParticipante({ idProjeto, idPessoa, inicio }) {
  const result = db.prepare(`
    INSERT INTO Cadastro (id_projeto, id_pessoa, inicio, fim, ativo)
    VALUES (?, ?, ?, NULL, 1)
  `).run(idProjeto, idPessoa, inicio)

  return Number(result.lastInsertRowid)
}

export function listParticipantes(idProjeto) {
  return db.prepare(`
    SELECT
      c.id,
      c.inicio,
      c.fim,
      c.ativo,
      p.id AS idPessoa,
      p.codigo_familiar AS codigoFamiliar,
      p.nome,
      p.cpf,
      p.ativo AS pessoaAtiva
    FROM Cadastro c
    INNER JOIN Pessoa p ON p.id = c.id_pessoa
    WHERE c.id_projeto = ?
    ORDER BY c.ativo DESC, p.nome COLLATE NOCASE
  `).all(idProjeto)
}

export function inactivateParticipante({ idCadastro, fim }) {
  db.prepare(`
    UPDATE Cadastro
    SET ativo = 0, fim = ?
    WHERE id = ?
  `).run(fim, idCadastro)
}
