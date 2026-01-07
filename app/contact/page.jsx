"use client";
import React from 'react';
import DashboardHeader from '../components/DashboardHeader';
import Button3D from '../components/Button3D';

export default function ContactPage() {
    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DashboardHeader />
            <div className="flex-1 overflow-y-auto bg-bg-3000 custom-scrollbar" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
                <div className="max-w-xl mx-auto px-6 py-12">
                    <h2 className="text-3xl font-black mb-8 lowercase text-primary">get in touch</h2>
                    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('message sent!'); }}>
                        <div className="grid grid-cols-2 gap-4">
                            <input required name="name" type="text" placeholder="name" className="w-full bg-white border border-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 ring-gray-400 lowercase placeholder:text-gray-400" />
                            <input required name="email" type="email" placeholder="email" className="w-full bg-white border border-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 ring-gray-400 lowercase placeholder:text-gray-400" />
                        </div>
                        <input required name="subject" type="text" placeholder="subject" className="w-full bg-white border border-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 ring-gray-400 lowercase placeholder:text-gray-400" />
                        <textarea required name="message" rows={5} placeholder="message" className="w-full bg-white border border-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 ring-gray-400 resize-none lowercase placeholder:text-gray-400"></textarea>

                        <Button3D type="submit" fullWidth>
                            send message
                        </Button3D>
                    </form>
                    <div className="mt-8 text-center text-sm text-secondary lowercase">
                        or email us directly at hello@worldinmaking.com
                    </div>
                </div>
            </div>
        </div>
    );
}
