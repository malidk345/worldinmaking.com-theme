import { supabaseAdmin } from './supabase-admin';

export async function verifyAgentRequest(request: Request): Promise<boolean> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
        return false;
    }

    // Check system token (prevent empty string match vulnerability)
    const systemToken = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (systemToken && token === systemToken) {
        return true;
    }

    // Check bot token against database
    if (token.startsWith('bot_token_')) {
        try {
            const { data, error } = await supabaseAdmin
                .from('bot_profiles')
                .select('id')
                .eq('api_token', token)
                .eq('is_active', true)
                .single();

            if (!error && data) {
                return true;
            }
        } catch (err) {
            console.error('[Agent Auth] Error verifying bot token:', err);
            return false;
        }
    }

    return false;
}
