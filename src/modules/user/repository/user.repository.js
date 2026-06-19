import { randomUUID } from 'node:crypto'
import db from '../../../configs/db.config.js'

export function countUsers() {
  return db.prepare('SELECT COUNT(*) AS total FROM Usuario').get().total
}

export function createUser({ login, hash, idPessoa = null }) {
  const uuid = randomUUID()

  db.prepare(`
    INSERT INTO Usuario (id_pessoa, uuid, login, hash)
    VALUES (?, ?, ?, ?)
  `).run(idPessoa, uuid, login, hash)

  return findByLogin(login)
}

export function listUsers() {
  return db.prepare(`
    SELECT id, id_pessoa AS idPessoa, uuid, login
    FROM Usuario
    ORDER BY login COLLATE NOCASE
  `).all()
}

export function findByLogin(login) {
  return db.prepare(`
    SELECT id, id_pessoa AS idPessoa, uuid, login, hash
    FROM Usuario
    WHERE login = ?
  `).get(login)
}

export function findByUuid(uuid) {
  return db.prepare(`
    SELECT id, id_pessoa AS idPessoa, uuid, login
    FROM Usuario
    WHERE uuid = ?
  `).get(uuid)
}

export function findAuthByUuid(uuid) {
  return db.prepare(`
    SELECT id, id_pessoa AS idPessoa, uuid, login, hash
    FROM Usuario
    WHERE uuid = ?
  `).get(uuid)
}

export function updateUser({ uuid, login, hash = null }) {
  if (hash) {
    db.prepare(`
      UPDATE Usuario
      SET login = ?, hash = ?
      WHERE uuid = ?
    `).run(login, hash, uuid)

    return findByUuid(uuid)
  }

  db.prepare(`
    UPDATE Usuario
    SET login = ?
    WHERE uuid = ?
  `).run(login, uuid)

  return findByUuid(uuid)
}

export function updatePasswordHash(uuid, hash) {
  db.prepare(`
    UPDATE Usuario
    SET hash = ?
    WHERE uuid = ?
  `).run(hash, uuid)
}

export function deleteUser(uuid) {
  return db.prepare(`
    DELETE FROM Usuario
    WHERE uuid = ?
  `).run(uuid)
}
