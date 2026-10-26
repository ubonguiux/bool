INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('bool-media', 'bool-media', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Bool media is publicly viewable" ON storage.objects;
CREATE POLICY "Bool media is publicly viewable"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'bool-media');

DROP POLICY IF EXISTS "Bool admins upload media" ON storage.objects;
CREATE POLICY "Bool admins upload media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'bool-media' AND (SELECT private.is_bool_admin()));

DROP POLICY IF EXISTS "Bool admins update media" ON storage.objects;
CREATE POLICY "Bool admins update media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'bool-media' AND (SELECT private.is_bool_admin()))
WITH CHECK (bucket_id = 'bool-media' AND (SELECT private.is_bool_admin()));

DROP POLICY IF EXISTS "Bool admins delete media" ON storage.objects;
CREATE POLICY "Bool admins delete media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'bool-media' AND (SELECT private.is_bool_admin()));