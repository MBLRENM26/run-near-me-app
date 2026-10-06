-- Disposable database only. Minimal app fixtures plus actual ORL migrations.
create role anon;
create role authenticated;
create role service_role;
create schema auth;
create table auth.users(id uuid primary key);
create schema extensions;
create extension pgcrypto with schema extensions;
create table public.clubs(id uuid primary key,name text not null);
create table public.events(id uuid primary key,name text,sort_date date,date_from date,status text default 'ACTIVE',entry_url text,organiser_url text,organiser text,distances text,organiser_club_id uuid references public.clubs(id));
create table public.event_edits(id uuid default gen_random_uuid() primary key,event_id uuid references public.events(id),changes jsonb,note text);
