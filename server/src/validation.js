export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/;

export function validateName(name) {
  if (typeof name !== 'string' || name.trim().length < 20 || name.trim().length > 60) {
    return 'Name must be between 20 and 60 characters.';
  }
  return null;
}
export function validateAddress(address) {
  if (typeof address !== 'string' || address.length > 400) return 'Address must be at most 400 characters.';
  return null;
}
export function validateEmail(email) {
  if (typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email)) return 'Enter a valid email address.';
  return null;
}
export function validatePassword(password) {
  if (typeof password !== 'string' || !PASSWORD_RE.test(password)) {
    return 'Password must be 8–16 characters and include an uppercase letter and a special character.';
  }
  return null;
}
export function validateUserInput(input, { requireRole = false } = {}) {
  const errors = [
    validateName(input.name),
    validateEmail(input.email),
    validateAddress(input.address ?? ''),
    validatePassword(input.password),
  ].filter(Boolean);
  if (requireRole && !['ADMIN', 'USER', 'OWNER'].includes(input.role)) errors.push('Role must be ADMIN, USER, or OWNER.');
  return errors;
}
