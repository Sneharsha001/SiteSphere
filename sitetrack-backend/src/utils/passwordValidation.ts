/**
 * Password strength validation.
 * Enforces minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, and 1 special character.
 */
export function validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' }
  }

  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)

  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    return {
      isValid: false,
      error:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    }
  }

  return { isValid: true }
}
