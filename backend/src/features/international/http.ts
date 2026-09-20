import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { z } from "zod";
import { resilientRequest } from "./resilience";

export class SourceFailure extends Error {
  constructor(public status: "ERROR" | "AUTH_REQUIRED" | "UNAVAILABLE", message: string, public httpStatus?: number) { super(message); }
}
// URLs originate in the fixed registry or public GBFS catalog, never arbitrary user URLs.
// Validate every discovered host and deny redirects to prevent internal-network requests.
export async function publicUrl(input: string) {
  const u = new URL(input);
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443") || isIP(u.hostname) || !u.hostname.includes(".")) throw new SourceFailure("UNAVAILABLE", "Provider URL is not public HTTPS.");
  const addresses = await lookup(u.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.|::|f[cd]|fe80)/i.test(address))) throw new SourceFailure("UNAVAILABLE", "Provider host is not publicly routable.");
  return u;
}
export async function fetchText(url: string, init?: RequestInit) {
  const endpoint = await publicUrl(url);
  return resilientRequest(endpoint.hostname, async signal => {
  const response = await fetch(url, { ...init, redirect: "error", signal, cache: "no-store", headers: { "User-Agent": "GETRA/1.0 (+https://github.com/ProgamingChristo/webgis)", ...init?.headers } });
  if (!response.ok) { await response.body?.cancel(); throw new SourceFailure(response.status === 401 || response.status === 403 ? "AUTH_REQUIRED" : "ERROR", `Provider HTTP ${response.status}`, response.status); }
  const reader = response.body?.getReader();
  if (!reader) throw new SourceFailure("ERROR", "Provider returned no body.");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 8_000_000) { await reader.cancel(); throw new SourceFailure("ERROR", "Provider response exceeds size limit."); } chunks.push(value); }
  return new TextDecoder().decode(Buffer.concat(chunks));
  }, { signal: init?.signal ?? undefined, retryable: error => !(error instanceof SourceFailure) || error.httpStatus !== undefined && (error.httpStatus >= 500 || error.httpStatus === 408) });
}
export async function fetchJson(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(await fetchText(url, init));
  return z.record(z.string(), z.unknown()).parse(parsed);
}
export function csv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(field); field = ""; }
    else if (c === '\n' && !quoted) { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const header = rows.shift() ?? [];
  return rows.filter(r => r.length === header.length).map(r => Object.fromEntries(header.map((k, i) => [k, r[i]])));
}
export const obj = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
export const list = (v: unknown): Record<string, unknown>[] => Array.isArray(v) ? v.map(obj) : [];
export const num = (v: unknown): number | null => (typeof v === "number" || typeof v === "string" && v.trim() !== "") && Number.isFinite(Number(v)) ? Number(v) : null;
export function timestamp(v: unknown): string | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const n = typeof v === "number" ? (v < 10_000_000_000 ? v * 1000 : v) : v;
  const date = new Date(n); return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
