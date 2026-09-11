import { supabaseAdmin } from './supabase-admin';

const adminEmailAllowlist = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export type AdminAuthResult =
    | { ok: true; userId: string }
    | { ok: false; status: number; error: string };

/**
 * Verifies that an incoming request carries a valid Supabase session belonging
 * to an admin user. Mirrors the client-side isAdmin check in AuthContext.tsx
 * (profiles.role === 'admin' OR email in NEXT_PUBLIC_ADMIN_EMAIL allowlist),
 * but re-validates server-side using the service role client so it can't be spoofed.
 */
export async function verifyAdminRequest(request: Request): Promise<AdminAuthResult> {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!token) {
        return { ok: false, status: 401, error: 'Missing Authorization header' };
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
        return { ok: false, status: 401, error: 'Invalid or expired session' };
    }

    const user = userData.user;

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    const isRoleAdmin = (profile?.role || '').toLowerCase() === 'admin';
    const isEmailAdmin = !!user.email && adminEmailAllowlist.includes(user.email.toLowerCase());

    if (!isRoleAdmin && !isEmailAdmin) {
        return { ok: false, status: 403, error: 'Admin access required' };
    }

    return { ok: true, userId: user.id };
}
