'use client';

import React, { Suspense } from 'react';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from '../contexts/ToastContext';
import { AuthProvider } from '../contexts/AuthContext';
import { WindowProvider } from '../contexts/WindowContext';
import DesktopEnvironment from '../components/DesktopEnvironment';
import ErrorBoundary from '../components/ErrorBoundary';

export default function Home() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Suspense fallback={null}>
              <WindowProvider>
                <DesktopEnvironment />
              </WindowProvider>
            </Suspense>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
