-- Public-read bucket for notebook images. Writes go through the service-role upload API.

INSERT INTO storage.buckets (id, name, public)
VALUES ('notebook-media', 'notebook-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "notebook_media_public_read" ON storage.objects;
CREATE POLICY "notebook_media_public_read"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'notebook-media');
