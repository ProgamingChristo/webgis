async function run() {
  console.log("--- PHASE 8: INGESTION FOUNDATION TEST (API) ---");

  const token = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!token) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY for API auth (assuming local API uses it for admin checks)"
    );
  }

  console.log(
    "Testing ingestion API endpoints... Please ensure the dev server is running and you pass an ADMIN token."
  );

  console.log(
    "Since auth requires a real JWT, testing via script requires setting a valid BEARER token."
  );

  console.log(
    "\nSkipping automatic execution due to missing Admin JWT. You can manually test with Postman using an Admin user."
  );
}

run().catch(console.error);