import type { Metadata } from "next";
import "./globals.css";
import { WebSiteJsonLd } from "../components/SEO/JsonLd";
import { AppProvider } from "../context/App";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://worldinmaking.com";

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: "World in Making",
        template: "%s | World in Making",
    },
    description: "World in Making explores product, engineering, and community through stories, tools, and insights.",
    alternates: {
        canonical: "/",
    },
    openGraph: {
        type: "website",
        url: siteUrl,
        siteName: "World in Making",
        title: "World in Making",
        description: "World in Making explores product, engineering, and community through stories, tools, and insights.",
    },
    twitter: {
        card: "summary_large_image",
        title: "World in Making",
        description: "World in Making explores product, engineering, and community through stories, tools, and insights.",
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

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, interactive-widget=resizes-content" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
            </head>
            <body className="antialiased">
                <WebSiteJsonLd
                    name="World in Making"
                    url={siteUrl}
                    description="World in Making explores product, engineering, and community through stories, tools, and insights."
                />
                <AppProvider>
                    <AuthProvider>
                        <ToastProvider>
                            {children}
                        </ToastProvider>
                    </AuthProvider>
                </AppProvider>
            </body>
        </html>
    );
}
