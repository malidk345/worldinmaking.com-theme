import { supabaseAdmin } from './supabase-admin';
import { envFrom, getRuntimeEnv } from '../src/lib/bots/runtime-env';

const STAFF_ROLES = new Set(['admin', 'moderator', 'staff']);
const ASSIGNABLE_ROLES = new Set(['member', 'user', 'writer', 'moderator', 'staff', 'admin']);

export type AdminAuthOk = {
    ok: true;
    userId: string;
    email: string | null;
    role: string;
    isAdmin: boolean;
    isStaff: boolean;
};

export type AdminAuthResult = AdminAuthOk | { ok: false; status: number; error: string };

export function isAssignableRole(role: string): boolean {
    return ASSIGNABLE_ROLES.has(role.trim().toLowerCase());
}

/**
 * Verifies that an incoming request carries a valid Supabase session belonging
 * to staff. Mirrors the client isModerator check (admin / moderator / staff)
 * plus NEXT_PUBLIC_ADMIN_EMAIL, but re-validates with the service-role client.
 */
export async function verifyAdminRequest(
    request: Request,
    opts?: { adminOnly?: boolean }
): Promise<AdminAuthResult> {
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
    const adminEmailAllowlist = envFrom(getRuntimeEnv(), 'NEXT_PUBLIC_ADMIN_EMAIL')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    const role = String(profile?.role || 'member').toLowerCase();
    const isEmailAdmin = !!user.email && adminEmailAllowlist.includes(user.email.toLowerCase());
    const isAdmin = role === 'admin' || isEmailAdmin;
    const isStaff = STAFF_ROLES.has(role) || isEmailAdmin;

    if (!isStaff) {
        return { ok: false, status: 403, error: 'Admin access required' };
    }
    if (opts?.adminOnly && !isAdmin) {
        return { ok: false, status: 403, error: 'Administrator role required' };
    }

    return {
        ok: true,
        userId: user.id,
        email: user.email || null,
        role,
        isAdmin,
        isStaff,
    };
}
