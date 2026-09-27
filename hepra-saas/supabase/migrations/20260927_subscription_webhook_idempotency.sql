create table if not exists public.subscription_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_fingerprint text not null,
  provider_subscription_id text,
  webhook_timestamp timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'processing',
  constraint subscription_webhook_events_status_check check (status in ('processing','processed')),
  constraint subscription_webhook_events_provider_fingerprint_key unique (provider, event_fingerprint)
);

create index if not exists subscription_webhook_events_subscription_idx
  on public.subscription_webhook_events(provider, provider_subscription_id, webhook_timestamp);

alter table public.subscription_webhook_events enable row level security;

revoke all on table public.subscription_webhook_events from public, anon, authenticated;
grant all on table public.subscription_webhook_events to service_role;

create or replace function public.process_subscription_webhook(
  p_provider text,
  p_event_fingerprint text,
  p_provider_subscription_id text,
  p_webhook_timestamp timestamptz,
  p_subscription_status text,
  p_subscription_expiry_time timestamptz,
  p_active boolean,
  p_past_due boolean,
  p_inactive boolean,
  p_auth_failed boolean
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_event_id uuid;
  v_existing_status text;
  v_sub public.store_subscriptions%rowtype;
  v_latest_event timestamptz;
begin
  if p_provider <> 'cashfree' then
    raise exception 'Unsupported subscription webhook provider';
  end if;

  insert into public.subscription_webhook_events (
    provider, event_fingerprint, provider_subscription_id,
    webhook_timestamp, status
  )
  values (
    p_provider, p_event_fingerprint, p_provider_subscription_id,
    p_webhook_timestamp, 'processing'
  )
  on conflict (provider, event_fingerprint) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select status into v_existing_status
      from public.subscription_webhook_events
     where provider = p_provider
       and event_fingerprint = p_event_fingerprint;

    if v_existing_status = 'processed' then
      return 'duplicate';
    end if;

    return 'retry';
  end if;

  if p_provider_subscription_id is null
     or btrim(p_provider_subscription_id) = '' then
    update public.subscription_webhook_events
       set status = 'processed', processed_at = now()
     where id = v_event_id;
    return 'ignored';
  end if;

  select *
    into v_sub
    from public.store_subscriptions
   where provider_subscription_id = p_provider_subscription_id
     and provider = p_provider
   for update;

  if not found then
    update public.subscription_webhook_events
       set status = 'processed', processed_at = now()
     where id = v_event_id;
    return 'unknown_subscription';
  end if;

  select max(webhook_timestamp)
    into v_latest_event
    from public.subscription_webhook_events
   where provider = p_provider
     and provider_subscription_id = p_provider_subscription_id
     and status = 'processed'
     and id <> v_event_id;

  if p_webhook_timestamp is not null
     and v_latest_event is not null
     and p_webhook_timestamp <= v_latest_event then
    update public.subscription_webhook_events
       set status = 'processed', processed_at = now()
     where id = v_event_id;
    return 'stale';
  end if;

  update public.store_subscriptions
     set status = coalesce(nullif(p_subscription_status, ''), v_sub.status),
         current_period_end = coalesce(p_subscription_expiry_time, v_sub.current_period_end),
         updated_at = now()
   where id = v_sub.id;

  if p_active then
    update public.stores
       set plan = v_sub.plan,
           billing_interval = v_sub.billing_interval,
           subscription_status = 'active'
     where id = v_sub.store_id;
  elsif p_past_due then
    update public.stores
       set subscription_status = 'past_due'
     where id = v_sub.store_id;
  elsif p_inactive then
    update public.stores
       set plan = 'free',
           billing_interval = 'monthly',
           subscription_status = case
             when p_auth_failed then 'past_due'
             else 'canceled'
           end
     where id = v_sub.store_id;
  end if;

  update public.subscription_webhook_events
     set status = 'processed', processed_at = now()
   where id = v_event_id;

  return 'processed';
end;
$$;

revoke all on function public.process_subscription_webhook(
  text, text, text, timestamptz, text, timestamptz,
  boolean, boolean, boolean, boolean
) from public, anon, authenticated;

grant execute on function public.process_subscription_webhook(
  text, text, text, timestamptz, text, timestamptz,
  boolean, boolean, boolean, boolean
) to service_role;
