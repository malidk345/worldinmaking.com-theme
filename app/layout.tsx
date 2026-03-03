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

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, interactive-widget=resizes-content" />
                <meta name="theme-color" content="#E5E7E0" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
            </head>
            <body className="antialiased">
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
            </body>
        </html>
    );
}
