-- One approved club per normalised name. Two pending rows may share a name;
-- the second approval is refused by this index (and by the admin action).
-- Expression matches lib/clubs.ts normalizeClubName / getClaimablePlayers SQL.
create unique index "clubs_approved_normalized_name_key"
  on "public"."clubs" (lower(btrim(regexp_replace("name", '\s+', ' ', 'g'))))
  where "status" = 'approved';
