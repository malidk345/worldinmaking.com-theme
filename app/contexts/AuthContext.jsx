"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import logger from '../utils/logger';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Define fetchProfile first with useCallback
    const fetchProfile = useCallback(async (userId) => {
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
            if (typeof window === 'undefined') return;

            logger.log('[Auth] Checking for existing session...');

            // 1. Handle PKCE Code (Query Parameter)
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

                        // Clean URL (remove code)
                        const newUrl = window.location.pathname;
                        window.history.replaceState(null, '', newUrl);
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    logger.error('[Auth] PKCE exchange exception:', e);
                }
            }

            // Fallback to standard getSession
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
        });

        return () => subscription.unsubscribe();
    }, [fetchProfile]);

    const updateProfile = async (username, avatar_url) => {
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

    const signInWithEmail = async (email) => {
        try {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const trimmedEmail = email?.trim();

            if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
                return { error: { message: 'please enter a valid email address' } };
            }

            const { error } = await supabase.auth.signInWithOtp({
                email: trimmedEmail,
                options: {
                    data: {
                        username: trimmedEmail.split('@')[0], // Default username
                    }
                },
            });

            if (error) {
                logger.error('[Auth] signInWithOtp error:', error);
                return { error };
            }

            return { error: null };
        } catch (e) {
            logger.error('[Auth] signInWithOtp exception:', e);
            return { error: { message: e?.message || 'Unknown error' } };
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
