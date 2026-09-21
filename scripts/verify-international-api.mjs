import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.GETRA_QA_URL || 'https://getra-routing-api.tail0ed517.ts.net:8443';
const output = process.env.GETRA_QA_OUTPUT || 'outputs/international-audit/public';
await mkdir(output, { recursive: true });
const cases = [
  ['weather', {}], ['weather', { adm4: '31.71.03.1001' }],
  ['earthquakes', { radius: '20000000', magnitude: '2' }],
  ['active-fire', {}], ['air-quality', {}], ['places', { q: 'Jakarta' }], ['elevation', {}], ['timezone', {}],
  ['poi', { category: 'restaurant', radius: '1000' }], ['accessibility', { category: 'toilet', radius: '1000' }],
  ['water-refill', { radius: '1000' }], ['bikeshare', { system: 'lyft_nyc', lat: '40.73', lon: '-73.99' }],
  ['micromobility', { system: 'dott-berlin', lat: '52.52', lon: '13.405' }], ['ev-charging', {}],
  ['transit-stops', { radius: '1000' }], ['jakarta-transit', { radius: '1000' }], ['flood', {}], ['disaster', {}],
  ['weather-radar', {}], ['weather-satellite', {}], ['open-data', { source: 'earthquakes', radius: '20000000' }],
];
const report = { base, started: new Date().toISOString(), results: [] };
for (const [layer, extra] of cases) {
  const started = Date.now();
  try {
    const response = await fetch(`${base}/api/international/${layer}?${new URLSearchParams({ lat: '-6.2', lon: '106.82', radius: '10000', ...extra })}`, { signal: AbortSignal.timeout(85000) });
    const data = await response.json();
    const result = { layer, query: extra, http: response.status, status: data.status, count: data.data?.features?.length,
      source: data.source?.provider, updated: data.last_updated, fetched: data.fetched_at, ttl: data.ttl,
      message: data.message, warnings: data.warnings, quality: data.quality, cache_status: data.cache_status, truncated: data.truncated, first: data.data?.features?.[0], ms: Date.now() - started };
    report.results.push(result);
    console.log(JSON.stringify({ layer, http: result.http, status: result.status, count: result.count, ms: result.ms }));
  } catch (error) { report.results.push({ layer, error: error.message, ms: Date.now() - started }); }
  await writeFile(`${output}/api-report.json`, JSON.stringify(report, null, 2));
}
const interpreted = await fetch(`${base}/api/international/interpret`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ layer: 'weather', query: { lat: -6.2, lon: 106.82, radius: 10000 } }) });
report.interpretation = { http: interpreted.status, body: await interpreted.json() };
report.finished = new Date().toISOString();
await writeFile(`${output}/api-report.json`, JSON.stringify(report, null, 2));
