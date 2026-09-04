# Lemon Squeezy billing

WorldInMaking uses Lemon Squeezy as merchant of record for **study** (paid desk). The free OS is **desk**. Entitlement in the database remains `profiles.role = pro`.

Code is already wired:

| Piece | Path |
|---|---|
| Plans / checkout | `src/lib/wim-billing.ts` |
| Checkout API | `src/pages/api/billing/checkout.ts` |
| Webhook | `src/pages/api/webhooks/lemonsqueezy.ts` |
| Pricing UI | `src/components/Pricing/PricingWindow.tsx` |
| Table | `supabase/migrations/20260830_subscriptions.sql` |

Checkout does **not** fake a payment when keys are missing. Upgrade fails until the store is configured.

## One-time dashboard

1. Create a store at [app.lemonsqueezy.com](https://app.lemonsqueezy.com).
2. **Products → New product**
   - Name: `study` (or `thinker pro` — display name on the site is study)
   - Pricing: **Subscription**
   - Variant `Monthly`: `$9.99` every 1 month
   - Variant `Yearly`: `$99.99` every 1 year
3. **Settings → API** — create a key (test mode first).
4. Put these in `.env.local` **and** Cloudflare Pages:

```
LEMON_SQUEEZY_API_KEY=
LEMON_SQUEEZY_STORE_ID=
LEMON_SQUEEZY_VARIANT_ID_PRO_MONTHLY=
LEMON_SQUEEZY_VARIANT_ID_PRO_YEARLY=
LEMON_SQUEEZY_WEBHOOK_SECRET=   # random 32+ chars; you choose it
LEMON_SQUEEZY_DISCOUNT_CODE=WIM25
NEXT_PUBLIC_APP_URL=https://worldinmaking.com
```

5. Apply the subscriptions migration if it is not on the project yet.
6. Register the webhook:

```
pnpm billing:setup
pnpm billing:setup --create-webhook
```

Webhook URL: `https://worldinmaking.com/api/webhooks/lemonsqueezy`

Events: `subscription_created`, `subscription_updated`, `subscription_resumed`, `subscription_paused`, `subscription_unpaused`, `subscription_cancelled`, `subscription_expired`, `subscription_payment_success`, `subscription_payment_failed`, `subscription_payment_recovered`.

Checkout sends `custom.user_id` so the webhook can set `profiles.role = pro` and upsert `public.subscriptions`.

## Test

1. Lemon Squeezy **test mode** + test card `4242 4242 4242 4242`.
2. Sign in on the site → Pricing → Upgrade to Pro.
3. Confirm redirect to Lemon checkout, then `/profile?upgraded=true`.
4. Confirm `profiles.role` is `pro` and a row exists in `subscriptions`.
