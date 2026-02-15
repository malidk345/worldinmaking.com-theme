import type { Metadata } from "next";
import "./globals.css";
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
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
            </head>
            <body className="antialiased light">
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
