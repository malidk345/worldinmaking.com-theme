/**
 * Server-side workspace chat repository (Supabase service role).
 * Used only by API routes and getServerSideProps — never import from client.
 */
import { supabaseAdmin } from '../../lib/supabase-admin'
import type { Artifact, Chat, FileAttachment, Message, ThinkingBudget, WebCitation } from '../components/ClaudeWorkspaceChat/types'


const MAX_CHATS = 80
const MAX_MESSAGES = 200
const MAX_CONTENT = 50_000
const MAX_JSON_BYTES = 80_000

export type StoredChatDTO = Chat

export type ChatListItem = Omit<Chat, 'messages'> & { messageCount: number }

type ChatRow = {
    id: string
    owner_key: string
    auth_user_id: string | null
    title: string
    project_id: string | null
    model_id: string
    starred: boolean
    thinking_budget: string
    web_search_enabled: boolean
    system_prompt: string | null
    share_token: string | null
    is_shared: boolean
    created_at: string
    updated_at: string
    deleted_at?: string | null
}

type MessageRow = {
    id: string
    chat_id: string
    role: string
    content: string
    model_used: string | null
    thinking_process: Message['thinkingProcess'] | null
    artifacts: Artifact[] | null
    citations: WebCitation[] | null
    attachments: FileAttachment[] | null
    os_action: Message['osAction'] | null
    liked: boolean | null
    edited_from_id: string | null
    sort_index: number
    created_at: string
}

export function isChatStoreUnavailable(error: unknown): boolean {
    const message = error && typeof error === 'object' && 'message' in error ? String((error as { message?: string }).message) : String(error)
    const code = error && typeof error === 'object' && 'code' in error ? String((error as { code?: string }).code) : ''
    return (
        code === 'PGRST205' ||
        code === '42883' ||
        message.includes('wim_chats') ||
        message.includes('wim_chat_usage') ||
        message.includes('increment_wim_chat_usage') ||
        message.includes('schema cache') ||
        message.includes('does not exist') ||
        message.includes('deleted_at')
    )
}

function clampText(value: unknown, max = MAX_CONTENT): string {
    return typeof value === 'string' ? value.slice(0, max) : ''
}

function sanitizeJson<T>(value: T | null | undefined, maxBytes = MAX_JSON_BYTES): T | null {
    if (value == null) return null
    try {
        const raw = JSON.stringify(value)
        if (raw.length <= maxBytes) return value
        return null
    } catch {
        return null
    }
}

function sanitizeAttachments(attachments: FileAttachment[] | undefined): FileAttachment[] | null {
    if (!attachments?.length) return null
    return attachments.slice(0, 8).map((attachment) => ({
        id: clampText(attachment.id, 80),
        name: clampText(attachment.name, 200),
        type: attachment.type,
        size: clampText(attachment.size, 40),
        url: attachment.url && !attachment.url.startsWith('data:') ? clampText(attachment.url, 500) : undefined,
        content: attachment.type === 'image' ? undefined : clampText(attachment.content, 8000),
        contentPreview: clampText(attachment.contentPreview, 500),
    }))
}

function toThinkingBudget(value: string | null | undefined): ThinkingBudget {
    if (value === 'minimal' || value === 'extended') return value
    return 'balanced'
}

function rowToChat(row: ChatRow, messages: Message[] = []): Chat {
    return {
        id: row.id,
        title: row.title,
        projectId: row.project_id || undefined,
        modelId: row.model_id,
        messages,
        starred: !!row.starred,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        thinkingBudget: toThinkingBudget(row.thinking_budget),
        webSearchEnabled: !!row.web_search_enabled,
        systemPrompt: row.system_prompt || undefined,
        shareToken: row.share_token || undefined,
        isShared: !!row.is_shared,
    }
}

