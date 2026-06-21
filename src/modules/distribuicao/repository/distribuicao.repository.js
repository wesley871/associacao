import db from '../../../configs/db.config.js'

export async function listProjetosAtivos() {
  return db.all(`
    SELECT
      p.id,
      p.nome,
      p.inicio,
      p.fim,
      COUNT(c.id) AS "totalParticipantes"
    FROM Projeto p
    LEFT JOIN Cadastro c ON c.id_projeto = p.id AND c.ativo = 1
    WHERE p.ativo = 1
    GROUP BY p.id, p.nome, p.inicio, p.fim
    ORDER BY p.nome COLLATE NOCASE
  `)
}

export async function findProjetoAtivoById(idProjeto) {
  return db.get(`
    SELECT id, nome, descricao, inicio, fim, ativo
    FROM Projeto
    WHERE id = ? AND ativo = 1
  `, [idProjeto])
}

export async function listParticipantesDistribuicao(idProjeto, data) {
  return db.all(`
    SELECT
      c.id AS "idCadastro",
      c.inicio,
      p.nome,
      p.cpf,
      p.codigo_familiar AS "codigoFamiliar",
      d.data AS "dataDistribuicao"
    FROM Cadastro c
    INNER JOIN Pessoa p ON p.id = c.id_pessoa
    LEFT JOIN Distribuicao d ON d.id_cadastro = c.id AND d.data = ?
    WHERE c.id_projeto = ? AND c.ativo = 1 AND p.ativo = 1
    ORDER BY d.data IS NOT NULL, p.nome COLLATE NOCASE
  `, [data, idProjeto])
}

export async function findDistribuicaoByCadastroAndData({ idCadastro, data }) {
  return db.get(`
    SELECT id, id_cadastro AS "idCadastro", data
    FROM Distribuicao
    WHERE id_cadastro = ? AND data = ?
    ORDER BY data DESC, id DESC
    LIMIT 1
  `, [idCadastro, data])
}

export async function findCadastroAtivoById(idCadastro) {
  return db.get(`
    SELECT
      c.id,
      c.id_projeto AS "idProjeto",
      c.id_pessoa AS "idPessoa",
      c.ativo,
      p.ativo AS "pessoaAtiva"
    FROM Cadastro c
    INNER JOIN Pessoa p ON p.id = c.id_pessoa
    WHERE c.id = ? AND c.ativo = 1 AND p.ativo = 1
  `, [idCadastro])
}

export async function createDistribuicao({ idCadastro, data }) {
  const result = await db.run(`
    INSERT INTO Distribuicao (id_cadastro, data)
    VALUES (?, ?)
    RETURNING id
  `, [idCadastro, data])

  return Number(result.lastInsertRowid)
}
