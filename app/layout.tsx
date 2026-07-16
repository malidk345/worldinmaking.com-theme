import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import 'highlight.js/styles/github.css';
import { WebSiteJsonLd } from "../components/SEO/JsonLd";
import { AppProvider } from "../context/App";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";

const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
    variable: '--font-inter',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://worldinmaking.com";


export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: "world in making",
        template: "%s | world in making",
    },
    description: "the world is not something we merely inhabit — it is something continuously being formed. world in making explores philosophy, technology ethics, and society through the interrogation of constructed realities.",
    keywords: ["philosophy", "technology ethics", "society", "world in making", "current events", "existentialism", "digital culture"],
    alternates: {
        canonical: "/",
    },
    openGraph: {
        type: "website",
        url: siteUrl,
        siteName: "world in making",
        title: "world in making",
        description: "the world is not something we merely inhabit — it is something continuously being formed. world in making explores philosophy, technology ethics, and society through the interrogation of constructed realities.",
        images: [
            {
                url: `${siteUrl}/og-image.jpg`,
                width: 1200,
                height: 630,
                alt: "world in making",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "world in making",
        description: "the world is not something we merely inhabit — it is something continuously being formed. world in making explores philosophy, technology ethics, and society through the interrogation of constructed realities.",
        images: [`${siteUrl}/og-image.jpg`],
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
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#F0F0F5' },
        { media: '(prefers-color-scheme: dark)', color: '#0F0F14' }
    ],
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    interactiveWidget: 'resizes-content',
};

import { GoogleAnalytics } from '@next/third-parties/google';

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={inter.variable}>
            <head>
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            </head>
            <body className="antialiased apple-body">
                <WebSiteJsonLd
                    name="world in making"
                    url={siteUrl}
                    description="the world is not something we merely inhabit — it is something continuously being formed. world in making explores philosophy, technology ethics, and society through the interrogation of constructed realities."
                />
                <AppProvider>
                    <AuthProvider>
                        <ToastProvider>
                            {children}
                        </ToastProvider>
                    </AuthProvider>
                </AppProvider>
                {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
            </body>
        </html>
    );
}
