import { z } from "zod";

export const updateScheduleSchema = z
  .object({
    start_at: z
      .string("Waktu mulai (start_at) wajib diisi.")
      .datetime({ message: "Format waktu mulai (start_at) harus ISO 8601 UTC yang valid." }),
    end_at: z
      .string("Waktu selesai (end_at) wajib diisi.")
      .datetime({ message: "Format waktu selesai (end_at) harus ISO 8601 UTC yang valid." }),
  })
  .strict()
  .refine(
    (data) => {
      const start = new Date(data.start_at).getTime();
      const end = new Date(data.end_at).getTime();
      return end > start;
    },
    {
      message: "Waktu selesai (end_at) harus setelah waktu mulai (start_at).",
      path: ["end_at"],
    }
  );

export type UpdateScheduleSchemaType = z.infer<typeof updateScheduleSchema>;
