/**
 * GETRA ISO/IEC 27001:2022-Aligned Password Security Policy
 *
 * Implements modern password security controls:
 * - Minimum 12 characters (length-centric instead of forced predictable symbols)
 * - Passphrase friendly (supports long phrases, spaces, UTF-8)
 * - Common weak password blocklist detection
 * - Privacy-preserving local validation (no plaintext transmission or storage)
 */

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

/**
 * Common weak/predictable passwords, patterns, and keyboard walks.
 * Normalized to lowercase for comparison.
 */
const COMMON_WEAK_PASSWORDS = new Set([
  // Basic sequences
  "123456789012",
  "1234567890123",
  "12345678901234",
  "123456789012345",
  "012345678901",
  "987654321098",

  // Keyboard walks
  "qwertyuiop12",
  "qwertyuiopas",
  "asdfghjkl123",
  "zxcvbnmasdfg",

  // Common dictionary + digit patterns
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

/**
 * Checks if a string consists of a single character repeated across its length.
 * e.g., "aaaaaaaaaaaa" or "111111111111"
 */
function isRepeatedChar(str: string): boolean {
  if (str.length < 2) return true;
  const first = str[0];
  for (let i = 1; i < str.length; i++) {
    if (str[i] !== first) return false;
  }
  return true;
}

/**
 * Checks if a string is a simple ascending or descending numeric sequence.
 */
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

/**
 * Evaluates whether a password is too common or easily guessable.
 * Returns true if the password should be rejected.
 */
export function isCommonPassword(password: string): boolean {
  if (!password) return true;

  const normalized = password.trim().toLowerCase();

  // 1. Direct match against known weak password blocklist
  if (COMMON_WEAK_PASSWORDS.has(normalized)) {
    return true;
  }

  // 2. All same character (e.g., "aaaaaaaaaaaa", "111111111111")
  if (isRepeatedChar(normalized)) {
    return true;
  }

  // 3. Pure sequential digits across the entire string
  if (isSequentialDigits(normalized)) {
    return true;
  }

  // 4. Repetitive blocks (e.g. "abcabcabcabc", "123123123123")
  for (const blockLen of [2, 3, 4]) {
    if (normalized.length >= blockLen * 3) {
      const block = normalized.slice(0, blockLen);
      const repeated = block.repeat(Math.floor(normalized.length / blockLen));
      if (normalized.startsWith(repeated)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculates password strength score (0-4) and classification.
 * Useful for both frontend and backend validation metrics.
 */
export interface PasswordStrengthResult {
  score: number; // 0 = very weak, 1 = weak, 2 = fair, 3 = strong, 4 = very strong
  level: "VERY_WEAK" | "WEAK" | "FAIR" | "STRONG" | "VERY_STRONG";
  isPassphrase: boolean;
  isValid: boolean;
  feedback: string;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return {
      score: 0,
      level: "VERY_WEAK",
      isPassphrase: false,
      isValid: false,
      feedback: `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`,
    };
  }

  if (isCommonPassword(password)) {
    return {
      score: 1,
      level: "WEAK",
      isPassphrase: false,
      isValid: false,
      feedback: "Password terlalu mudah ditebak.",
    };
  }

  const length = password.length;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9\s]/.test(password);
  const hasSpace = /\s/.test(password);

  // Multi-word passphrase detection (e.g. "kucing hitam melompat tinggi")
  const words = password.trim().split(/\s+/);
  const isPassphrase = words.length >= 3 && length >= 16;

  let score = 2; // Baseline for meeting >= 12 chars and not common

  if (isPassphrase) {
    score = 4;
  } else {
    let diversityCount = 0;
    if (hasLower) diversityCount++;
    if (hasUpper) diversityCount++;
    if (hasNumber) diversityCount++;
    if (hasSpecial || hasSpace) diversityCount++;

    if (length >= 16 && diversityCount >= 3) {
      score = 4;
    } else if (length >= 14 && diversityCount >= 3) {
      score = 3;
    } else if (diversityCount >= 2 && length >= 12) {
      score = 2;
    } else {
      score = 1;
    }
  }

  const levelMap: Record<number, PasswordStrengthResult["level"]> = {
    0: "VERY_WEAK",
    1: "WEAK",
    2: "FAIR",
    3: "STRONG",
    4: "VERY_STRONG",
  };

  return {
    score,
    level: levelMap[score] || "FAIR",
    isPassphrase,
    isValid: score >= 2,
    feedback:
      score >= 3
        ? "Password kuat dan memenuhi standar keamanan."
        : "Frasa sandi yang lebih panjang atau variasi karakter akan membuatnya lebih aman.",
  };
}
