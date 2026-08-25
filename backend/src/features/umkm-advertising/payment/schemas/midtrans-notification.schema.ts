import { z } from "zod";

export const midtransNotificationSchema = z.object({
  order_id: z.string().min(1, { message: "order_id wajib ada." }),
  status_code: z.string().min(1, { message: "status_code wajib ada." }),
  gross_amount: z.string().min(1, { message: "gross_amount wajib ada." }),
  signature_key: z.string().min(1, { message: "signature_key wajib ada." }),
  transaction_status: z.string().min(1, { message: "transaction_status wajib ada." }),
  fraud_status: z.string().optional(),
  transaction_id: z.string().optional(),
  payment_type: z.string().optional(),
  transaction_time: z.string().optional(),
  settlement_time: z.string().optional(),
  status_message: z.string().optional(),
  merchant_id: z.string().optional(),
});

export type MidtransNotificationSchemaType = z.infer<typeof midtransNotificationSchema>;
