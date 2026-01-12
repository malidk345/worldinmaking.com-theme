"use client";

import React from 'react';
import DashboardHeader from '../components/DashboardHeader';

export default function SearchPage() {
    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DashboardHeader />
            {/* Window managed by WindowManager & WindowSync */}
        </div>
    );
}
