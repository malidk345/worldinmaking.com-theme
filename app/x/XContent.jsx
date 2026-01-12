"use client";
import GenericPage from '../components/GenericPage';
import * as Icons from '../components/SidebarIcons';

export default function XPage({ isWindowMode = false }) {
    return (
        <GenericPage
            title="x"
            description="stay updated with real-time news and community discussions."
            icon={<Icons.X className="size-8" />}
            isWindowMode={isWindowMode}
        />
    );
}
