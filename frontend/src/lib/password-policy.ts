/**
 * GETRA ISO/IEC 27001:2022-Aligned Password Security Policy (Frontend)
 *
 * Provides real-time interactive feedback on password strength, passphrases,
 * and common weak password detection matching backend policy.
 */

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

const COMMON_WEAK_PASSWORDS = new Set([
  "123456789012",
  "1234567890123",
  "12345678901234",
  "123456789012345",
  "012345678901",
  "987654321098",
  "qwertyuiop12",
  "qwertyuiopas",
  "asdfghjkl123",
  "zxcvbnmasdfg",
  "password1234",
  "password12345",
  "password123456",
  "administrator",
  "admin1234567",
  "admin12345678",
  "admin123456789",
  "indonesia123",
  "indonesia1234",
  "indonesia12345",
  "jakarta12345",
  "jakarta123456",
  "rahasia12345",
  "rahasia123456",
  "getraadmin123",
  "getrapassword",
  "getra12345678",
  "welcome12345",
  "welcome123456",
  "iloveyou1234",
  "iloveyou12345",
  "changeme1234",
  "changeme12345",
  "letmein12345",
  "letmein123456",
  "masterpassword",
  "passcode1234",
]);

function isRepeatedChar(str: string): boolean {
  if (str.length < 2) return true;
  const first = str[0];
  for (let i = 1; i < str.length; i++) {
    if (str[i] !== first) return false;
  }
  return true;
}

function isSequentialDigits(str: string): boolean {
  if (!/^\d+$/.test(str) || str.length < 4) return false;
  let ascending = true;
  let descending = true;
  for (let i = 1; i < str.length; i++) {
    const diff = str.charCodeAt(i) - str.charCodeAt(i - 1);
    if (diff !== 1 && !(str[i - 1] === "9" && str[i] === "0")) {
      ascending = false;
    }
    if (diff !== -1 && !(str[i - 1] === "0" && str[i] === "9")) {
      descending = false;
    }
  }
  return ascending || descending;
}

export function isCommonPassword(password: string): boolean {
  if (!password) return true;
  const normalized = password.trim().toLowerCase();

  if (COMMON_WEAK_PASSWORDS.has(normalized)) return true;
  if (isRepeatedChar(normalized)) return true;
  if (isSequentialDigits(normalized)) return true;

  for (const blockLen of [2, 3, 4]) {
    if (normalized.length >= blockLen * 3) {
      const block = normalized.slice(0, blockLen);
      const repeated = block.repeat(Math.floor(normalized.length / blockLen));
      if (normalized.startsWith(repeated)) return true;
    }
  }

  return false;
}

export interface PasswordStrengthResult {
  score: number; // 0..4
  level: "VERY_WEAK" | "WEAK" | "FAIR" | "STRONG" | "VERY_STRONG";
  isPassphrase: boolean;
  isValid: boolean;
  label: string;
  feedback: string;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      level: "VERY_WEAK",
      isPassphrase: false,
      isValid: false,
      label: "Belum diisi",
      feedback: `Gunakan minimal ${MIN_PASSWORD_LENGTH} karakter.`,
    };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      score: 1,
      level: "WEAK",
      isPassphrase: false,
      isValid: false,
      label: "Terlalu pendek",
      feedback: `Password minimal ${MIN_PASSWORD_LENGTH} karakter (kurang ${MIN_PASSWORD_LENGTH - password.length} karakter).`,
    };
  }

  if (isCommonPassword(password)) {
    return {
      score: 1,
      level: "WEAK",
      isPassphrase: false,
      isValid: false,
      label: "Terlalu mudah ditebak",
      feedback: "Password terlalu mudah ditebak.",
    };
  }

  const length = password.length;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9\s]/.test(password);
  const hasSpace = /\s/.test(password);

  const words = password.trim().split(/\s+/);
  const isPassphrase = words.length >= 3 && length >= 16;

  let score = 2; // Meets length & not common

  if (isPassphrase) {
    score = 4;
  } else {
    let diversity = 0;
    if (hasLower) diversity++;
    if (hasUpper) diversity++;
    if (hasNumber) diversity++;
    if (hasSpecial || hasSpace) diversity++;

    if (length >= 16 && diversity >= 3) {
      score = 4;
    } else if (length >= 14 && diversity >= 3) {
      score = 3;
    } else if (diversity >= 2 && length >= 12) {
      score = 2;
    } else {
      score = 1;
    }
  }

  const labelMap: Record<number, { level: PasswordStrengthResult["level"]; label: string }> = {
    0: { level: "VERY_WEAK", label: "Sangat Lemah" },
    1: { level: "WEAK", label: "Lemah" },
    2: { level: "FAIR", label: "Cukup" },
    3: { level: "STRONG", label: "Kuat" },
    4: { level: "VERY_STRONG", label: "Sangat Kuat" },
  };

  const meta = labelMap[score] || labelMap[2];

  return {
    score,
    level: meta.level,
    isPassphrase,
    isValid: score >= 2,
    label: isPassphrase ? "Frasa Sandi Kuat" : meta.label,
    feedback:
      score >= 3
        ? "Password kuat dan memenuhi standar keamanan."
        : "Frasa sandi yang lebih panjang atau variasi karakter akan membuatnya lebih aman.",
  };
}
