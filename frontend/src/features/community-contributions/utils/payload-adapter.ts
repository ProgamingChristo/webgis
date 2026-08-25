import {
  CONTRIBUTION_DETAILS_MAX_LENGTH,
  CONTRIBUTION_HOURS_KEY_MAX_LENGTH,
  CONTRIBUTION_HOURS_MAX_ENTRIES,
  CONTRIBUTION_HOURS_VALUE_MAX_LENGTH,
  CONTRIBUTION_PRICE_LEVEL_MAX_LENGTH,
} from "../constants";
import type {
  CommunityContributionFormState,
  CreateCommunityContributionPayload,
} from "../types/community-contributions.types";
import { serializeObservedAt } from "./date-time";

export type ContributionValidationErrors = Partial<
  Record<
    | "reportType"
    | "location"
    | "reportedNewLocation"
    | "observedAt"
    | "details"
    | "facilityType"
    | "targetMerchant"
    | "reportedPriceLevel"
    | "reportedOpeningHours",
    string
  >
>;

export class ContributionFormValidationError extends Error {
  constructor(readonly errors: ContributionValidationErrors) {
    super("Contribution form validation failed");
    this.name = "ContributionFormValidationError";
  }
}

export function buildContributionPayload(
  state: CommunityContributionFormState,
): CreateCommunityContributionPayload {
  const errors: ContributionValidationErrors = {};
  const observedAt = readObservedAt(state, errors);
  const location = readLocation(state, "location", errors);

  switch (state.reportType) {
    case "SIDEWALK_OBSTRUCTION":
      return {
        report_type: state.reportType,
        location,
        observed_at: observedAt,
        details: readDetails(state.details, errors),
      };
    case "RAMP_OR_GUIDING_BLOCK":
      return {
        report_type: state.reportType,
        location,
        observed_at: observedAt,
        facility_type: state.facilityType,
        details: readDetails(state.details, errors),
      };
    case "CROSSING":
      return {
        report_type: state.reportType,
        location,
        observed_at: observedAt,
        details: readDetails(state.details, errors),
      };
    case "MERCHANT_LOCATION_CHANGED":
      return withOptionalNotes(
        {
          report_type: state.reportType,
          location,
          observed_at: observedAt,
          target_merchant_id: readMerchantId(state, errors),
          reported_new_location: readLocation(
            state,
            "reportedNewLocation",
            errors,
          ),
        },
        state.notes,
      );
    case "MERCHANT_PRICE_CHANGED":
      return withOptionalNotes(
        {
          report_type: state.reportType,
          location,
          observed_at: observedAt,
          target_merchant_id: readMerchantId(state, errors),
          reported_price_level: readPriceLevel(
            state.reportedPriceLevel,
            errors,
          ),
        },
        state.notes,
      );
    case "MERCHANT_HOURS_CHANGED":
      return withOptionalNotes(
        {
          report_type: state.reportType,
          location,
          observed_at: observedAt,
          target_merchant_id: readMerchantId(state, errors),
          reported_opening_hours: readOpeningHours(
            state.reportedOpeningHours,
            errors,
          ),
        },
        state.notes,
      );
  }
}

function readObservedAt(
  state: CommunityContributionFormState,
  errors: ContributionValidationErrors,
) {
  try {
    return serializeObservedAt(state.observedAtLocal);
  } catch (error) {
    errors.observedAt =
      error instanceof Error ? error.message : "Waktu pengamatan tidak valid.";
    throw new ContributionFormValidationError(errors);
  }
}

function readLocation(
  state: CommunityContributionFormState,
  key: "location" | "reportedNewLocation",
  errors: ContributionValidationErrors,
) {
  const value = state[key];
  const errorKey = key;

  if (
    !value ||
    !Number.isFinite(value.longitude) ||
    !Number.isFinite(value.latitude) ||
    value.longitude < -180 ||
    value.longitude > 180 ||
    value.latitude < -90 ||
    value.latitude > 90
  ) {
    errors[errorKey] =
      key === "location"
        ? "Pilih lokasi kejadian terlebih dahulu."
        : "Pilih lokasi baru usaha terlebih dahulu.";
    throw new ContributionFormValidationError(errors);
  }

  return {
    longitude: value.longitude,
    latitude: value.latitude,
  };
}

function readDetails(
  value: string,
  errors: ContributionValidationErrors,
) {
  const details = value.trim();

  if (!details || details.length > CONTRIBUTION_DETAILS_MAX_LENGTH) {
    errors.details = `Deskripsi wajib diisi dan maksimal ${CONTRIBUTION_DETAILS_MAX_LENGTH} karakter.`;
    throw new ContributionFormValidationError(errors);
  }

  return details;
}

function readMerchantId(
  state: CommunityContributionFormState,
  errors: ContributionValidationErrors,
) {
  if (!state.targetMerchant?.id) {
    errors.targetMerchant = "Pilih usaha canonical terlebih dahulu.";
    throw new ContributionFormValidationError(errors);
  }

  return state.targetMerchant.id;
}

function readPriceLevel(
  value: string,
  errors: ContributionValidationErrors,
) {
  const price = value.trim();

  if (!price || price.length > CONTRIBUTION_PRICE_LEVEL_MAX_LENGTH) {
    errors.reportedPriceLevel = `Harga wajib diisi dan maksimal ${CONTRIBUTION_PRICE_LEVEL_MAX_LENGTH} karakter.`;
    throw new ContributionFormValidationError(errors);
  }

  return price;
}

function readOpeningHours(
  value: Record<string, string>,
  errors: ContributionValidationErrors,
) {
  const entries = Object.entries(value)
    .map(([key, entryValue]) => [key.trim(), entryValue.trim()] as const)
    .filter(([, entryValue]) => entryValue.length > 0);

  if (entries.length < 1 || entries.length > CONTRIBUTION_HOURS_MAX_ENTRIES) {
    errors.reportedOpeningHours = "Isi setidaknya satu jam buka yang dilaporkan.";
    throw new ContributionFormValidationError(errors);
  }

  for (const [key, entryValue] of entries) {
    if (
      key.length < 1 ||
      key.length > CONTRIBUTION_HOURS_KEY_MAX_LENGTH ||
      entryValue.length > CONTRIBUTION_HOURS_VALUE_MAX_LENGTH
    ) {
      errors.reportedOpeningHours = "Format jam buka terlalu panjang.";
      throw new ContributionFormValidationError(errors);
    }
  }

  return Object.fromEntries(entries);
}

function withOptionalNotes<T extends Record<string, unknown>>(
  payload: T,
  notesValue: string,
): T & { notes?: string } {
  const notes = notesValue.trim();

  return notes ? { ...payload, notes } : payload;
}
