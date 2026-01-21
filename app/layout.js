import "./globals.css";
import "./components/Card.css";
import { IBM_Plex_Sans } from "next/font/google";

// Providers - All contexts in single folder
import { SidebarProvider } from "./contexts/SidebarContext";
import { TabProvider } from "./contexts/TabContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { WindowProvider } from "./contexts/WindowContext";

// Components
import Sidebar from "./components/Sidebar";
import DashboardHeader from "./components/DashboardHeader";
import WindowManager from "./components/WindowManager";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import WindowSync from "./components/WindowSync";

// PostHog uses IBM Plex Sans for body text
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

// Site configuration
const siteConfig = {
  name: "World in Making",
  description: "Discover insights, tutorials, and stories about technology, design, and life. A modern blog platform built with Next.js.",
  url: "https://worldinmaking.com",
  author: "World in Making Team",
  twitterHandle: "@worldinmaking",
};

export const metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: ["blog", "technology", "design", "tutorials", "insights", "web development", "programming"],
  authors: [{ name: siteConfig.author }],
  creator: siteConfig.author,
  publisher: siteConfig.name,

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    creator: siteConfig.twitterHandle,
    images: ["/og-image.png"],
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Icons
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  // Manifest
  manifest: "/manifest.json",

  // Verification (add your codes here)
  verification: {
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1f1f1f" },
  ],
};

export default function RootLayout({ children }) {
  // JSON-LD structured data for organization
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    sameAs: [
      "https://twitter.com/worldinmaking",
      "https://instagram.com/worldinmaking",
    ],
  };

  return (
    <html lang="en" className={ibmPlexSans.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${ibmPlexSans.className} bg-bg-3000 text-primary scrollbar-hide lowercase`}>
        <div className="flex h-dvh w-full overflow-hidden relative">
          <AuthProvider>
            <ThemeProvider>
              <ToastProvider>
                <SidebarProvider>
                  <TabProvider>
                    <WindowProvider>
                      <KeyboardShortcuts />
                      <WindowSync />
                      <Sidebar />
                      <div className="scene flex flex-col flex-1 min-w-0 bg-bg-3000">
                        <DashboardHeader />
                        <div className="SceneLayout flex-1 flex flex-col min-h-0 relative">
                          {children}
                          <WindowManager />
                        </div>
                      </div>
                    </WindowProvider>
                  </TabProvider>
                </SidebarProvider>
              </ToastProvider>
            </ThemeProvider>
          </AuthProvider>

          {/* Global safe zone - prevents browser chrome from cutting off content */}
          <div className="safe-zone-border" aria-hidden="true" />
        </div>

        {/* Service Worker Registration for PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                      console.log('SW registered: ', registration);
                    })
                    .catch((registrationError) => {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
