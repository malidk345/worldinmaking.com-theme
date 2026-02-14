"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
    IconUser,
    IconUpload,
    IconLock,
    IconChevronRight,
    IconInfo,
    IconGlobe,
    IconMessage
} from '@posthog/icons';
import Input from '../OSForm/input';
import Textarea from '../OSForm/textarea';

// Custom Social Icons from PostHog V1
const GitHubIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0} fillRule="evenodd">
        <path fill="currentColor" d="M11.9906 1.78809C6.19453 1.78574 1.5 6.47793 1.5 12.2693C1.5 16.849 4.43672 20.742 8.52656 22.1717C9.07734 22.31 8.99297 21.9186 8.99297 21.6514V19.835C5.8125 20.2076 5.68359 18.1029 5.47031 17.7514C5.03906 17.0154 4.01953 16.8279 4.32422 16.4764C5.04844 16.1037 5.78672 16.5701 6.64219 17.8334C7.26094 18.7498 8.46797 18.5951 9.07969 18.4428C9.21328 17.892 9.49922 17.3998 9.89297 17.0178C6.59766 16.4271 5.22422 14.4162 5.22422 12.0256C5.22422 10.8654 5.60625 9.79902 6.35625 8.93887C5.87812 7.5209 6.40078 6.30684 6.47109 6.12637C7.83281 6.00449 9.24844 7.10137 9.35859 7.18809C10.132 6.97949 11.0156 6.86934 12.0047 6.86934C12.9984 6.86934 13.8844 6.98418 14.6648 7.19512C14.9297 6.99355 16.2422 6.05137 17.5078 6.16621C17.5758 6.34668 18.0867 7.53262 17.6367 8.93184C18.3961 9.79434 18.7828 10.8701 18.7828 12.0326C18.7828 14.4279 17.4 16.4412 14.0953 17.0225C14.3784 17.3008 14.6031 17.6328 14.7564 17.999C14.9098 18.3652 14.9886 18.7583 14.9883 19.1553V21.792C15.007 22.0029 14.9883 22.2115 15.3398 22.2115C19.4906 20.8123 22.4789 16.8912 22.4789 12.2717C22.4789 6.47793 17.782 1.78809 11.9906 1.78809V1.78809Z" />
    </svg>
);

const LinkedInIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24">
        <path fill="currentColor" d="M19.893 19.717h-3.111v-4.825c0-1.15-.021-2.632-1.619-2.632-1.62 0-1.868 1.254-1.868 2.548v4.908h-3.112V9.794h2.987v1.356h.042a3.26 3.26 0 0 1 1.25-1.204 3.3 3.3 0 0 1 1.697-.398c3.154 0 3.735 2.054 3.735 4.726l-.001 5.443ZM6.673 8.438c-.358 0-.707-.104-1.004-.3a1.792 1.792 0 0 1-.665-.803 1.772 1.772 0 0 1 .39-1.949 1.822 1.822 0 0 1 .33.136.613.365.811.659a1.775 1.775 0 0 1-.224 2.257 1.807 1.807 0 0 1-1.277.524Zm1.555 11.279H5.113V9.794h3.115v9.923ZM21.444 2H3.55a1.54 1.54 0 0 0-1.088.432A1.51 1.51 0 0 0 2 3.5v17.792c.005.402.17.786.461 1.068.29.281.682.437 1.089.432h17.894c.407.005.8-.15 1.092-.431.291-.281.458-.666.464-1.069V3.499a1.513 1.513 0 0 0-.465-1.068 1.544 1.544 0 0 0-1.09-.43" />
    </svg>
);

const TwitterIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 1200 1227" xmlns="http://www.w3.org/2000/svg">
        <path fill="currentColor" d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" />
    </svg>
);

