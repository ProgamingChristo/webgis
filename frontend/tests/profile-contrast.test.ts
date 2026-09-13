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
});
