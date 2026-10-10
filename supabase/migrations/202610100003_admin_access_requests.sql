create table public.admin_access_requests (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

alter table public.admin_access_requests enable row level security;

create policy "Admins read admin access requests" on public.admin_access_requests
  for select to authenticated using (public.is_admin());

grant select on public.admin_access_requests to authenticated;

create function public.record_admin_access_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'request_admin_access' = 'true' then
    insert into public.admin_access_requests (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger request_admin_access_on_signup
  after insert on auth.users
  for each row execute procedure public.record_admin_access_request();

revoke all on function public.record_admin_access_request() from public, anon, authenticated;

create function public.review_admin_access_request(p_user_id uuid, p_approved boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an existing administrator can review access requests';
  end if;
  if p_approved is null then
    raise exception 'Choose whether to approve or reject the request';
  end if;
  if not exists (
    select 1 from public.admin_access_requests
    where user_id = p_user_id and status = 'pending'
  ) then
    raise exception 'This request is no longer pending';
  end if;

  if p_approved then
    update public.profiles set role = 'admin' where id = p_user_id;
    if not found then
      raise exception 'The account profile for this request could not be found';
    end if;
  end if;

  update public.admin_access_requests
  set status = case when p_approved then 'approved' else 'rejected' end,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where user_id = p_user_id and status = 'pending';
end;
$$;

revoke all on function public.review_admin_access_request(uuid, boolean) from public, anon;
grant execute on function public.review_admin_access_request(uuid, boolean) to authenticated;
