import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const TEXT_EXTENSIONS = new Set([".js", ".json", ".mjs", ".ts", ".tsx"]);

function readSourceTree(root: string): string {
  const chunks: string[] = [];
  const visit = (path: string) => {
    for (const entry of readdirSync(path)) {
      if ([".next", "node_modules"].includes(entry)) continue;
      const child = resolve(path, entry);
      if (statSync(child).isDirectory()) visit(child);
      else if (TEXT_EXTENSIONS.has(extname(entry))) chunks.push(readFileSync(child, "utf8"));
    }
  };
  visit(root);
  return chunks.join("\n");
}

describe("Sub2API secret boundary", () => {
  it("keeps every Sub2API runtime variable out of frontend source", () => {
    const frontendSource = readSourceTree(resolve(process.cwd(), "../frontend"));
    expect(frontendSource).not.toContain("SUB2API_API_KEY");
    expect(frontendSource).not.toContain("SUB2API_BASE_URL");
    expect(frontendSource).not.toContain("SUB2API_MODEL");
    expect(frontendSource).not.toContain("NEXT_PUBLIC_SUB2API_API_KEY");
  });
});
