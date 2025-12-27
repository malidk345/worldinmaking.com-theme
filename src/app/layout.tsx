import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Worldinmaking",
  description: "A digital collective focused on minimizing the noise. We believe in interfaces that disappear, content that breathes, and code that performs.",
  keywords: ["design", "development", "tech", "philosophy", "blog"],
  authors: [{ name: "Worldinmaking" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
