import { createClient } from "@supabase/supabase-js";
import { SurveyRepository } from "@/src/modules/survey/survey.repository";
import { SurveyService } from "@/src/modules/survey/survey.service";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials in .env.local");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Starting Phase 13 Dummy Survey Seeding...");

  // 1. Get or create a DUMMY spatial source for Phase 13
  let { data: source } = await supabase
    .from("spatial_sources")
    .select("id")
    .eq("source_name", "Phase 13 Dummy Survey Data")
    .single();

  if (!source) {
    const { data: newSource, error: sourceError } = await supabase
      .from("spatial_sources")
      .insert({
        source_name: "Phase 13 Dummy Survey Data",
        source_type: "MANUAL",
        description: "Dummy survey and demand data for Phase 13 testing",
      })
      .select("id")
      .single();
    if (sourceError) throw sourceError;
    source = newSource;
  }
  const sourceId = source.id;

  // 2. Get the DUMMY study area (from Phase 9)
  const { data: area } = await supabase
    .from("study_areas")
    .select("id")
    .eq("name", "Pilot Area Dummy")
    .single();

  if (!area) {
    throw new Error("Pilot Area Dummy not found. Please run Phase 9 seeding first.");
  }
  const areaId = area.id;

  const repo = new SurveyRepository(supabase);
  const service = new SurveyService(repo);

  // 3. Create Dummy Survey Definition
  console.log("Creating/Fetching Dummy Survey Definition...");
  const survey = await service.findOrCreateSurvey({
    code: "PHASE13_DUMMY_SURVEY",
    name: "Transport & UMKM Demand Survey (Dummy)",
    version: "1.0",
    status: "ACTIVE",
    environment: "DUMMY",
    sourceId
  });

  // 4. Create Questions if they don't exist
  let questions = await service.getSurveyQuestions(survey.id);
  if (questions.length === 0) {
    console.log("Inserting Survey Questions...");
    questions = await service.createQuestions([
      {
        surveyId: survey.id,
        questionCode: "preferred_transport_mode",
        questionType: "SINGLE_CHOICE",
        required: true,
        options: ["WALKING", "BUS", "COMMUTER", "RIDE_HAILING"],
        sequence: 1
      },
      {
        surveyId: survey.id,
        questionCode: "max_walking_minutes",
        questionType: "NUMBER",
        required: true,
        sequence: 2
      },
      {
        surveyId: survey.id,
        questionCode: "frequent_umkm_category",
        questionType: "MULTIPLE_CHOICE",
        required: false,
        options: ["FOOD", "RETAIL", "SERVICE"],
        sequence: 3
      }
    ]);
  }

  // 5. Insert Dummy Responses
  console.log("Inserting Dummy Responses...");
  const dummyResponses = [
    { 
      code: "resp-001", 
      lat: -6.22, lng: 106.82, 
      answers: { preferred_transport_mode: "COMMUTER", max_walking_minutes: 15, frequent_umkm_category: ["FOOD"] }
    },
    { 
      code: "resp-002", 
      lat: -6.23, lng: 106.83, 
      answers: { preferred_transport_mode: "BUS", max_walking_minutes: 10, frequent_umkm_category: ["RETAIL"] }
    },
    { 
      code: "resp-003", 
      lat: -6.24, lng: 106.84, 
      answers: { preferred_transport_mode: "WALKING", max_walking_minutes: 20, frequent_umkm_category: ["FOOD", "SERVICE"] }
    },
    { 
      code: "resp-004", 
      lat: -6.25, lng: 106.85, 
      answers: { preferred_transport_mode: "RIDE_HAILING", max_walking_minutes: 5, frequent_umkm_category: ["RETAIL"] }
    },
    { 
      code: "resp-005", 
      lat: -6.26, lng: 106.86, 
      answers: { preferred_transport_mode: "COMMUTER", max_walking_minutes: 10, frequent_umkm_category: ["FOOD"] }
    },
    { 
      code: "resp-006", 
      lat: -6.27, lng: 106.87, 
      answers: { preferred_transport_mode: "BUS", max_walking_minutes: 15, frequent_umkm_category: ["SERVICE"] }
    }
  ];

  let insertedCount = 0;
  for (const resp of dummyResponses) {
    try {
      const result = await service.submitResponse({
        surveyId: survey.id,
        responseCode: resp.code,
        studyAreaId: areaId,
        originGeometry: { type: "Point", coordinates: [resp.lng, resp.lat] },
        answers: resp.answers,
        environment: "DUMMY",
        sourceId
      }, questions);

      if (result) insertedCount++;
    } catch (err: any) {
      console.error(`Failed to insert response ${resp.code}:`, err.message);
    }
  }

  console.log(`Phase 13 Dummy Seeding Completed! Processed ${insertedCount} responses.`);
}

run().catch((err) => {
  console.error("Fatal error during Phase 13 seeding:", err);
  process.exit(1);
});
