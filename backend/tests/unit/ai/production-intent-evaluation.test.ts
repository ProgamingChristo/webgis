import { describe, it, expect } from "vitest";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { routeAssistantIntent } from "@/src/modules/ai/intent-router";
import { answerCameraInventory } from "@/src/modules/ai/camera-tool";
const rows = JSON.parse(readFileSync(new URL("../../../../docs/production-hardening/ai-questions.json", import.meta.url), "utf8")) as { id: string; question: string; expected_intent: string }[];
describe("production intent evaluation (classification only)", () => {
  it("measures 154 questions in 14 categories without claiming generated-answer accuracy", () => {
    const results = rows.map(row => { const start = performance.now(); const result = routeAssistantIntent(row.question); return { ...row, actual: result, passed: result.intents.includes(row.expected_intent as never), latency_ms: performance.now()-start }; });
    mkdirSync("../outputs/production-hardening", { recursive: true });
    writeFileSync("../outputs/production-hardening/ai-intent-evaluation.json", JSON.stringify({ kind: "offline intent classification; not an LLM or live tool benchmark", count: results.length, accuracy: results.filter(r => r.passed).length/results.length, results }, null, 2));
    expect(rows.length).toBeGreaterThanOrEqual(150); expect(new Set(rows.map(r => r.expected_intent)).size).toBe(14);
    expect(results.filter(r => !r.passed).map(r => r.id)).toEqual([]);
  });
  it("combines weather and air quality tool selection", () => {
    expect(routeAssistantIntent("Cuaca dan kualitas udara di sini").international_tools).toEqual(expect.arrayContaining(["weather", "air-quality"]));
  });
  it("does not invent camera counts when frames are absent", () => {
    const answer = answerCameraInventory({ question: "Berapa kendaraan di CCTV Bundaran HI?", active_experience: "GENERAL" });
    expect(answer?.answer).toContain("belum tersedia"); expect(answer?.provider).toBe("deterministic");
  });
});
