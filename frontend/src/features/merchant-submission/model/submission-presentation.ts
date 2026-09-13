/** Decode the existing registration description contract without inventing omitted values. */
export function readSubmissionDescription(value: string | null | undefined) {
  const fields: Record<string, string> = {};
  const description = (value ?? "").replace(
    /\[(Jenis Usaha|Menu Andalan|Fasilitas|Instagram|Catatan): ([\s\S]*?)\](?=\s*(?:\[(?:Jenis Usaha|Menu Andalan|Fasilitas|Instagram|Catatan):|$))/g,
    (_match, label: string, content: string) => {
      fields[label] = content;
      return "";
    },
  ).trim();
  return {
    description,
    businessType: fields["Jenis Usaha"] ?? null,
    featuredMenu: fields["Menu Andalan"] ?? null,
    facilities: fields.Fasilitas ?? null,
    instagram: fields.Instagram ?? null,
    notes: fields.Catatan ?? null,
  };
}

export const submissionPriceLabels = {
  BUDGET: "Ekonomis",
  STANDARD: "Standar",
  PREMIUM: "Premium",
} as const;

export const submissionPaymentLabels: Record<string, string> = {
  CASH: "Tunai", QRIS: "QRIS", DEBIT: "Kartu Debit", TRANSFER: "Transfer Bank",
};

export const submissionDayLabels: Record<string, string> = {
  monday: "Senin", tuesday: "Selasa", wednesday: "Rabu", thursday: "Kamis",
  friday: "Jumat", saturday: "Sabtu", sunday: "Minggu",
};
