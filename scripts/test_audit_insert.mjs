import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const service = createClient(supabaseUrl, serviceKey);

async function testAuditInsert() {
  const adminId = "23fb3a46-e4b2-42a7-9cf7-1a13ed187b22";
  const id = "e83ec3d1-6905-4e68-bb13-82ad7f0dd9ae";
  const newMerchantId = "00000000-0000-0000-0000-000000000000";

  console.log("Testing insert into audit_events...");
  const { data, error } = await service.from("audit_events").insert([
    {
      action: "MERCHANT_SUBMISSION_APPROVED",
      actor_id: adminId,
      entity_type: "merchant_submission",
      entity_id: id,
      metadata: { merchant_id: newMerchantId, claimant_id: adminId },
    },
    {
      action: "MERCHANT_OWNERSHIP_ACTIVATED",
      actor_id: adminId,
      entity_type: "merchant",
      entity_id: newMerchantId,
      metadata: { owner_id: adminId, submission_id: id },
    },
  ]).select();

  console.log("Audit insert result:", { data, error });
  if (data?.length) {
    console.log("Cleaning up test audit events...");
    await service.from("audit_events").delete().in("id", data.map(d => d.id));
  }
}

testAuditInsert().catch(console.error);
