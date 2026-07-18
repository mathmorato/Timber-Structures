-- Execute uma unica vez em Supabase Dashboard > SQL Editor > New query.
-- Cria perfis, papeis e regras de seguranca para a plataforma.

create type public.app_role as enum ('user', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Usuarios leem o proprio perfil; administradores leem todos"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "Usuarios atualizam apenas o proprio perfil"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Impede que uma pessoa se torne admin alterando o navegador.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- DEPOIS de criar sua conta pelo site, troque o email abaixo pelo seu e execute esta linha.
-- update public.profiles p set role = 'admin' from auth.users u where p.id = u.id and u.email = 'seu-email@exemplo.com';
