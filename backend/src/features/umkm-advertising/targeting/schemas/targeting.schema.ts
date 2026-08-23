import { z } from "zod";
import { MIN_RADIUS_METERS, MAX_RADIUS_METERS } from "../constants/targeting.constants";

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

export type RadiusTargetingInput = z.infer<typeof radiusTargetingSchema>;
export type StudyAreaTargetingInput = z.infer<typeof studyAreaTargetingSchema>;
export type SaveTargetingInput = z.infer<typeof saveTargetingSchema>;
