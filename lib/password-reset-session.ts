const PASSWORD_RESET_EMAIL_KEY = 'viros_password_reset_email'

export function setPasswordResetEmail(email: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PASSWORD_RESET_EMAIL_KEY, email.trim().toLowerCase())
}

export function getPasswordResetEmail(): string {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem(PASSWORD_RESET_EMAIL_KEY) || ''
}

export function clearPasswordResetSession(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(PASSWORD_RESET_EMAIL_KEY)
  // legacy key cleanup
  sessionStorage.removeItem('viros_password_reset_otp')
}