export default function ProfileContent() {
    const { user, profile, updateProfile, signOut } = useAuth();
    const { addToast } = useToast();

    const [form, setForm] = useState({
        username: profile?.username || '',
        avatar_url: profile?.avatar_url || '',
        bio: profile?.bio || '',
        website: profile?.website || '',
        github: profile?.github || '',
        linkedin: profile?.linkedin || '',
        twitter: profile?.twitter || '',
        pronouns: profile?.pronouns || '',
        location: profile?.location || '',
    });

    const [updating, setUpdating] = useState(false);

    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        const success = await updateProfile(form);
        setUpdating(false);

        if (success) {
            addToast('profile updated successfully', 'success');
        } else {
            addToast('failed to update profile', 'error');
        }
    };

    if (!user) return null;

    return (
        <div className="flex-1 flex flex-col h-full bg-accent overflow-y-auto custom-scrollbar">
            <div className="p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-3xl mx-auto w-full space-y-8"
                >
                    {/* Header Card */}
                    <div className="bg-primary border border-primary rounded p-6 shadow-sm flex items-center gap-6">
                        <div className="relative group cursor-pointer">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary shadow-inner bg-accent flex-shrink-0">
                                {form.avatar_url ? (
                                    <img src={form.avatar_url} className="w-full h-full object-cover" alt={form.username} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-secondary">
                                        <IconUser className="w-12 h-12" />
                                    </div>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <IconUpload className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-black lowercase m-0 text-primary">{profile?.username || 'anonymous'}</h2>
                            <p className="text-[15px] text-secondary lowercase m-0 font-medium">{user.email}</p>
                            <div className="mt-3 flex gap-2">
                                <span className="px-2 py-0.5 bg-accent border border-primary rounded text-[11px] font-bold lowercase text-secondary">
                                    {profile?.role || 'member'}
                                </span>
                                {form.location && (
                                    <span className="px-2 py-0.5 bg-accent border border-primary rounded text-[11px] font-bold lowercase text-secondary flex items-center gap-1">
                                        <IconGlobe className="w-3 h-3" /> {form.location}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tip Section */}
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30 p-4 rounded-md flex items-start gap-3">
                        <IconInfo className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-[13px] text-blue-800 dark:text-blue-300 m-0 leading-relaxed font-medium">
                            <strong>Tip:</strong> Be sure to use full URLs when adding links to your website, GitHub, LinkedIn and Twitter (start with https). Markdown is allowed in your bio!
                        </p>
                    </div>

                    <form onSubmit={handleSave} className="space-y-8">
                        {/* Account Settings */}
                        <div className="bg-primary border border-primary rounded overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-primary bg-accent/30 flex items-center justify-between">
                                <h3 className="text-sm font-black lowercase m-0 opacity-70">account settings</h3>
                                <IconLock className="w-4 h-4 opacity-30" />
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        label="username"
                                        direction="column"
                                        value={form.username}
                                        onChange={(e: any) => handleChange('username', e.target.value)}
                                        placeholder="choose a display name"
                                        description="this is how you'll appear to others."
                                    />
                                    <Input
                                        label="avatar url"
                                        direction="column"
                                        value={form.avatar_url}
                                        onChange={(e: any) => handleChange('avatar_url', e.target.value)}
                                        placeholder="https://..."
                                        description="direct link to your profile image."
                                        showClearButton
                                        onClear={() => handleChange('avatar_url', '')}
                                    />
                                </div>

                                <Textarea
                                    label="bio"
                                    direction="column"
                                    value={form.bio}
                                    onChange={(e: any) => handleChange('bio', e.target.value)}
                                    placeholder="tell us about yourself (markdown encouraged)..."
                                    description="share your story, stack, or current projects."
                                    rows={4}
                                />
                            </div>
                        </div>

                        {/* Personal Details */}
                        <div className="bg-primary border border-primary rounded overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-primary bg-accent/30 flex items-center justify-between">
                                <h3 className="text-sm font-black lowercase m-0 opacity-70">personal details</h3>
                                <IconUser className="w-4 h-4 opacity-30" />
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input
                                    label="pronouns"
                                    direction="column"
                                    value={form.pronouns}
                                    onChange={(e: any) => handleChange('pronouns', e.target.value)}
                                    placeholder="e.g. they/them"
                                />
                                <Input
                                    label="location"
                                    direction="column"
                                    value={form.location}
                                    onChange={(e: any) => handleChange('location', e.target.value)}
                                    placeholder="e.g. san francisco, ca"
                                />
                            </div>
                        </div>

                        {/* Social Links */}
                        <div className="bg-primary border border-primary rounded overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-primary bg-accent/30 flex items-center justify-between">
                                <h3 className="text-sm font-black lowercase m-0 opacity-70">social links</h3>
                                <IconGlobe className="w-4 h-4 opacity-30" />
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        label="website"
                                        direction="column"
                                        value={form.website}
                                        onChange={(e: any) => handleChange('website', e.target.value)}
                                        placeholder="https://yourpage.com"
                                        tooltip={<span className="flex items-center gap-1"><IconGlobe className="w-3 h-3" /> your personal corner of the web</span>}
                                    />
                                    <Input
                                        label="github"
                                        direction="column"
                                        value={form.github}
                                        onChange={(e: any) => handleChange('github', e.target.value)}
                                        placeholder="https://github.com/username"
                                        tooltip={<span className="flex items-center gap-1"><GitHubIcon className="w-3 h-3" /> your open source footprint</span>}
                                    />
                                    <Input
                                        label="linkedin"
                                        direction="column"
                                        value={form.linkedin}
                                        onChange={(e: any) => handleChange('linkedin', e.target.value)}
                                        placeholder="https://linkedin.com/in/username"
                                        tooltip={<span className="flex items-center gap-1"><LinkedInIcon className="w-3 h-3" /> your professional side</span>}
                                    />
                                    <Input
                                        label="twitter"
                                        direction="column"
                                        value={form.twitter}
                                        onChange={(e: any) => handleChange('twitter', e.target.value)}
                                        placeholder="https://twitter.com/username"
                                        tooltip={<span className="flex items-center gap-1"><TwitterIcon className="w-3 h-3" /> where you share thoughts</span>}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 flex items-center justify-between gap-3 border-t border-primary">
                            <button
                                type="button"
                                onClick={() => signOut()}
                                className="px-4 py-2 text-red font-bold text-[13px] hover:bg-red/5 rounded transition-colors lowercase"
                            >
                                sign out
                            </button>
                            <div className="flex items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="px-6 py-2 bg-gray-900 text-white font-bold rounded hover:opacity-90 text-[13px] disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
                                >
                                    {updating ? 'saving...' : 'save changes'}
                                    {!updating && <IconChevronRight className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Footer Info */}
                    <div className="flex items-center justify-center gap-4 py-8 opacity-30 group hover:opacity-100 transition-opacity">
                        <div className="h-px bg-primary flex-1" />
                        <div className="text-[11px] font-bold lowercase tracking-wider flex items-center gap-2">
                            <span>posthog os community v1.1.0</span>
                            <span className="w-1 h-1 rounded-full bg-current" />
                            <span>identity verified via supabase</span>
                        </div>
                        <div className="h-px bg-primary flex-1" />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
