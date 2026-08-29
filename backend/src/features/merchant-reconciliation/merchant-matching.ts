import type {
  MerchantCandidateInput,
  MerchantMatchDecision,
} from "./merchant-reconciliation.types";

const MOBILE_TERMS = new Set([
  "berpindah",
  "bergerak",
  "keliling",
  "mobile",
  "nomaden",
  "tidak tetap",
]);

const FOOD_TERMS = new Set([
  "bakery",
  "cafe",
  "coffee",
  "food",
  "kafe",
  "kuliner",
  "makanan",
  "minuman",
  "restaurant",
  "restoran",
  "rumah makan",
  "warung",
]);

export function normalizeMerchantName(value: string | null | undefined) {
  return normalizeText(value)
    .replace(/\b(rm)\b/g, "rumah makan")
    .replace(/\b(wrg)\b/g, "warung")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  if (digits.startsWith("8")) return `0${digits}`;
  return digits;
}

export function normalizeAddress(value: string | null | undefined) {
  const normalized = normalizeText(value)
    .replace(/\b(jalan)\b/g, "jl")
    .replace(/\bnomor\b/g, "no")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || null;
}

export function areCategoriesCompatible(
  premium: string | null | undefined,
  menuGo: string | null | undefined,
) {
  const left = normalizeText(premium);
  const right = normalizeText(menuGo);
  if (!left || !right) return null;
  if (left === right || left.includes(right) || right.includes(left)) return true;

  const leftFood = Array.from(FOOD_TERMS).some((term) => left.includes(term));
  const rightFood = Array.from(FOOD_TERMS).some((term) => right.includes(term));
  return leftFood && rightFood;
}

export function isMobileMerchant(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return Array.from(MOBILE_TERMS).some(
    (term) => normalized === term || normalized.includes(term),
  );
}

export function merchantNameSimilarity(
  leftValue: string | null | undefined,
  rightValue: string | null | undefined,
) {
  const left = normalizeMerchantName(leftValue);
  const right = normalizeMerchantName(rightValue);
  if (!left || !right) return 0;
  if (left === right) return 1;

  const leftTokens = new Set(left.split(" "));
  const rightTokens = new Set(right.split(" "));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  const tokenScore = union === 0 ? 0 : intersection / union;
  const bigramScore = diceCoefficient(left, right);
  return roundScore(tokenScore * 0.45 + bigramScore * 0.55);
}

export function evaluateMerchantCandidate(
  candidate: MerchantCandidateInput,
): MerchantMatchDecision {
  const nameScore = merchantNameSimilarity(
    candidate.menuName,
    candidate.premiumName,
  );
  const isMobile = isMobileMerchant(candidate.menuMobility);
  const categoryMatch = areCategoriesCompatible(
    candidate.premiumCategory,
    candidate.menuCategory,
  );
  const premiumPhone = normalizePhone(candidate.premiumPhone);
  const menuPhone = normalizePhone(readString(candidate.menuProperties.telepon));
  const phoneMatch =
    premiumPhone && menuPhone ? premiumPhone === menuPhone : null;
  const premiumAddress = normalizeAddress(candidate.premiumAddress);
  const menuAddress = normalizeAddress(readString(candidate.menuProperties.alamat));
  const addressMatch =
    premiumAddress && menuAddress
      ? premiumAddress === menuAddress ||
        premiumAddress.includes(menuAddress) ||
        menuAddress.includes(premiumAddress)
      : null;
  const distance = candidate.distanceMeters;

  if (!candidate.premiumMerchantId || distance === null) {
    return decision(candidate, "NO_MATCH", 0, nameScore, phoneMatch, addressMatch,
      categoryMatch, isMobile, "No Premium candidate exists within 250 metres.");
  }

  const distanceScore = Math.max(0, 1 - distance / 250);
  const score = roundScore(
    nameScore * 0.6 +
      distanceScore * 0.25 +
      (categoryMatch === true ? 0.1 : 0) +
      (phoneMatch === true || addressMatch === true ? 0.05 : 0),
  );

  if (isMobile) {
    const status = nameScore >= 0.82 && distance <= 120
      ? "MATCH_REVIEW_REQUIRED"
      : "NO_MATCH";
    return decision(candidate, status, score, nameScore, phoneMatch, addressMatch,
      categoryMatch, true, status === "MATCH_REVIEW_REQUIRED"
        ? "Menu Go marks the merchant as mobile; observed proximity cannot establish a permanent identity."
        : "Mobile observation has insufficient identity evidence.");
  }

  if (phoneMatch === false) {
    const status = nameScore >= 0.9 && distance <= 50
      ? "MATCH_REVIEW_REQUIRED"
      : "NO_MATCH";
    return decision(candidate, status, score, nameScore, phoneMatch, addressMatch,
      categoryMatch, false, "Conflicting normalized phone numbers prevent automatic reconciliation.");
  }

  if (nameScore === 1 && phoneMatch === true && distance <= 50) {
    return decision(candidate, "MATCH_CONFIRMED", score, nameScore, phoneMatch,
      addressMatch, categoryMatch, false,
      "Exact normalized name and phone match with geometry within 50 metres.");
  }

  if (
    nameScore === 1 &&
    distance <= 20 &&
    categoryMatch !== false
  ) {
    return decision(candidate, "MATCH_HIGH_CONFIDENCE", score, nameScore,
      phoneMatch, addressMatch, categoryMatch, false,
      "Exact normalized name, compatible category, and geometry within 20 metres.");
  }

  if (
    nameScore >= 0.94 &&
    distance <= 10 &&
    categoryMatch === true
  ) {
    return decision(candidate, "MATCH_HIGH_CONFIDENCE", score, nameScore,
      phoneMatch, addressMatch, categoryMatch, false,
      "Very similar name, compatible category, and geometry within 10 metres.");
  }

  if ((nameScore >= 0.82 && distance <= 120) || (nameScore === 1 && distance <= 200)) {
    return decision(candidate, "MATCH_REVIEW_REQUIRED", score, nameScore,
      phoneMatch, addressMatch, categoryMatch, false,
      "Name and spatial evidence are plausible but insufficient for automatic reconciliation.");
  }

  return decision(candidate, "NO_MATCH", score, nameScore, phoneMatch,
    addressMatch, categoryMatch, false,
    "Available identity evidence does not meet reconciliation thresholds.");
}

