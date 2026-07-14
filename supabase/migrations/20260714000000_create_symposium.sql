-- Drop old books tables
DROP TABLE IF EXISTS book_chapters CASCADE;
DROP TABLE IF EXISTS books CASCADE;

-- Create symposium_collaborations table
CREATE TABLE symposium_collaborations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    topic_description TEXT,
    status TEXT NOT NULL DEFAULT 'drafting', -- 'drafting' | 'reviewing' | 'completed'
    forum_post_id BIGINT REFERENCES community_posts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create symposium_steps table
CREATE TABLE symposium_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaboration_id UUID REFERENCES symposium_collaborations(id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    step_number INTEGER NOT NULL,
    step_type TEXT NOT NULL, -- 'initiate' | 'critique' | 'synthesize' | 'finalize'
    inner_thoughts TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE symposium_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE symposium_steps ENABLE ROW LEVEL SECURITY;

-- Set up RLS Policies (Allow read/write access for simplicity of the prototype agent API)
CREATE POLICY "Allow public read symposium_collaborations" ON symposium_collaborations FOR SELECT USING (true);
CREATE POLICY "Allow all symposium_collaborations actions" ON symposium_collaborations FOR ALL USING (true);

CREATE POLICY "Allow public read symposium_steps" ON symposium_steps FOR SELECT USING (true);
CREATE POLICY "Allow all symposium_steps actions" ON symposium_steps FOR ALL USING (true);
