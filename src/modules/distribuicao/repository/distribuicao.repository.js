import db from '../../../configs/db.config.js'

export function listProjetosAtivos() {
  return db.prepare(`
    SELECT
      p.id,
      p.nome,
      p.inicio,
      p.fim,
      COUNT(c.id) AS totalParticipantes
    FROM Projeto p
    LEFT JOIN Cadastro c ON c.id_projeto = p.id AND c.ativo = 1
    WHERE p.ativo = 1
    GROUP BY p.id
    ORDER BY p.nome COLLATE NOCASE
  `).all()
}

export function findProjetoAtivoById(idProjeto) {
  return db.prepare(`
    SELECT id, nome, descricao, inicio, fim, ativo
    FROM Projeto
    WHERE id = ? AND ativo = 1
  `).get(idProjeto)
}

export function listParticipantesDistribuicao(idProjeto) {
  return db.prepare(`
    SELECT
      c.id AS idCadastro,
      c.inicio,
      p.nome,
      p.cpf,
      p.codigo_familiar AS codigoFamiliar,
      MAX(d.data) AS dataDistribuicao
    FROM Cadastro c
    INNER JOIN Pessoa p ON p.id = c.id_pessoa
    LEFT JOIN Distribuicao d ON d.id_cadastro = c.id
    WHERE c.id_projeto = ? AND c.ativo = 1 AND p.ativo = 1
    GROUP BY c.id
    ORDER BY dataDistribuicao IS NOT NULL, p.nome COLLATE NOCASE
  `).all(idProjeto)
}

export function findDistribuicaoByCadastro(idCadastro) {
  return db.prepare(`
    SELECT id, id_cadastro AS idCadastro, data
    FROM Distribuicao
    WHERE id_cadastro = ?
    ORDER BY data DESC, id DESC
    LIMIT 1
  `).get(idCadastro)
}

export function findCadastroAtivoById(idCadastro) {
  return db.prepare(`
    SELECT
      c.id,
      c.id_projeto AS idProjeto,
      c.id_pessoa AS idPessoa,
      c.ativo,
      p.ativo AS pessoaAtiva
    FROM Cadastro c
    INNER JOIN Pessoa p ON p.id = c.id_pessoa
    WHERE c.id = ? AND c.ativo = 1 AND p.ativo = 1
  `).get(idCadastro)
}

export function createDistribuicao({ idCadastro, data }) {
  const result = db.prepare(`
    INSERT INTO Distribuicao (id_cadastro, data)
    VALUES (?, ?)
  `).run(idCadastro, data)

  return Number(result.lastInsertRowid)
}
