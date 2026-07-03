-- Thumbnails are JPEGs stored alongside the videos, so the bucket must accept them.
update storage.buckets
set allowed_mime_types = array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg']
where id = 'player-videos';
