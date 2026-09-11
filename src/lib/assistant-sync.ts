import { supabase, isSupabaseConfigured } from './supabase'
import { readPersonalAssistantId, writePersonalAssistantId, isPersonalAssistantId } from './personal-assistant'
import { mergeRemoteNotices, readAssistantNotices, readWatchMeta, writeWatchMeta, type WatchMeta } from './assistant-notices'
import { readAssistantCadence, writeAssistantCadence, type AssistantCadence } from './assistant-cadence'
import {
    readAssistantAnswers,
    readAssistantFacts,
    writeAssistantAnswers,
    writeAssistantFacts,
    type AssistantAnswer,
    type AssistantFact,
} from './assistant-memory'

type RemoteRow = {
    philosopher_id: string | null
    notices: unknown
    answers: unknown
    memory: unknown
    cadence: unknown
    watch_meta: unknown
    updated_at: string
}

let pushTimer: number | null = null
let hydrating = false

function isMissingTable(message?: string): boolean {
    return Boolean(message && /schema cache|does not exist|relation|could not find/i.test(message))
}

export async function hydrateAssistantFromRemote(): Promise<boolean> {
    if (!isSupabaseConfigured || typeof window === 'undefined') return false
    if (hydrating) return false
    hydrating = true
    try {
        const { data: sessionData } = await supabase.auth.getSession()
        const userId = sessionData.session?.user?.id
        if (!userId) return false
        const { data, error } = await supabase
            .from('user_assistant')
            .select('philosopher_id, notices, answers, memory, cadence, watch_meta, updated_at')
            .eq('user_id', userId)
            .maybeSingle()
        if (error) {
            if (!isMissingTable(error.message)) console.warn('[assistant] hydrate', error.message)
            return false
        }
        if (!data) return false
        const row = data as RemoteRow
        if (row.philosopher_id && isPersonalAssistantId(row.philosopher_id) && !readPersonalAssistantId()) {
            writePersonalAssistantId(row.philosopher_id)
        }
        if (Array.isArray(row.notices)) mergeRemoteNotices(row.notices)
        if (Array.isArray(row.answers) && readAssistantAnswers().length === 0) {
            writeAssistantAnswers(row.answers as AssistantAnswer[])
        } else if (Array.isArray(row.answers)) {
            const local = readAssistantAnswers()
            const byId = new Map(local.map((item) => [item.id, item]))
            for (const item of row.answers as AssistantAnswer[]) {
                if (item?.id && !byId.has(item.id)) byId.set(item.id, item)
            }
            writeAssistantAnswers(Array.from(byId.values()))
        }
        if (Array.isArray(row.memory) && readAssistantFacts().length === 0) {
            writeAssistantFacts(row.memory as AssistantFact[])
        }
        if (row.cadence && typeof row.cadence === 'object') {
            writeAssistantCadence(row.cadence as Partial<AssistantCadence>)
        }
        if (row.watch_meta && typeof row.watch_meta === 'object') {
            writeWatchMeta(row.watch_meta as Partial<WatchMeta>)
        }
        return true
    } catch {
        return false
    } finally {
        hydrating = false
    }
}

export async function pushAssistantToRemote(): Promise<boolean> {
    if (!isSupabaseConfigured || typeof window === 'undefined') return false
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id
    if (!userId) return false
    const { error } = await supabase.from('user_assistant').upsert(
        {
            user_id: userId,
            philosopher_id: readPersonalAssistantId(),
            notices: readAssistantNotices(),
            answers: readAssistantAnswers(),
            memory: readAssistantFacts(),
            cadence: readAssistantCadence(),
            watch_meta: readWatchMeta(),
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
    )
    if (error) {
        if (!isMissingTable(error.message)) console.warn('[assistant] save', error.message)
        return false
    }
    return true
}

export function scheduleAssistantPush(): void {
    if (typeof window === 'undefined') return
    if (pushTimer) window.clearTimeout(pushTimer)
    pushTimer = window.setTimeout(() => {
        void pushAssistantToRemote()
    }, 1200)
}
