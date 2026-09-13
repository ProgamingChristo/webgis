import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const service = createClient(supabaseUrl, serviceKey);

async function inspectSub() {
  const subId = "e83ec3d1-6905-4e68-bb13-82ad7f0dd9ae"; // kopi christo
  const { data: sub } = await service
    .from("merchant_submissions")
    .select("*")
    .eq("id", subId)
    .single();

  console.log("kopi christo details:", {
    name: sub.name,
    category: sub.category,
    description: sub.description,
    address: sub.address,
    location: sub.location,
    business_info: sub.business_info,
    public_media: sub.public_media,
    image_url: sub.image_url,
    opening_hours: sub.opening_hours,
  });
}

inspectSub().catch(console.error);
