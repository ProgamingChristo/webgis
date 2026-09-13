import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("profile metadata contrast contract", () => {
  it("uses readable semantic colors on light account-menu surfaces", () => {
    expect(styles).toContain("--account-menu-meta-light");
    expect(styles).toContain("--account-menu-mode-light");
    expect(styles).toMatch(/\.workspace--figma \.account-menu__panel \.account-menu__advertising-link/);
    expect(styles).toMatch(/\.workspace--figma \.account-menu__panel \.account-menu__logout/);
    expect(styles).toMatch(/\.workspace--figma \.user-type-badge--admin/);
  });

  it("keeps directory trust, stakeholder badges, and public profile cards readable on light surfaces", () => {
    expect(styles).toMatch(/\.profile-trust-score\s*\{[^}]*color:\s*#3f6212/s);
    expect(styles).toMatch(/\.user-type-badge--admin\s*\{[^}]*background:\s*#fffbeb;[^}]*color:\s*#854d0e/s);
    expect(styles).toMatch(/\.user-type-badge--investor\s*\{[^}]*background:\s*#faf5ff;[^}]*color:\s*#6b21a8/s);
    expect(styles).toMatch(/\.user-type-badge--government\s*\{[^}]*background:\s*#f0fdfa;[^}]*color:\s*#0f766e/s);
    expect(styles).not.toMatch(/\.user-type-badge--admin\s*\{[^}]*color:\s*rgb\(254 240 138\)/s);
    expect(styles).not.toMatch(/\.user-type-badge--investor\s*\{[^}]*color:\s*rgb\(233 213 255\)/s);
    expect(styles).not.toMatch(/\.user-type-badge--government\s*\{[^}]*color:\s*rgb\(153 246 228\)/s);
    expect(styles).toMatch(/\.getra-public-profile \.user-profile-mode\s*\{[^}]*background:\s*#f8fafc;[^}]*color:\s*#0f2744/s);
    expect(styles).toMatch(/\.getra-public-profile \.user-profile-mode p\s*\{[^}]*color:\s*#475569/s);
  });
});
