import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "../context/App";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";

export const metadata: Metadata = {
  title: "PostHog - The open source Product OS",
  description: "PostHog provides open-source product analytics, session recording, feature flags and A/B testing that you can self-host.",
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
