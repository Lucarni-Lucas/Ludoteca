-- Hook «Before User Created» de Supabase Auth: frena el alta de cualquier mail que no esté en la lista.
-- Es security definer porque allowed_email tiene RLS sin políticas y supabase_auth_admin no la puede leer.
-- El search_path vacío evita que un objeto con el mismo nombre en otro esquema reemplace al de acá.
create or replace function public.before_user_created_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text := lower(btrim(event->'user'->>'email', E' \t\n\r'));
begin
  if exists (select 1 from public.allowed_email where email = candidate) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Esta cuenta no tiene acceso a Ludoteca'
    )
  );
end;
$$;
--> statement-breakpoint
grant usage on schema public to supabase_auth_admin;
--> statement-breakpoint
-- Supabase da permiso a anon y authenticated en cada función nueva de public, además del permiso a public.
revoke execute on function public.before_user_created_hook(jsonb) from public, anon, authenticated;
--> statement-breakpoint
grant execute on function public.before_user_created_hook(jsonb) to supabase_auth_admin;
