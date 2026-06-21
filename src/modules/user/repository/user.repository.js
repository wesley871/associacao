import { randomUUID } from 'node:crypto'
import db from '../../../configs/db.config.js'

export async function countUsers() {
  const row = await db.get('SELECT COUNT(*) AS total FROM Usuario')
  return Number(row.total)
}

export async function createUser({ login, hash, idPessoa = null }) {
  const uuid = randomUUID()

  await db.run(`
    INSERT INTO Usuario (id_pessoa, uuid, login, hash)
    VALUES (?, ?, ?, ?)
  `, [idPessoa, uuid, login, hash])

  return findByLogin(login)
}

export async function listUsers() {
  return db.all(`
    SELECT id, id_pessoa AS "idPessoa", uuid, login
    FROM Usuario
    ORDER BY login COLLATE NOCASE
  `)
}

export async function findByLogin(login) {
  return db.get(`
    SELECT id, id_pessoa AS "idPessoa", uuid, login, hash
    FROM Usuario
    WHERE login = ?
  `, [login])
}

export async function findByUuid(uuid) {
  return db.get(`
    SELECT id, id_pessoa AS "idPessoa", uuid, login
    FROM Usuario
    WHERE uuid = ?
  `, [uuid])
}

export async function findAuthByUuid(uuid) {
  return db.get(`
    SELECT id, id_pessoa AS "idPessoa", uuid, login, hash
    FROM Usuario
    WHERE uuid = ?
  `, [uuid])
}

export async function updateUser({ uuid, login, hash = null }) {
  if (hash) {
    await db.run(`
      UPDATE Usuario
      SET login = ?, hash = ?
      WHERE uuid = ?
    `, [login, hash, uuid])

    return findByUuid(uuid)
  }

  await db.run(`
    UPDATE Usuario
    SET login = ?
    WHERE uuid = ?
  `, [login, uuid])

  return findByUuid(uuid)
}

export async function updatePasswordHash(uuid, hash) {
  return db.run(`
    UPDATE Usuario
    SET hash = ?
    WHERE uuid = ?
  `, [hash, uuid])
}

export async function deleteUser(uuid) {
  return db.run(`
    DELETE FROM Usuario
    WHERE uuid = ?
  `, [uuid])
}
