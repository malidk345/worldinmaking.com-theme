/**
 * One-time cleanup: purge all soft-deleted notebooks from Supabase.
 * Run with: node --env-file=.env.local scripts/purge-deleted-notebooks.mjs
 */
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
)

async function main() {
    console.log("Fetching soft-deleted notebooks...")
    const { data: deleted, error } = await supabase
        .from("wim_notebooks")
        .select("id, title, deleted_at, owner_key")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: true })

    if (error) { console.error("Error:", error); process.exit(1) }
    if (!deleted || deleted.length === 0) { console.log("No soft-deleted notebooks. Clean! ?"); return }

    console.log(`Found ${deleted.length} soft-deleted notebook(s):`)
    deleted.forEach((n) => console.log(`  - [${n.id}] "${n.title}" (deleted: ${n.deleted_at})`))

    const ids = deleted.map((n) => n.id)

    // Delete history
    const { error: histErr } = await supabase.from("wim_notebook_history").delete().in("notebook_id", ids)
    if (histErr) console.error("History delete error:", histErr)
    else console.log(`  Deleted history for ${ids.length} notebook(s) ?`)

    // Hard-delete notebook rows
    const { error: delErr } = await supabase.from("wim_notebooks").delete().not("deleted_at", "is", null)
    if (delErr) console.error("Notebook delete error:", delErr)
    else console.log(`  Hard-deleted ${deleted.length} notebook row(s) ?`)

    console.log("\nCleanup complete!")
}

main().catch(console.error)
