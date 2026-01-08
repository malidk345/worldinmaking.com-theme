"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '../components/DashboardHeader';
import PageWindow from '../components/PageWindow';
import Button3D from '../components/Button3D';

export default function WriteForWimPage() {
    const router = useRouter();

    const handleClose = () => {
        router.push('/');
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DashboardHeader />
            <PageWindow id="write-window" title="write for wim" onClose={handleClose}>
                <div className="flex-1 overflow-y-auto bg-bg-3000 custom-scrollbar h-full" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
                    <div className="max-w-2xl mx-auto px-6 py-12 space-y-12">
                        <section className="space-y-4">
                            <h2 className="text-3xl font-black lowercase text-primary">the wim philosophy</h2>
                            <p className="text-secondary leading-relaxed lowercase text-lg">
                                worldinmaking is a digital collective focused on minimizing the noise. we believe in interfaces that disappear, content that breathes, and code that performs.
                            </p>
                            <p className="text-secondary leading-relaxed lowercase text-lg">
                                we are looking for writers, designers, and developers who share our obsession with simplicity and substance. if you have a unique perspective on the future of the web, we want to hear from you.
                            </p>
                        </section>

                        <hr className="border-primary" />

                        <section>
                            <h3 className="font-bold text-xl mb-6 lowercase text-primary">submit your pitch</h3>
                            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('application submitted!'); }}>
                                <div className="grid grid-cols-2 gap-4">
                                    <input required name="name" type="text" placeholder="name" className="w-full bg-white border border-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 ring-gray-400 lowercase placeholder:text-gray-400" />
                                    <input required name="email" type="email" placeholder="email" className="w-full bg-white border border-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 ring-gray-400 lowercase placeholder:text-gray-400" />
                                </div>
                                <input required name="portfolio" type="url" placeholder="portfolio / writing sample url" className="w-full bg-white border border-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 ring-gray-400 lowercase placeholder:text-gray-400" />
                                <textarea required name="pitch" rows={5} placeholder="what would you like to write about?" className="w-full bg-white border border-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 ring-gray-400 resize-none lowercase placeholder:text-gray-400"></textarea>

                                <Button3D type="submit" fullWidth>
                                    submit application
                                </Button3D>
                            </form>
                        </section>
                    </div>
                </div>
            </PageWindow>
        </div>
    );
}
