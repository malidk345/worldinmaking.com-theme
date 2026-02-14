"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import logger from '../utils/logger';

interface Profile {
    username: string;
    avatar_url: string;
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
    signInWithEmail: (email: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasExtendedProfileFields, setHasExtendedProfileFields] = useState(false);

    const fetchProfile = useCallback(async (userId: string) => {
        const fullSelect = 'username, avatar_url, role, bio, website, github, linkedin, twitter, pronouns, location';
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
                        logger.log('[Auth] PKCE exchange success:', data.session.user.email);
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
                logger.log('[Auth] Session found for user:', session.user.email);
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
            logger.log('[Auth] Auth state changed:', event, session?.user?.email || 'no user');

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

        const safeUpdates = hasExtendedProfileFields
            ? updates
            : {
                username: updates.username,
                avatar_url: updates.avatar_url,
            };

        if (!Object.values(safeUpdates).some((value) => value !== undefined)) return false;

        const { error } = await supabase
            .from('profiles')
            .update(safeUpdates)
            .eq('id', user.id);

        if (error) {
            logger.error('[Auth] Error updating profile:', error);
            return false;
        }

        setProfile(prev => prev ? { ...prev, ...safeUpdates } : null);
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
        } catch (e: any) {
            logger.error('[Auth] signInWithOtp exception:', e);
            return { error: { message: e?.message || 'Unknown error' } };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const isAdmin = profile?.role?.toLowerCase() === 'admin';

    return (
        <AuthContext.Provider value={{ user, profile, loading, signInWithEmail, signOut, updateProfile, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