export function chooseBestMerchantDecision(
  candidates: MerchantCandidateInput[],
): MerchantMatchDecision {
  const evaluated = candidates.map(evaluateMerchantCandidate).sort((left, right) =>
    right.score - left.score ||
    (left.candidate.distanceMeters ?? Number.POSITIVE_INFINITY) -
      (right.candidate.distanceMeters ?? Number.POSITIVE_INFINITY),
  );
  const best = evaluated[0];
  if (!best) throw new Error("MENU_GO_CANDIDATE_GROUP_EMPTY");

  const sameNameNearby = evaluated.filter(
    (item) => item.nameScore === 1 && (item.candidate.distanceMeters ?? Infinity) <= 100,
  );
  if (
    sameNameNearby.length > 1 &&
    (best.status === "MATCH_CONFIRMED" || best.status === "MATCH_HIGH_CONFIDENCE")
  ) {
    return {
      ...best,
      status: "MATCH_REVIEW_REQUIRED",
      reason: "Multiple nearby Premium merchants share the normalized name; branch identity requires review.",
    };
  }

  return best;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " dan ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function diceCoefficient(left: string, right: string) {
  if (left.length < 2 || right.length < 2) return left === right ? 1 : 0;
  const counts = new Map<string, number>();
  for (let index = 0; index < left.length - 1; index += 1) {
    const pair = left.slice(index, index + 2);
    counts.set(pair, (counts.get(pair) ?? 0) + 1);
  }
  let overlap = 0;
  for (let index = 0; index < right.length - 1; index += 1) {
    const pair = right.slice(index, index + 2);
    const count = counts.get(pair) ?? 0;
    if (count > 0) {
      overlap += 1;
      counts.set(pair, count - 1);
    }
  }
  return (2 * overlap) / (left.length + right.length - 2);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function roundScore(value: number) {
  return Math.round(Math.max(0, Math.min(1, value)) * 100_000) / 100_000;
}

function decision(
  candidate: MerchantCandidateInput,
  status: MerchantMatchDecision["status"],
  score: number,
  nameScore: number,
  phoneMatch: boolean | null,
  addressMatch: boolean | null,
  categoryMatch: boolean | null,
  isMobile: boolean,
  reason: string,
): MerchantMatchDecision {
  return {
    candidate,
    status,
    score: roundScore(score),
    nameScore: roundScore(nameScore),
    phoneMatch,
    addressMatch,
    categoryMatch,
    isMobile,
    reason,
  };
}

