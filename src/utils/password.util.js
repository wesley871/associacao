import bcrypt from 'bcryptjs'
import { scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64
const SALT_ROUNDS = 12

export function hashPassword(password) {
  return bcrypt.hashSync(password, SALT_ROUNDS)
}

export function verifyPassword(password, storedHash = '') {
  if (storedHash.startsWith('$2')) {
    return bcrypt.compareSync(password, storedHash)
  }

  return verifyLegacyScryptPassword(password, storedHash)
}

export function shouldRehashPassword(storedHash = '') {
  return !storedHash.startsWith('$2')
}

function verifyLegacyScryptPassword(password, storedHash = '') {
  const [algorithm, salt, hash] = storedHash.split(':')

  if (algorithm !== 'scrypt' || !salt || !hash) {
    return false
  }

  const passwordHash = Buffer.from(scryptSync(password, salt, KEY_LENGTH).toString('hex'), 'hex')
  const storedPasswordHash = Buffer.from(hash, 'hex')

  if (passwordHash.length !== storedPasswordHash.length) {
    return false
  }

  return timingSafeEqual(passwordHash, storedPasswordHash)
}
