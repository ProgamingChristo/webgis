import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function testInsert() {
  const current = {
    name: "Test Approval Candidate " + Date.now(),
    description: "Test description",
    address: "Jl. Test No. 1",
    location: { coordinates: [106.728791, -6.33518] },
    opening_hours: {},
    submitted_by: "23fb3a46-e4b2-42a7-9cf7-1a13ed187b22",
    category: "Kuliner",
    business_info: { price_range: "Rp 10.000 - 25.000" },
    public_media: { menu_urls: [] },
  };

  const [lng, lat] = current.location.coordinates;
  const geomStr = `SRID=4326;POINT(${lng} ${lat})`;

  console.log("Testing insert into merchants with geomStr:", geomStr);

  const { data: merchantRow, error: merchantErr } = await supabase
    .from("merchants")
    .insert({
      name: current.name,
      description: current.description,
      address: current.address,
      location: geomStr,
      opening_hours: current.opening_hours || {},
      owner_id: current.submitted_by,
      publish_status: "PUBLISHED",
      verification_status: "VERIFIED",
      price_level: current.business_info?.price_range || null,
      metadata: {
        submitted_from_id: "00000000-0000-0000-0000-000000000000",
        approved_by: current.submitted_by,
        approved_at: new Date().toISOString(),
        category_label: current.category,
        public_media: current.public_media,
        business_info: current.business_info,
      },
    })
    .select("id")
    .single();

  console.log("Insert result:", { merchantRow, merchantErr });

  if (merchantRow?.id) {
    console.log("Cleaning up test merchant...");
    await supabase.from("merchants").delete().eq("id", merchantRow.id);
    console.log("Cleaned up.");
  }
}

testInsert().catch(console.error);
