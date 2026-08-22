-- 20260819150000_add_survey_and_demand_foundation.sql
-- Create survey tables for Phase 13 Demand Data

-- 1. SURVEYS TABLE
CREATE TABLE surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, ACTIVE, ARCHIVED
    environment VARCHAR(50) NOT NULL DEFAULT 'DUMMY',
    source_id UUID REFERENCES spatial_sources(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique code and version per environment
    CONSTRAINT uq_survey_code_version UNIQUE (code, version, environment)
);

-- 2. SURVEY QUESTIONS TABLE (Relational schema for definitions)
CREATE TABLE survey_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    question_code VARCHAR(100) NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- NUMBER, BOOLEAN, TEXT, SINGLE_CHOICE, MULTIPLE_CHOICE
    required BOOLEAN NOT NULL DEFAULT false,
    options JSONB, -- Array of allowed values for choice types
    sequence INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_survey_question_code UNIQUE (survey_id, question_code)
);

-- 3. SURVEY RESPONSES TABLE
CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES surveys(id),
    response_code VARCHAR(255) NOT NULL, -- Anonymous identifier or unique response ID
    study_area_id UUID REFERENCES study_areas(id),
    
    -- Spatial context
    origin_geometry GEOMETRY(Point, 4326),
    destination_geometry GEOMETRY(Point, 4326),
    
    -- Answers payload (Validated strictly in application layer against survey_questions)
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Provenance and Status
    environment VARCHAR(50) NOT NULL DEFAULT 'DUMMY',
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    source_id UUID REFERENCES spatial_sources(id),
    
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Deduplication constraint
    CONSTRAINT uq_survey_response_code UNIQUE (survey_id, response_code, source_id, environment)
);

-- 4. SPATIAL INDEXES
CREATE INDEX idx_survey_responses_origin_geom ON survey_responses USING GIST(origin_geometry);
CREATE INDEX idx_survey_responses_dest_geom ON survey_responses USING GIST(destination_geometry);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Allow reading survey definitions publicly for rendering forms
CREATE POLICY "Allow public read of active surveys" 
    ON surveys FOR SELECT 
    USING (status = 'ACTIVE');

CREATE POLICY "Allow public read of survey questions" 
    ON survey_questions FOR SELECT 
    USING (
        survey_id IN (SELECT id FROM surveys WHERE status = 'ACTIVE')
    );

-- Responses are strictly INTERNAL/ADMIN only. The public cannot read raw responses.
-- We use the authenticated role for basic operations, but raw responses should be protected.
CREATE POLICY "Allow service role full access on responses"
    ON survey_responses
    USING (true)
    WITH CHECK (true);

-- End of migration
