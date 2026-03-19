create table if not exists public.orders (
  id bigint generated always as identity primary key,
  order_id text unique not null,
  submitted_at timestamptz not null default now(),
  customer_name text,
  customer_contact text,
  book_type_id text,
  book_type_title text,
  payment_method text,
  payment_approved boolean default false,
  manager_code text,
  status text not null default 'received',
  generation_status text,
  manager_delivery_status text,
  generated_book text,
  questionnaire jsonb not null default '{}'::jsonb,
  photo_comment text,
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id bigint generated always as identity primary key,
  order_id text not null,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_order_id on public.orders(order_id);
create index if not exists idx_order_status_history_order_id on public.order_status_history(order_id);
