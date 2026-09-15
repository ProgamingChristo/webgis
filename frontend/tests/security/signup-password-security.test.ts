import { describe, expect, it } from "vitest";

import {
  evaluatePasswordStrength,
  isCommonPassword,
  MIN_PASSWORD_LENGTH,
} from "@/src/lib/password-policy";

describe("Frontend Password Security & ISO/IEC 27001 Baseline", () => {
  it("enforces a minimum length of 12 characters", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);

    const shortPwd = "Short12345!";
    const result = evaluatePasswordStrength(shortPwd);
    expect(result.isValid).toBe(false);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.label).toBe("Terlalu pendek");
  });

  it("identifies and rejects common weak passwords", () => {
    const commonPasswords = [
      "123456789012",
      "password12345",
      "qwertyuiop12",
      "admin12345678",
      "indonesia1234",
      "aaaaaaaaaaaa",
    ];

    for (const pwd of commonPasswords) {
      expect(isCommonPassword(pwd)).toBe(true);
      const evalResult = evaluatePasswordStrength(pwd);
      expect(evalResult.isValid).toBe(false);
      expect(evalResult.feedback).toBe("Password terlalu mudah ditebak.");
    }
  });

  it("recognizes and rewards strong multi-word passphrases", () => {
    const passphrase = "kucing hitam melompat tinggi sekali";
    const result = evaluatePasswordStrength(passphrase);

    expect(result.isValid).toBe(true);
    expect(result.isPassphrase).toBe(true);
    expect(result.score).toBe(4);
    expect(result.label).toBe("Frasa Sandi Kuat");
  });

  it("correctly grades strong complex passwords", () => {
    const complexPwd = "Getra#Secure2026!Platform";
    const result = evaluatePasswordStrength(complexPwd);

    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(result.level).toMatch(/STRONG|VERY_STRONG/);
  });
});
