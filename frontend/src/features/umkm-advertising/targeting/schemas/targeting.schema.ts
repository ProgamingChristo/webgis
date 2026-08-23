import { z } from "zod";

export const MIN_RADIUS_METERS = 250;
export const MAX_RADIUS_METERS = 10000;
export const DEFAULT_RADIUS_METERS = 1000;

export const radiusTargetingSchema = z.object({
  target_type: z.literal("RADIUS"),
  radius_meters: z
    .number("Radius wajib diisi")
    .int("Radius harus berupa bilangan bulat")
    .min(MIN_RADIUS_METERS, `Radius minimal ${MIN_RADIUS_METERS} meter`)
    .max(MAX_RADIUS_METERS, `Radius maksimal ${MAX_RADIUS_METERS} meter`),
});

export const studyAreaTargetingSchema = z.object({
  target_type: z.literal("STUDY_AREA"),
  study_area_id: z
    .string("Study area wajib dipilih")
    .uuid("ID Study area tidak valid"),
});

export const saveTargetingSchema = z.discriminatedUnion("target_type", [
  radiusTargetingSchema,
  studyAreaTargetingSchema,
]);
