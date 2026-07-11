import { z } from 'zod'

export const MIN_PASSWORD_LENGTH = 8

export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Password must be at least 8 characters and include a letter, a number, and a special character'

/** Letter + number + special character, min 8 chars */
export function isStrongPassword(password: string): boolean {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) return false
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^a-zA-Z0-9]/.test(password)
  return hasLetter && hasNumber && hasSpecial
}

export const strongPasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, PASSWORD_REQUIREMENTS_MESSAGE)
  .refine(isStrongPassword, { message: PASSWORD_REQUIREMENTS_MESSAGE })
