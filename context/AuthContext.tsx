"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import logger from '../utils/logger';

interface Profile {
    username: string;
    avatar_url: string;
    cover_url?: string;
    role: string;
    bio?: string;
    website?: string;
    github?: string;
    linkedin?: string;
    twitter?: string;
    pronouns?: string;
    location?: string;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signInWithEmail: (email: string) => Promise<{ error: { message: string } | null }>;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
    isAdmin: boolean;
}

const trimValue = (value?: string | null) => value?.trim() || '';

const normalizeExternalUrl = (value?: string | null) => {
    const trimmed = trimValue(value);
    if (!trimmed) return '';
    if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('mailto:')) return trimmed;
    return `https://${trimmed}`;
};

const sanitizeProfileUpdates = (updates: Partial<Profile>) => ({
    ...('username' in updates ? { username: trimValue(updates.username) } : {}),
    ...('avatar_url' in updates ? { avatar_url: normalizeExternalUrl(updates.avatar_url) } : {}),
    ...('cover_url' in updates ? { cover_url: normalizeExternalUrl(updates.cover_url) } : {}),
    ...('role' in updates ? { role: trimValue(updates.role) } : {}),
    ...('bio' in updates ? { bio: trimValue(updates.bio) } : {}),
    ...('website' in updates ? { website: normalizeExternalUrl(updates.website) } : {}),
    ...('github' in updates ? { github: normalizeExternalUrl(updates.github) } : {}),
    ...('linkedin' in updates ? { linkedin: normalizeExternalUrl(updates.linkedin) } : {}),
    ...('twitter' in updates ? { twitter: normalizeExternalUrl(updates.twitter) } : {}),
    ...('pronouns' in updates ? { pronouns: trimValue(updates.pronouns) } : {}),
    ...('location' in updates ? { location: trimValue(updates.location) } : {}),
});

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasExtendedProfileFields, setHasExtendedProfileFields] = useState(false);

    const adminEmailAllowlist = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

    const fetchProfile = useCallback(async (userId: string) => {
        const fullSelect = 'username, avatar_url, cover_url, role, bio, website, github, linkedin, twitter, pronouns, location';
        const minimalSelect = 'username, avatar_url, role';

        const { data, error } = await supabase
            .from('profiles')
            .select(fullSelect)
            .eq('id', userId)
            .single();

        if (!error && data) {
            setHasExtendedProfileFields(true);
            setProfile(data as Profile);
            return;
        }

        if (error) {
            logger.warn('[Auth] Profile query fallback to minimal fields:', error.message || error);
        }

        const { data: minimalData, error: minimalError } = await supabase
            .from('profiles')
            .select(minimalSelect)
            .eq('id', userId)
            .single();

        if (minimalError) {
            logger.error('[Auth] Minimal profile query failed:', minimalError);
            return;
        }

        if (minimalData) {
            setHasExtendedProfileFields(false);
            setProfile(minimalData as Profile);
        }
    }, []);

    useEffect(() => {
        const getSession = async () => {
            if (typeof window === 'undefined') return;

            logger.log('[Auth] Checking for existing session...');

            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');

            if (code) {
                logger.log('[Auth] Found PKCE code, exchanging for session...');
                try {
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) {
                        logger.error('[Auth] Code exchange error:', error);
                    } else if (data.session) {
                        logger.log('[Auth] PKCE exchange success');
                        setUser(data.session.user);
                        fetchProfile(data.session.user.id);

                        const newUrl = window.location.pathname;
                        window.history.replaceState(null, '', newUrl);
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    logger.error('[Auth] PKCE exchange exception:', e);
                }
            }

            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                logger.error('[Auth] Error getting session:', error);
            }

            if (session) {
                logger.log('[Auth] Session found');
                setUser(session.user);
                fetchProfile(session.user.id);
            } else {
                logger.log('[Auth] No active session');
                setUser(null);
            }
            setLoading(false);
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            logger.log('[Auth] Auth state changed:', event);

            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [fetchProfile]);

    const updateProfile = async (updates: Partial<Profile>) => {
        if (!user) return false;

        const sanitizedUpdates = sanitizeProfileUpdates(updates);

        const safeUpdates = hasExtendedProfileFields
            ? sanitizedUpdates
            : {
                username: sanitizedUpdates.username,
                avatar_url: sanitizedUpdates.avatar_url,
            };

        if (!Object.values(safeUpdates).some((value) => value !== undefined)) return false;

        if ('username' in safeUpdates) {
            const nextUsername = trimValue(safeUpdates.username);

            if (!nextUsername) {
                logger.warn('[Auth] Refusing to save blank username');
                return false;
            }

            const { data: conflictingProfiles, error: usernameError } = await supabase
                .from('profiles')
                .select('id')
                .ilike('username', nextUsername)
                .neq('id', user.id)
                .limit(1);

            if (usernameError) {
                logger.error('[Auth] Error checking username uniqueness:', usernameError);
                return false;
            }

            if (conflictingProfiles && conflictingProfiles.length > 0) {
                logger.warn('[Auth] Username already taken:', nextUsername);
                return false;
            }
        }

        const { error } = await supabase
            .from('profiles')
            .update(safeUpdates)
            .eq('id', user.id);

        if (error) {
            logger.error('[Auth] Error updating profile:', error);
            return false;
        }

        await fetchProfile(user.id);
        return true;
    };

    const signInWithEmail = async (email: string) => {
        try {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const trimmedEmail = email?.trim();

            if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
                return { error: { message: 'please enter a valid email address' } };
            }

            const { error } = await supabase.auth.signInWithOtp({
                email: trimmedEmail,
                options: {
                    data: {
                        username: trimmedEmail.split('@')[0],
                    }
                },
            });

            if (error) {
                logger.error('[Auth] signInWithOtp error:', error);
                return { error };
            }

            return { error: null };
        } catch (e: unknown) {
            logger.error('[Auth] signInWithOtp exception:', e);
            return { error: { message: (e as Error)?.message || 'Unknown error' } };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const isRoleAdmin = profile?.role?.toLowerCase() === 'admin';
    const isEmailAdmin = !!user?.email && adminEmailAllowlist.includes(user.email.toLowerCase());
    const isAdmin = isRoleAdmin || isEmailAdmin;

    const value = React.useMemo(() => ({
        user,
        profile,
        loading,
        signInWithEmail,
        signOut,
        updateProfile,
        isAdmin
    }), [user, profile, loading, signInWithEmail, signOut, updateProfile, isAdmin]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
