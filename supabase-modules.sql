-- Execute esta atualizacao no SQL Editor depois de supabase-setup.sql.
alter table public.profiles add column if not exists email text;
update public.profiles p set email = u.email from auth.users u where p.id = u.id;
alter table public.profiles alter column email set not null;
create unique index if not exists profiles_email_key on public.profiles (email);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email);
  return new;
end;
$$;

create table if not exists public.journey_entries (
  id bigint generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null, description text, happened_on date not null default current_date, created_at timestamptz not null default now()
);
create table if not exists public.library_items (
  id bigint generated always as identity primary key, created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null, description text, link text, created_at timestamptz not null default now()
);
create table if not exists public.participation_posts (
  id bigint generated always as identity primary key, created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null, content text not null, created_at timestamptz not null default now()
);
create table if not exists public.result_items (
  id bigint generated always as identity primary key, title text not null, description text, indicator_value text, created_at timestamptz not null default now()
);
alter table public.journey_entries enable row level security;
alter table public.library_items enable row level security;
alter table public.participation_posts enable row level security;
alter table public.result_items enable row level security;

create policy "percurso proprio" on public.journey_entries for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ler acervo" on public.library_items for select to authenticated using (true);
create policy "criar acervo" on public.library_items for insert to authenticated with check (created_by = auth.uid());
create policy "editar acervo" on public.library_items for update to authenticated using (created_by = auth.uid() or public.is_admin()) with check (created_by = auth.uid() or public.is_admin());
create policy "apagar acervo" on public.library_items for delete to authenticated using (created_by = auth.uid() or public.is_admin());
create policy "ler participacao" on public.participation_posts for select to authenticated using (true);
create policy "criar participacao" on public.participation_posts for insert to authenticated with check (created_by = auth.uid());
create policy "editar participacao" on public.participation_posts for update to authenticated using (created_by = auth.uid() or public.is_admin()) with check (created_by = auth.uid() or public.is_admin());
create policy "apagar participacao" on public.participation_posts for delete to authenticated using (created_by = auth.uid() or public.is_admin());
create policy "ler resultados" on public.result_items for select to authenticated using (true);
create policy "admin cria resultados" on public.result_items for insert to authenticated with check (public.is_admin());
create policy "admin edita resultados" on public.result_items for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin apaga resultados" on public.result_items for delete to authenticated using (public.is_admin());

create or replace function public.admin_set_role(target_id uuid, next_role public.app_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Apenas administradores podem alterar papeis'; end if;
  update public.profiles set role = next_role where id = target_id;
end;
$$;
grant execute on function public.admin_set_role(uuid, public.app_role) to authenticated;
