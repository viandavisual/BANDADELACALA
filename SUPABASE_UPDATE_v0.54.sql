-- BANDA DE LA CALA v0.54
-- Infraestructura del backup multimedia.
-- Si ya se creó manualmente el bucket media-backup-staging y esta policy,
-- NO es necesario ejecutar este archivo.

-- El bucket debe existir como PRIVADO con id/name: media-backup-staging.
-- La creación del bucket se recomienda desde Supabase Dashboard > Storage.

DROP POLICY IF EXISTS "admin_gestor_upload_media_backup_staging" ON storage.objects;

CREATE POLICY "admin_gestor_upload_media_backup_staging"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media-backup-staging'
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'gestor')
  )
);
