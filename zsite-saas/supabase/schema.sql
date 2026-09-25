create extension if not exists pgcrypto;
create table if not exists public.stores (id uuid primary key default gen_random_uuid(), owner_id uuid references auth.users(id) on delete cascade, name text not null, slug text unique not null, logo_url text, upi_id text, merchant_name text, created_at timestamptz default now());
create table if not exists public.categories (id uuid primary key default gen_random_uuid(), store_id uuid references public.stores(id) on delete cascade not null, name text not null, sort_order int default 0, visible boolean default true, created_at timestamptz default now());
create table if not exists public.items (id uuid primary key default gen_random_uuid(), store_id uuid references public.stores(id) on delete cascade not null, category_id uuid references public.categories(id) on delete set null, name text not null, description text, price numeric(12,2) not null default 0, compare_at_price numeric(12,2), stock int default 0, image_url text, active boolean default true, created_at timestamptz default now());
create table if not exists public.discounts (id uuid primary key default gen_random_uuid(), store_id uuid references public.stores(id) on delete cascade not null, code text not null, kind text not null default 'percentage', value numeric(12,2) not null, max_discount numeric(12,2), minimum_order numeric(12,2) default 0, first_order_only boolean default false, show_on_storefront boolean default true, active boolean default true, starts_at timestamptz, ends_at timestamptz, created_at timestamptz default now());
create table if not exists public.orders (id uuid primary key default gen_random_uuid(), store_id uuid references public.stores(id) on delete cascade not null, customer_name text, customer_phone text, customer_address text, status text default 'new', payment_status text default 'pending', subtotal numeric(12,2) default 0, discount numeric(12,2) default 0, total numeric(12,2) default 0, notes text, created_at timestamptz default now());
create table if not exists public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id) on delete cascade not null, item_id uuid references public.items(id) on delete set null, item_name text not null, quantity int not null default 1, unit_price numeric(12,2) not null default 0, total numeric(12,2) not null default 0);
alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.discounts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
create policy "owners manage stores" on public.stores for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage categories" on public.categories for all using (store_id in (select id from public.stores where owner_id=auth.uid())) with check (store_id in (select id from public.stores where owner_id=auth.uid()));
create policy "owners manage items" on public.items for all using (store_id in (select id from public.stores where owner_id=auth.uid())) with check (store_id in (select id from public.stores where owner_id=auth.uid()));
create policy "owners manage discounts" on public.discounts for all using (store_id in (select id from public.stores where owner_id=auth.uid())) with check (store_id in (select id from public.stores where owner_id=auth.uid()));
create policy "owners manage orders" on public.orders for all using (store_id in (select id from public.stores where owner_id=auth.uid())) with check (store_id in (select id from public.stores where owner_id=auth.uid()));
create policy "owners manage order items" on public.order_items for all using (order_id in (select id from public.orders where store_id in (select id from public.stores where owner_id=auth.uid()))) with check (order_id in (select id from public.orders where store_id in (select id from public.stores where owner_id=auth.uid())));
create index if not exists items_store_idx on public.items(store_id);
create index if not exists orders_store_idx on public.orders(store_id);
create index if not exists categories_store_idx on public.categories(store_id);

-- Database-level enforcement for the public plan limits.
create or replace function public.enforce_store_plan_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_plan text;
  product_count bigint;
  category_count bigint;
begin
  select plan into current_plan from public.stores where id = new.store_id for update;
  if current_plan is null then
    raise exception 'Store plan could not be determined';
  end if;
  if tg_table_name = 'items' then
    if current_plan = 'free' then
      select count(*) into product_count from public.items where store_id = new.store_id;
      if product_count >= 10 then
        raise exception 'FREE plan allows up to 10 products. Upgrade your plan to add more.';
      end if;
    elsif current_plan = 'starter' then
      select count(*) into product_count from public.items where store_id = new.store_id;
      if product_count >= 100 then
        raise exception 'STARTER plan allows up to 100 products. Upgrade your plan to add more.';
      end if;
    end if;
  elsif tg_table_name = 'categories' then
    if current_plan = 'free' then
      select count(*) into category_count from public.categories where store_id = new.store_id;
      if category_count >= 1 then
        raise exception 'FREE plan allows 1 category. Upgrade to STARTER for unlimited categories.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_store_product_limit on public.items;
create trigger enforce_store_product_limit before insert on public.items for each row execute function public.enforce_store_plan_limits();

drop trigger if exists enforce_store_category_limit on public.categories;
create trigger enforce_store_category_limit before insert on public.categories for each row execute function public.enforce_store_plan_limits();

revoke all on function public.enforce_store_plan_limits() from public, anon, authenticated;