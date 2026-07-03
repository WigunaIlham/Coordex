import bcrypt from "bcryptjs";

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";

export function generateTemporaryPassword(length = 10): string {
  const pool = ALPHA + DIGITS + "!@#";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += pool[bytes[i] % pool.length];
  }
  // Guarantee at least one digit
  if (!/[0-9]/.test(pwd)) {
    pwd = pwd.slice(0, -1) + DIGITS[bytes[0] % DIGITS.length];
  }
  return pwd;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}
