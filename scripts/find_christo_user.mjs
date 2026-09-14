import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bflnswbhkxafakgdrkgu.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const service = createClient(supabaseUrl, serviceKey);

async function check() {
  const { data: sub } = await service
    .from("merchant_submissions")
    .select("id, name, submitter_id")
    .eq("id", "e83ec3d1-6905-4e68-bb13-82ad7f0dd9ae")
    .single();

  console.log("Sub:", sub);
  if (sub?.submitter_id) {
    const { data: authUser } = await service.auth.admin.getUserById(sub.submitter_id);
    console.log("Submitter Email:", authUser?.user?.email);
  }
}

check().catch(console.error);
