"use client"

import React from 'react'
import WindowTabs from 'components/WindowTabs'
import { Settings, User, Monitor, Bell, Shield, Database, Globe, Cpu } from 'lucide-react'

export default function SystemSettings() {
    const tabs = [
        {
            key: 'general',
            title: <div className="flex items-center gap-2"><Settings className="size-4" /> general</div>,
            content: (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold">general settings</h2>
                    <p className="text-sm text-secondary">manage your basic system preferences here.</p>
                    <div className="p-4 border border-primary rounded bg-accent/10">
                        <div className="font-bold mb-1">system name</div>
                        <input className="w-full bg-primary border border-input p-2 rounded" defaultValue="posthog-os-01" />
                    </div>
                </div>
            )
        },
        {
            key: 'appearance',
            title: <div className="flex items-center gap-2"><Monitor className="size-4" /> appearance</div>,
            content: (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold">appearance</h2>
                    <p className="text-sm text-secondary">customize how your desktop looks and feels.</p>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="aspect-video bg-zinc-800 rounded border-2 border-orange-500 flex items-center justify-center text-[10px] text-white">dark mode</div>
                        <div className="aspect-video bg-white rounded border border-primary flex items-center justify-center text-[10px] text-zinc-400">light mode</div>
                        <div className="aspect-video bg-zinc-400 rounded border border-primary flex items-center justify-center text-[10px] text-white">system</div>
                    </div>
                </div>
            )
        },
        {
            key: 'notifications',
            title: <div className="flex items-center gap-2"><Bell className="size-4" /> notifications</div>,
            content: (
                <div className="p-8 text-center text-muted italic">
                    notification settings are currently managed by central brain module.
                </div>
            )
        },
        {
            key: 'security',
            title: <div className="flex items-center gap-2"><Shield className="size-4" /> security</div>,
            content: <div className="p-4">security protocols active.</div>
        },
        {
            key: 'storage',
            title: <div className="flex items-center gap-2"><Database className="size-4" /> storage</div>,
            content: <div className="p-4">storage health: 98%</div>
        },
        {
            key: 'network',
            title: <div className="flex items-center gap-2"><Globe className="size-4" /> network</div>,
            content: <div className="p-4">connected to posthog-net</div>
        },
        {
            key: 'hardware',
            title: <div className="flex items-center gap-2"><Cpu className="size-4" /> hardware</div>,
            content: <div className="p-4">cpu: 8-core virtualized</div>
        }
    ]

    return (
        <div className="h-full bg-primary flex flex-col overflow-hidden">
            <div className="p-4 border-b border-primary bg-accent/20">
                <h1 className="text-lg font-bold flex items-center gap-2">
                    <Monitor className="size-5" />
                    system settings
                </h1>
            </div>
            <div className="flex-1 min-h-0">
                <WindowTabs tabs={tabs} />
            </div>
        </div>
    )
}
