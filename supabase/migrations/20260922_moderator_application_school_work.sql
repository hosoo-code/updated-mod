alter table public.moderator_applications
  add column if not exists is_student boolean not null default false,
  add column if not exists school_name text not null default '',
  add column if not exists school_grade text not null default '',
  add column if not exists teacher_name text not null default '',
  add column if not exists teacher_phone text not null default '',
  add column if not exists is_employed boolean not null default false,
  add column if not exists workplace_name text not null default '',
  add column if not exists workplace_location text not null default '',
  add column if not exists director_phone text not null default '';
