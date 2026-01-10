import { Suspense } from 'react';
import ProfileContent from './ProfileContent';

export const metadata = {
    title: 'Profile | PostHog Blog',
    description: 'Your profile page'
};

export default function ProfilePage() {
    return (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
            <ProfileContent />
        </Suspense>
    );
}
