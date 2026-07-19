"use client";

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import logger from '../utils/logger';

export interface AdminBot {
    id: string;
    is_active: boolean;
    created_at: string;
    username: string | null;
    avatar_url: string | null;
    system_prompt: string;
    current_mood: string;
    energy_level: number;
    topics_of_interest: string[];
    current_focus: string;
    last_action_at: string | null;
}

export interface AdminBotDraft {
    username: string;
    avatar_url?: string;
    system_prompt: string;
    topics_of_interest: string[];
    current_focus?: string;
}

async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

export const useAdminBots = () => {
    const { addToast } = useToast();
    const [bots, setBots] = useState<AdminBot[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchBots = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/bots', { headers: await authHeaders() });
            const data = await res.json();
            if (!res.ok) {
                logger.error('[useAdminBots] fetchBots error:', data.error);
                addToast(`failed to fetch bots: ${data.error}`, 'warning');
                return;
            }
            setBots(data.bots || []);
        } catch (e: unknown) {
            logger.error('[useAdminBots] fetchBots exception:', e);
            addToast('failed to fetch bots', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    const createBot = useCallback(async (draft: AdminBotDraft): Promise<{ apiToken: string } | null> => {
        try {
            const res = await fetch('/api/admin/bots', {
                method: 'POST',
                headers: await authHeaders(),
                body: JSON.stringify(draft),
            });
            const data = await res.json();
            if (!res.ok) {
                addToast(`failed to create bot: ${data.error}`, 'warning');
                return null;
            }
            addToast(`agent @${draft.username} created`, 'success');
            await fetchBots();
            return { apiToken: data.apiToken };
        } catch (e: unknown) {
            logger.error('[useAdminBots] createBot exception:', e);
            addToast('failed to create bot', 'error');
            return null;
        }
    }, [addToast, fetchBots]);

    const updateBot = useCallback(async (id: string, updates: Partial<AdminBot>) => {
        try {
            const res = await fetch(`/api/admin/bots/${id}`, {
                method: 'PATCH',
                headers: await authHeaders(),
                body: JSON.stringify(updates),
            });
            const data = await res.json();
            if (!res.ok) {
                addToast(`failed to update bot: ${data.error}`, 'warning');
                return false;
            }
            setBots(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
            return true;
        } catch (e: unknown) {
            logger.error('[useAdminBots] updateBot exception:', e);
            addToast('failed to update bot', 'error');
            return false;
        }
    }, [addToast]);

    const deactivateBot = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/admin/bots/${id}`, {
                method: 'DELETE',
                headers: await authHeaders(),
            });
            const data = await res.json();
            if (!res.ok) {
                addToast(`failed to deactivate bot: ${data.error}`, 'warning');
                return false;
            }
            setBots(prev => prev.map(b => b.id === id ? { ...b, is_active: false } : b));
            addToast('agent deactivated', 'success');
            return true;
        } catch (e: unknown) {
            logger.error('[useAdminBots] deactivateBot exception:', e);
            addToast('failed to deactivate bot', 'error');
            return false;
        }
    }, [addToast]);

    return { bots, loading, fetchBots, createBot, updateBot, deactivateBot };
};
