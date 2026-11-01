-- RVM Choir: musical metadata for song records.
-- Keep audio and score files in the existing private rvm-choir-files bucket.
alter table public.songs
  add column if not exists musical_key text,
  add column if not exists tempo_bpm integer,
  add column if not exists time_signature text,
  add column if not exists vocal_parts text[] not null default '{}',
  add column if not exists lyrics_source_url text,
  add column if not exists recording_source_url text,
  add column if not exists sheet_music_source_url text,
  add column if not exists rights_status text not null default 'needs_review',
  add column if not exists verification_status text not null default 'unverified';

alter table public.songs
  drop constraint if exists songs_tempo_bpm_range;
alter table public.songs
  add constraint songs_tempo_bpm_range
  check (tempo_bpm is null or tempo_bpm between 20 and 300) not valid;

create index if not exists songs_choir_musical_key_idx
  on public.songs (choir_id, musical_key);
create index if not exists songs_choir_verification_idx
  on public.songs (choir_id, verification_status);
create index if not exists songs_choir_rights_status_idx
  on public.songs (choir_id, rights_status);

comment on column public.songs.musical_key is
  'Key for the specific stored song version/arrangement; do not populate unless verified.';
comment on column public.songs.rights_status is
  'Rights review state. Full lyrics, scores and recordings must not be uploaded unless permitted.';
comment on column public.songs.verification_status is
  'Whether metadata and source links have been reviewed by an authorised librarian.';
