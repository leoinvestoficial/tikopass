
INSERT INTO storage.buckets (id, name, public) VALUES ('event-banners', 'event-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view event banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-banners');

CREATE POLICY "Authenticated users can upload event banners"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-banners' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own event banners"
ON storage.objects FOR UPDATE
USING (bucket_id = 'event-banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own event banners"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-banners' AND auth.uid()::text = (storage.foldername(name))[1]);
