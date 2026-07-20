"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/App';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from 'hooks/useTranslation';
import {
    LemonButton,
    LemonInput,
    LemonTag,
    LemonBanner,
    LemonField,
    Spinner,
} from '@/components/LemonUI';
import { IconMessage, IconUser, IconShield, IconLock, IconSparkles } from '@posthog/icons';

// PostHog "paper-desk" card styles — matching PaperDeskLogin.tsx and base.scss tokens
const cardStyle: React.CSSProperties = {
    background: 'var(--color-bg-surface-primary, #fff)',
    border: '1px solid var(--border-3000, #dadbd2)',
    borderRadius: 'var(--radius-lg, 6px)',
    boxShadow: '0 20px 44px -26px rgba(40, 38, 30, 0.35), var(--shadow-elevation-3000)',
};

const textPrimary: React.CSSProperties = { color: 'var(--text-3000)' };
const textSecondary: React.CSSProperties = { color: 'var(--color-text-secondary-3000)' };
const textMuted: React.CSSProperties = { color: 'var(--muted-3000)' };
const linkStyle: React.CSSProperties = {
    color: 'var(--link-3000)',
    cursor: 'pointer',
    fontWeight: 600,
    textDecoration: 'none',
};

function LogoMark() {
    return (
        <div
            style={{
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: 'var(--radius, 4px)',
                background: 'var(--primary-3000)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: '1.1rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
                userSelect: 'none',
                flexShrink: 0,
            }}
        >
            W
        </div>
    );
}

export default function LoginContent() {
    const { signInWithEmail, user, profile, signOut, loading: authLoading, isAdmin } = useAuth();
    const { addWindow } = useApp();
    const { addToast } = useToast();
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        const { error } = await signInWithEmail(email);
        setLoading(false);

        if (error) {
            addToast(error.message?.toLowerCase() || t('login.failed'), 'error');
        } else {
            setSent(true);
            addToast(t('login.magic_sent_success'), 'success');
        }
    };

    const handleSignOut = async () => {
        await signOut();
        addToast(t('login.signout_success'), 'info');
    };

    // ── Auth loading ──────────────────────────────────────────────────────────
    if (authLoading) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center p-6 h-full w-full">
                <div className="flex flex-col items-center gap-3">
                    <Spinner size="medium" />
                    <span className="text-xs font-mono lowercase" style={textMuted}>
                        {t('login.initializing')}
                    </span>
                </div>
            </div>
        );
    }

    // ── Already signed in ─────────────────────────────────────────────────────
    if (user) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 h-full w-full">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    style={{ width: '26rem', maxWidth: '100%', position: 'relative', zIndex: 10 }}
                >
                    <div
                        style={{
                            ...cardStyle,
                            padding: '2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem',
                            textAlign: 'center',
                        }}
                    >
                        <LogoMark />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h2 className="text-base font-bold" style={textPrimary}>
                                {t('login.authenticated')}
                            </h2>
                            <LemonTag type="success">ACTIVE</LemonTag>
                        </div>

                        <p
                            className="text-xs font-mono w-full truncate px-3 py-1 rounded border"
                            style={{
                                color: 'var(--color-text-secondary-3000)',
                                background: 'var(--color-accent-3000)',
                                borderColor: 'var(--border-3000)',
                            }}
                        >
                            {profile?.username || user.email}
                        </p>

                        <div className="flex flex-col gap-2.5 w-full">
                            {isAdmin && (
                                <LemonButton
                                    type="primary"
                                    fullWidth
                                    size="small"
                                    icon={<IconSparkles className="size-4" />}
                                    onClick={() =>
                                        addWindow({ key: 'admin', path: '/admin', title: t('menu.admin_dashboard') })
                                    }
                                >
                                    {t('login.open_dashboard')}
                                </LemonButton>
                            )}
                            <LemonButton
                                type="secondary"
                                status="danger"
                                fullWidth
                                size="small"
                                icon={<IconLock className="size-4" />}
                                onClick={handleSignOut}
                            >
                                {t('menu.sign_out')}
                            </LemonButton>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ── Magic link sent ───────────────────────────────────────────────────────
    if (sent) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 h-full w-full">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    style={{ width: '26rem', maxWidth: '100%' }}
                >
                    <div style={{ ...cardStyle, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <LemonBanner type="info" icon={<IconMessage className="size-4" />}>
                            <span className="font-semibold">{t('login.check_inbox')}</span>
                        </LemonBanner>

                        <p className="text-xs font-mono leading-relaxed lowercase" style={textSecondary}>
                            {t('login.magic_sent_to')}{' '}
                            <strong style={textPrimary}>{email}</strong>.{' '}
                            {t('login.click_to_signin')}
                        </p>

                        <LemonButton
                            type="secondary"
                            size="small"
                            onClick={() => setSent(false)}
                        >
                            {t('login.diff_email')}
                        </LemonButton>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ── Main login form ───────────────────────────────────────────────────────
    return (
        <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 h-full w-full">
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ width: '26rem', maxWidth: '100%', position: 'relative', zIndex: 10 }}
            >
                {/* Branding */}
                <div className="flex flex-col items-center text-center mb-5">
                    <LogoMark />
                </div>

                {/* Paper Desk Card */}
                <div style={{ ...cardStyle, padding: '2rem 2rem 1.5rem' }}>
                    {/* Header */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h1 className="text-xl font-bold tracking-tight leading-snug mb-1" style={textPrimary}>
                            Log in to WorldInMaking
                        </h1>
                        <p className="text-xs" style={textMuted}>
                            Welcome back. Let&apos;s go ship something.
                        </p>
                    </div>

                    {/* Form */}
                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        <LemonField label="Email address">
                            <LemonInput
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@yourcompany.com"
                                autoFocus
                            />
                        </LemonField>

                        <LemonButton
                            type="primary"
                            fullWidth
                            center
                            disabled={loading}
                            loading={loading}
                            icon={!loading ? <IconUser className="size-4" /> : undefined}
                        >
                            {loading ? 'Sending login code…' : 'Continue with email'}
                        </LemonButton>
                    </form>

                    {/* Footer divider */}
                    <div
                        style={{
                            marginTop: '1.5rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid var(--border-3000)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.375rem',
                        }}
                    >
                        <IconShield style={{ width: '0.875rem', height: '0.875rem', opacity: 0.6 }} />
                        <span className="text-[10px] font-mono" style={textMuted}>
                            secure magic-link sign-in
                        </span>
                    </div>
                </div>

                {/* Sign-up prompt — PostHog link color (orange/amber) */}
                <p className="mt-4 text-xs text-center" style={textMuted}>
                    New to WorldInMaking?{' '}
                    <span
                        style={linkStyle}
                        onClick={() => addToast('Sign up is open! Type your email above.', 'info')}
                        onMouseEnter={(e) => ((e.target as HTMLElement).style.textDecoration = 'underline')}
                        onMouseLeave={(e) => ((e.target as HTMLElement).style.textDecoration = 'none')}
                    >
                        Create an account →
                    </span>
                </p>
            </motion.div>
        </div>
    );
}
