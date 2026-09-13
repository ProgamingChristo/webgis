import { createClient } from "@supabase/supabase-js";
import { MerchantSubmissionRepository } from "../backend/src/features/merchant-submission/repositories/merchant-submission.repository.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function testRepoApprove() {
  const repo = new MerchantSubmissionRepository(supabase);
  const subId = "e83ec3d1-6905-4e68-bb13-82ad7f0dd9ae"; // kopi christo
  const adminId = "23fb3a46-e4b2-42a7-9cf7-1a13ed187b22";

  console.log("Calling repo.approveSubmission...");
  try {
    const result = await repo.approveSubmission(subId, adminId, "Catatan persetujuan admin");
    console.log("Success result:", result);
  } catch (err) {
    console.error("Caught error in approveSubmission:", err);
  }
}

testRepoApprove().catch(console.error);
