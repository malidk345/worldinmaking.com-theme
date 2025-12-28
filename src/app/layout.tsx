import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Source_Code_Pro } from "next/font/google";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
});

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-source-code-pro",
});

// SEO Metadata
export const metadata: Metadata = {
  metadataBase: new URL('https://worldinmaking.com'),
  title: {
    default: "Worldinmaking",
    template: "%s | Worldinmaking",
  },
  description: "A digital collective focused on minimizing the noise. We believe in interfaces that disappear, content that breathes, and code that performs.",
  keywords: ["design", "development", "tech", "philosophy", "blog", "minimalism", "software", "worldinmaking"],
  authors: [{ name: "Worldinmaking", url: "https://worldinmaking.com" }],
  creator: "Worldinmaking",
  publisher: "Worldinmaking",

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://worldinmaking.com",
    siteName: "Worldinmaking",
    title: "Worldinmaking",
    description: "A digital collective focused on minimizing the noise.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Worldinmaking",
      },
    ],
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "Worldinmaking",
    description: "A digital collective focused on minimizing the noise.",
    images: ["/og-image.png"],
  },

  // Icons
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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

  // Verification (add your own IDs)
  // verification: {
  //   google: "your-google-verification-code",
  // },
};

// Viewport settings
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        suppressHydrationWarning
        className={`${ibmPlexSans.variable} ${sourceCodePro.variable} antialiased transition-colors duration-300 lowercase`}
      >
        <div className="fixed inset-0 w-full h-full overflow-hidden overscroll-none">
          {children}
        </div>
      </body>
    </html>
  );
}
