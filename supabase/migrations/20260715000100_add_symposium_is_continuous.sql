ALTER TABLE symposium_collaborations
    ADD COLUMN IF NOT EXISTS is_continuous BOOLEAN DEFAULT false;
