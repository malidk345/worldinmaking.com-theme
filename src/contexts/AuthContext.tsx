'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface Profile {
    username: string;
    avatar_url: string;
    role?: string;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signInWithEmail: (email: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    updateProfile: (username: string, avatar_url: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        const getSession = async () => {
            console.log('[Auth] Checking for existing session...');

            // First, check if there's a hash in the URL (magic link callback)
            if (typeof window !== 'undefined' && window.location.hash) {
                console.log('[Auth] Found hash in URL, attempting to exchange for session');
            }

            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('[Auth] Error getting session:', error);
            }

            if (session) {
                console.log('[Auth] Session found for user:', session.user.email);
                setUser(session.user);
                fetchProfile(session.user.id);
            } else {
                console.log('[Auth] No active session');
                setUser(null);
            }
            setLoading(false);
        };

        getSession();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[Auth] Auth state changed:', event, session?.user?.email || 'no user');

            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
            setLoading(false);

            // Clean up URL hash after successful login
            if (event === 'SIGNED_IN' && typeof window !== 'undefined' && window.location.hash) {
                console.log('[Auth] Cleaning up URL hash after sign in');
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('username, avatar_url, role')
            .eq('id', userId)
            .single();
        if (data) setProfile(data);
    };

    const updateProfile = async (username: string, avatar_url: string) => {
        if (!user) return false;

        const { error } = await supabase
            .from('profiles')
            .update({ username, avatar_url })
            .eq('id', user.id);

        if (error) {
            console.error('Error updating profile:', error);
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
                console.error('[Supabase] signInWithOtp error:', error);
                return { error };
            }

            return { error: null };
        } catch (e: any) {
            console.error('[Supabase] signInWithOtp exception:', e);
            return { error: { message: e?.message || 'Unknown error', status: e?.status } };
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
