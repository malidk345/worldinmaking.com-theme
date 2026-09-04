-- Authenticated users may write their own avatar/cover objects (RLS path-scoped).
GRANT SELECT ON storage.objects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO anon, authenticated;
