import "./globals.css";
import "./components/Card.css";
import Sidebar from "./components/Sidebar";
import { IBM_Plex_Sans } from "next/font/google";

// PostHog uses IBM Plex Sans for body text
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});



export const metadata = {
  title: "PostHog Dashboard",
  description: "Clone of PostHog Dashboard",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // Important for iOS safe-area
};

import { SidebarProvider } from "./context/SidebarContext";
import { TabProvider } from "./context/TabContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={ibmPlexSans.variable}>
      <body className="bg-bg-3000 font-sans text-primary scrollbar-hide lowercase">
        <div className="flex h-[100dvh] w-full overflow-hidden relative">
          <AuthProvider>
            <ToastProvider>
              <SidebarProvider>
                <TabProvider>
                  <Sidebar />
                  <div className="scene flex flex-col flex-1 min-w-0">
                    <div className="SceneLayout flex-1 flex flex-col min-h-0 relative">
                      {children}
                    </div>
                  </div>
                </TabProvider>
              </SidebarProvider>
            </ToastProvider>
          </AuthProvider>


          {/* Global safe zone - prevents browser chrome from cutting off content */}
          <div className="safe-zone-border" aria-hidden="true" />
        </div>
      </body>
    </html>
  );
}
