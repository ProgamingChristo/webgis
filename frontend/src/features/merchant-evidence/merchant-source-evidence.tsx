import type { Merchant } from "@/types/getra";

export function normalizeMerchantSources(
  merchant: Pick<Merchant, "source" | "sources">,
): string[] {
  const values = [
    ...(Array.isArray(merchant.sources) ? merchant.sources : []),
    ...(typeof merchant.source === "string" ? merchant.source.split("+") : []),
  ];
  const unique = new Map<string, string>();

  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (!normalized) continue;
    unique.set(normalized.toUpperCase(), normalized);
  }

  return [...unique.values()];
}

export function formatMerchantSources(
  merchant: Pick<Merchant, "source" | "sources">,
): string {
  const sources = normalizeMerchantSources(merchant);
  return sources.length > 0 ? sources.join(" + ") : "Tidak tersedia";
}

export function hasMerchantSource(
  merchant: Pick<Merchant, "source" | "sources">,
  source: string,
): boolean {
  const expected = source.trim().toUpperCase();
  return normalizeMerchantSources(merchant).some(
    (candidate) => candidate.toUpperCase() === expected,
  );
}

function OptionalDetail({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function MerchantSourceEvidence({ merchant }: { merchant: Merchant }) {
  const hasMenuGo = hasMerchantSource(merchant, "MENU_GO");

  return (
    <section className="evidence-section">
      <h4>Sumber data</h4>
      <p className="limitation-box">Sumber data: {formatMerchantSources(merchant)}</p>
      {hasMenuGo ? (
        <dl className="evidence-list evidence-list--compact">
          <OptionalDetail label="Menu utama" value={merchant.menu} />
          <OptionalDetail label="Harga observasi" value={merchant.observedPrice} />
          <OptionalDetail label="Kondisi tempat" value={merchant.observedCondition} />
          <OptionalDetail label="Mobilitas" value={merchant.mobility} />
          <OptionalDetail label="Waktu pengamatan" value={merchant.observedAt} />
        </dl>
      ) : null}
    </section>
  );
}