function rowToMessage(row: MessageRow): Message {
    const timestamp = new Date(row.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    return {
        id: row.id,
        role: row.role === 'assistant' || row.role === 'system' ? row.role : 'user',
        content: row.content || '',
        timestamp,
        modelUsed: row.model_used || undefined,
        thinkingProcess: row.thinking_process || undefined,
        artifacts: row.artifacts || undefined,
        citations: row.citations || undefined,
        attachments: row.attachments || undefined,
        liked: row.liked,
        editedFromId: row.edited_from_id || undefined,
        osAction: row.os_action || undefined,
        isStreaming: false,
        isTypingDone: true,
    }
}

function messageToRow(chatId: string, message: Message, sortIndex: number): MessageRow {
    return {
        id: clampText(message.id, 80) || `m-${chatId}-${sortIndex}`,
        chat_id: chatId,
        role: message.role,
        content: clampText(message.content),
        model_used: message.modelUsed ? clampText(message.modelUsed, 80) : null,
        thinking_process: sanitizeJson(message.thinkingProcess),
        artifacts: sanitizeJson(message.artifacts),
        citations: sanitizeJson(message.citations),
        attachments: sanitizeJson(sanitizeAttachments(message.attachments)),
        os_action: sanitizeJson(message.osAction),
        liked: typeof message.liked === 'boolean' ? message.liked : null,
        edited_from_id: message.editedFromId ? clampText(message.editedFromId, 80) : null,
        sort_index: sortIndex,
        created_at: new Date().toISOString(),
    }
}

function applyOwnerScope<T extends { or: Function; eq: Function }>(query: T, ownerKey: string, userId?: string): T {
    if (userId && userId === ownerKey) {
        return query.or(`owner_key.eq.${ownerKey},auth_user_id.eq.${userId}`)
    }
    return query.eq('owner_key', ownerKey)
}

export async function listChatsByOwner(ownerKey: string, userId?: string): Promise<ChatListItem[]> {
    const chats = await listChatsWithMessages(ownerKey, userId)
    return chats.map((chat) => ({ ...chat, messageCount: chat.messages.length }))
}

export async function listDeletedChatIds(ownerKey: string, userId?: string): Promise<string[]> {
    let query = supabaseAdmin.from('wim_chats').select('id').not('deleted_at', 'is', null)
    query = applyOwnerScope(query, ownerKey, userId)
    const { data, error } = await query.limit(500)
    if (error) throw error
    return ((data as { id: string }[] | null) || []).map((row) => row.id)
}

export async function listChatsWithMessages(ownerKey: string, userId?: string): Promise<Chat[]> {
    let query = supabaseAdmin
        .from('wim_chats')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(MAX_CHATS)
    query = applyOwnerScope(query, ownerKey, userId)
    const { data, error } = await query

    if (error) throw error
    const rows = (data as ChatRow[] | null) || []
    if (rows.length === 0) return []

    const { data: messageData, error: messageError } = await supabaseAdmin
        .from('wim_chat_messages')
        .select('*')
        .in(
            'chat_id',
            rows.map((row) => row.id)
        )
        .order('sort_index', { ascending: true })
    if (messageError) throw messageError

    const byChat = new Map<string, Message[]>()
    for (const row of (messageData as MessageRow[] | null) || []) {
        const list = byChat.get(row.chat_id) || []
        if (list.length < MAX_MESSAGES) list.push(rowToMessage(row))
        byChat.set(row.chat_id, list)
    }

    return rows.map((row) => rowToChat(row, byChat.get(row.id) || []))
}

export async function getChatForOwner(chatId: string, ownerKey: string): Promise<Chat | null> {
    const { data, error } = await supabaseAdmin
        .from('wim_chats')
        .select('*')
        .eq('id', chatId)
        .eq('owner_key', ownerKey)
        .is('deleted_at', null)
        .maybeSingle()
    if (error) throw error
    if (!data) return null
    const messages = await listMessages(chatId)
    return rowToChat(data as ChatRow, messages)
}

export async function getSharedChatByToken(token: string): Promise<Chat | null> {
    const clean = token.trim()
    if (!clean || clean.length < 8 || clean.length > 80) return null
    const { data, error } = await supabaseAdmin
        .from('wim_chats')
        .select('*')
        .eq('share_token', clean)
        .eq('is_shared', true)
        .is('deleted_at', null)
        .maybeSingle()
    if (error) throw error
    if (!data) return null
    const messages = await listMessages((data as ChatRow).id)
    return rowToChat(data as ChatRow, messages)
}

async function listMessages(chatId: string): Promise<Message[]> {
    const { data, error } = await supabaseAdmin
        .from('wim_chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('sort_index', { ascending: true })
        .limit(MAX_MESSAGES)
    if (error) throw error
    return ((data as MessageRow[] | null) || []).map(rowToMessage)
}

export async function upsertChatWithMessages(
    ownerKey: string,
    userId: string | undefined,
    chat: Chat
): Promise<Chat> {
    const chatId = clampText(chat.id, 80)
    if (!chatId) throw Object.assign(new Error('chat.id is required'), { status: 400 })

    const row = {
        id: chatId,
        owner_key: ownerKey,
        auth_user_id: userId || null,
        title: clampText(chat.title, 200) || 'Yeni Sohbet',
        project_id: chat.projectId ? clampText(chat.projectId, 80) : null,
        model_id: clampText(chat.modelId, 80) || 'nietzsche',
        starred: !!chat.starred,
        thinking_budget: toThinkingBudget(chat.thinkingBudget),
        web_search_enabled: !!chat.webSearchEnabled,
        system_prompt: chat.systemPrompt ? clampText(chat.systemPrompt, 5000) : null,
        share_token: chat.shareToken ? clampText(chat.shareToken, 80) : null,
        is_shared: !!chat.isShared,
        created_at: chat.createdAt || new Date().toISOString(),
        updated_at: chat.updatedAt || new Date().toISOString(),
    }

    const { data: existing, error: existingError } = await supabaseAdmin
        .from('wim_chats')
        .select('id, owner_key, share_token, is_shared, deleted_at')
        .eq('id', chatId)
        .maybeSingle()
    if (existingError) throw existingError
    if (existing && (existing as ChatRow).owner_key !== ownerKey) {
        throw Object.assign(new Error('Forbidden'), { status: 403 })
    }
    if (existing && (existing as ChatRow).deleted_at) {
        throw Object.assign(new Error('Chat was deleted'), { status: 410 })
    }

    if (existing) {
        // Preserve an already-issued share token unless the client is explicitly sharing.
        row.share_token = (existing as ChatRow).share_token
        row.is_shared = (existing as ChatRow).is_shared
        const { error } = await supabaseAdmin.from('wim_chats').update(row).eq('id', chatId).eq('owner_key', ownerKey)
        if (error) throw error
    } else {
        const { error } = await supabaseAdmin.from('wim_chats').insert(row)
        if (error) throw error
    }

    const persistable = (chat.messages || [])
        .filter((message) => message.role === 'user' || message.role === 'assistant' || message.role === 'system')
        .filter((message) => message.role === 'user' || (message.content || '').trim().length > 0)
        .slice(0, MAX_MESSAGES)

    const existingMessages = await listMessages(chatId)
    const existingIds = new Set(existingMessages.map((message) => message.id))
    const incomingRows = persistable.map((message, index) => messageToRow(chatId, message, index))
    const inserts = incomingRows.filter((row) => !existingIds.has(row.id))
    const updates = incomingRows.filter((row) => existingIds.has(row.id))

    if (inserts.length > 0) {
        const { error: insertError } = await supabaseAdmin.from('wim_chat_messages').insert(inserts)
        if (insertError) throw insertError
    }
    for (const row of updates) {
        const { created_at: _createdAt, chat_id: _chatId, ...patch } = row
        const { error: updateError } = await supabaseAdmin
            .from('wim_chat_messages')
            .update(patch)
            .eq('id', row.id)
            .eq('chat_id', chatId)
        if (updateError) throw updateError
    }

    return getChatForOwner(chatId, ownerKey) as Promise<Chat>
}

export async function patchChatForOwner(
    chatId: string,
    ownerKey: string,
    patch: Partial<Pick<Chat, 'title' | 'starred' | 'modelId' | 'thinkingBudget' | 'webSearchEnabled' | 'projectId'>>
): Promise<Chat | null> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (patch.title !== undefined) updates.title = clampText(patch.title, 200) || 'Yeni Sohbet'
    if (patch.starred !== undefined) updates.starred = !!patch.starred
    if (patch.modelId !== undefined) updates.model_id = clampText(patch.modelId, 80)
    if (patch.thinkingBudget !== undefined) updates.thinking_budget = toThinkingBudget(patch.thinkingBudget)
    if (patch.webSearchEnabled !== undefined) updates.web_search_enabled = !!patch.webSearchEnabled
    if (patch.projectId !== undefined) updates.project_id = patch.projectId ? clampText(patch.projectId, 80) : null

    const { error } = await supabaseAdmin.from('wim_chats').update(updates).eq('id', chatId).eq('owner_key', ownerKey)
    if (error) throw error
    return getChatForOwner(chatId, ownerKey)
}

export async function setMessageLiked(chatId: string, ownerKey: string, messageId: string, liked: boolean | null): Promise<void> {
    const owned = await getChatForOwner(chatId, ownerKey)
    if (!owned) throw Object.assign(new Error('Not found'), { status: 404 })
    const { error } = await supabaseAdmin
        .from('wim_chat_messages')
        .update({ liked })
        .eq('id', messageId)
        .eq('chat_id', chatId)
    if (error) throw error
}

export async function deleteChatForOwner(chatId: string, ownerKey: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
        .from('wim_chats')
        .update({ deleted_at: new Date().toISOString(), is_shared: false })
        .eq('id', chatId)
        .eq('owner_key', ownerKey)
        .is('deleted_at', null)
        .select('id')
    if (error) throw error
    return Array.isArray(data) && data.length > 0
}

export function createShareToken(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID().replace(/-/g, '')
    }
    return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`
}

export async function setChatShare(chatId: string, ownerKey: string, enabled: boolean): Promise<Chat | null> {
    const existing = await getChatForOwner(chatId, ownerKey)
    if (!existing) return null
    const shareToken = enabled ? existing.shareToken || createShareToken() : existing.shareToken || null
    const { error } = await supabaseAdmin
        .from('wim_chats')
        .update({
            is_shared: enabled,
            share_token: enabled ? shareToken : shareToken,
            updated_at: new Date().toISOString(),
        })
        .eq('id', chatId)
        .eq('owner_key', ownerKey)
    if (error) throw error
    return getChatForOwner(chatId, ownerKey)
}

export async function incrementDailyUsage(subject: string): Promise<number | null> {
    const day = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabaseAdmin.rpc('increment_wim_chat_usage', { p_subject: subject, p_day: day })
    if (error) throw error
    return typeof data === 'number' ? data : Number(data)
}
