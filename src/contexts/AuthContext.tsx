'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import logger from '../utils/logger';

interface Profile {
    username: string;
    avatar_url: string;
    role?: string;
}

interface AuthError {
    message: string;
    status?: number;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signInWithEmail: (email: string) => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<void>;
    updateProfile: (username: string, avatar_url: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    // Define fetchProfile first with useCallback
    const fetchProfile = useCallback(async (userId: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('username, avatar_url, role')
            .eq('id', userId)
            .single();
        if (data) setProfile(data);
    }, []);

    useEffect(() => {
        // Check active session
        const getSession = async () => {
            logger.log('[Auth] Checking for existing session...');

            // First, check if there's a hash in the URL (magic link callback)
            if (typeof window !== 'undefined' && window.location.hash) {
                logger.log('[Auth] Found hash in URL, attempting to exchange for session');
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

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            logger.log('[Auth] Auth state changed:', event, session?.user?.email || 'no user');

            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
            setLoading(false);

            // Clean up URL hash after successful login
            if (event === 'SIGNED_IN' && typeof window !== 'undefined' && window.location.hash) {
                logger.log('[Auth] Cleaning up URL hash after sign in');
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchProfile]);

    const updateProfile = async (username: string, avatar_url: string) => {
        if (!user) return false;

        const { error } = await supabase
            .from('profiles')
            .update({ username, avatar_url })
            .eq('id', user.id);

        if (error) {
            logger.error('[Auth] Error updating profile:', error);
            return false;
        }

        // Update local state
        setProfile(prev => prev ? { ...prev, username, avatar_url } : null);
        return true;
    };

    const signInWithEmail = async (email: string) => {
        // Magic Link Sign In with better error handling
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    // Redirect user back to site
                    emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
                    data: {
                        username: email.split('@')[0], // Default username
                    }
                },
            });

            if (error) {
                logger.error('[Auth] signInWithOtp error:', error);
                return { error };
            }

            return { error: null };
        } catch (e: unknown) {
            const err = e as Error;
            logger.error('[Auth] signInWithOtp exception:', err);
            return { error: { message: err?.message || 'Unknown error' } };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signInWithEmail, signOut, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
