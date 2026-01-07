"use client";
import React from 'react';
import DashboardHeader from '../components/DashboardHeader';

export default function ServicesPage() {
    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DashboardHeader />
            <div className="flex-1 overflow-y-auto bg-bg-3000 custom-scrollbar" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
                <div className="max-w-4xl mx-auto px-6 py-12">
                    <h2 className="text-3xl font-black mb-8 lowercase text-primary">what we do</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['web design', 'development', 'branding', 'seo', 'consulting', 'analytics'].map((service, idx) => (
                            <div key={service} className="p-6 rounded-lg border border-primary bg-white hover:shadow-md transition-shadow cursor-pointer">
                                <h3 className="font-bold text-lg mb-2 lowercase">{service}</h3>
                                <p className="text-sm text-secondary lowercase">
                                    comprehensive {service} solutions tailored for modern businesses seeking growth and digital presence.
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
