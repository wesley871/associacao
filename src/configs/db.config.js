export const UNIQUE_CONSTRAINT_CODE = 'APP_UNIQUE_CONSTRAINT'

export async function initDatabase() {
  return null
}

export function createUniqueConstraintError(message) {
  const error = new Error(message)
  error.code = UNIQUE_CONSTRAINT_CODE
  return error
}

export function isUniqueConstraintError(error) {
  return error?.code === UNIQUE_CONSTRAINT_CODE
}
