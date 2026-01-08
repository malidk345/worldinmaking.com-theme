"use client";
import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import DashboardHeader from '../components/DashboardHeader';
import PageWindow from '../components/PageWindow';

export default function AboutPage() {
    const router = useRouter();

    const handleClose = () => {
        router.push('/');
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DashboardHeader />
            <PageWindow id="about-window" title="about" onClose={handleClose}>
                <div className="flex-1 overflow-y-auto bg-bg-3000 custom-scrollbar h-full" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
                    <div className="max-w-2xl mx-auto px-6 py-12 text-center space-y-8">
                        <div className="w-24 h-24 mx-auto rounded-full bg-gray-200 overflow-hidden relative border border-primary">
                            <Image
                                src="https://i.pravatar.cc/300?u=50"
                                alt="team"
                                fill
                                className="object-cover grayscale"
                                unoptimized
                            />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black lowercase mb-4 text-primary">we are worldinmaking</h2>
                            <p className="text-secondary leading-relaxed lowercase text-lg">
                                a digital collective focused on minimizing the noise. we believe in interfaces that disappear, content that breathes, and code that performs. established in 2024, we are rethinking how the web should feel.
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-4 border-t border-primary pt-8">
                            <div>
                                <div className="text-2xl font-bold text-primary">12+</div>
                                <div className="text-xs text-secondary lowercase">awards won</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-primary">50+</div>
                                <div className="text-xs text-secondary lowercase">projects</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-primary">5</div>
                                <div className="text-xs text-secondary lowercase">team members</div>
                            </div>
                        </div>
                    </div>
                </div>
            </PageWindow>
        </div>
    );
}
