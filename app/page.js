'use client';

import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import DashboardHeader from './components/DashboardHeader';
import HomeWindow from './components/HomeWindow';
import { useWindow } from './contexts/WindowContext';

/**
 * HomePage
 * Main page component that displays the Home window
 */
export default function HomePage() {
  const { windows, openWindow, closeWindow } = useWindow();

  // Open home window on mount if not already open
  useEffect(() => {
    const hasHomeWindow = windows.some(w => w.id === 'home-window');
    if (!hasHomeWindow) {
      openWindow('home', { id: 'home-window', title: 'home' });
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <DashboardHeader />
      {/* Windows Layer is now handled by WindowManager in RootLayout */}
    </div>
  );
}
