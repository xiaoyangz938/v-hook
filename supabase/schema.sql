create table if not exists public.community_items (
  id bigint primary key,
  title text not null,
  author text not null,
  image_url text not null,
  image_path text,
  views text default '0',
  downloads text default '0',
  description text default '',
  gcode_file_name text,
  gcode_url text,
  gcode_path text,
  tdm_file_name text,
  tdm_url text,
  tdm_path text,
  is_user_created boolean default true,
  storage_key text,
  created_at timestamptz not null default now()
);

create index if not exists community_items_created_at_idx
  on public.community_items (created_at desc);
