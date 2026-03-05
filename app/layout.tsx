import type { Metadata, Viewport } from "next";
import '@fontsource-variable/ibm-plex-sans';
import "./globals.css";
import { WebSiteJsonLd } from "../components/SEO/JsonLd";
import { AppProvider } from "../context/App";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://worldinmaking.com";

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: "world in making",
        template: "%s | world in making",
    },
    description: "the world is not something we merely inhabit — it is something continuously being formed. world in making explores product, engineering, and community through the interrogation of constructed realities.",
    alternates: {
        canonical: "/",
    },
    openGraph: {
        type: "website",
        url: siteUrl,
        siteName: "world in making",
        title: "world in making",
        description: "the world is not something we merely inhabit — it is something continuously being formed. world in making explores product, engineering, and community through the interrogation of constructed realities.",
    },
    twitter: {
        card: "summary_large_image",
        title: "world in making",
        description: "the world is not something we merely inhabit — it is something continuously being formed. world in making explores product, engineering, and community through the interrogation of constructed realities.",
    },
    robots: {
        index: true,
        follow: true,
    },
    icons: {
        icon: [
            { url: '/logo.svg?v=2', type: 'image/svg+xml' },
        ],
        shortcut: '/logo.svg?v=2',
        apple: '/logo.svg?v=2',
    },
    manifest: '/manifest.json',
};

export const viewport: Viewport = {
    themeColor: '#E5E7E0',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    interactiveWidget: 'resizes-content',
};

import { PostHogProvider } from "../providers/PostHogProvider";
import PostHogPageView from "../providers/PostHogPageView";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />

                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
            </head>
            <body className="antialiased">
                <PostHogProvider>
                    <PostHogPageView />
                    <WebSiteJsonLd
                        name="world in making"
                        url={siteUrl}
                        description="the world is not something we merely inhabit — it is something continuously being formed. world in making explores product, engineering, and community through the interrogation of constructed realities."
                    />
                    <AppProvider>
                        <AuthProvider>
                            <ToastProvider>
                                {children}
                            </ToastProvider>
                        </AuthProvider>
                    </AppProvider>
                </PostHogProvider>
            </body>
        </html>
    );
}
