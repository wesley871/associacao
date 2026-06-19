import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const databasePath = process.env.DB_PATH
  ?? fileURLToPath(new URL('./dados.sqlite', import.meta.url))

const db = new DatabaseSync(databasePath)

db.exec('PRAGMA foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS Pessoa
(
  id           INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  codigo_familiar TEXT    NOT NULL,
  nome         TEXT    NOT NULL,
  cpf          TEXT    NOT NULL,
  nascimento   TEXT    NOT NULL,
  data_cadunico TEXT   NOT NULL,
  folha_resumo TEXT    NOT NULL,
  responsavel_familiar INTEGER NOT NULL DEFAULT 0 CHECK (responsavel_familiar IN (0, 1)),
  menor        INTEGER NOT NULL DEFAULT 0 CHECK (menor IN (0, 1)),
  ativo        INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
);
`)

db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_pessoa_cpf
ON Pessoa (cpf);
`)

db.exec(`
CREATE TABLE IF NOT EXISTS Usuario
(
  id        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  id_pessoa INTEGER NULL     REFERENCES Pessoa (id),
  uuid      TEXT    NOT NULL UNIQUE,
  login     TEXT    NOT NULL UNIQUE,
  hash      TEXT    NOT NULL
);
`)

db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_login
ON Usuario (login);
`)

db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_uuid
ON Usuario (uuid);
`)

db.exec(`
CREATE TABLE IF NOT EXISTS Projeto
(
  id        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  nome      TEXT    NOT NULL,
  descricao TEXT    NULL,
  inicio    TEXT    NOT NULL,
  fim       TEXT    NULL,
  ativo     INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
);
`)

db.exec(`
CREATE TABLE IF NOT EXISTS Cadastro
(
  id         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  id_projeto INTEGER NOT NULL REFERENCES Projeto (id),
  id_pessoa  INTEGER NOT NULL REFERENCES Pessoa (id),
  inicio     TEXT    NOT NULL,
  fim        TEXT    NULL,
  ativo      INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
);
`)

db.exec(`
CREATE INDEX IF NOT EXISTS idx_cadastro_projeto_pessoa
ON Cadastro (id_projeto, id_pessoa);
`)

db.exec(`
CREATE TABLE IF NOT EXISTS Distribuicao
(
  id          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  id_cadastro INTEGER NOT NULL REFERENCES Cadastro (id),
  data        TEXT    NOT NULL
);
`)

db.exec(`
CREATE INDEX IF NOT EXISTS idx_distribuicao_cadastro
ON Distribuicao (id_cadastro);
`)

db.exec(`
CREATE TABLE IF NOT EXISTS Telefone
(
  id        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  descricao TEXT    NULL,
  numero    TEXT    NOT NULL,
  principal INTEGER NOT NULL DEFAULT 1 CHECK (principal IN (0, 1)),
  whatsapp  INTEGER NOT NULL DEFAULT 1 CHECK (whatsapp IN (0, 1)),
  ativo     INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
);
`)

db.exec(`
CREATE TABLE IF NOT EXISTS Pessoa_Contato
(
  id          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  id_pessoa   INTEGER NOT NULL REFERENCES Pessoa (id),
  id_telefone INTEGER NOT NULL REFERENCES Telefone (id)
);
`)

db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_pessoa_contato
ON Pessoa_Contato (id_pessoa, id_telefone);
`)

db.exec(`
CREATE TABLE IF NOT EXISTS Endereco
(
  id          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  cep         TEXT    NULL,
  logradouro  TEXT    NULL,
  numero      TEXT    NULL,
  complemento TEXT    NULL,
  bairro      TEXT    NULL,
  localidade  TEXT    NULL,
  uf          TEXT    NULL,
  estado      TEXT    NULL,
  regiao      TEXT    NULL,
  ibge        TEXT    NULL,
  gia         TEXT    NULL,
  ddd         TEXT    NULL,
  siafi       TEXT    NULL,
  descricao   TEXT    NULL,
  ativo       INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
);
`)

db.exec(`
CREATE TABLE IF NOT EXISTS Pessoa_Endereco
(
  id          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  id_pessoa   INTEGER NOT NULL REFERENCES Pessoa (id),
  id_endereco INTEGER NOT NULL REFERENCES Endereco (id)
);
`)

db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_pessoa_endereco
ON Pessoa_Endereco (id_pessoa, id_endereco);
`)

export default db
