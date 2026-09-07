import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import assert from "node:assert/strict";

export function ordinaryUserFixture() {
  const require = createRequire(import.meta.url);
  const ts = require(resolve("node_modules/typescript/lib/typescript.js"));
  const fixtureSource = execFileSync("git", ["show", "HEAD:backend/scripts/api-smoke-test.ts"], { encoding: "utf8" });
  const source = ts.createSourceFile("fixture.ts", fixtureSource, ts.ScriptTarget.Latest, true);
  const declarations = new Map();
  function collect(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) declarations.set(node.name.text, node.initializer);
    ts.forEachChild(node, collect);
  }
  collect(source);
  function literal(node) {
    if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return literal(node.expression);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
    if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map((p) => [p.name.text, literal(p.initializer)]));
    if (ts.isIdentifier(node) && declarations.has(node.text)) return literal(declarations.get(node.text));
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.BarBarToken) return process.env.GETRA_TEST_USER_PASSWORD || literal(node.right);
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    throw new Error("UNSUPPORTED_FIXTURE_LITERAL");
  }
  const fixture = literal(declarations.get("stableUsers")).find((u) => u.expectedAccountRole === "USER");
  assert(fixture, "ORDINARY_USER_FIXTURE_REQUIRED");
  const password = literal(declarations.get("TEST_PASSWORD"));
  return { email: fixture.email, password };
}
