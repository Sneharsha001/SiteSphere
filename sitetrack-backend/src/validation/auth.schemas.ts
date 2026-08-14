/**
 * src/validation/auth.schemas.ts
 *
 * Zod validation schemas for all authentication endpoints.
 * Single source of truth — imported by controllers.
 */
import { z } from 'zod'

// ── Reusable field definitions ────────────────────────────────────────────

const emailField = z
  .string({ message: 'Email is required' })
  .min(1, 'Email is required')
  .email('Must be a valid email address')
  .toLowerCase()
  .trim()

const passwordField = z
  .string({ message: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine((p) => /[A-Z]/.test(p), 'Password must contain at least one uppercase letter')
  .refine((p) => /[a-z]/.test(p), 'Password must contain at least one lowercase letter')
  .refine((p) => /[0-9]/.test(p), 'Password must contain at least one number')
  .refine((p) => /[^A-Za-z0-9]/.test(p), 'Password must contain at least one special character')

const nameField = z
  .string({ message: 'Name is required' })
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters')
  .trim()

// ── Register ──────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  organizationName: z
    .string({ message: 'Organization name is required' })
    .min(2, 'Organization name must be at least 2 characters')
    .max(200, 'Organization name must be at most 200 characters')
    .trim(),
  name: nameField,
  email: emailField,
  password: passwordField,
})

export type RegisterInput = z.infer<typeof RegisterSchema>

// ── Login ─────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: emailField,
  password: z
    .string({ message: 'Password is required' })
    .min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof LoginSchema>

// ── Forgot Password ───────────────────────────────────────────────────────

export const ForgotPasswordSchema = z.object({
  email: emailField,
})

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>

// ── Reset Password ────────────────────────────────────────────────────────

export const ResetPasswordSchema = z.object({
  token: z
    .string({ message: 'Reset token is required' })
    .min(1, 'Reset token is required'),
  password: passwordField,
})

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>

// ── Change Password (authenticated) ──────────────────────────────────────

export const ChangePasswordSchema = z
  .object({
    currentPassword: z
      .string({ message: 'Current password is required' })
      .min(1, 'Current password is required'),
    newPassword: passwordField,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must differ from current password',
    path: ['newPassword'],
  })

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
