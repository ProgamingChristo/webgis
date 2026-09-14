import { SponsoredPinServingContext } from "../types/ad-serving.types";

export interface ManualCoordinateValues {
  longitude: string;
  latitude: string;
}

export interface CoordinateValidationResult {
  context: SponsoredPinServingContext | null;
  errors: Partial<Record<keyof ManualCoordinateValues, string>>;
}

export function validateManualCoordinates(
  values: ManualCoordinateValues,
): CoordinateValidationResult {
  const errors: CoordinateValidationResult["errors"] = {};
  const longitude = Number(values.longitude);
  const latitude = Number(values.latitude);

  if (values.longitude.trim() === "" || !Number.isFinite(longitude)) {
    errors.longitude = "Longitude wajib berupa angka.";
  } else if (longitude < -180 || longitude > 180) {
    errors.longitude = "Longitude harus berada di antara -180 dan 180.";
  }

  if (values.latitude.trim() === "" || !Number.isFinite(latitude)) {
    errors.latitude = "Latitude wajib berupa angka.";
  } else if (latitude < -90 || latitude > 90) {
    errors.latitude = "Latitude harus berada di antara -90 dan 90.";
  }

  return {
    context: Object.keys(errors).length === 0 ? { longitude, latitude } : null,
    errors,
  };
}

export function formatCoordinate(value: number): string {
  return Number(value.toFixed(6)).toString();
}
