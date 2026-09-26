alter table public.moderator_applications
  add column if not exists teacher_facebook_link text not null default '';
