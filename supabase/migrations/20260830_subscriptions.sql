-- WorldInMaking Subscriptions Schema
-- Powered by Lemon Squeezy (Merchant of Record)

create table if not exists public.subscriptions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade unique not null,
    subscription_id text,
    customer_id text,
    order_id text,
    variant_id text,
    status text default 'active',
    plan text default 'pro',
    current_period_end timestamptz,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.subscriptions enable row level security;

-- Policy: Users can view their own subscription
create policy "Users can view own subscription"
    on public.subscriptions
    for select
    using (auth.uid() = user_id);

-- Policy: Service role can manage all subscriptions
create policy "Service role can manage all subscriptions"
    on public.subscriptions
    for all
    using (auth.jwt()->>'role' = 'service_role');
