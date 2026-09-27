create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_fingerprint text not null,
  provider_event_id text,
  gateway_order_id text,
  webhook_timestamp timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'processing',
  constraint payment_webhook_events_status_check check (status in ('processing','processed')),
  constraint payment_webhook_events_provider_fingerprint_key unique (provider,event_fingerprint),
  constraint payment_webhook_events_provider_event_key unique (provider,provider_event_id)
);

create index if not exists payment_webhook_events_order_idx
  on public.payment_webhook_events(provider,gateway_order_id,webhook_timestamp);

alter table public.payment_webhook_events enable row level security;
revoke all on table public.payment_webhook_events from public,anon,authenticated;
grant all on table public.payment_webhook_events to service_role;

create or replace function public.process_payment_webhook(
  p_provider text,
  p_event_fingerprint text,
  p_provider_event_id text,
  p_gateway_order_id text,
  p_webhook_timestamp timestamptz,
  p_payment_status text,
  p_gateway_payment_id text
)
returns text
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_event_id uuid;
  v_existing_status text;
  v_order public.orders%rowtype;
  v_latest_event timestamptz;
  v_new_status text;
begin
  if p_provider not in ('cashfree','razorpay') then
    raise exception 'Unsupported payment webhook provider';
  end if;

  insert into public.payment_webhook_events(
    provider,event_fingerprint,provider_event_id,gateway_order_id,webhook_timestamp,status
  )
  values(
    p_provider,p_event_fingerprint,p_provider_event_id,p_gateway_order_id,p_webhook_timestamp,'processing'
  )
  on conflict (provider,event_fingerprint) do nothing
  returning id into v_event_id;

  if v_event_id is null and p_provider_event_id is not null then
    select status into v_existing_status
      from public.payment_webhook_events
     where provider=p_provider and provider_event_id=p_provider_event_id;
  elsif v_event_id is null then
    select status into v_existing_status
      from public.payment_webhook_events
     where provider=p_provider and event_fingerprint=p_event_fingerprint;
  end if;

  if v_event_id is null then
    if v_existing_status='processed' then return 'duplicate'; end if;
    return 'retry';
  end if;

  if p_gateway_order_id is null or btrim(p_gateway_order_id)='' then
    update public.payment_webhook_events set status='processed',processed_at=now() where id=v_event_id;
    return 'ignored';
  end if;

  select * into v_order
    from public.orders
   where gateway_order_id=p_gateway_order_id
   for update;

  if not found then
    update public.payment_webhook_events set status='processed',processed_at=now() where id=v_event_id;
    return 'unknown_order';
  end if;

  select max(webhook_timestamp) into v_latest_event
    from public.payment_webhook_events
   where provider=p_provider
     and gateway_order_id=p_gateway_order_id
     and status='processed'
     and id<>v_event_id;

  if p_webhook_timestamp is not null and v_latest_event is not null and p_webhook_timestamp<=v_latest_event then
    update public.payment_webhook_events set status='processed',processed_at=now() where id=v_event_id;
    return 'stale';
  end if;

  v_new_status=lower(coalesce(p_payment_status,'pending'));

  if v_order.payment_status='paid' and v_new_status<>'paid' then
    v_new_status='paid';
  end if;

  update public.orders
     set payment_status=v_new_status,
         gateway_payment_id=coalesce(nullif(p_gateway_payment_id,''),gateway_payment_id)
   where id=v_order.id;

  update public.payment_webhook_events
     set status='processed',processed_at=now()
   where id=v_event_id;

  return 'processed';
end;
$$;

revoke all on function public.process_payment_webhook(text,text,text,text,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.process_payment_webhook(text,text,text,text,timestamptz,text,text) to service_role;
