-- Storage policies for "images" bucket

-- Public read access
CREATE POLICY "Public read images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

-- Authenticated users can upload
CREATE POLICY "Auth users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');

-- Authenticated users can update their uploads
CREATE POLICY "Auth users can update images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'images' AND auth.role() = 'authenticated');

-- Authenticated users can delete
CREATE POLICY "Auth users can delete images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'images' AND auth.role() = 'authenticated');
