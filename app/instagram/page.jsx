"use client";
import GenericPage from '../components/GenericPage';
import * as Icons from '../components/SidebarIcons';

export default function InstagramPage() {
    return (
        <GenericPage
            title="instagram"
            description="follow our visual journey and behind-the-scenes content."
            icon={<Icons.Instagram className="size-8" />}
        />
    );
}
