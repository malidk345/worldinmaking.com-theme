/**
 * Diagnose / register Lemon Squeezy billing for WorldInMaking.
 *
 * Usage:
 *   pnpm billing:setup
 *   pnpm billing:setup --create-webhook
 *
 * Product + monthly/yearly variants must be created in the Lemon Squeezy
 * dashboard (subscription prices are not fully creatable via API).
 * This script reads .env.local, lists stores/variants, and can register
 * the production webhook.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const ENV_PATH = path.join(ROOT, '.env.local')
const API = 'https://api.lemonsqueezy.com/v1'
const WEBHOOK_PATH = '/api/webhooks/lemonsqueezy'
const WEBHOOK_EVENTS = [
    'subscription_created',
    'subscription_updated',
    'subscription_resumed',
    'subscription_paused',
    'subscription_unpaused',
    'subscription_cancelled',
    'subscription_expired',
    'subscription_payment_success',
    'subscription_payment_failed',
    'subscription_payment_recovered',
]

function loadEnvLocal() {
    const out = { ...process.env }
    if (!fs.existsSync(ENV_PATH)) return out
    for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
        if (!match) continue
        let value = match[2] || ''
        if (value.includes('#') && !value.startsWith('"') && !value.startsWith("'")) {
            value = value.split('#')[0].trim()
        }
        value = value.trim().replace(/^['"]|['"]$/g, '')
        if (out[match[1]] === undefined) out[match[1]] = value
    }
    return out
}

function placeholder(value) {
    const v = String(value || '').trim()
    return !v || /^(your_|placeholder|changeme)/i.test(v)
}

async function lsFetch(apiKey, pathname) {
    const res = await fetch(`${API}${pathname}`, {
        headers: {
            Accept: 'application/vnd.api+json',
            Authorization: `Bearer ${apiKey}`,
        },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
        const detail = data?.errors?.[0]?.detail || res.statusText
        throw new Error(`${pathname} → ${res.status} ${detail}`)
    }
    return data
}

function printChecklist() {
    console.log(`
Lemon Squeezy dashboard (one-time):
  1. https://app.lemonsqueezy.com  → create store "WorldInMaking"
  2. Products → New product
       Name: Thinker (Pro)
       Pricing: Subscription
       Variant "Monthly": $9.99 / month
       Variant "Yearly":  $99 / year
  3. Settings → API → create a key (test mode first, then live)
  4. Copy into .env.local AND Cloudflare Pages env:
       LEMON_SQUEEZY_API_KEY=
       LEMON_SQUEEZY_STORE_ID=
       LEMON_SQUEEZY_VARIANT_ID_PRO_MONTHLY=
       LEMON_SQUEEZY_VARIANT_ID_PRO_YEARLY=
       LEMON_SQUEEZY_WEBHOOK_SECRET=   (random 32+ char string)
       NEXT_PUBLIC_APP_URL=https://worldinmaking.com
  5. Re-run: pnpm billing:setup --create-webhook
`)
}

async function main() {
    const env = loadEnvLocal()
    const createWebhook = process.argv.includes('--create-webhook')
    const apiKey = env.LEMON_SQUEEZY_API_KEY
    const storeId = env.LEMON_SQUEEZY_STORE_ID
    const monthly = env.LEMON_SQUEEZY_VARIANT_ID_PRO_MONTHLY
    const yearly = env.LEMON_SQUEEZY_VARIANT_ID_PRO_YEARLY
    const secret = env.LEMON_SQUEEZY_WEBHOOK_SECRET
    const appUrl = (env.NEXT_PUBLIC_APP_URL || 'https://worldinmaking.com').replace(/\/$/, '')

    console.log('WorldInMaking Lemon Squeezy setup')
    console.log(`  .env.local: ${fs.existsSync(ENV_PATH) ? ENV_PATH : 'MISSING'}`)
    console.log(`  API key:    ${placeholder(apiKey) ? 'MISSING' : 'set'}`)
    console.log(`  Store ID:   ${placeholder(storeId) ? 'MISSING' : storeId}`)
    console.log(`  Monthly:    ${placeholder(monthly) ? 'MISSING' : monthly}`)
    console.log(`  Yearly:     ${placeholder(yearly) ? 'MISSING' : yearly}`)
    console.log(`  Webhook:    ${placeholder(secret) ? 'MISSING secret' : 'secret set'}`)
    console.log(`  App URL:    ${appUrl}`)
    console.log(`  Callback:   ${appUrl}${WEBHOOK_PATH}`)

    if (placeholder(apiKey)) {
        printChecklist()
        process.exitCode = 1
        return
    }

    const stores = await lsFetch(apiKey, '/stores')
    const storeRows = stores?.data || []
    console.log('\nStores:')
    for (const store of storeRows) {
        console.log(`  ${store.id}  ${store.attributes?.name}  (${store.attributes?.slug})`)
    }
    if (!storeRows.length) {
        console.log('  (none — create a store in the dashboard first)')
        printChecklist()
        process.exitCode = 1
        return
    }

    const variants = await lsFetch(apiKey, '/variants')
    const variantRows = variants?.data || []
    console.log('\nVariants (copy IDs into env):')
    for (const variant of variantRows) {
        const attr = variant.attributes || {}
        console.log(
            `  ${variant.id}  product=${attr.product_id}  ${attr.name}  ${attr.status}  ` +
                `sub=${attr.is_subscription ? `${attr.interval}/${attr.interval_count}` : 'no'}  ` +
                `price=${attr.price}`
        )
    }
    if (!variantRows.length) {
        console.log('  (none — create the Thinker Pro subscription product in the dashboard)')
        printChecklist()
        process.exitCode = 1
    }

    const resolvedStoreId = placeholder(storeId) ? storeRows[0]?.id : storeId
    const missing = []
    if (placeholder(resolvedStoreId)) missing.push('LEMON_SQUEEZY_STORE_ID')
    if (placeholder(monthly)) missing.push('LEMON_SQUEEZY_VARIANT_ID_PRO_MONTHLY')
    if (placeholder(yearly)) missing.push('LEMON_SQUEEZY_VARIANT_ID_PRO_YEARLY')
    if (placeholder(secret)) missing.push('LEMON_SQUEEZY_WEBHOOK_SECRET')
    if (missing.length) {
        console.log(`\nStill missing in .env.local: ${missing.join(', ')}`)
    }

    if (placeholder(resolvedStoreId) || placeholder(secret)) {
        process.exitCode = 1
        return
    }

    const webhooks = await lsFetch(apiKey, `/webhooks?filter[store_id]=${resolvedStoreId}`)
    const hookRows = webhooks?.data || []
    const target = `${appUrl}${WEBHOOK_PATH}`
    const existing = hookRows.find((hook) => hook.attributes?.url === target)
    console.log('\nWebhooks:')
    for (const hook of hookRows) {
        console.log(`  ${hook.id}  ${hook.attributes?.url}  events=${(hook.attributes?.events || []).join(',')}`)
    }

    if (existing) {
        console.log(`\nWebhook already registered: ${existing.id}`)
        console.log('Setup looks complete. Test with a Lemon Squeezy test-mode checkout.')
        return
    }

    if (!createWebhook) {
        console.log(`\nNo webhook for ${target}.`)
        console.log('Run: pnpm billing:setup --create-webhook')
        return
    }

    const created = await fetch(`${API}/webhooks`, {
        method: 'POST',
        headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            data: {
                type: 'webhooks',
                attributes: {
                    url: target,
                    events: WEBHOOK_EVENTS,
                    secret,
                },
                relationships: {
                    store: { data: { type: 'stores', id: String(resolvedStoreId) } },
                },
            },
        }),
    })
    const createdBody = await created.json().catch(() => null)
    if (!created.ok) {
        throw new Error(createdBody?.errors?.[0]?.detail || `webhook create failed: ${created.status}`)
    }
    console.log(`\nWebhook created: ${createdBody?.data?.id} → ${target}`)
    console.log('Put the same five LEMON_* keys on Cloudflare Pages, then test checkout.')
}

main().catch((err) => {
    console.error(err?.message || err)
    process.exit(1)
})
