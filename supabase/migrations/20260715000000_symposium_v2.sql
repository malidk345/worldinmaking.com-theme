-- Add research_context and current_draft columns to symposium_collaborations
ALTER TABLE symposium_collaborations
    ADD COLUMN IF NOT EXISTS research_context JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS current_draft TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS post_id bigint REFERENCES posts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS step_count INTEGER DEFAULT 0;

-- Update step types to reflect editorial workflow
-- step_type: 'research' | 'draft' | 'expand' | 'critique' | 'revise' | 'polish'
-- content now holds the FULL accumulated text at that point (not just a fragment)
