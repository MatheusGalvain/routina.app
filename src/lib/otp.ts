/**
 * Login por código (OTP do e-mail).
 *
 * OTP_LENGTH precisa ser igual ao "Email OTP Length" do Supabase
 * (Authentication → Sign In / Providers → Email). O padrão do Supabase é 6; se mudar lá,
 * defina VITE_OTP_LENGTH com o mesmo número.
 */
const envLength = Number(import.meta.env.VITE_OTP_LENGTH)
export const OTP_LENGTH = Number.isInteger(envLength) && envLength >= 6 && envLength <= 10 ? envLength : 6

/** O mesmo e-mail no envio e na verificação: sem espaços e em minúsculas. */
export const normalizeEmail = (email: string) => email.trim().toLowerCase()

/** Só os dígitos do código, cortados no tamanho certo (digitado ou colado). */
export const cleanCode = (value: string) => value.replace(/\D/g, '').slice(0, OTP_LENGTH)

/** Em dev, registra cada chamada de login no console (nunca o código em si, só o tamanho). */
export function logAuth(call: 'signInWithOtp' | 'verifyOtp', info: { email?: string; codeLength?: number; type?: string; result: string }) {
  if (!import.meta.env.DEV) return
  console.info(`[auth] ${new Date().toISOString()} ${call}`, info)
}
