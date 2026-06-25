-- Fix product-images storage policies
-- The SELECT policy "Admins can list product images" still calls public.is_admin()
-- which causes "permission denied for function is_admin" on image upload.

DROP POLICY IF EXISTS "Admins can list product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;

-- Public URL reads bypass RLS entirely (Supabase storage CDN), so no SELECT
-- policy is needed for end users to see images. Admins need SELECT to list/manage.

CREATE POLICY "Admins can manage product images"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
)
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);