"use client";
import GenericPage from '../components/GenericPage';

export default function LoginPage() {
    return (
        <GenericPage
            title="login"
            description="access your account to manage your content and settings."
            icon={(
                <svg className="size-8" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    <polyline points="10 17 15 12 10 7"></polyline>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
            )}
        />
    );
}
